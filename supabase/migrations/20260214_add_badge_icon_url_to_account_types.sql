-- Add badge_icon_url column to account_types table
ALTER TABLE public.account_types
ADD COLUMN IF NOT EXISTS badge_icon_url TEXT DEFAULT NULL;
