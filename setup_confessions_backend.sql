-- Confessions Backend Schema

CREATE TABLE IF NOT EXISTS confessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    teaser TEXT, -- blurred preview text
    content TEXT, -- full unlocked text
    media_url TEXT, -- optional unlocked media
    type TEXT NOT NULL, -- Text, Voice, Video
    tier TEXT NOT NULL, -- Soft, Spicy, Dirty, Dark, Forbidden
    price NUMERIC NOT NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Published, Archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;

-- Policies for confessions
-- Creator (Host) can do everything
CREATE POLICY "Creator manage confessions" ON confessions FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

-- Public (Fans) can view PUBLISHED items (metadata only usually, but simplified here)
-- In a real app, content/media_url would be hidden by column-level security or separate table.
-- For now, we allow SELECT on everything if Published, but frontend handles blurring.
-- A more secure approach is a separate view or function, but for this MVP, we'll rely on the API to filter fields for fans if needed,
-- OR just trust the frontend for 'teaser' vs 'content' display since we aren't building the Fan Purchase flow fully yet.
CREATE POLICY "Public view published" ON confessions FOR SELECT USING (
    status = 'Published'
);
