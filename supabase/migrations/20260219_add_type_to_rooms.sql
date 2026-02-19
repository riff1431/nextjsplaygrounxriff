-- Add type column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'truth-or-dare';
