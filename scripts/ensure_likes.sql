
-- Ensure likes table has Foreign Keys if not
DO $$
BEGIN
    -- This assumes 'target_id' is the column name for the item being liked.
    -- If it's specifically 'room_id' in some schemata, we might need to adjust.
    -- But typically generic 'likes' tables use target_id + target_type.
    
    -- Let's just create a view or index if needed, but for now we rely on existing structure.
    -- This file is mostly a placeholder to remind valid SQL execution if I need to debug.
    -- I'll use it to add a dummy like to test the UI.
    NULL;
END $$;

-- Insert a test like
INSERT INTO rooms (id, name, description, status) 
VALUES ('00000000-0000-0000-0000-000000000099', 'Test Lounge', 'A cool place to hang out', 'live')
ON CONFLICT (id) DO NOTHING;

-- Liked by... who? I need a user ID. 
-- I'll just skip the insert and ask user to like something if they can, or I'll implement 'Like' button on rooms later.
-- For now, the profile page code is robust enough to handle empty list.
