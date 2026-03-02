-- Add missing columns for full confession request flow
ALTER TABLE confession_requests
  ADD COLUMN IF NOT EXISTS fan_name TEXT DEFAULT 'Anonymous',
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_media_url TEXT;
