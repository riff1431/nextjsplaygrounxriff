-- Function for admins to update user details (wallet, packages, badges, and KYC)
-- Fixed: Relaxed permission check to allow JWT metadata role 'admin' OR profiles table role 'admin'

CREATE OR REPLACE FUNCTION public.admin_update_user_details(
  target_user_id UUID,
  new_balance NUMERIC DEFAULT NULL,
  new_account_type_id UUID DEFAULT NULL,
  new_fan_membership_id UUID DEFAULT NULL,
  new_creator_level_id UUID DEFAULT NULL,
  new_kyc_status TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the executing user is an admin
  -- We allow access if:
  -- 1. The user has 'admin' rules in user_metadata (JWT)
  -- 2. OR The user has 'admin' role in public.profiles table
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

  -- Update Profile Details
  UPDATE public.profiles
  SET 
    account_type_id = new_account_type_id,
    fan_membership_id = new_fan_membership_id,
    creator_level_id = new_creator_level_id,
    kyc_status = COALESCE(new_kyc_status, kyc_status),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Update Wallet Balance
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
