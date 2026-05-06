-- Add media_urls column to flash_drop_roller_packs table
-- Stores an array of public URLs (images/videos) for each pack
ALTER TABLE flash_drop_roller_packs ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;
