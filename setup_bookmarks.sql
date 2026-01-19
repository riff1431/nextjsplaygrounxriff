-- Create 'post_bookmarks' table
CREATE TABLE IF NOT EXISTS post_bookmarks (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- Enable RLS
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bookmarks"
ON post_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add bookmarks"
ON post_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
ON post_bookmarks FOR DELETE
USING (auth.uid() = user_id);
