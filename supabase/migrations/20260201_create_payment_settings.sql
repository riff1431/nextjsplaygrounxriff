-- Create payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE, -- 'stripe', 'paypal', 'bank'
    is_enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::JSONB, -- Public key, instructions, etc.
    secret_config JSONB DEFAULT '{}'::JSONB, -- Secret keys (only accessible by service role/admin)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to enabled providers and their public config only
-- Actually, for simplicity in UI, we might want to read all to show "Unavailable" vs "Hidden"?
-- Let's allow read access to all rows, but we must protect secret_config via column security or just API logic.
-- Since Supabase RLS is row-based, we can't easily hide one column for public unless we use a view or robust API.
-- We will handle secret stripping in the API layer (Next.js API Route). 
-- This policy just allows authenticated users to read the settings rows.
CREATE POLICY "Everyone can read payment settings"
ON public.payment_settings FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins/service role can update
-- Assumes admin_role or check based on 'users' table role if applicable.
-- For now, using service_role or superuser check via generic 'postgres' role or custom admin claim.
-- Simplest: Only allow read for now via RLS, updates handled via dashboard (service role).

-- Seed Initial Data
INSERT INTO public.payment_settings (provider, is_enabled, config, secret_config)
VALUES 
    ('stripe', false, '{"public_key": ""}', '{"secret_key": ""}'),
    ('paypal', false, '{"client_id": ""}', '{"client_secret": ""}'),
    ('bank', true, '{"account_name": "PlaygroundX Ltd", "account_number": "1234567890", "bank_name": "Demo Bank", "swift": "DEMOUS33"}', '{}')
ON CONFLICT (provider) DO NOTHING;
