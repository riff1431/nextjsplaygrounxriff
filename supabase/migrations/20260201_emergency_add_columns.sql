-- EMERGENCY FIX: Add missing columns to existing table
-- The previous CREATE TABLE IF NOT EXISTS skipped this because the table already existed!

-- 1. Add fan_name (Critical for UI)
ALTER TABLE truth_dare_requests 
ADD COLUMN IF NOT EXISTS fan_name TEXT DEFAULT 'Anonymous';

-- 2. Add creator_response (For answering)
ALTER TABLE truth_dare_requests 
ADD COLUMN IF NOT EXISTS creator_response TEXT;

-- 3. Add timestamps (For flow logic)
ALTER TABLE truth_dare_requests 
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

ALTER TABLE truth_dare_requests 
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

ALTER TABLE truth_dare_requests 
ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ;

-- 4. Re-apply RLS policies just in case (optional, but safe)
DROP POLICY IF EXISTS "Fans can insert requests" ON truth_dare_requests;
CREATE POLICY "Fans can insert requests" ON truth_dare_requests
    FOR INSERT TO authenticated
    WITH CHECK (fan_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view room requests" ON truth_dare_requests;
CREATE POLICY "Creators can view room requests" ON truth_dare_requests
    FOR SELECT TO authenticated
    USING (true);

-- 5. Force Realtime (Idempotent)
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE truth_dare_requests;
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 6. Verify comment
COMMENT ON TABLE truth_dare_requests IS 'Fixed: Contains fan_name and all required columns';
