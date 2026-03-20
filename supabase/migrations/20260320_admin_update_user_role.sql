-- RPC for admins to change a user's role (fan/creator/admin)
-- Uses the same admin-check pattern as admin_update_user_details

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate role value
  IF new_role NOT IN ('fan', 'creator', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be fan, creator, or admin', new_role;
  END IF;

  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1
    WHERE
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can manage users';
  END IF;

  -- Update the user's role
  UPDATE public.profiles
  SET
    role = new_role,
    updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;
END;
$$;
