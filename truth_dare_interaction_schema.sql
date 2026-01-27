-- Create table for Interactions (System Prompts & Custom Requests)
CREATE TABLE IF NOT EXISTS truth_dare_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Keep request even if fan deleted
    type TEXT NOT NULL, -- 'system_truth', 'system_dare', 'custom_truth', 'custom_dare'
    tier TEXT, -- 'bronze', 'silver', 'gold', 'custom'
    content TEXT NOT NULL, -- The prompt text
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE truth_dare_requests ENABLE ROW LEVEL SECURITY;

-- Fans can create requests (insert)
CREATE POLICY "Fans create requests" ON truth_dare_requests
FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Fans can see their own requests
CREATE POLICY "Fans view own requests" ON truth_dare_requests
FOR SELECT USING (auth.uid() = fan_id);

-- Creators (Hosts) can see all requests for their rooms
CREATE POLICY "Creators view room requests" ON truth_dare_requests
FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = truth_dare_requests.room_id)
);

-- Creators can update status (mark completed)
CREATE POLICY "Creators update room requests" ON truth_dare_requests
FOR UPDATE USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = truth_dare_requests.room_id)
);

-- REALTIME
-- Enable realtime for this table so creators get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE truth_dare_requests;
