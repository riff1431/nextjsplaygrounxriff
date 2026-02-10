-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'confession_request', 'system', etc.
    reference_id UUID, -- Link to request or other entity
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger to notify Room Host on new Confession Request
CREATE OR REPLACE FUNCTION handle_new_confession_request()
RETURNS TRIGGER AS $$
DECLARE
    host_id UUID;
    room_title TEXT;
BEGIN
    -- Get the host_id of the room
    SELECT t.host_id, t.title INTO host_id, room_title
    FROM rooms t
    WHERE t.id = NEW.room_id;

    IF host_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, reference_id, message)
        VALUES (
            host_id, 
            'confession_request', 
            NEW.id, 
            'New ' || NEW.type || ' Request: ' || NEW.topic
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_confession_request_created ON confession_requests;
CREATE TRIGGER on_confession_request_created
    AFTER INSERT ON confession_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_confession_request();
