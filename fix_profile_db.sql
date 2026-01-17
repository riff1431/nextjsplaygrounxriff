
-- 1. Ensure cover_url exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cover_url') THEN
        ALTER TABLE profiles ADD COLUMN cover_url text;
    END IF;
END $$;

-- 2. Check/Fix RLS for Profiles
-- Ensure Users can UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING ( auth.uid() = id );

-- Ensure Users can INSERT their own profile (upsert needs insert permission)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- Ensure Users can SELECT their own profile (and others if public)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING ( true );
