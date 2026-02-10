-- [FIX] Room Slug Mismatch
-- The 'default-room' slug currently points to an empty/dummy room (0000...), 
-- while the actual content is in room '9b3ebfe9-4c61-4f7d-815e-23c74150e34a'.
-- This script swaps them so the Fan Page (using 'default-room') sees the content.

-- 1. Rename the empty/dummy room's slug to free up "default-room"
UPDATE rooms 
SET slug = 'archived-default' 
WHERE slug = 'default-room';

-- 2. Assign "default-room" to the active content room
UPDATE rooms 
SET slug = 'default-room' 
WHERE id = '9b3ebfe9-4c61-4f7d-815e-23c74150e34a';

-- Verify
-- SELECT id, slug FROM rooms;
