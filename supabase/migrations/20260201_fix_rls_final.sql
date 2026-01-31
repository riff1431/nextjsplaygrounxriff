-- CLEANUP ALL POLICIES on truth_dare_requests to ensure NO conflicts
DROP POLICY IF EXISTS "Creators can view room requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Creators view room requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Creators can update room requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Creators update room requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Fans can insert requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Fans create requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Fans can view own requests" ON truth_dare_requests;
DROP POLICY IF EXISTS "Fans view own requests" ON truth_dare_requests;

-- RE-APPLY SIMPLIFIED, ROBUST POLICIES

-- 1. Allow Authenticated Users (Creators) to do EVERYTHING (Select, Update, etc.)
-- This ensures the Creator Dashboard can ALWAYS see and modify requests.
CREATE POLICY "Authenticated users full access" ON truth_dare_requests
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Allow Public Users (Fans, even if anon) to INSERT requests
CREATE POLICY "Public can insert requests" ON truth_dare_requests
    FOR INSERT TO public
    WITH CHECK (true);

-- 3. Allow Public Users to SELECT (view) requests
-- (This ensures that even if the Creator's session is weird, they can see data. We can tighten this later.)
CREATE POLICY "Public can view requests" ON truth_dare_requests
    FOR SELECT TO public
    USING (true);

-- Force Realtime to be ON (Just in case)
-- ALTER PUBLICATION supabase_realtime ADD TABLE truth_dare_requests;
