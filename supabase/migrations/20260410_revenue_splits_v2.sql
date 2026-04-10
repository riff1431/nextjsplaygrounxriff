-- ══════════════════════════════════════════════════════════════════
-- Revenue Splits V2 — Complete Split Infrastructure
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Additional Split Profiles ──────────────────────────────
INSERT INTO split_profiles (name, creator_pct, platform_pct, processing_pct, affiliate_pct, other_pct)
VALUES
  ('Public Entry 0/100',      0,  100, 0, 0, 0),
  ('Public PerMin 25/75',    25,   75, 0, 0, 0),
  ('Private Entry 50/50',    50,   50, 0, 0, 0),
  ('Private PerMin 50/50',   50,   50, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- ─── 2. Additional Revenue Types ───────────────────────────────
INSERT INTO revenue_types (code, name) VALUES
  ('entry_fee_public',   'Public Room Entry Fee'),
  ('entry_fee_private',  'Private Room Entry Fee'),
  ('per_min_public',     'Public Room Per-Minute'),
  ('per_min_private',    'Private Room Per-Minute'),
  ('reaction',           'Reaction'),
  ('custom_request',     'Custom Request'),
  ('drop_unlock',        'Drop / Content Unlock'),
  ('suga_favorite',      'Suga4U Favorite'),
  ('competition_tip',    'Competition Tip'),
  ('confession_unlock',  'Confession Unlock'),
  ('confession_bid',     'Confession Bid'),
  ('confession_request', 'Confession Request'),
  ('confession_tip',     'Confession Tip'),
  ('bar_request',        'Bar Lounge Request'),
  ('bar_effect',         'Bar Lounge Effect'),
  ('bar_spin',           'Bar Lounge Spin'),
  ('xchat_session',      'X-Chat Session'),
  ('xchat_reaction',     'X-Chat Reaction'),
  ('flash_drop_unlock',  'Flash Drop Unlock'),
  ('flash_drop_request', 'Flash Drop Request'),
  ('suga_gift',          'Suga4U Gift'),
  ('suga_entry',         'Suga4U Entry Fee'),
  ('td_entry',           'Truth or Dare Entry'),
  ('td_tip',             'Truth or Dare Tip'),
  ('td_vote',            'Truth or Dare Vote'),
  ('session_tip',        'Session Tip'),
  ('session_reaction',   'Session Reaction'),
  ('session_custom_request', 'Session Custom Request'),
  ('session_entry',      'Session Entry Fee')
ON CONFLICT DO NOTHING;

-- ─── 3. Revenue Type → Split Profile Mapping ──────────────────
-- Helper: look up split profile IDs and revenue type IDs dynamically
DO $$
DECLARE
  sp_standard    BIGINT;
  sp_creator100  BIGINT;
  sp_pub_entry   BIGINT;
  sp_pub_min     BIGINT;
  sp_priv_entry  BIGINT;
  sp_priv_min    BIGINT;
BEGIN
  SELECT id INTO sp_standard   FROM split_profiles WHERE name = 'Standard 85/15' LIMIT 1;
  SELECT id INTO sp_creator100 FROM split_profiles WHERE name = 'Creator 100%'   LIMIT 1;
  SELECT id INTO sp_pub_entry  FROM split_profiles WHERE name = 'Public Entry 0/100'  LIMIT 1;
  SELECT id INTO sp_pub_min    FROM split_profiles WHERE name = 'Public PerMin 25/75'  LIMIT 1;
  SELECT id INTO sp_priv_entry FROM split_profiles WHERE name = 'Private Entry 50/50'  LIMIT 1;
  SELECT id INTO sp_priv_min   FROM split_profiles WHERE name = 'Private PerMin 50/50' LIMIT 1;

  -- Map all GLOBAL 85/15 types
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_standard, NOW()
  FROM revenue_types rt
  WHERE rt.code IN (
    'tip', 'gift', 'reaction', 'custom_request', 'drop_unlock',
    'confession_unlock', 'confession_bid', 'confession_request', 'confession_tip',
    'bar_request', 'bar_effect', 'bar_spin',
    'xchat_reaction', 'flash_drop_unlock', 'flash_drop_request',
    'suga_gift', 'td_tip', 'td_vote',
    'session_tip', 'session_reaction', 'session_custom_request'
  )
  ON CONFLICT DO NOTHING;

  -- Entry fees: public
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_pub_entry, NOW()
  FROM revenue_types rt WHERE rt.code = 'entry_fee_public'
  ON CONFLICT DO NOTHING;

  -- Entry fees: private
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_priv_entry, NOW()
  FROM revenue_types rt WHERE rt.code IN ('entry_fee_private', 'suga_entry', 'td_entry', 'session_entry')
  ON CONFLICT DO NOTHING;

  -- Per-minute: public
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_pub_min, NOW()
  FROM revenue_types rt WHERE rt.code = 'per_min_public'
  ON CONFLICT DO NOTHING;

  -- Per-minute: private
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_priv_min, NOW()
  FROM revenue_types rt WHERE rt.code = 'per_min_private'
  ON CONFLICT DO NOTHING;

  -- X-Chat session (metered) = private per-min
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_priv_min, NOW()
  FROM revenue_types rt WHERE rt.code = 'xchat_session'
  ON CONFLICT DO NOTHING;

  -- Suga4U Favorites = 100% creator
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_creator100, NOW()
  FROM revenue_types rt WHERE rt.code = 'suga_favorite'
  ON CONFLICT DO NOTHING;

  -- Competition tips = 100% creator
  INSERT INTO revenue_type_split_map (revenue_type_id, room_key, split_profile_id, effective_from)
  SELECT rt.id, NULL, sp_creator100, NOW()
  FROM revenue_types rt WHERE rt.code = 'competition_tip'
  ON CONFLICT DO NOTHING;
END $$;

-- ─── 4. Creator Earnings Ledger ────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_earnings_ledger (
  creator_id UUID PRIMARY KEY,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tips NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_reactions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_entry_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_per_min NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_drops NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gifts NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_custom_requests NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_competition_tips NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_suga_favorites NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_earned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creator_earnings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own earnings"
ON creator_earnings_ledger FOR SELECT
USING (auth.uid() = creator_id);

-- ─── 5. Session Entry Tickets ──────────────────────────────────
CREATE TABLE IF NOT EXISTS session_entry_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  entry_fee_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, fan_id)
);

