-- Function to update KYC status, bypassing RLS
-- This is necessary because RLS policies on 'profiles' table usually only allow users to update their own profile.
-- Admins need to be able to update other users' KYC status.

CREATE OR REPLACE FUNCTION public.update_kyc_status(
  target_user_id UUID,
  new_status TEXT,
  rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
BEGIN
  -- Check if the executing user is an admin
  -- (Optional: enforcing role check inside the function for double safety)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can update KYC status';
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET 
    kyc_status = new_status,
    onboarding_completed_at = CASE 
      WHEN new_status = 'approved' THEN NOW() 
      ELSE onboarding_completed_at 
    END,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- If status is rejected, we might want to ensure the rejection reason is logged in kyc_submissions
  -- But usually that's done separately. This function focuses on the profile sync.
END;
$$;
