-- Flash Drops Backend Schema

CREATE TABLE IF NOT EXISTS flash_drops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL, -- "Photo Set", "Video", etc.
    rarity TEXT NOT NULL, -- "Common", "Rare", etc.
    price NUMERIC DEFAULT 0,
    ends_at TIMESTAMPTZ,
    status TEXT DEFAULT 'Scheduled', -- "Scheduled", "Live", "Ended"
    inventory_total INT DEFAULT 0,
    inventory_remaining INT DEFAULT 0,
    gross_preview NUMERIC DEFAULT 0, -- Cache for ease, or calculate via joins
    unlocks_preview INT DEFAULT 0,   -- Cache for ease
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flash_drop_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drop_id UUID REFERENCES flash_drops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id), -- Nullable for anon/sim
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE flash_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creator manage drops" ON flash_drops FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

CREATE POLICY "Public view active drops" ON flash_drops FOR SELECT USING (
    status = 'Live' OR 
    (auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)) -- Creator sees all
);

CREATE POLICY "Creator view unlocks" ON flash_drop_unlocks FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = (SELECT room_id FROM flash_drops WHERE id = drop_id))
);

CREATE POLICY "Public insert unlocks" ON flash_drop_unlocks FOR INSERT WITH CHECK (
    true 
);
