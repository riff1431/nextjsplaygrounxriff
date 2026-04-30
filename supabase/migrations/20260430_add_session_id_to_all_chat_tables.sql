-- Session-scoped chat: Add session_id to all remaining chat tables

-- Bar Lounge
ALTER TABLE bar_lounge_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bar_lounge_messages_session ON bar_lounge_messages(session_id);

-- X-Chat
ALTER TABLE x_chat_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_x_chat_messages_session ON x_chat_messages(session_id);

-- Confessions
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Flash Drop
ALTER TABLE room_chat_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_room_chat_messages_session ON room_chat_messages(session_id);
