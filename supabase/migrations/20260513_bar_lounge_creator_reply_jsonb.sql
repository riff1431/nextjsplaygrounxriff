-- Ensure creator_reply column exists on bar_lounge_requests as JSONB
-- so it can store { text, mediaUrl, mediaType } objects from VIP replies.

-- First, add the column if it doesn't exist (as JSONB)
ALTER TABLE bar_lounge_requests ADD COLUMN IF NOT EXISTS creator_reply JSONB;

-- If the column already exists as TEXT, alter it to JSONB
-- This handles the case where it was previously TEXT (storing "[object Object]")
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bar_lounge_requests'
        AND column_name = 'creator_reply'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE bar_lounge_requests
            ALTER COLUMN creator_reply TYPE JSONB
            USING CASE
                WHEN creator_reply IS NULL THEN NULL
                WHEN creator_reply::text = '[object Object]' THEN NULL
                ELSE to_jsonb(creator_reply)
            END;
    END IF;
END $$;
