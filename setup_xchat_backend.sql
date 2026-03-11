-- X Chat Backend Schema

-- 1. Messages table
CREATE TABLE IF NOT EXISTS x_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id), -- Nullable for anon/simulated fans
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    lane TEXT NOT NULL, -- Priority, Paid, Free
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Queued', -- Queued, Answered, Refunded, Pinned
    creator_reply TEXT, -- Creator's reply to this message
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions table (metered fan-creator sessions)
CREATE TABLE IF NOT EXISTS x_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES profiles(id) NOT NULL,
    creator_id UUID REFERENCES profiles(id) NOT NULL,
    rate_per_min NUMERIC DEFAULT 2,
    status TEXT DEFAULT 'active', -- 'active', 'ended'
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_charged NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Requests table (fan-initiated chat requests)
CREATE TABLE IF NOT EXISTS x_chat_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES profiles(id) NOT NULL,
    fan_name TEXT NOT NULL,
    message TEXT DEFAULT 'Wants to chat',
    avatar_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reactions table (paid reactions/stickers)
CREATE TABLE IF NOT EXISTS x_chat_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES profiles(id) NOT NULL,
    reaction_type TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS
-- ============================================

-- x_chat_messages
ALTER TABLE x_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator manage messages" ON x_chat_messages FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

CREATE POLICY "Public insert messages" ON x_chat_messages FOR INSERT WITH CHECK (
    true
);

CREATE POLICY "Public view messages" ON x_chat_messages FOR SELECT USING (
    true
);

-- x_chat_sessions
ALTER TABLE x_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan manage own sessions" ON x_chat_sessions FOR ALL USING (
    auth.uid() = fan_id
);

CREATE POLICY "Creator view room sessions" ON x_chat_sessions FOR SELECT USING (
    auth.uid() = creator_id
);

CREATE POLICY "Public insert sessions" ON x_chat_sessions FOR INSERT WITH CHECK (
    true
);

-- x_chat_requests
ALTER TABLE x_chat_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan create requests" ON x_chat_requests FOR INSERT WITH CHECK (
    auth.uid() = fan_id
);

CREATE POLICY "Fan view own requests" ON x_chat_requests FOR SELECT USING (
    auth.uid() = fan_id
);

CREATE POLICY "Creator view room requests" ON x_chat_requests FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

CREATE POLICY "Creator update room requests" ON x_chat_requests FOR UPDATE USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

-- x_chat_reactions
ALTER TABLE x_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan insert reactions" ON x_chat_reactions FOR INSERT WITH CHECK (
    true
);

CREATE POLICY "Public view reactions" ON x_chat_reactions FOR SELECT USING (
    true
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_x_chat_messages_room ON x_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_x_chat_sessions_room ON x_chat_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_x_chat_sessions_fan ON x_chat_sessions(fan_id);
CREATE INDEX IF NOT EXISTS idx_x_chat_requests_room ON x_chat_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_x_chat_requests_fan ON x_chat_requests(fan_id);
CREATE INDEX IF NOT EXISTS idx_x_chat_reactions_room ON x_chat_reactions(room_id);
