-- Create room_requests table for Private Room logic
CREATE TABLE IF NOT EXISTS room_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    unique(room_id, user_id)
);

-- Enable RLS
ALTER TABLE room_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own requests
CREATE POLICY "Users can view own requests"
ON room_requests FOR SELECT
USING (auth.uid() = user_id);

-- 2. Users can create their own requests
CREATE POLICY "Users can create requests"
ON room_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Room Hosts (Creators) can view requests for their rooms
CREATE POLICY "Hosts can view requests for their rooms"
ON room_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = room_requests.room_id
        AND rooms.host_id = auth.uid()
    )
);

-- 4. Room Hosts can update requests (approve/reject)
CREATE POLICY "Hosts can update requests"
ON room_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = room_requests.room_id
        AND rooms.host_id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_room_requests_room_id ON room_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_room_requests_user_id ON room_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_room_requests_status ON room_requests(status);
