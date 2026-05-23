-- 20260523_enable_realtime_for_dashboards.sql
-- Enable Realtime replication for all dashboard and interaction tables across rooms

-- 1. Enable Realtime for Bar Lounge
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'bar_lounge_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_lounge_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
    END IF;
END $$;

-- 2. Enable Realtime for Suga4U and general session participants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_session_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_session_participants;
    END IF;
END $$;

-- 3. Enable Realtime for X-Chat
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'x_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.x_chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'x_chat_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.x_chat_reactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'x_chat_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.x_chat_requests;
    END IF;
END $$;

-- 4. Enable Realtime for Flash Drops
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'flash_drops'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_drops;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'flash_drop_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_drop_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'flash_drop_roller_packs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_drop_roller_packs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_session_tips'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_session_tips;
    END IF;
END $$;
