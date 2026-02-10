
-- 1. Create 'posts' table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_type TEXT CHECK (content_type IN ('text', 'image', 'video')) NOT NULL,
    caption TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on 'posts'
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for 'posts'

-- Everyone can view posts
CREATE POLICY "Public posts are viewable by everyone" 
ON posts FOR SELECT 
USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" 
ON posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" 
ON posts FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON posts FOR DELETE 
USING (auth.uid() = user_id);


-- 4. Setup Storage Bucket 'post-media'
-- Note: inserting into storage.buckets only works if you have permissions or via dashboard.
-- Typically strictly better to do via Dashboard, but we can try SQL if extension is enabled.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies for 'post-media'
-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'post-media' );

-- Allow authenticated uploads
-- Enforcing folder structure user_id/filename is good practice
CREATE POLICY "Authenticated users can upload media" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'post-media' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own files
CREATE POLICY "Users can update their own media" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'post-media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own media" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'post-media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
