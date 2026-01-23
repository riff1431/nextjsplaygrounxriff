-- Drop the function first to allow parameter name changes
DROP FUNCTION IF EXISTS approve_transaction(uuid);

CREATE OR REPLACE FUNCTION approve_transaction(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_wallet_exists boolean;
BEGIN
  -- Get transaction details
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM transactions
  WHERE id = transaction_id;

  -- Validation
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction via ID % not found', transaction_id;
  END IF;

  IF v_status != 'pending' THEN
    -- If already completed, just return, don't error out to avoid frontend confusion if re-clicked
    IF v_status = 'completed' THEN
        RETURN;
    END IF;
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- 1. Update Transaction Status
  UPDATE transactions
  SET status = 'completed',
      updated_at = now()
  WHERE id = transaction_id;

  -- 2. Update Wallet Balance (Upsert pattern)
  -- Try to update first
  UPDATE wallets
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- If no row updated, insert new wallet
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, created_at, updated_at)
    VALUES (v_user_id, v_amount, now(), now());
  END IF;

END;
$$;
