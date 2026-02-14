-- Add group_vote_state to truth_dare_games if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'truth_dare_games'
        AND column_name = 'group_vote_state'
    ) THEN
        ALTER TABLE truth_dare_games
        ADD COLUMN group_vote_state JSONB DEFAULT '{}';
    END IF;
END $$;
