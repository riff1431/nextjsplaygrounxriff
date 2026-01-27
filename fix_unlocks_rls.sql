-- Allow authenticated users to insert their own unlocks
-- Crucial for the payment API to record the transaction when running in user context
CREATE POLICY "Fans can insert own unlock" ON public.truth_dare_unlocks
FOR INSERT
WITH CHECK (auth.uid() = fan_id);
