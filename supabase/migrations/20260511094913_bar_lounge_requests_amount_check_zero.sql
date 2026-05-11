-- Update the check constraint for amount in bar_lounge_requests
-- Custom requests can now be free (amount = 0)
ALTER TABLE bar_lounge_requests DROP CONSTRAINT IF EXISTS bar_lounge_requests_amount_check;
ALTER TABLE bar_lounge_requests ADD CONSTRAINT bar_lounge_requests_amount_check CHECK (amount >= 0);
