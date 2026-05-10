-- XChat Session Isolation: Add session_id to requests and reactions tables
-- This ensures each new session starts with a fresh, clean data slate.

-- X-Chat Requests: scope to session
ALTER TABLE x_chat_requests ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_x_chat_requests_session ON x_chat_requests(session_id);

-- X-Chat Reactions: scope to session
ALTER TABLE x_chat_reactions ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_x_chat_reactions_session ON x_chat_reactions(session_id);
