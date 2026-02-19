-- Add viewer_count to rooms if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'viewer_count') THEN
        ALTER TABLE rooms ADD COLUMN viewer_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- RPC function to atomically increment/decrement viewer count
CREATE OR REPLACE FUNCTION increment_viewer_count(p_room_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE rooms
    SET viewer_count = GREATEST(0, viewer_count + p_amount)
    WHERE id = p_room_id;
END;
$$;
