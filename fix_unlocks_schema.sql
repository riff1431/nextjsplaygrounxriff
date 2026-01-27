-- Add the missing column 'amount_paid' to truth_dare_unlocks if it doesn't exist
ALTER TABLE public.truth_dare_unlocks 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Optional: Verify other columns just in case
ALTER TABLE public.truth_dare_unlocks 
ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;

-- Ensure RLS is still active (redundant safety)
ALTER TABLE public.truth_dare_unlocks ENABLE ROW LEVEL SECURITY;
