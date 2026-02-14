-- Ensure the column exists
ALTER TABLE truth_dare_games 
ADD COLUMN IF NOT EXISTS group_vote_state JSONB DEFAULT '{}';

-- Ensure the table is in the publication for Realtime
-- This is critical for the client subscription to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'truth_dare_games'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE truth_dare_games;
    END IF;
END $$;
