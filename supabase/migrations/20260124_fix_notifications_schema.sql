-- Add missing columns to notifications table if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT; 
