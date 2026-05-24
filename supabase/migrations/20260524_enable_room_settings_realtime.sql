-- 20260524_enable_room_settings_realtime.sql
-- Enable Realtime replication for room_settings table

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_settings;
    END IF;
END $$;
