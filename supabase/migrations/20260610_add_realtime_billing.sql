-- Migration to enable Realtime replication for session_billing_records
-- Created: 2026-06-10

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'session_billing_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.session_billing_records;
    END IF;
END $$;
