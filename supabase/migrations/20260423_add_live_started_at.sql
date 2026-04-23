-- Add live_started_at column to room_sessions
-- This tracks when the creator clicked "Go Live" (distinct from session creation time).
-- NULL means the session was created but the creator hasn't started broadcasting yet.
ALTER TABLE room_sessions ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMPTZ DEFAULT NULL;
