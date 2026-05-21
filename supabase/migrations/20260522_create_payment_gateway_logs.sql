-- Create payment_gateway_logs table
CREATE TABLE IF NOT EXISTS public.payment_gateway_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- 'riskpaygo', 'stripe', etc.
    event_type TEXT NOT NULL, -- 'test_connection', 'create_payment', 'webhook_received', 'webhook_verified', 'webhook_failed'
    order_id TEXT, -- local transaction reference
    payment_ref TEXT, -- gateway reference
    status TEXT,
    request_payload JSONB DEFAULT '{}'::JSONB,
    response_payload JSONB DEFAULT '{}'::JSONB,
    status_code INTEGER,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_gateway_logs ENABLE ROW LEVEL SECURITY;

-- Allow only admins to select gateway logs
CREATE POLICY "Admins can view payment gateway logs"
ON public.payment_gateway_logs FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
);

-- Allow service_role to do everything (inserts are done by the backend server API)
CREATE POLICY "Service role can manage payment gateway logs"
ON public.payment_gateway_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure transactions has a payment_method column if not present (safely check first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN payment_method TEXT;
    END IF;
END $$;
