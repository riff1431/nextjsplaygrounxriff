-- Private 1-on-1 Video Call Schema
-- Tracks private call sessions between fan and creator in Suga4U rooms

CREATE TABLE IF NOT EXISTS suga_private_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    request_id UUID REFERENCES suga_paid_requests(id) ON DELETE SET NULL,
    fan_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    fan_name TEXT,
    status TEXT DEFAULT 'pending', -- pending, ringing, active, ended, declined, missed, rejected_by_fan
    agora_channel TEXT NOT NULL,
    duration_seconds INT DEFAULT 60,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add private_1on1_duration_seconds to room_settings (if column doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'room_settings' AND column_name = 'private_1on1_duration_seconds'
    ) THEN
        ALTER TABLE room_settings ADD COLUMN private_1on1_duration_seconds INT DEFAULT 60;
    END IF;
END $$;

-- RLS
ALTER TABLE suga_private_calls ENABLE ROW LEVEL SECURITY;

-- Both fan and creator can view their own calls
CREATE POLICY "Users view own calls" ON suga_private_calls FOR SELECT USING (
    auth.uid() = fan_id OR auth.uid() = creator_id
);

-- Authenticated users can create calls
CREATE POLICY "Authenticated insert calls" ON suga_private_calls FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

-- Participants can update calls
CREATE POLICY "Participants update calls" ON suga_private_calls FOR UPDATE USING (
    auth.uid() = fan_id OR auth.uid() = creator_id
);

-- Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'suga_private_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_private_calls;
    END IF;
END $$;
