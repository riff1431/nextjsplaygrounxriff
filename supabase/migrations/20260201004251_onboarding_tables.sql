-- Create onboarding-related tables
-- Run this migration to enable the profile setup flow

-- ============================================
-- 1. ACCOUNT TYPES (Sugar Daddy / Sugar Mommy)
-- ============================================
CREATE TABLE IF NOT EXISTS account_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'sugar_daddy', 'sugar_mommy'
    display_name TEXT NOT NULL,
    description TEXT,
    badge_icon TEXT, -- Icon name or emoji
    badge_color TEXT NOT NULL DEFAULT '#ec4899', -- Pink hex color
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table existed without them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_types' AND column_name = 'badge_icon') THEN
        ALTER TABLE account_types ADD COLUMN badge_icon TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_types' AND column_name = 'description') THEN
        ALTER TABLE account_types ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_types' AND column_name = 'is_active') THEN
        ALTER TABLE account_types ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_types' AND column_name = 'sort_order') THEN
        ALTER TABLE account_types ADD COLUMN sort_order INT DEFAULT 0;
    END IF;
END $$;

-- Insert default account types
INSERT INTO account_types (name, display_name, description, badge_icon, badge_color, sort_order) VALUES
('sugar_daddy', 'Sugar Daddy', 'Generous benefactor looking to spoil creators', '💎', '#3b82f6', 1),
('sugar_mommy', 'Sugar Mommy', 'Generous benefactor looking to pamper creators', '💖', '#ec4899', 2)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    badge_icon = EXCLUDED.badge_icon,
    badge_color = EXCLUDED.badge_color,
    sort_order = EXCLUDED.sort_order;


-- ============================================
-- 2. FAN MEMBERSHIP PLANS (Bronze, Silver, Gold)
-- ============================================
CREATE TABLE IF NOT EXISTS fan_membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'bronze', 'silver', 'gold'
    display_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    badge_color TEXT NOT NULL DEFAULT '#cd7f32',
    features JSONB DEFAULT '[]'::jsonb, -- Array of feature strings
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default fan membership plans
INSERT INTO fan_membership_plans (name, display_name, price, description, badge_color, features, sort_order) VALUES
('bronze', 'Bronze', 0, 'Free tier with basic features', '#cd7f32', '["Access to public content", "Basic messaging", "Standard support"]'::jsonb, 1),
('silver', 'Silver', 10, 'Enhanced features for active fans', '#c0c0c0', '["All Bronze features", "Priority messaging", "Exclusive content access", "Silver badge"]'::jsonb, 2),
('gold', 'Gold', 50, 'Premium experience with VIP perks', '#ffd700', '["All Silver features", "VIP support", "Early access to new features", "Gold badge", "Exclusive events"]'::jsonb, 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. CREATOR LEVEL PLANS (Rookie, Rising, Star, Elite)
-- ============================================
CREATE TABLE IF NOT EXISTS creator_level_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'rookie', 'rising', 'star', 'elite'
    display_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    post_unlock_count INT, -- Number of posts required to unlock (alternative to payment)
    description TEXT,
    badge_color TEXT NOT NULL DEFAULT '#22c55e',
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default creator level plans
INSERT INTO creator_level_plans (name, display_name, price, post_unlock_count, description, badge_color, features, sort_order) VALUES
('rookie', 'Rookie', 0, NULL, 'Starting your creator journey', '#22c55e', '["Basic creator tools", "Public profile", "Standard commission rate"]'::jsonb, 1),
('rising', 'Rising', 25, 10, 'Growing your audience', '#3b82f6', '["All Rookie features", "Enhanced analytics", "Priority listing", "Custom profile themes"]'::jsonb, 2),
('star', 'Star', 50, 25, 'Established creator with loyal fans', '#a855f7', '["All Rising features", "Reduced commission", "Featured placement", "Exclusive creator events"]'::jsonb, 3),
('elite', 'Elite', 100, 50, 'Top-tier creator with maximum perks', '#f59e0b', '["All Star features", "Lowest commission rate", "Personal account manager", "Premium badge", "VIP support"]'::jsonb, 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. KYC SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    id_type TEXT NOT NULL, -- 'passport', 'drivers_license', 'national_id'
    id_front_url TEXT NOT NULL,
    id_back_url TEXT, -- Optional for some ID types
    selfie_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. EXTEND PROFILES TABLE
-- ============================================
-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_type_id') THEN
        ALTER TABLE profiles ADD COLUMN account_type_id UUID REFERENCES account_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'fan_membership_id') THEN
        ALTER TABLE profiles ADD COLUMN fan_membership_id UUID REFERENCES fan_membership_plans(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'creator_level_id') THEN
        ALTER TABLE profiles ADD COLUMN creator_level_id UUID REFERENCES creator_level_plans(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_status') THEN
        ALTER TABLE profiles ADD COLUMN kyc_status TEXT DEFAULT 'not_required';
    END IF;
END $$;

-- ============================================
-- 6. RLS POLICIES
-- ============================================
-- Enable RLS on new tables
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_level_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Account types - everyone can read
DROP POLICY IF EXISTS "Anyone can view account types" ON account_types;
CREATE POLICY "Anyone can view account types" ON account_types
    FOR SELECT USING (true);

-- Fan membership plans - everyone can read
DROP POLICY IF EXISTS "Anyone can view fan membership plans" ON fan_membership_plans;
CREATE POLICY "Anyone can view fan membership plans" ON fan_membership_plans
    FOR SELECT USING (true);

-- Creator level plans - everyone can read
DROP POLICY IF EXISTS "Anyone can view creator level plans" ON creator_level_plans;
CREATE POLICY "Anyone can view creator level plans" ON creator_level_plans
    FOR SELECT USING (true);

-- KYC submissions - users can view and manage their own
DROP POLICY IF EXISTS "Users can view own KYC submissions" ON kyc_submissions;
CREATE POLICY "Users can view own KYC submissions" ON kyc_submissions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own KYC submissions" ON kyc_submissions;
CREATE POLICY "Users can create own KYC submissions" ON kyc_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own KYC submissions" ON kyc_submissions;
CREATE POLICY "Users can update own KYC submissions" ON kyc_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can do everything with KYC
DROP POLICY IF EXISTS "Admins can manage all KYC submissions" ON kyc_submissions;
CREATE POLICY "Admins can manage all KYC submissions" ON kyc_submissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can manage plans
DROP POLICY IF EXISTS "Admins can manage account types" ON account_types;
CREATE POLICY "Admins can manage account types" ON account_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can manage fan membership plans" ON fan_membership_plans;
CREATE POLICY "Admins can manage fan membership plans" ON fan_membership_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can manage creator level plans" ON creator_level_plans;
CREATE POLICY "Admins can manage creator level plans" ON creator_level_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- 7. CREATE KYC DOCUMENTS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents bucket
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'kyc-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
CREATE POLICY "Users can view their own KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
CREATE POLICY "Admins can view all KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc-documents' AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
