-- ============================================================
-- Migration: Add session_id to Truth & Dare data tables
-- Purpose: Isolate data per session so new sessions start clean
-- Run this in Supabase SQL Editor BEFORE deploying code changes
-- ============================================================

-- 1. Add session_id to truth_dare_requests
ALTER TABLE truth_dare_requests 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES truth_dare_sessions(id);

-- 2. Add session_id to truth_dare_queue
ALTER TABLE truth_dare_queue 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES truth_dare_sessions(id);

-- 3. Add session_id to chat_messages
ALTER TABLE chat_messages 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES truth_dare_sessions(id);

-- 4. Add session_id to truth_dare_games (active session reference)
ALTER TABLE truth_dare_games 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES truth_dare_sessions(id);

-- 5. Indexes for efficient session-scoped queries
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_session 
  ON truth_dare_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_truth_dare_queue_session 
  ON truth_dare_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session 
  ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_truth_dare_games_session 
  ON truth_dare_games(session_id);
