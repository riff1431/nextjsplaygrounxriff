-- Add supporting columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rejected')),
ADD COLUMN IF NOT EXISTS proof_url text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create storage bucket for payment proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', false) -- Private bucket, only admin can view
ON CONFLICT (id) DO NOTHING;

-- RLS: Start fresh for simple logic
DROP POLICY IF EXISTS "Users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view proofs" ON storage.objects;

-- Allow authenticated users to upload their own proofs
CREATE POLICY "Users can upload proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Allow admins to view proofs (assuming admin check is done via role or hardcoded email for now)
-- For simplicity in this demo, we might make it public read OR strict RLS. 
-- Let's make it public read for admin ease for now, or use signed URLs.
-- Let's stick to signed URLs pattern in code, but for policy:
CREATE POLICY "Admins can view proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment_proofs'
  AND (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
);
