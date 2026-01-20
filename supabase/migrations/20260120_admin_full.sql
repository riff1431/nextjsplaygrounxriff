-- CLEAN SLATE (Use with caution: Drops admin tables to rebuild schema)
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

-- Admin Settings (Global Config)
CREATE TABLE admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings" ON admin_settings
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update settings" ON admin_settings
    FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert settings" ON admin_settings
    FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Audit Logs (Immutable)
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
    
CREATE POLICY "Admins can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Transactions (Central Ledger)
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reference_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all transactions" ON transactions
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Payouts (Creator Batches)
CREATE TABLE payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('processing', 'paid', 'failed', 'hold')) DEFAULT 'processing',
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own payouts" ON payouts
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Admins view all payouts" ON payouts
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins manage payouts" ON payouts
    FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Refunds
CREATE TABLE refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('requested', 'approved', 'declined', 'dispute')) DEFAULT 'requested',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own refunds" ON refunds
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM transactions WHERE id = refunds.transaction_id
        )
    );

CREATE POLICY "Admins view all refunds" ON refunds
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins manage refunds" ON refunds
    FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Reports (Moderation)
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id),
    target_id UUID,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all reports" ON reports
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins manage reports" ON reports
    FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Seed Initial Settings
INSERT INTO admin_settings (key, value, description)
VALUES 
    ('global_pricing', '{"entry_fee": 10, "free_minutes": 5, "rate_per_minute": 2}', 'Default room pricing configuration'),
    ('feature_flags', '{"maintenance_mode": false, "beta_features": true}', 'System wide feature toggles')
ON CONFLICT (key) DO NOTHING;
