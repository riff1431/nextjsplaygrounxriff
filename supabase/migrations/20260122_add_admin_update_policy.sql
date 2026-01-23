-- Allow admins to update transactions (e.g., set status to 'rejected' or 'approved')
CREATE POLICY "Admins can update transactions"
ON transactions
FOR UPDATE
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
