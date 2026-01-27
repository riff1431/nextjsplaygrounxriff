-- Ensure wallets table has RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Allow users to update their own wallet (for deductions)
CREATE POLICY "Users can update own wallet" ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id);
