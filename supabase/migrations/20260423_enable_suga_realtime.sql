-- Enable Supabase Realtime for Suga4U tables that were missing from the publication.
-- Without this, postgres_changes subscriptions in useSuga4U hook will never fire.

DO $$
BEGIN
  -- suga_activity_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'suga_activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_activity_events;
  END IF;

  -- suga_paid_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'suga_paid_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_paid_requests;
  END IF;

  -- suga_offer_drops
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'suga_offer_drops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_offer_drops;
  END IF;
END $$;

-- Enable REPLICA IDENTITY FULL on tables that need DELETE events to include old row data
ALTER TABLE public.suga_creator_secrets REPLICA IDENTITY FULL;
ALTER TABLE public.suga_creator_favorites REPLICA IDENTITY FULL;
