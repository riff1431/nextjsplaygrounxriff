-- Confession Requests Schema

CREATE TABLE IF NOT EXISTS confession_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The target creator
    type TEXT NOT NULL CHECK (type IN ('Text', 'Audio', 'Video')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'in_progress', 'delivered', 'completed', 'rejected')),
    delivery_content TEXT, -- URL or text content when delivered
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE confession_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- Fan can view their own requests
CREATE POLICY "Fans view own requests" ON confession_requests FOR SELECT USING (
    auth.uid() = fan_id
);

-- Fan can insert requests (Funds check usually happens in API/Trigger, allowing insert for now)
CREATE POLICY "Fans insert requests" ON confession_requests FOR INSERT WITH CHECK (
    auth.uid() = fan_id
);

-- Fan can update status only to 'completed' (Approve delivery)
CREATE POLICY "Fans approve delivery" ON confession_requests FOR UPDATE USING (
    auth.uid() = fan_id
) WITH CHECK (
    auth.uid() = fan_id AND status = 'completed'
);

-- Creator can view requests assigned to them
CREATE POLICY "Creators view assigned requests" ON confession_requests FOR SELECT USING (
    auth.uid() = creator_id
);

-- Creator can update status (Accept, Reject, Deliver)
CREATE POLICY "Creators update requests" ON confession_requests FOR UPDATE USING (
    auth.uid() = creator_id
);
