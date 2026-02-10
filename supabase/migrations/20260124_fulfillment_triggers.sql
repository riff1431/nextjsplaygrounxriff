-- Trigger to notify Fan when request is Delivered
CREATE OR REPLACE FUNCTION notify_fan_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
        INSERT INTO notifications (user_id, type, reference_id, message)
        VALUES (
            NEW.fan_id,
            'request_delivered',
            NEW.id,
            'Your confession request is ready! Click to view.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_request_delivery ON confession_requests;
CREATE TRIGGER on_request_delivery
    AFTER UPDATE ON confession_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_fan_delivery();
