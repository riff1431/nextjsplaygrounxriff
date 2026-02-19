-- Fix relationships and RLS for Bar Lounge visibility

-- 1. Ensure rooms.host_id has a foreign key to profiles for easy joining
-- This allows: .select('*, profiles:host_id(...)')
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'rooms_host_id_fkey_profiles') THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_host_id_fkey_profiles 
        FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure RLS allows everyone to view live rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view live rooms" ON rooms;
CREATE POLICY "Anyone can view live rooms" ON rooms
    FOR SELECT USING (status = 'live');

-- 3. Ensure profiles are visible (usually public, but good to ensure)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);
