-- Drop the function first to allow parameter name changes
DROP FUNCTION IF EXISTS approve_transaction(uuid);

CREATE OR REPLACE FUNCTION approve_transaction(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id uuid;
  v_amount numeric;
  v_status text;
BEGIN
  -- Get transaction details
  SELECT wallet_id, amount, status INTO v_wallet_id, v_amount, v_status
  FROM transactions
  WHERE id = transaction_id;

  -- Validation
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction via ID % not found', transaction_id;
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- Start Transaction
  
  -- 1. Update Transaction Status
  UPDATE transactions
  SET status = 'completed',
      updated_at = now()
  WHERE id = transaction_id;

  -- 2. Update Wallet Balance
  UPDATE wallets
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

END;
$$;