ALTER TABLE session_entry_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can view own tickets"
ON session_entry_tickets FOR SELECT
USING (auth.uid() = fan_id);

-- ─── 6. Session Billing Records ───────────────────────────────
CREATE TABLE IF NOT EXISTS session_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  minute_number INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  creator_share NUMERIC(12,2) NOT NULL,
  platform_share NUMERIC(12,2) NOT NULL,
  billed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_session_fan
ON session_billing_records (session_id, fan_id);

ALTER TABLE session_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can view own billing"
ON session_billing_records FOR SELECT
USING (auth.uid() = fan_id);

-- ─── 7. Creator Invite Splits ──────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_invite_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  inviter_creator_id UUID NOT NULL,
  invited_creator_id UUID NOT NULL,
  invited_split_pct NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE creator_invite_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own invites"
ON creator_invite_splits FOR SELECT
USING (auth.uid() = inviter_creator_id OR auth.uid() = invited_creator_id);

-- ─── 8. Room Settings Billing Columns ──────────────────────────
ALTER TABLE room_settings
  ADD COLUMN IF NOT EXISTS public_cost_per_min NUMERIC DEFAULT 2,
  ADD COLUMN IF NOT EXISTS min_private_cost_per_min NUMERIC DEFAULT 5,
  ADD COLUMN IF NOT EXISTS billing_enabled BOOLEAN DEFAULT TRUE;

-- ─── 9. Platform System User ──────────────────────────────────
-- Insert a platform wallet entry if it doesn't exist yet.
-- The platform user ID should be configured as an environment variable.
-- We create a wallet for a well-known UUID that the app will reference.
-- NOTE: This UUID must match PLATFORM_USER_ID in the app's env vars.
-- The actual user creation should be done in Supabase Auth dashboard.
