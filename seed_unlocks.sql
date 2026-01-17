
-- Insert a test item if not exists
INSERT INTO unlockable_items (id, name, description, type, image_url)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Founder Badge', 'One of the first members.', 'badge', 'https://api.dicebear.com/7.x/identicon/svg?seed=founder'),
    ('00000000-0000-0000-0000-000000000002', 'First Drop', 'Collected the first drop.', 'sticker', 'https://api.dicebear.com/7.x/identicon/svg?seed=drop')
ON CONFLICT (id) DO NOTHING;

-- Grant to current user (need user ID, will do dynamically if running as script, but for SQL editor user needs to replace)
-- Since I can't easily get the user ID for a SQL script without asking them, I will provide a script that they can run in the SQL editor 
-- OR better yet, I can write a small TS script that uses the logged in user context if I had it, but that's hard in a script.
-- I'll just ask them to run this SQL and Replace 'USER_ID_HERE' with their ID, or I can try to fetch their ID if they are logged in.

-- actually, I can just use a TS script to seed for the *currently authenticated user* if I run it in the browser context? No.
-- I will create a "seed" page or just a one-off TS script that uses the service key if available, or just asks the user to run SQL.

-- Let's stick to the TS script idea `scripts/seed_unlocks.ts` reusing the service key logic I prepared but didn't use. 
-- Wait, I don't have the service key.
-- I will just ask the user to run the SQL. It's robust.

