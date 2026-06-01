-- ═══════════════════════════════════════════════════════════
-- PlayGroundX — SMTP Settings & Email Notification Webhook
-- ═══════════════════════════════════════════════════════════

-- 1. Create SMTP settings table
CREATE TABLE IF NOT EXISTS smtp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT true,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'PlayGroundX',
    site_url TEXT, -- Base URL for notifications webhook (e.g. http://host.docker.internal:3000 or https://playgroundx.vip)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Server-side (service role) only. Disable direct access by users.
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on smtp_settings"
    ON smtp_settings FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Enable pg_net extension for outbound HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Create webhook trigger function
CREATE OR REPLACE FUNCTION notify_on_notification_insert()
RETURNS TRIGGER AS $$
DECLARE
    smtp_row RECORD;
    target_url TEXT;
    webhook_secret TEXT := 'super-secret-webhook-token';
BEGIN
    -- Query the active SMTP settings to fetch site_url
    SELECT * INTO smtp_row FROM smtp_settings WHERE is_active = true LIMIT 1;
    
    -- If no settings, or no site_url is configured, exit early
    IF smtp_row IS NULL OR smtp_row.site_url IS NULL OR smtp_row.site_url = '' THEN
        RETURN NEW;
    END IF;
    
    -- Build webhook endpoint URL
    target_url := rtrim(smtp_row.site_url, '/') || '/api/v1/notifications/webhook';
    
    -- Dispatch async HTTP POST to the Next.js server
    PERFORM net.http_post(
        url := target_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', webhook_secret
        ),
        body := jsonb_build_object(
            'type', 'INSERT',
            'record', row_to_json(NEW)
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on notifications table
DROP TRIGGER IF EXISTS trg_on_notification_insert ON notifications;
CREATE TRIGGER trg_on_notification_insert
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION notify_on_notification_insert();

-- Verify
SELECT 'SMTP settings table and notification trigger created ✅' AS result;
