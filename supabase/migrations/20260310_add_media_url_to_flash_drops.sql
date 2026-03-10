-- Add media_url column to flash_drops for storing uploaded photo/video URLs
ALTER TABLE flash_drops ADD COLUMN IF NOT EXISTS media_url TEXT;
