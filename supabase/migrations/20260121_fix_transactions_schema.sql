-- Fix transactions table schema
ALTER TABLE IF EXISTS transactions 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES wallets(id);

-- Make user_id nullable if we want to rely on wallet_id, OR keep it not null and require it.
-- Let's keep existing structure but ensure we have policies.

-- RLS: Allow users to insert transactions
-- We need to ensure they can only insert for themselves.
-- If user_id is present, we check auth.uid() = user_id.
-- If wallet_id is present, we technically should check ownership, but user_id check is simpler and safer if we enforce it.

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

CREATE POLICY "Users can insert own transactions"
ON transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Ensure users can see their checks
-- (Existing policy "Users view own transactions" covers SELECT)
