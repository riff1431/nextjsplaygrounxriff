-- 1. Create 'comments' table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on 'comments'
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for 'comments'
CREATE POLICY "Public comments are viewable by everyone" 
ON comments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert comments" 
ON comments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own comments" 
ON comments FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Ensure 'likes' table supports posts
-- We assume 'likes' has user_id and then a target. 
-- If 'likes' strictly references rooms, we might need a polymorphic approach or a new table.
-- Let's check if we can add 'post_id' to likes or use a 'target_id' + 'target_type' approach.
-- For simplicity and safety, let's create 'post_likes' if 'likes' is messy, 
-- or try to add columns if they don't exist.
-- Given I can't easily see the current schema, I'll create 'post_likes' to be safe and separate.

CREATE TABLE IF NOT EXISTS post_likes (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public post_likes viewable" 
ON post_likes FOR SELECT 
USING (true);

CREATE POLICY "Auth users can toggle likes" 
ON post_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth users can remove likes" 
ON post_likes FOR DELETE 
USING (auth.uid() = user_id);
