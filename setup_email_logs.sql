-- ═══════════════════════════════════════════════════════════
-- PlayGroundX — Email Logs Schema
-- Run this in your Supabase SQL editor
-- ═══════════════════════════════════════════════════════════

-- Email logs table for tracking all sent emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    template_id TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',  -- 'sent', 'failed', 'bounced'
    resend_id TEXT,                       -- Resend's message ID for tracking
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- RLS: Only service role can insert (server-side only)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (default behavior)
-- Admins can read via the admin dashboard
CREATE POLICY "Service role full access on email_logs"
    ON email_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add low-balance email throttle column to wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS
    low_balance_email_sent_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- Verify
-- ═══════════════════════════════════════════════════════════
SELECT 'email_logs table created ✅' AS result;
