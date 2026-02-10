-- Wallet RPC Functions for Safe Transactions

-- 0. Ensure Wallets Table Exists
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy: User can view their own wallet (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'wallets' 
        AND policyname = 'Users can view own wallet'
    ) THEN
        CREATE POLICY "Users can view own wallet" ON wallets
          FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
END $$;


-- 1. Add Balance
CREATE OR REPLACE FUNCTION add_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = wallets.balance + p_amount;
  
  -- Ideally log transaction here, but keeping simple for MVP
END;
$$;

-- 2. Deduct Balance
CREATE OR REPLACE FUNCTION deduct_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal NUMERIC;
BEGIN
  -- Lock row for update
  SELECT balance INTO current_bal
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_bal IS NULL OR current_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount
  WHERE user_id = p_user_id;
END;
$$;
