-- 1. Add type column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'truth-or-dare';

-- 2. Create table for global Bar Lounge configuration
CREATE TABLE IF NOT EXISTS public.admin_bar_config (
    id int PRIMARY KEY CHECK (id = 1), -- Singleton row
    vip_price numeric DEFAULT 150,
    ultra_vip_price numeric DEFAULT 400,
    spin_odds jsonb DEFAULT '[
        {"id": "o1", "label": "Pinned Message (1 min)", "odds": 30, "note": "Fan’s next message pins above chat."},
        {"id": "o2", "label": "Priority Cam (2 min)", "odds": 20, "note": "Fan badge glows; creator sees first."},
        {"id": "o3", "label": "VIP Booth Discount $50", "odds": 12, "note": "Applies to VIP Booth unlock."},
        {"id": "o4", "label": "Free +2 Minutes", "odds": 18, "note": "Adds 2 minutes of free time."},
        {"id": "o5", "label": "Creator Dares You", "odds": 10, "note": "Creator can send a dare prompt."},
        {"id": "o6", "label": "Try Again", "odds": 10, "note": "No perk, but creator shoutout."}
    ]'::jsonb,
    menu_items jsonb DEFAULT '[
        {"id": "d1", "name": "Whiskey Shot", "price": 8, "icon": "🥃", "tone": "red", "special": null},
        {"id": "d2", "name": "Neon Martini", "price": 25, "icon": "🍸", "tone": "pink", "special": null},
        {"id": "d3", "name": "Blue Lagoon", "price": 25, "icon": "🧊", "tone": "blue", "special": null},
        {"id": "d4", "name": "Champagne Bottle", "price": 100, "icon": "🍾", "tone": "yellow", "special": "champagne"},
        {"id": "d5", "name": "VIP Bottle", "price": 250, "icon": "👑", "tone": "purple", "special": "vipbottle"}
    ]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS and Policies for admin_bar_config
ALTER TABLE public.admin_bar_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_bar_config' AND policyname = 'Admin full access'
    ) THEN
        CREATE POLICY "Admin full access" ON public.admin_bar_config
            FOR ALL
            USING ( (auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' )
            WITH CHECK ( (auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_bar_config' AND policyname = 'Public read access'
    ) THEN
        CREATE POLICY "Public read access" ON public.admin_bar_config
            FOR SELECT
            USING ( true );
    END IF;
END $$;

-- Seed default config
INSERT INTO public.admin_bar_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- 3. Create revenue_events table for real-time updates and transaction logs
CREATE TABLE IF NOT EXISTS public.revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_key UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    item_type TEXT NOT NULL, -- 'drink', 'vip', 'spin'
    item_label TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for revenue_events
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'revenue_events' AND policyname = 'Public read access'
    ) THEN
        CREATE POLICY "Public read access" ON public.revenue_events FOR SELECT USING (true);
    END IF;
END $$;

-- 4. RPC: purchase_bar_item
CREATE OR REPLACE FUNCTION purchase_bar_item(p_room_id UUID, p_item_type TEXT, p_item_label TEXT, p_amount NUMERIC, p_metadata JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check balance (optional depending on if deduct_balance handles it, but good to be safe)
    -- deduct_balance raises exception if insufficient
    PERFORM deduct_balance(auth.uid(), p_amount);
    
    -- Record event
    INSERT INTO revenue_events (room_key, sender_id, amount, item_type, item_label, metadata)
    VALUES (p_room_id, auth.uid(), p_amount, p_item_type, p_item_label, p_metadata);
END;
$$;


-- 5. RPC: spin_bottle_game
CREATE OR REPLACE FUNCTION spin_bottle_game(p_room_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_odds JSONB;
    v_target FLOAT;
    v_cumulative FLOAT := 0;
    v_roll FLOAT;
    v_outcome JSONB;
    v_item JSONB;
BEGIN
    -- Deduct Balance
    PERFORM deduct_balance(auth.uid(), p_amount);
    
    -- Get Odds from Config
    SELECT spin_odds INTO v_odds FROM admin_bar_config WHERE id = 1;
    
    -- Random Logic
    v_roll := random() * 100;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_odds)
    LOOP
        v_cumulative := v_cumulative + (v_item->>'odds')::FLOAT;
        IF v_roll <= v_cumulative THEN
            v_outcome := v_item;
            EXIT;
        END IF;
    END LOOP;
    
    -- Fallback safety
    IF v_outcome IS NULL THEN
        v_outcome := v_odds->0;
    END IF;

    -- Record Event
    INSERT INTO revenue_events (room_key, sender_id, amount, item_type, item_label, metadata)
    VALUES (p_room_id, auth.uid(), p_amount, 'spin', v_outcome->>'label', jsonb_build_object('outcome', v_outcome));

    RETURN jsonb_build_object('success', true, 'outcome', v_outcome);
END;
$$;
