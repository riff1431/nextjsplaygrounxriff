-- Truth or Dare Backend Schema

-- 1. Games table (one per room, singleton state)
CREATE TABLE IF NOT EXISTS truth_dare_games (
    room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    current_prompt JSONB, -- { id, label, tier, source, etc. }
    votes_tier JSONB DEFAULT '{"bronze": 0, "silver": 0, "gold": 0}',
    votes_tv JSONB DEFAULT '{"truth": 0, "dare": 0}',
    is_double_dare_armed BOOLEAN DEFAULT FALSE,
    replay_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INT DEFAULT 0
);

-- 2. Queue table
CREATE TABLE IF NOT EXISTS truth_dare_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- TIER_PURCHASE, TIP, etc.
    fan_name TEXT,
    amount NUMERIC,
    meta JSONB DEFAULT '{}',
    is_served BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Camera Slots (10 slots)
CREATE TABLE IF NOT EXISTS truth_dare_camera_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    fan_name TEXT,
    is_on_camera BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, fan_id)
);

-- RLS
ALTER TABLE truth_dare_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE truth_dare_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE truth_dare_camera_slots ENABLE ROW LEVEL SECURITY;

-- Policies for truth_dare_games
CREATE POLICY "Public games view" ON truth_dare_games FOR SELECT USING (true);
CREATE POLICY "Creators update games" ON truth_dare_games FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
-- Allow authenticated insert for creating the game state if it lacks
CREATE POLICY "Auth insert games" ON truth_dare_games FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Policies for truth_dare_queue
CREATE POLICY "Creator view queue" ON truth_dare_queue FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
CREATE POLICY "Fans insert queue" ON truth_dare_queue FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator update queue" ON truth_dare_queue FOR UPDATE USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

-- Policies for truth_dare_camera_slots
CREATE POLICY "Public view slots" ON truth_dare_camera_slots FOR SELECT USING (true);
CREATE POLICY "Creator manage slots" ON truth_dare_camera_slots FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
