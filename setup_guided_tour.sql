-- Guided Tour System: Add tour completion tracking columns
-- These are SEPARATE from onboarding_completed_at (which tracks the account setup wizard)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guided_tour_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guided_tour_type TEXT DEFAULT NULL;

-- Optional: Add an index for querying users who haven't completed the tour
CREATE INDEX IF NOT EXISTS idx_profiles_guided_tour ON profiles (guided_tour_completed) WHERE guided_tour_completed = FALSE;
