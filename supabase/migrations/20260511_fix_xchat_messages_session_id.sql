-- Fix X-Chat Message Sending Issue
-- Adds the missing session_id column to the x_chat_messages table
-- This allows messages to be correctly scoped to their respective room sessions.

ALTER TABLE x_chat_messages 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES room_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_x_chat_messages_session ON x_chat_messages(session_id);
