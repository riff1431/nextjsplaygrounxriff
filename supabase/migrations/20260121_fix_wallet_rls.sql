-- Allow users to create their own wallet
-- First, drop existing policy if it conflicts (optional, but good for safety if we are unsure of names)
DROP POLICY IF EXISTS "Users can insert their own wallet" ON wallets;

CREATE POLICY "Users can insert their own wallet"
ON wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also ensure they can view it (usually already exists but good to double check or add)
-- DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
-- CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);

-- And update
-- DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
-- CREATE POLICY "Users can update their own wallet" ON wallets FOR UPDATE USING (auth.uid() = user_id);
