-- ==============================================================================
-- Migration: Add session_id to confessions table for session isolation
-- Each new session should start with a clean confession wall.
-- ==============================================================================

-- Add session_id column (nullable for backwards compatibility with existing data)
ALTER TABLE confessions
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;

-- Index for fast session-scoped queries
CREATE INDEX IF NOT EXISTS idx_confessions_session ON confessions(session_id);
