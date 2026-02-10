-- Competition Manager Backend Schema (Updated)

-- 1. Competitions Table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'New Competition',
    entry_fee NUMERIC DEFAULT 50,
    status TEXT DEFAULT 'SETUP', -- SETUP, VOTING, LIVE, ENDED
    phase_end_time TIMESTAMPTZ,
    fan_count_paid INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Topics Table (for voting)
CREATE TABLE IF NOT EXISTS competition_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    votes INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Participants Table (Creators in the competition)
CREATE TABLE IF NOT EXISTS competition_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id), -- Nullable for bot/simulated, set for real
    name TEXT NOT NULL,
    avatar_url TEXT,
    votes INT DEFAULT 0,
    tips NUMERIC DEFAULT 0,
    badge TEXT,
    is_ready BOOLEAN DEFAULT FALSE,
    entered_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- Competitions
CREATE POLICY "Public view competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Creator manage competitions" ON competitions FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

-- Topics
CREATE POLICY "Public view topics" ON competition_topics FOR SELECT USING (true);
CREATE POLICY "Creator manage topics" ON competition_topics FOR ALL USING (
    auth.uid() IN (
        SELECT r.host_id 
        FROM rooms r 
        JOIN competitions c ON c.room_id = r.id 
        WHERE c.id = competition_id
    )
);

-- Participants
CREATE POLICY "Public view participants" ON competition_participants FOR SELECT USING (true);
CREATE POLICY "Creator manage participants" ON competition_participants FOR ALL USING (
    auth.uid() IN (
        SELECT r.host_id 
        FROM rooms r 
        JOIN competitions c ON c.room_id = r.id 
        WHERE c.id = competition_id
    )
);
CREATE POLICY "User manage self" ON competition_participants FOR ALL USING (
    auth.uid() = user_id
);
