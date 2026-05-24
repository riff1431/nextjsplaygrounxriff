-- 20260524_enable_truth_dare_queue_realtime.sql
-- Enable Realtime replication for truth_dare_queue table to ensure creator dashboard updates instantly

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'truth_dare_queue'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_queue;
    END IF;
END $$;
