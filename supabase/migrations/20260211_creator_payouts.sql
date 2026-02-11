-- =========================
-- 1) ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE revenue_event_status AS ENUM ('pending','succeeded','failed','refunded','disputed','reversed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE split_beneficiary_type AS ENUM ('creator','platform','processor','affiliate','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_type AS ENUM ('live_room','competition','messaging','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_item_status AS ENUM ('ready','hold','paid','partial','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================
-- 2) REVENUE TYPES + SPLIT PROFILES
-- =========================
CREATE TABLE IF NOT EXISTS revenue_types (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS split_profiles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  creator_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  platform_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  processing_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  affiliate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  other_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  CONSTRAINT split_profiles_total_pct CHECK (
    (creator_pct + platform_pct + processing_pct + affiliate_pct + other_pct) = 100.00
  )
);

-- Map revenue type + optional room to a split profile (supports future changes)
CREATE TABLE IF NOT EXISTS revenue_type_split_map (
  id BIGSERIAL PRIMARY KEY,
  revenue_type_id BIGINT NOT NULL REFERENCES revenue_types(id) ON DELETE CASCADE,
  room_key TEXT, -- optional: 'truth_or_dare', 'confessions', etc.
  split_profile_id BIGINT NOT NULL REFERENCES split_profiles(id) ON DELETE RESTRICT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rtsm_lookup
ON revenue_type_split_map (revenue_type_id, room_key, effective_from);

-- =========================
-- 3) REVENUE EVENTS (IMMUTABLE LEDGER)
-- =========================
CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurred_at TIMESTAMPTZ NOT NULL,
  fan_user_id UUID NOT NULL, -- Assumes users table exists
  creator_user_id UUID,
  revenue_type_id BIGINT NOT NULL REFERENCES revenue_types(id),
  room_key TEXT,
  competition_id UUID,
  subscription_id UUID,
  currency TEXT NOT NULL DEFAULT 'USD',
  gross_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2),
  payment_provider TEXT NOT NULL,
  payment_intent_id TEXT NOT NULL,
  status revenue_event_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_payment UNIQUE (payment_provider, payment_intent_id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_creator_time
ON revenue_events (creator_user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_revenue_events_status_time
ON revenue_events (status, occurred_at);

-- =========================
-- 4) SPLITS (WHO GETS WHAT)
-- =========================
CREATE TABLE IF NOT EXISTS revenue_splits (
  id BIGSERIAL PRIMARY KEY,
  revenue_event_id UUID NOT NULL REFERENCES revenue_events(id) ON DELETE CASCADE,
  beneficiary_type split_beneficiary_type NOT NULL,
  beneficiary_id UUID, -- creator id when beneficiary_type='creator'
  split_profile_id BIGINT NOT NULL REFERENCES split_profiles(id) ON DELETE RESTRICT,
  pct NUMERIC(5,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_splits_event
ON revenue_splits (revenue_event_id);

CREATE INDEX IF NOT EXISTS idx_revenue_splits_creator
ON revenue_splits (beneficiary_type, beneficiary_id);

-- =========================
-- 5) SESSION TRACKING (TIME SPENT)
-- =========================
CREATE TABLE IF NOT EXISTS creator_activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL,
  room_key TEXT,
  session_type session_type NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sessions_creator_time
ON creator_activity_sessions (creator_user_id, started_at);

CREATE TABLE IF NOT EXISTS revenue_event_sessions (
  revenue_event_id UUID NOT NULL REFERENCES revenue_events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES creator_activity_sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (revenue_event_id, session_id)
);

-- =========================
-- 6) PAYOUT BATCHES (PAYING OUT IS SEPARATE FROM EARNING)
-- =========================
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS payout_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status payout_item_status NOT NULL DEFAULT 'ready',
  paid_at TIMESTAMPTZ,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_batch_creator UNIQUE (batch_id, creator_user_id)
);

-- =========================
-- 7) SEED DATA
-- =========================
INSERT INTO revenue_types (code, name) VALUES
('subscription','Subscription'),
('tip','Tip'),
('gift','Gift'),
('room_unlock','Room Unlock'),
('competition_entry','Competition Entry'),
('adjustment','Adjustment')
ON CONFLICT do nothing;

INSERT INTO split_profiles (name, creator_pct, platform_pct, processing_pct, affiliate_pct, other_pct)
VALUES
('Standard 85/15', 85, 15, 0, 0, 0),
('Creator 100%', 100, 0, 0, 0, 0),
('Competition 90/10', 90, 10, 0, 0, 0)
ON CONFLICT do nothing;
