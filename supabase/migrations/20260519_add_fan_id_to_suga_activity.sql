-- Add fan_id column to suga_activity_events so we can resolve user avatars and badges in chat
ALTER TABLE suga_activity_events ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for efficient avatar/badge lookups
CREATE INDEX IF NOT EXISTS idx_suga_activity_events_fan_id ON suga_activity_events(fan_id);

-- Allow fans (any authenticated user) to read activity events so realtime chat works
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Fan view activity' AND tablename = 'suga_activity_events'
    ) THEN
        CREATE POLICY "Fan view activity" ON suga_activity_events FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;
