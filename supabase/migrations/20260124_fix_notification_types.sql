-- Simply drop the constraint to allow any notification type (e.g. 'request_delivered')
-- We won't re-add it for now to avoid conflicts with existing data.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
