-- Add session_id to bar_lounge_requests for session-scoped summary stats
ALTER TABLE bar_lounge_requests ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bar_lounge_requests_session ON bar_lounge_requests(session_id);
