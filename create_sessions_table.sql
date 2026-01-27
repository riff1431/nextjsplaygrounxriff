-- Create table for Session History
CREATE TABLE IF NOT EXISTS truth_dare_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    price NUMERIC DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' -- 'active', 'ended'
);

-- RLS
ALTER TABLE truth_dare_sessions ENABLE ROW LEVEL SECURITY;

-- Creator can view their own sessions
CREATE POLICY "Creators view own sessions" ON truth_dare_sessions
    FOR SELECT USING (
        auth.uid() IN (SELECT host_id FROM rooms WHERE id = truth_dare_sessions.room_id)
    );

-- Creator can insert sessions
CREATE POLICY "Creators insert sessions" ON truth_dare_sessions
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT host_id FROM rooms WHERE id = truth_dare_sessions.room_id)
    );
