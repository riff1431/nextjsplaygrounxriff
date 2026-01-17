-- Migration to add missing columns to Competition tables

-- Add fan_count_paid to competitions if it doesn't exist
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS fan_count_paid INT DEFAULT 0;

-- Add user_id and is_ready to competition_participants
ALTER TABLE competition_participants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE competition_participants ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_participants ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ DEFAULT NOW();

-- Add Policy for "User manage self" if it doesn't exist (handled via DO block or just try create and ignore error in app logic, but pure SQL is safer)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'competition_participants'
        AND policyname = 'User manage self'
    ) THEN
        CREATE POLICY "User manage self" ON competition_participants FOR ALL USING (
            auth.uid() = user_id
        );
    END IF;
END
$$;
