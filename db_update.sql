-- Create unlockable_items table
CREATE TABLE IF NOT EXISTS unlockable_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type TEXT NOT NULL, -- 'badge', 'sticker', 'bg', 'feature'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_unlocks table
CREATE TABLE IF NOT EXISTS user_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES unlockable_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- Add cover_url to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cover_url') THEN
        ALTER TABLE profiles ADD COLUMN cover_url TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE unlockable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies for unlockable_items (Public read, admin write - assuming manual admin for now)
DROP POLICY IF EXISTS "Public items are viewable by everyone" ON unlockable_items;
CREATE POLICY "Public items are viewable by everyone" ON unlockable_items FOR SELECT USING (true);

-- Policies for user_unlocks
DROP POLICY IF EXISTS "Users can view their own unlocks" ON user_unlocks;
DROP POLICY IF EXISTS "Public user unlocks view" ON user_unlocks;
CREATE POLICY "Public user unlocks view" ON user_unlocks FOR SELECT USING (true);

-- Insert some sample items if they don't exist
INSERT INTO unlockable_items (name, description, type)
SELECT 'Early Adopter', 'Joined during the beta phase', 'badge'
WHERE NOT EXISTS (SELECT 1 FROM unlockable_items WHERE name = 'Early Adopter');

INSERT INTO unlockable_items (name, description, type)
SELECT 'Trendsetter', 'Created a popular room', 'badge'
WHERE NOT EXISTS (SELECT 1 FROM unlockable_items WHERE name = 'Trendsetter');
