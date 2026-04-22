-- Migration: Add media fields to flash_drop_bundles
-- Run this in the Supabase SQL editor

ALTER TABLE flash_drop_bundles
    ADD COLUMN IF NOT EXISTS media_url TEXT,
    ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video'));
