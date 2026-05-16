-- ============================================================
-- Migration: Add session_id to Flash Drop data tables
-- Purpose: Isolate data per session so new sessions start clean
-- Run this in Supabase SQL Editor BEFORE deploying code changes
-- ============================================================

-- 1. Add session_id to flash_drops
ALTER TABLE flash_drops 
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- 2. Add session_id to flash_drop_requests
ALTER TABLE flash_drop_requests 
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- 3. Add session_id to flash_drop_roller_packs
ALTER TABLE flash_drop_roller_packs 
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- 4. Indexes for efficient session-scoped queries
CREATE INDEX IF NOT EXISTS idx_flash_drops_session 
  ON flash_drops(session_id);
CREATE INDEX IF NOT EXISTS idx_flash_drop_requests_session 
  ON flash_drop_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_flash_drop_roller_packs_session 
  ON flash_drop_roller_packs(session_id);
