-- Function for admins to update user details (wallet, packages, badges)
-- Bypasses RLS to allow full management

CREATE OR REPLACE FUNCTION public.admin_update_user_details(
  target_user_id UUID,
  new_balance NUMERIC DEFAULT NULL,
  new_account_type_id TEXT DEFAULT NULL,
  new_fan_membership_id TEXT DEFAULT NULL,
  new_creator_level_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can manage users';
  END IF;

  -- Update Profile Details
  -- We use COALESCE to keep existing values if NULL is passed, 
  -- BUT we want to allow clearing values too. 
  -- So checking specific logic: assuming frontend sends current value if unchanged, or specific 'null' string if clearing?
  -- Actually, let's keep it simple: frontend sends the intended final state string (or null).
  
  UPDATE public.profiles
  SET 
    account_type_id = new_account_type_id,
    fan_membership_id = new_fan_membership_id,
    creator_level_id = new_creator_level_id,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Update Wallet Balance
  -- Insert user_id if not exists
  IF new_balance IS NOT NULL THEN
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (target_user_id, new_balance, 'USD')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = EXCLUDED.balance,
      updated_at = NOW();
  END IF;

END;
$$;
