-- Add 'custom' to bar_lounge_requests type CHECK constraint
-- This enables fans to send unlimited free-form custom requests in Bar Lounge sessions.
ALTER TABLE bar_lounge_requests DROP CONSTRAINT IF EXISTS bar_lounge_requests_type_check;
ALTER TABLE bar_lounge_requests ADD CONSTRAINT bar_lounge_requests_type_check
  CHECK (type IN ('song', 'champagne', 'vip_bottle', 'tip', 'drink', 'vip', 'booth', 'pin', 'custom'));
