-- Dashboard Stats & Follows System

-- 1. Create Follows Table
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- RLS for Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view follows" ON follows;
CREATE POLICY "Public view follows" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 2. Dashboard Stats Function
-- Returns: { total_earnings_cents, total_followers, active_rooms }
CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(p_creator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_followers INT;
    v_active_rooms INT;
    v_comp_tips_cents BIGINT;
    v_suga_revenue NUMERIC;
    v_total_earnings_cents BIGINT;
BEGIN
    -- Count Followers
    SELECT COUNT(*) INTO v_total_followers
    FROM follows
    WHERE following_id = p_creator_id;

    -- Count Active Rooms
    SELECT COUNT(*) INTO v_active_rooms
    FROM rooms
    WHERE host_id = p_creator_id AND status = 'live';

    -- Sum Competition Tips (100% of stored, or just the creator portion)
    -- The table stores `creator_amount_cents` which is the 90% share.
    SELECT COALESCE(SUM(creator_amount_cents), 0) INTO v_comp_tips_cents
    FROM competition_tips
    WHERE creator_id IN (
        SELECT id FROM competition_participants WHERE user_id = p_creator_id
    );

    -- Sum Suga Revenue (assuming revenue column is Dollars, convert to Cents)
    -- If revenue is null, treat as 0.
    SELECT COALESCE(SUM(revenue), 0) INTO v_suga_revenue
    FROM suga_offer_drops
    WHERE room_id IN (
        SELECT id FROM rooms WHERE host_id = p_creator_id
    );

    -- Total Cents = Comp Tips + (Suga Revenue * 100)
    -- Ensure suga_revenue is treated as numeric
    v_total_earnings_cents := v_comp_tips_cents + (v_suga_revenue * 100);

    RETURN jsonb_build_object(
        'totalFollowers', v_total_followers,
        'activeRooms', v_active_rooms,
        'totalEarningsCents', v_total_earnings_cents
    );
END;
$$;
