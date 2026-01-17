-- Suga 4 U Backend Schema

-- 1. Paid Requests (custom interactions)
CREATE TABLE IF NOT EXISTS suga_paid_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_name TEXT, -- In production, link to profiles(id)
    type TEXT NOT NULL, -- POSE, SHOUTOUT, etc.
    label TEXT NOT NULL,
    note TEXT,
    price NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, fulfilled, declined
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Offer Drops (limited time/quantity items)
CREATE TABLE IF NOT EXISTS suga_offer_drops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    total_slots INT NOT NULL,
    slots_remaining INT NOT NULL,
    ends_at TIMESTAMPTZ, -- absolute time
    claims INT DEFAULT 0,
    revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Activity Events (Financial feed & Goal tracking)
CREATE TABLE IF NOT EXISTS suga_activity_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- TIP, OFFER_CLAIM, etc.
    fan_name TEXT,
    label TEXT,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Item Analytics (Secrets/Favorites persistent stats)
-- Simple key-value store or structured rows for analytics
CREATE TABLE IF NOT EXISTS suga_item_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- SECRET, FAVORITE
    item_id TEXT NOT NULL, -- local ID like 's1'
    title TEXT,
    price NUMERIC,
    count_a INT DEFAULT 0, -- unlocks/reveals
    count_b INT DEFAULT 0, -- buys (for favorites)
    revenue NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, category, item_id)
);

-- RLS
ALTER TABLE suga_paid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE suga_offer_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE suga_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE suga_item_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for suga_paid_requests
CREATE POLICY "Creator view requests" ON suga_paid_requests FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
CREATE POLICY "Creator update requests" ON suga_paid_requests FOR UPDATE USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
CREATE POLICY "Fan insert requests" ON suga_paid_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for suga_offer_drops
CREATE POLICY "Public view offers" ON suga_offer_drops FOR SELECT USING (true);
CREATE POLICY "Creator manage offers" ON suga_offer_drops FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);

-- Policies for suga_activity_events
CREATE POLICY "Creator view activity" ON suga_activity_events FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
CREATE POLICY "Fan insert activity" ON suga_activity_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Also allow creating system events if needed, but 'authenticated' covers sim for now.

-- Policies for suga_item_analytics
CREATE POLICY "Creator view analytics" ON suga_item_analytics FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
CREATE POLICY "Creator manage analytics" ON suga_item_analytics FOR ALL USING (
    auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id)
);
