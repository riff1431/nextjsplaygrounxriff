-- 20260607_enable_room_realtime_activity.sql
-- Safely enable Supabase Realtime replication for all chat, message, request, and activity tables across rooms

-- 1. Real-time chat & message tables
DO $$
BEGIN
    -- chat_messages (Truth or Dare, etc.)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;
    END IF;

    -- room_chat_messages (Confessions, Flash Drops, etc.)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_chat_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'room_chat_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.room_chat_messages;
        END IF;
    END IF;

    -- bar_lounge_messages (Bar Lounge chat)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bar_lounge_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bar_lounge_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_lounge_messages;
        END IF;
    END IF;

    -- room_session_messages (Shared session chats)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_session_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'room_session_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.room_session_messages;
        END IF;
    END IF;

    -- casino_chat_messages (Casino lounges chat)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'casino_chat_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'casino_chat_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_chat_messages;
        END IF;
    END IF;
END $$;

-- 2. Room activity, requests and interactions
DO $$
BEGIN
    -- confessions (Wall posts updates)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'confessions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'confessions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
        END IF;
    END IF;

    -- flash_drop_bundles (Flash Drop bundle definitions)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flash_drop_bundles') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'flash_drop_bundles') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_drop_bundles;
        END IF;
    END IF;

    -- room_join_requests (Truth or Dare, Suga4U, and other streaming slot requests)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_join_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'room_join_requests') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.room_join_requests;
        END IF;
    END IF;

    -- revenue_events (Bar Lounge tips alerts and activity counters)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'revenue_events') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'revenue_events') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_events;
        END IF;
    END IF;
END $$;

-- 3. Live Session gates and status updates
DO $$
BEGIN
    -- room_sessions (Start/End session stream states)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'room_sessions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;
        END IF;
    END IF;

    -- truth_dare_sessions (Truth or Dare stream states)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'truth_dare_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'truth_dare_sessions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_sessions;
        END IF;
    END IF;

    -- casino_lounges (Casino lounge configurations and status)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'casino_lounges') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'casino_lounges') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_lounges;
        END IF;
    END IF;

    -- competitions (Live stream competition states)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competitions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'competitions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
        END IF;
    END IF;

    -- competition_participants (Competition participants scoreboard)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competition_participants') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'competition_participants') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;
        END IF;
    END IF;
END $$;

-- 4. User settings, Wallet and balance changes
DO $$
BEGIN
    -- wallets (Wallet token balances)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallets') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallets') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
        END IF;
    END IF;

    -- transactions (Coin purchase and expenditure history)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
        END IF;
    END IF;

    -- creator_earnings_ledger (Creator real-time earning ledger entries)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'creator_earnings_ledger') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'creator_earnings_ledger') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_earnings_ledger;
        END IF;
    END IF;

    -- posts (Realtime newsfeed feeds update)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
        END IF;
    END IF;

    -- kyc_submissions (KYC verification updates)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kyc_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'kyc_submissions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_submissions;
        END IF;
    END IF;
END $$;
