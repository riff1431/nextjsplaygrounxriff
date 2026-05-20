-- Add custom request columns to suga_paid_requests
-- custom_text: Fan's typed custom request message
-- response_text: Creator's text reply
-- response_media_url: Creator's attached media file URL

ALTER TABLE suga_paid_requests ADD COLUMN IF NOT EXISTS custom_text TEXT;
ALTER TABLE suga_paid_requests ADD COLUMN IF NOT EXISTS response_text TEXT;
ALTER TABLE suga_paid_requests ADD COLUMN IF NOT EXISTS response_media_url TEXT;

-- Allow fans to also read their own requests (needed for incoming panel)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Fan read own requests' AND tablename = 'suga_paid_requests'
    ) THEN
        CREATE POLICY "Fan read own requests" ON suga_paid_requests FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;
