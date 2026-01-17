-- X Chat Backend Schema

CREATE TABLE IF NOT EXISTS x_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id), -- Nullable for anon/simulated fans
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    lane TEXT NOT NULL, -- Priority, Paid, Free
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Queued', -- Queued, Answered, Refunded, Pinned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE x_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creator manage messages" ON x_chat_messages FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

CREATE POLICY "Public insert messages" ON x_chat_messages FOR INSERT WITH CHECK (
    true 
); 

CREATE POLICY "Public view messages" ON x_chat_messages FOR SELECT USING (
    true
);
