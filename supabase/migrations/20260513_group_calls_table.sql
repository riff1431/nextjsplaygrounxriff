-- Group Calls: persist active group call sessions for fan reconnection support
CREATE TABLE IF NOT EXISTS group_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agora_channel TEXT NOT NULL,
    participant_fan_ids UUID[] NOT NULL DEFAULT '{}',
    type TEXT NOT NULL CHECK (type IN ('truth', 'dare')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Index for fast lookup by room
CREATE INDEX IF NOT EXISTS group_calls_room_id_status_idx ON group_calls(room_id, status);

-- RLS
ALTER TABLE group_calls ENABLE ROW LEVEL SECURITY;

-- Creators can insert their own calls
CREATE POLICY "Creators can insert group_calls"
    ON group_calls FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

-- Creators can update (end) their own calls
CREATE POLICY "Creators can update group_calls"
    ON group_calls FOR UPDATE
    USING (auth.uid() = creator_id);

-- Any authenticated user can read active calls (fans need to see if they're invited)
CREATE POLICY "Authenticated users can read group_calls"
    ON group_calls FOR SELECT
    USING (auth.role() = 'authenticated');
