-- Add missing columns to truth_dare_requests table for real-time functionality

-- Add fan_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'fan_name'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN fan_name TEXT;
    END IF;
END $$;

-- Add tier column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'tier'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold'));
    END IF;
END $$;

-- Add answered_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'answered_at'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN answered_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add declined_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'declined_at'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN declined_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add revealed_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'revealed_at'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN revealed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add creator_response column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'creator_response'
    ) THEN
        ALTER TABLE truth_dare_requests ADD COLUMN creator_response TEXT;
    END IF;
END $$;

-- Update status column to include new statuses if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'truth_dare_requests' AND column_name = 'status'
    ) THEN
        ALTER TABLE truth_dare_requests 
        DROP CONSTRAINT IF EXISTS truth_dare_requests_status_check;
        
        ALTER TABLE truth_dare_requests 
        ADD CONSTRAINT truth_dare_requests_status_check 
        CHECK (status IN ('pending', 'accepted', 'answered', 'declined'));
    END IF;
END $$;

-- Create index on room_id and status for faster queries
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_room_status 
ON truth_dare_requests(room_id, status);

-- Create index on fan_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_truth_dare_requests_fan_id 
ON truth_dare_requests(fan_id);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS truth_dare_requests;

-- Add comment to table
COMMENT ON TABLE truth_dare_requests IS 'Stores truth or dare requests from fans with real-time updates enabled';
