-- Add media_url column to flash_drops
ALTER TABLE flash_drops ADD COLUMN IF NOT EXISTS media_url TEXT;
