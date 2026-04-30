-- Add session_id to suga_activity_events so chat/activity is scoped per session
ALTER TABLE suga_activity_events ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;

-- Add session_id to suga_paid_requests so requests are scoped per session
ALTER TABLE suga_paid_requests ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;

-- Index for efficient session-scoped queries
CREATE INDEX IF NOT EXISTS idx_suga_activity_events_session ON suga_activity_events(session_id);
CREATE INDEX IF NOT EXISTS idx_suga_paid_requests_session ON suga_paid_requests(session_id);
