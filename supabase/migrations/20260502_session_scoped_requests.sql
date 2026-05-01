-- ==============================================================================
-- Add session_id to confession_requests
-- ==============================================================================

-- Add session_id column (nullable initially for backwards compatibility)
ALTER TABLE confession_requests
ADD COLUMN session_id UUID REFERENCES room_sessions(id) ON DELETE CASCADE;

-- Create an index to speed up filtering by session
CREATE INDEX IF NOT EXISTS idx_confession_requests_session_id ON confession_requests(session_id);
