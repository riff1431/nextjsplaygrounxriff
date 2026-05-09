-- =============================================
-- Fix Truth & Dare RLS for Fan Access
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Allow any authenticated user to read active/pending sessions (for browsing/joining)
-- This unblocks fans from seeing sessions in the browse API and fan room page
CREATE POLICY "Authenticated users can read active sessions" 
ON public.truth_dare_sessions
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND status IN ('active', 'pending')
);

-- 2. Allow authenticated users to read their own participation records
-- Needed for the fan page to check if user already joined a session
DO $$
BEGIN
  -- Check if RLS is enabled on truth_dare_session_participants
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'truth_dare_session_participants' 
    AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.truth_dare_session_participants ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to read their own participation
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'truth_dare_session_participants' 
      AND policyname = 'Users can read own participation'
    ) THEN
      CREATE POLICY "Users can read own participation" 
      ON public.truth_dare_session_participants
      FOR SELECT
      USING (auth.uid() = user_id);
    END IF;
    
    -- Allow system/API to insert participants
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'truth_dare_session_participants' 
      AND policyname = 'Authenticated users can be added as participants'
    ) THEN
      CREATE POLICY "Authenticated users can be added as participants" 
      ON public.truth_dare_session_participants
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- 3. Ensure truth_dare_unlocks has session_id column
ALTER TABLE public.truth_dare_unlocks 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES truth_dare_sessions(id) ON DELETE SET NULL;

-- 4. Ensure truth_dare_entries has session_id column (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'truth_dare_entries' 
    AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.truth_dare_entries 
    ADD COLUMN IF NOT EXISTS session_id UUID;
  END IF;
END $$;

-- Done! Verify by checking policies:
-- SELECT * FROM pg_policies WHERE tablename = 'truth_dare_sessions';
-- SELECT * FROM pg_policies WHERE tablename = 'truth_dare_session_participants';
