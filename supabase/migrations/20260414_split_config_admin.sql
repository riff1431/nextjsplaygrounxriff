-- ══════════════════════════════════════════════════════════════════
-- Platform Split Config — Admin-Manageable Revenue Split Rules
-- ══════════════════════════════════════════════════════════════════
-- This table stores all revenue split configuration as DB rows
-- so admins can update them without code deploys.
-- The app reads from this table at runtime (with a short TTL cache).
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_split_config (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    split_key        TEXT NOT NULL UNIQUE,
    label            TEXT NOT NULL,
    creator_pct      NUMERIC(5,2) NOT NULL CHECK (creator_pct >= 0 AND creator_pct <= 100),
    platform_pct     NUMERIC(5,2) NOT NULL CHECK (platform_pct >= 0 AND platform_pct <= 100),
    entry_fee        NUMERIC(12,2) DEFAULT NULL,   -- flat entry fee (e.g. $10 public)
    cost_per_min     NUMERIC(12,2) DEFAULT NULL,   -- per-minute billing rate
    min_charge       NUMERIC(12,2) DEFAULT NULL,   -- minimum charge amount
    is_editable      BOOLEAN NOT NULL DEFAULT TRUE,
    description      TEXT DEFAULT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Validate that creator_pct + platform_pct = 100
ALTER TABLE platform_split_config
    ADD CONSTRAINT pct_sum_100
    CHECK (creator_pct + platform_pct = 100);

-- RLS
ALTER TABLE platform_split_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage split config"
ON platform_split_config
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow public read (so disclosure UIs can fetch without auth)
CREATE POLICY "Anyone can read split config"
ON platform_split_config
FOR SELECT
USING (TRUE);

-- ─── Seed Initial Rows from PRD ────────────────────────────────────

INSERT INTO platform_split_config
    (split_key, label, creator_pct, platform_pct, entry_fee, cost_per_min, min_charge, is_editable, description)
VALUES
    (
        'GLOBAL',
        'Global — Tips, Reactions, Gifts, Drops, Requests, Bids',
        85, 15,
        NULL, NULL, NULL,
        TRUE,
        'Default split applied to all tips, reactions, gifts, flash drops, custom requests, bids, and confessions.'
    ),
    (
        'PUBLIC_ENTRY',
        'Public Room — Entry Fee',
        0, 100,
        10.00, NULL, NULL,
        TRUE,
        'Public room entry ticket. 100% goes to the platform. Fixed $10 per session ticket (valid 24h or 1 session).'
    ),
    (
        'PUBLIC_PER_MIN',
        'Public Room — Per-Minute Billing',
        25, 75,
        NULL, 2.00, NULL,
        TRUE,
        'Per-minute billing inside a public room. Creator receives 25%, platform receives 75%. Rate: $2/min.'
    ),
    (
        'PRIVATE_ENTRY',
        'Private Room — Entry Fee',
        50, 50,
        NULL, NULL, 20.00,
        TRUE,
        'Private room entry ticket. 50/50 split. Minimum charge of $20.'
    ),
    (
        'PRIVATE_PER_MIN',
        'Private Room — Per-Minute Billing',
        50, 50,
        NULL, 5.00, 5.00,
        TRUE,
        'Per-minute billing inside a private room. 50/50 split. Minimum rate of $5/min.'
    ),
    (
        'SUGA4U_FAVORITES',
        'Suga4U — Creator Favorites',
        100, 0,
        NULL, NULL, NULL,
        FALSE,
        'Suga4U Favorites interactions go 100% to the creator. This is locked per the PRD.'
    ),
    (
        'COMPETITION_TIPS',
        'Competition — Tips',
        100, 0,
        NULL, NULL, NULL,
        FALSE,
        'Competition tips go 100% to the creator. This is locked per the PRD.'
    )
ON CONFLICT (split_key) DO UPDATE SET
    label        = EXCLUDED.label,
    creator_pct  = EXCLUDED.creator_pct,
    platform_pct = EXCLUDED.platform_pct,
    entry_fee    = EXCLUDED.entry_fee,
    cost_per_min = EXCLUDED.cost_per_min,
    min_charge   = EXCLUDED.min_charge,
    description  = EXCLUDED.description;

-- Index for fast lookup by key
CREATE INDEX IF NOT EXISTS idx_platform_split_config_key ON platform_split_config (split_key);
