-- ══════════════════════════════════════════════════════════════════════
-- CREATOR EARNINGS SEED DATA
-- Run this in Supabase SQL Editor to populate test earnings data.
-- Replace the UUIDs below with real values from your database.
-- ══════════════════════════════════════════════════════════════════════

-- HOW TO USE:
-- 1. Find a creator user ID: SELECT id FROM auth.users LIMIT 5;
-- 2. Find a fan user ID: SELECT id FROM auth.users WHERE id != <creator_id> LIMIT 5;  
-- 3. Find a room ID: SELECT id, title FROM rooms LIMIT 5;
-- 4. Replace the variables below and run.

DO $$
DECLARE
  -- !! REPLACE THESE WITH REAL IDs FROM YOUR DATABASE !!
  v_creator_id    UUID := (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1);
  v_fan_id        UUID := (SELECT id FROM profiles WHERE role = 'fan' LIMIT 1);
  v_room_id       TEXT := (SELECT id::text FROM rooms LIMIT 1);

  -- Revenue type IDs  
  v_tip_id        BIGINT;
  v_reaction_id   BIGINT;
  v_entry_id      BIGINT;
  v_request_id    BIGINT;
  v_gift_id       BIGINT;
  v_vote_id       BIGINT;
  v_drop_id       BIGINT;

  -- Split profile IDs
  v_split_85_id   BIGINT;
  v_split_100_id  BIGINT;

  -- Event IDs
  v_event_id      UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_tip_id      FROM revenue_types WHERE code = 'tip' LIMIT 1;
  SELECT id INTO v_reaction_id FROM revenue_types WHERE code = 'session_reaction' LIMIT 1;
  SELECT id INTO v_entry_id    FROM revenue_types WHERE code = 'entry_fee_private' LIMIT 1;
  SELECT id INTO v_request_id  FROM revenue_types WHERE code = 'session_custom_request' LIMIT 1;
  SELECT id INTO v_gift_id     FROM revenue_types WHERE code = 'suga_gift' LIMIT 1;
  SELECT id INTO v_vote_id     FROM revenue_types WHERE code = 'td_vote' LIMIT 1;
  SELECT id INTO v_drop_id     FROM revenue_types WHERE code = 'drop_unlock' LIMIT 1;
  SELECT id INTO v_split_85_id  FROM split_profiles WHERE name = 'Standard 85/15' LIMIT 1;
  SELECT id INTO v_split_100_id FROM split_profiles WHERE name = 'Creator 100%' LIMIT 1;

  IF v_creator_id IS NULL OR v_fan_id IS NULL THEN
    RAISE NOTICE 'No creator or fan found. Make sure you have users with role = creator and role = fan.';
    RETURN;
  END IF;

  -- ── Insert revenue events for current month ──────────────────────

  -- 1. Tip $20 (85% creator = $17)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '2 hours', v_fan_id, v_creator_id, v_tip_id, v_room_id, 'USD', 20.00, 17.00, 'wallet', 'seed_tip_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 17.00),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 3.00);

  -- 2. Reaction $5 (85%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '3 hours', v_fan_id, v_creator_id, v_reaction_id, v_room_id, 'USD', 5.00, 4.25, 'wallet', 'seed_reaction_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 4.25),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 0.75);

  -- 3. Entry Fee $15 (50%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '5 hours', v_fan_id, v_creator_id, v_entry_id, v_room_id, 'USD', 15.00, 7.50, 'wallet', 'seed_entry_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 50, 7.50),
         (v_event_id, 'platform', NULL, v_split_85_id, 50, 7.50);

  -- 4. Custom Request $50 (85%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '1 day', v_fan_id, v_creator_id, v_request_id, v_room_id, 'USD', 50.00, 42.50, 'wallet', 'seed_request_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 42.50),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 7.50);

  -- 5. Gift $30 (85%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '2 days', v_fan_id, v_creator_id, COALESCE(v_gift_id, v_tip_id), v_room_id, 'USD', 30.00, 25.50, 'wallet', 'seed_gift_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 25.50),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 4.50);

  -- 6. Vote $10 (85%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '3 days', v_fan_id, v_creator_id, COALESCE(v_vote_id, v_tip_id), v_room_id, 'USD', 10.00, 8.50, 'wallet', 'seed_vote_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 8.50),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 1.50);

  -- 7. Tip $100 (85%) — 3 days ago
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '3 days 2 hours', v_fan_id, v_creator_id, v_tip_id, v_room_id, 'USD', 100.00, 85.00, 'wallet', 'seed_tip_2', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 85.00),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 15.00);

  -- 8. Drop Unlock $25 (85%)
  INSERT INTO revenue_events (occurred_at, fan_user_id, creator_user_id, revenue_type_id, room_key, currency, gross_amount, net_amount, payment_provider, payment_intent_id, status)
  VALUES (NOW() - INTERVAL '5 days', v_fan_id, v_creator_id, COALESCE(v_drop_id, v_tip_id), v_room_id, 'USD', 25.00, 21.25, 'wallet', 'seed_drop_1', 'succeeded')
  RETURNING id INTO v_event_id;
  INSERT INTO revenue_splits (revenue_event_id, beneficiary_type, beneficiary_id, split_profile_id, pct, amount)
  VALUES (v_event_id, 'creator', v_creator_id, v_split_85_id, 85, 21.25),
         (v_event_id, 'platform', NULL, v_split_85_id, 15, 3.75);

  -- ── Now upsert creator_earnings_ledger ──────────────────────────
  INSERT INTO creator_earnings_ledger (
    creator_id, total_earned, total_tips, total_reactions,
    total_entry_fees, total_per_min, total_drops, total_gifts,
    total_custom_requests, total_competition_tips, total_suga_favorites,
    pending_payout, last_earned_at, updated_at
  )
  VALUES (
    v_creator_id,
    211.50,  -- total: 17+4.25+7.50+42.50+25.50+8.50+85+21.25
    102.00,  -- tips: 17 + 85
    4.25,    -- reactions
    7.50,    -- entry fees
    0,       -- per-min
    21.25,   -- drops
    25.50,   -- gifts
    42.50,   -- requests
    0,       -- competition
    0,       -- suga
    211.50,  -- pending payout
    NOW(),
    NOW()
  )
  ON CONFLICT (creator_id) DO UPDATE SET
    total_earned = creator_earnings_ledger.total_earned + EXCLUDED.total_earned,
    total_tips = creator_earnings_ledger.total_tips + EXCLUDED.total_tips,
    total_reactions = creator_earnings_ledger.total_reactions + EXCLUDED.total_reactions,
    total_entry_fees = creator_earnings_ledger.total_entry_fees + EXCLUDED.total_entry_fees,
    total_drops = creator_earnings_ledger.total_drops + EXCLUDED.total_drops,
    total_gifts = creator_earnings_ledger.total_gifts + EXCLUDED.total_gifts,
    total_custom_requests = creator_earnings_ledger.total_custom_requests + EXCLUDED.total_custom_requests,
    pending_payout = creator_earnings_ledger.pending_payout + EXCLUDED.pending_payout,
    last_earned_at = NOW(),
    updated_at = NOW();

  RAISE NOTICE 'SUCCESS: Seeded earnings for creator % from fan %', v_creator_id, v_fan_id;
END $$;
