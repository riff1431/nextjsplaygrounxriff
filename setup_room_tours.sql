-- Room Tours: Per-room guided tour completion tracking
-- Each room has a separate Creator and Fan tour (12 total)

CREATE TABLE IF NOT EXISTS room_tours_completed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tour_name text NOT NULL,
  completed boolean DEFAULT true,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tour_name)
);

-- RLS policies
ALTER TABLE room_tours_completed ENABLE ROW LEVEL SECURITY;

-- Users can read their own tour completion status
CREATE POLICY "Users can read own tour completions"
  ON room_tours_completed FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tour completions
CREATE POLICY "Users can insert own tour completions"
  ON room_tours_completed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tour completions
CREATE POLICY "Users can update own tour completions"
  ON room_tours_completed FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_room_tours_user_id ON room_tours_completed (user_id);
CREATE INDEX IF NOT EXISTS idx_room_tours_user_tour ON room_tours_completed (user_id, tour_name);
