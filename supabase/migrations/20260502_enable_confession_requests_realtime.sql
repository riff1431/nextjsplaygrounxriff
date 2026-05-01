-- Enable realtime for confession_requests so creator dashboard receives live updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'confession_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_requests;
    END IF;
END $$;

-- Update the type CHECK constraint to include 'Image' alongside existing types
ALTER TABLE confession_requests DROP CONSTRAINT IF EXISTS confession_requests_type_check;
ALTER TABLE confession_requests ADD CONSTRAINT confession_requests_type_check
    CHECK (type IN ('Text', 'Audio', 'Video', 'Image'));
