-- Function for admins to update user details (wallet, packages, badges, and KYC)
-- Fixed: Changed parameter types from TEXT to UUID for ID columns to match table schema

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
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can manage users';
  END IF;

  -- Update Profile Details
  -- Note: We trust the input. If frontend sends NULL, it means we WANT null (or no change? logic was: replace if provided).
  -- Actually, the previous logic was: replace blindly. 
  -- But wait, if I want to "unset" a badge, I pass NULL.
  -- But if I don't want to change it, I should pass the CURRENT value?
  -- The UI sends the *selected* value. If the user selects "No Level", it sends "" which we convert to NULL in frontend.
  -- So we should just assignment.
  -- HOWEVER, in the previous version, I didn't use COALESCE for these IDs, which implies they would be set to NULL if not passed.
  -- The RPC is called with arguments. If an argument is NULL, it sets the column to NULL.
  -- This is correct behavior for "Removing a badge".
  -- Unlike kyc_status where we might want to keep it if not mentioned. 
  -- Bu actually, the frontend sends ALL fields currently.
  
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
