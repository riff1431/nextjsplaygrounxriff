-- 1. Ensure the 'slug' column exists
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Insert the Default Room
-- Includes 'title' (required) and 'slug'
INSERT INTO rooms (id, host_id, title, slug)
SELECT
  '00000000-0000-0000-0000-000000000000', -- Consistent ID
  id, -- Uses the first user found as host
  'Default Room',
  'default-room'
FROM auth.users
LIMIT 1
ON CONFLICT (slug) DO NOTHING;
