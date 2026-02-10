
-- Enable storage extension if not already (usually enabled by default)

-- 1. Create 'avatars' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'covers' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies for 'avatars'

-- Public Read
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Authenticated Upload
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
CREATE POLICY "Auth Upload Avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- User Update Own
DROP POLICY IF EXISTS "User Update Own Avatars" ON storage.objects;
CREATE POLICY "User Update Own Avatars"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- User Delete Own
DROP POLICY IF EXISTS "User Delete Own Avatars" ON storage.objects;
CREATE POLICY "User Delete Own Avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );


-- 4. Policies for 'covers'

-- Public Read
DROP POLICY IF EXISTS "Public Access Covers" ON storage.objects;
CREATE POLICY "Public Access Covers"
ON storage.objects FOR SELECT
USING ( bucket_id = 'covers' );

-- Authenticated Upload
DROP POLICY IF EXISTS "Auth Upload Covers" ON storage.objects;
CREATE POLICY "Auth Upload Covers"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'covers' AND auth.role() = 'authenticated' );

-- User Update Own
DROP POLICY IF EXISTS "User Update Own Covers" ON storage.objects;
CREATE POLICY "User Update Own Covers"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'covers' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'covers' AND auth.uid() = owner );

-- User Delete Own
DROP POLICY IF EXISTS "User Delete Own Covers" ON storage.objects;
CREATE POLICY "User Delete Own Covers"
ON storage.objects FOR DELETE
USING ( bucket_id = 'covers' AND auth.uid() = owner );
