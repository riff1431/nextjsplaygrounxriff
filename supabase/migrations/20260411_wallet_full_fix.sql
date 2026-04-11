-- ====================================================
-- Wallet Full Fix: Missing RPCs + Withdrawal Table
-- ====================================================

-- 1. Fix add_funds RPC (wallet page calls this exact name)
CREATE OR REPLACE FUNCTION add_funds(
    user_uuid UUID,
    amount_val NUMERIC,
    desc_text TEXT DEFAULT 'Top Up'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Upsert wallet
    INSERT INTO wallets (user_id, balance)
    VALUES (user_uuid, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get wallet id
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = user_uuid;

    -- Update balance
    UPDATE wallets
    SET balance = balance + amount_val,
        updated_at = now()
    WHERE user_id = user_uuid;

    -- Log transaction
    INSERT INTO transactions (wallet_id, user_id, amount, type, description, status, payment_method)
    VALUES (v_wallet_id, user_uuid, amount_val, 'deposit', desc_text, 'completed', 'system');
END;
$$;

-- 2. Create withdrawal_requests table (if not exists)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 10),
    method TEXT NOT NULL CHECK (method IN ('paypal', 'bank_transfer')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Creator can view their own requests
DROP POLICY IF EXISTS "Users view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Users view own withdrawals" ON withdrawal_requests
    FOR SELECT USING (auth.uid() = user_id);

-- RLS: Creator can insert their own requests
DROP POLICY IF EXISTS "Users insert own withdrawals" ON withdrawal_requests;
CREATE POLICY "Users insert own withdrawals" ON withdrawal_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: Admin can do everything
DROP POLICY IF EXISTS "Admins manage withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins manage withdrawals" ON withdrawal_requests
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- 3. request_withdrawal RPC (WithdrawalModal calls this)
CREATE OR REPLACE FUNCTION request_withdrawal(
    amount_val NUMERIC,
    method_val TEXT,
    details_val JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_balance NUMERIC;
    v_wallet_id UUID;
    v_request_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check balance
    SELECT id, balance INTO v_wallet_id, v_balance
    FROM wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF amount_val > v_balance THEN
        RAISE EXCEPTION 'Insufficient balance. Available: $%', v_balance;
    END IF;

    IF amount_val < 10 THEN
        RAISE EXCEPTION 'Minimum withdrawal is $10';
    END IF;

    -- Deduct from wallet immediately (hold funds)
    UPDATE wallets
    SET balance = balance - amount_val,
        updated_at = now()
    WHERE user_id = v_user_id;

    -- Log withdrawal transaction
    INSERT INTO transactions (wallet_id, user_id, amount, type, description, status, payment_method, metadata)
    VALUES (
        v_wallet_id,
        v_user_id,
        amount_val,
        'withdrawal',
        'Withdrawal Request via ' || method_val,
        'pending',
        method_val,
        jsonb_build_object('payout_details', details_val)
    );

    -- Create withdrawal request record
    INSERT INTO withdrawal_requests (user_id, amount, method, details)
    VALUES (v_user_id, amount_val, method_val, details_val)
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'amount', amount_val,
        'method', method_val
    );
END;
$$;

-- 4. Ensure wallets has an id column (some migrations use user_id as PK, some use id)
-- The transactions table references wallets(id) so we need it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'id'
    ) THEN
        ALTER TABLE wallets ADD COLUMN id UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;
END $$;

-- 5. Ensure wallets has currency column
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
