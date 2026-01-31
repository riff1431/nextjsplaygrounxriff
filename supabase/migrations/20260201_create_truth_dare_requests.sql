-- Create truth_dare_requests table if it doesn't exist
-- This table stores all truth/dare requests from fans with real-time updates

CREATE TABLE IF NOT EXISTS truth_dare_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    fan_id UUID NOT NULL,
    fan_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('system_truth', 'system_dare', 'custom_truth', 'custom_dare')),
    tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold')),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'answered', 'declined')),
    creator_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    revealed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_room_id ON truth_dare_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_fan_id ON truth_dare_requests(fan_id);
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_status ON truth_dare_requests(status);
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_room_status ON truth_dare_requests(room_id, status);
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_created_at ON truth_dare_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE truth_dare_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Fans can insert their own requests
DROP POLICY IF EXISTS "Fans can insert requests" ON truth_dare_requests;
CREATE POLICY "Fans can insert requests" ON truth_dare_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (fan_id = auth.uid());

-- Policy: Fans can view their own requests
DROP POLICY IF EXISTS "Fans can view own requests" ON truth_dare_requests;
CREATE POLICY "Fans can view own requests" ON truth_dare_requests
    FOR SELECT
    TO authenticated
    USING (fan_id = auth.uid());

-- Policy: Allow authenticated users to view all requests (for creators)
-- Note: In production, you may want to restrict this further based on your auth setup
DROP POLICY IF EXISTS "Creators can view room requests" ON truth_dare_requests;
CREATE POLICY "Creators can view room requests" ON truth_dare_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to update requests (for creators)
-- Note: In production, you may want to restrict this further based on your auth setup
DROP POLICY IF EXISTS "Creators can update room requests" ON truth_dare_requests;
CREATE POLICY "Creators can update room requests" ON truth_dare_requests
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable real-time for this table
DO $$ 
BEGIN
    -- Try to add table to realtime publication
    -- This will fail silently if table is already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE truth_dare_requests;
    EXCEPTION 
        WHEN duplicate_object THEN 
            NULL; -- Table already in publication, ignore
    END;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_truth_dare_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS truth_dare_requests_updated_at ON truth_dare_requests;
CREATE TRIGGER truth_dare_requests_updated_at
    BEFORE UPDATE ON truth_dare_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_truth_dare_requests_updated_at();

-- Add helpful comments
COMMENT ON TABLE truth_dare_requests IS 'Stores truth or dare requests from fans with real-time updates enabled';
