-- ══════════════════════════════════════════════════════════════════
-- Casino Room Tables, RLS, Realtime & Transaction RPCs
-- ══════════════════════════════════════════════════════════════════

-- 1. Register Casino Room Settings
INSERT INTO room_settings (
  room_type,
  display_name,
  is_active,
  public_entry_fee,
  min_private_entry_fee,
  public_cost_per_min,
  min_private_cost_per_min,
  billing_enabled,
  public_sessions_enabled,
  private_sessions_enabled
) VALUES (
  'casino',
  'Casino Lounge',
  true,
  10.00,
  20.00,
  0.00,
  0.00,
  false, -- Casino uses bet-based transactions, not metered per-minute billing
  true,
  true
) ON CONFLICT (room_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active;

-- 2. Create Casino Game States Table (Holds current active round state)
CREATE TABLE IF NOT EXISTS public.casino_game_states (
  session_id UUID PRIMARY KEY REFERENCES public.room_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'betting', -- 'betting', 'dealing', 'resolved'
  player_cards JSONB DEFAULT '[]'::jsonb,
  banker_cards JSONB DEFAULT '[]'::jsonb,
  winner TEXT, -- 'player', 'banker', 'tie'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.casino_game_states ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_game_states' AND policyname = 'Public read access for casino game states'
    ) THEN
        CREATE POLICY "Public read access for casino game states" ON public.casino_game_states
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_game_states' AND policyname = 'Creators manage casino game states'
    ) THEN
        CREATE POLICY "Creators manage casino game states" ON public.casino_game_states
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.room_sessions rs 
                    WHERE rs.id = session_id AND rs.creator_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 2b. Create Casino Rounds Table (Holds history of past rounds)
CREATE TABLE IF NOT EXISTS public.casino_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.room_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  winner TEXT NOT NULL, -- 'player', 'banker', 'tie'
  player_cards JSONB DEFAULT '[]'::jsonb,
  banker_cards JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.casino_rounds ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_rounds' AND policyname = 'Public read access for casino rounds'
    ) THEN
        CREATE POLICY "Public read access for casino rounds" ON public.casino_rounds
            FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Create Casino Bets Table
CREATE TABLE IF NOT EXISTS public.casino_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.room_sessions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_type TEXT NOT NULL, -- 'player', 'banker', 'tie'
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'won', 'lost', 'refunded'
  payout NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.casino_bets ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_bets' AND policyname = 'Fans view own casino bets'
    ) THEN
        CREATE POLICY "Fans view own casino bets" ON public.casino_bets
            FOR SELECT USING (auth.uid() = fan_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_bets' AND policyname = 'Creators view session casino bets'
    ) THEN
        CREATE POLICY "Creators view session casino bets" ON public.casino_bets
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.room_sessions rs 
                    WHERE rs.id = session_id AND rs.creator_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'casino_bets' AND policyname = 'Fans insert own casino bets'
    ) THEN
        CREATE POLICY "Fans insert own casino bets" ON public.casino_bets
            FOR INSERT WITH CHECK (auth.uid() = fan_id);
    END IF;
END $$;

-- 4. Enable Realtime Replication for Casino Tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'casino_game_states'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_game_states;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'casino_rounds'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_rounds;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'casino_bets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_bets;
    END IF;
END $$;

-- 5. RPC: place_casino_bet
CREATE OR REPLACE FUNCTION public.place_casino_bet(
  p_session_id UUID,
  p_fan_id UUID,
  p_bet_type TEXT,
  p_amount NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_bet_id UUID;
BEGIN
  -- Validate bet type
  IF p_bet_type NOT IN ('player', 'banker', 'tie') THEN
    RAISE EXCEPTION 'Invalid bet type: must be player, banker, or tie';
  END IF;

  -- 1. Lock wallet row for update
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_fan_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 2. Deduct from wallet balance
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 3. Log transaction
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    status,
    description,
    wallet_id,
    metadata
  ) VALUES (
    p_fan_id,
    p_amount,
    'debit',
    'completed',
    'Casino Bet: ' || p_bet_type,
    v_wallet_id,
    jsonb_build_object('session_id', p_session_id, 'bet_type', p_bet_type)
  );

  -- 4. Record the bet
  INSERT INTO casino_bets (
    session_id,
    fan_id,
    bet_type,
    amount,
    status
  ) VALUES (
    p_session_id,
    p_fan_id,
    p_bet_type,
    p_amount,
    'pending'
  ) RETURNING id INTO v_bet_id;

  RETURN jsonb_build_object(
    'success', true,
    'bet_id', v_bet_id,
    'new_balance', v_balance - p_amount
  );
END;
$$;

-- 6. RPC: start_new_casino_round
CREATE OR REPLACE FUNCTION public.start_new_casino_round(
  p_session_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO casino_game_states (session_id, status, player_cards, banker_cards, winner)
  VALUES (p_session_id, 'betting', '[]'::jsonb, '[]'::jsonb, NULL)
  ON CONFLICT (session_id) DO UPDATE SET
    status = 'betting',
    player_cards = '[]'::jsonb,
    banker_cards = '[]'::jsonb,
    winner = NULL,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'status', 'betting');
END;
$$;

