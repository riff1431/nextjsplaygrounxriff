-- ==============================================================================
-- ⚠️ DEVELOPER BYPASS POLICY FOR LOCAL TESTING
-- ==============================================================================
-- This policy allows ANY authenticated user to read all confession requests.
-- This prevents the "0 requests" bug when testing both Fan and Creator flows
-- in the same browser window where cookies overwrite each other.
--
-- IMPORTANT: Do NOT deploy this to production without restricting it!
-- ==============================================================================

CREATE POLICY "Developer testing bypass for requests" ON confession_requests FOR SELECT USING (
    true
);
