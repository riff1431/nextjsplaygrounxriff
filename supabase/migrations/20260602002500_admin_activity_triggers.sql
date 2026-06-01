-- ═══════════════════════════════════════════════════════════
-- PlayGroundX — Admin Panel Activity Triggers
-- ═══════════════════════════════════════════════════════════

-- 1. Trigger function for platform suggestions
CREATE OR REPLACE FUNCTION notify_admins_on_suggestion()
RETURNS TRIGGER AS $$
DECLARE
    admin_row RECORD;
BEGIN
    FOR admin_row IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            admin_row.id,
            'system',
            'New Platform Suggestion 💡',
            'A user has submitted a new platform suggestion: "' || substring(NEW.content from 1 for 100) || '..."',
            '/admin/dashboard'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_suggestion_insert ON public.platform_suggestions;
CREATE TRIGGER trg_on_suggestion_insert
AFTER INSERT ON public.platform_suggestions
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_suggestion();

-- 2. Trigger function for withdrawal requests
CREATE OR REPLACE FUNCTION notify_admins_on_withdrawal_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_row RECORD;
    creator_name TEXT;
BEGIN
    -- Fetch creator display name or default
    SELECT COALESCE(full_name, username, 'A creator') INTO creator_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;

    FOR admin_row IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            admin_row.id,
            'system',
            'New Withdrawal Request 💰',
            creator_name || ' has requested a withdrawal of $' || to_char(NEW.amount, 'FM999,999,990.00'),
            '/admin/dashboard'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_withdrawal_request_insert ON public.withdrawal_requests;
CREATE TRIGGER trg_on_withdrawal_request_insert
AFTER INSERT ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_withdrawal_request();

-- Verify
SELECT 'Admin activity notification triggers created ✅' AS result;
