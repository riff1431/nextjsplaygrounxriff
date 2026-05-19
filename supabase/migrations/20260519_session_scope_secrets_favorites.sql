-- Add session_id to secrets and favorites for session-scoped data
ALTER TABLE suga_creator_secrets ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE CASCADE;
ALTER TABLE suga_creator_favorites ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE CASCADE;

-- Add room_id to secrets and favorites for realtime subscription filtering
ALTER TABLE suga_creator_secrets ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE suga_creator_favorites ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suga_creator_secrets_session ON suga_creator_secrets(session_id);
CREATE INDEX IF NOT EXISTS idx_suga_creator_favorites_session ON suga_creator_favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_suga_creator_secrets_room ON suga_creator_secrets(room_id);
CREATE INDEX IF NOT EXISTS idx_suga_creator_favorites_room ON suga_creator_favorites(room_id);

-- Add link column to favorites if missing
ALTER TABLE suga_creator_favorites ADD COLUMN IF NOT EXISTS link TEXT;
