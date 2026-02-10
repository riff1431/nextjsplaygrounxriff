-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Participants Table
CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text', -- 'text', 'image', 'video'
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON dm_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv ON dm_messages(conversation_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Conversations: Visible if you are a participant
CREATE POLICY "Users can view conversations they joined"
ON dm_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dm_participants zp
    WHERE zp.conversation_id = id
    AND zp.user_id = auth.uid()
  )
);

-- Participants: Visible if you are in the same conversation
CREATE POLICY "Users can view participants of their conversations"
ON dm_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM dm_participants
    WHERE user_id = auth.uid()
  )
);

-- Messages: Visible if you are in the conversation
CREATE POLICY "Users can view messages in their conversations"
ON dm_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM dm_participants
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policies (Sending messages)
CREATE POLICY "Users can insert messages in their conversations"
ON dm_messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id FROM dm_participants
    WHERE user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- INSERT Policies (Creating conversations)
-- Anyone can create a conversation, but usually done via a function to ensure participants are added atomically.
-- For now, allow authenticated users to insert conversation if they will be a participant (logic handled in app transaction usually)
CREATE POLICY "Authenticated users can create conversations"
ON dm_conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can add participants"
ON dm_participants FOR INSERT
TO authenticated
WITH CHECK (true); -- Ideally stricter, but complex without trigger
