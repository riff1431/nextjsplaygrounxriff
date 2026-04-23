-- Add optional message column to creator invite splits
ALTER TABLE creator_invite_splits
  ADD COLUMN IF NOT EXISTS invite_message TEXT;
