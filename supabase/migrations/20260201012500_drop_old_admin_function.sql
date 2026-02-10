-- Drop the old ambiguous function signature (the one using TEXT for IDs)
-- This resolves the "Could not choose the best candidate function" error.

DROP FUNCTION IF EXISTS public.admin_update_user_details(
  target_user_id UUID,
  new_balance NUMERIC,
  new_account_type_id TEXT,
  new_fan_membership_id TEXT,
  new_creator_level_id TEXT,
  new_kyc_status TEXT
);
