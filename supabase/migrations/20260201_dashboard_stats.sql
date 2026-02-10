-- Create followers table if not exists (standard social graph)
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES auth.users(id) NOT NULL,
    following_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- RLS for followers
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON followers FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON followers FOR DELETE USING (auth.uid() = follower_id);

-- Create RPC for dashboard stats
CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(p_creator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_followers INT;
    v_active_rooms INT;
    v_total_earnings NUMERIC;
BEGIN
    -- 1. Followers Count
    SELECT COUNT(*) INTO v_total_followers
    FROM followers
    WHERE following_id = p_creator_id;

    -- 2. Active Rooms Count
    SELECT COUNT(*) INTO v_active_rooms
    FROM rooms
    WHERE host_id = p_creator_id AND status = 'live'; -- content says 'live' or 'active'

    -- 3. Total Earnings (Tips + Unlocks)
    -- Sum from truth_dare_unlocks (entry fees)
    -- Sum from truth_dare_requests (tips/requests)
    -- (We can add other revenue sources here later)
    
    SELECT 
        COALESCE((SELECT SUM(amount_paid) FROM truth_dare_unlocks WHERE room_id IN (SELECT id FROM rooms WHERE host_id = p_creator_id)), 0) +
        COALESCE((SELECT SUM(amount) FROM truth_dare_requests WHERE room_id IN (SELECT id FROM rooms WHERE host_id = p_creator_id)), 0)
    INTO v_total_earnings;

    RETURN jsonb_build_object(
        'totalFollowers', v_total_followers,
        'activeRooms', v_active_rooms,
        'totalEarnings', v_total_earnings
    );
END;
$$;
