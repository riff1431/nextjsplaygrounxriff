-- Add a public SELECT policy to the profiles table
-- This allows anyone (including logged out users) to read basic profile info like avatars
-- which is necessary for the homepage and creator feeds to display correctly.

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT
USING (true);
