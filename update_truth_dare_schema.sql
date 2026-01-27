-- Update Truth & Dare Games table for Session Support
ALTER TABLE truth_dare_games 
ADD COLUMN IF NOT EXISTS session_title TEXT,
ADD COLUMN IF NOT EXISTS session_description TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlock_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ended'; -- 'active' or 'ended'

-- Create Unlocks table for Private Sessions
CREATE TABLE IF NOT EXISTS truth_dare_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fan_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    amount_paid NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fan_id, room_id) -- One unlock per user per room (persistent for that session? Or should we clear on session end? For now persistent is safer)
);

-- RLS for Unlocks
ALTER TABLE truth_dare_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans view own unlocks" ON truth_dare_unlocks 
    FOR SELECT USING (auth.uid() = fan_id);

CREATE POLICY "Creators view unlocks for their rooms" ON truth_dare_unlocks 
    FOR SELECT USING (
        auth.uid() IN (SELECT host_id FROM rooms WHERE id = truth_dare_unlocks.room_id)
    );

-- Allow system/backend to insert (or authenticated users if we do client-side call, but better server-side)
-- For now, allow authenticated insert to make implementation easier if we use direct Supabase client, 
-- but ideally this is done via RPC or API route with service role.
-- Let's stick to API route using Service Role for payments, but for reading we need policies.

-- Simple policy for insertion if needed (though we'll use API mostly)
CREATE POLICY "Service role manages unlocks" ON truth_dare_unlocks
    FOR ALL USING (auth.role() = 'service_role');