-- 7. RPC: resolve_casino_bets
CREATE OR REPLACE FUNCTION public.resolve_casino_bets(
  p_session_id UUID,
  p_winner TEXT, -- 'player', 'banker', 'tie'
  p_player_cards JSONB,
  p_banker_cards JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_id UUID;
  v_host_wallet_id UUID;
  v_bet RECORD;
  v_total_payout NUMERIC := 0;
  v_total_house_profit NUMERIC := 0;
  v_payout_amount NUMERIC;
  v_round_number INT;
BEGIN
  -- Validate winner type
  IF p_winner NOT IN ('player', 'banker', 'tie') THEN
    RAISE EXCEPTION 'Invalid winner: must be player, banker, or tie';
  END IF;

  -- 1. Find session host creator
  SELECT creator_id INTO v_host_id
  FROM room_sessions
  WHERE id = p_session_id;

  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- 2. Find host wallet
  SELECT id INTO v_host_wallet_id
  FROM wallets
  WHERE user_id = v_host_id;

  IF v_host_wallet_id IS NULL THEN
    -- Auto-create host wallet if missing
    INSERT INTO wallets (user_id, balance) VALUES (v_host_id, 0)
    RETURNING id INTO v_host_wallet_id;
  END IF;

  -- 3. Update game state to resolved
  INSERT INTO casino_game_states (session_id, status, player_cards, banker_cards, winner)
  VALUES (p_session_id, 'resolved', p_player_cards, p_banker_cards, p_winner)
  ON CONFLICT (session_id) DO UPDATE SET
    status = 'resolved',
    player_cards = p_player_cards,
    banker_cards = p_banker_cards,
    winner = p_winner,
    updated_at = NOW();

  -- 3b. Insert into casino_rounds (History Log)
  SELECT COALESCE(MAX(round_number), 0) + 1 INTO v_round_number
  FROM casino_rounds
  WHERE session_id = p_session_id;

  INSERT INTO casino_rounds (session_id, round_number, winner, player_cards, banker_cards)
  VALUES (p_session_id, v_round_number, p_winner, p_player_cards, p_banker_cards);

  -- 4. Process all pending bets for this session
  FOR v_bet IN 
    SELECT id, fan_id, bet_type, amount 
    FROM casino_bets 
    WHERE session_id = p_session_id AND status = 'pending'
  LOOP
    -- Baccarat game payout logic
    IF p_winner = 'tie' THEN
      IF v_bet.bet_type = 'tie' THEN
        -- Tie wins: 8:1 payout (so pays original bet + 8x payout = 9x total credit)
        v_payout_amount := v_bet.amount * 9;
        
        UPDATE wallets SET balance = balance + v_payout_amount WHERE user_id = v_bet.fan_id;
        
        UPDATE casino_bets SET status = 'won', payout = v_payout_amount - v_bet.amount WHERE id = v_bet.id;
        
        INSERT INTO transactions (user_id, amount, type, status, description, wallet_id, metadata)
        SELECT v_bet.fan_id, v_payout_amount, 'credit', 'completed', 'Casino Payout (Tie Win)', id, jsonb_build_object('bet_id', v_bet.id)
        FROM wallets WHERE user_id = v_bet.fan_id;
        
      ELSE
        -- Player/Banker bets are refunded (Push) -> 1 * amount
        v_payout_amount := v_bet.amount;
        
        UPDATE wallets SET balance = balance + v_payout_amount WHERE user_id = v_bet.fan_id;
        
        UPDATE casino_bets SET status = 'refunded', payout = 0 WHERE id = v_bet.id;
        
        INSERT INTO transactions (user_id, amount, type, status, description, wallet_id, metadata)
        SELECT v_bet.fan_id, v_payout_amount, 'credit', 'completed', 'Casino Bet Refund (Tie Push)', id, jsonb_build_object('bet_id', v_bet.id)
        FROM wallets WHERE user_id = v_bet.fan_id;
        
      END IF;

    ELSIF v_bet.bet_type = p_winner THEN
      -- Player wins: 1:1 payout (pays original bet + 1x payout = 2x total credit)
      -- Banker wins: 0.95:1 payout (pays original bet + 0.95x payout = 1.95x total credit)
      IF p_winner = 'player' THEN
        v_payout_amount := v_bet.amount * 2;
      ELSE -- banker
        v_payout_amount := v_bet.amount * 1.95;
      END IF;

      UPDATE wallets SET balance = balance + v_payout_amount WHERE user_id = v_bet.fan_id;
      
      UPDATE casino_bets SET status = 'won', payout = v_payout_amount - v_bet.amount WHERE id = v_bet.id;
      
      INSERT INTO transactions (user_id, amount, type, status, description, wallet_id, metadata)
      SELECT v_bet.fan_id, v_payout_amount, 'credit', 'completed', 'Casino Payout (' || p_winner || ' Win)', id, jsonb_build_object('bet_id', v_bet.id)
      FROM wallets WHERE user_id = v_bet.fan_id;

    ELSE
      -- Bet lost -> Amount goes to the host creator
      UPDATE casino_bets SET status = 'lost', payout = 0 WHERE id = v_bet.id;
      
      UPDATE wallets SET balance = balance + v_bet.amount WHERE id = v_host_wallet_id;
      
      INSERT INTO transactions (user_id, amount, type, status, description, wallet_id, metadata)
      VALUES (
        v_host_id,
        v_bet.amount,
        'credit',
        'completed',
        'Casino House Earnings (Fan Bet Lost)',
        v_host_wallet_id,
        jsonb_build_object('bet_id', v_bet.id, 'fan_id', v_bet.fan_id)
      );

      v_total_house_profit := v_total_house_profit + v_bet.amount;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'winner', p_winner,
    'house_profit', v_total_house_profit
  );
END;
$$;
