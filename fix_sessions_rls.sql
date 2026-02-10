-- Enable RLS on the table if not already enabled
ALTER TABLE public.truth_dare_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow creators (hosts) to view their own sessions
-- We link sessions to rooms, and rooms have a host_id. 
-- However, truth_dare_sessions table stores 'room_id'.
-- We need to check if the auth.uid() matches the host_id of the room for that session.

CREATE POLICY "Enable read access for room hosts" ON public.truth_dare_sessions
FOR SELECT
USING (
  exists (
    select 1 from public.rooms
    where rooms.id = truth_dare_sessions.room_id
    and rooms.host_id = auth.uid()
  )
);

-- Policy to allow insertion (needed for the API route/service role, but good to have for user if client-side logic changes)
-- Generally, the API uses service role which bypasses RLS, but if we ever read from client, we need SELECT.

-- Policy to allow updates (marking as ended)
CREATE POLICY "Enable update for room hosts" ON public.truth_dare_sessions
FOR UPDATE
USING (
  exists (
    select 1 from public.rooms
    where rooms.id = truth_dare_sessions.room_id
    and rooms.host_id = auth.uid()
  )
);
