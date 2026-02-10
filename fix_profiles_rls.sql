-- Enable RLS on profiles if not active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to view their own profile (including wallet_balance)
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Allow users to update their own profile (for wallet deduction)
-- Note: Ideally wallet updates happen via secure RPC, but for this app structure we are doing it via API which acts as the user.
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 3. (Optional) Allow public read of basic fields if needed for other features, but keep it constrained for now.
-- Verify wallet_type is numeric
-- DO NOT RUN THIS IF YOU HAVE CUSTOM TYPES, just ensuring compatibility
-- ALTER TABLE public.profiles ALTER COLUMN wallet_balance TYPE NUMERIC USING wallet_balance::numeric;
