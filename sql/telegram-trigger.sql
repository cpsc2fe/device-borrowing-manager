-- 需要先啟用 pg_net extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_telegram()
RETURNS TRIGGER AS $$
DECLARE
    device_name TEXT;
    user_email TEXT;
    payload JSONB;
BEGIN
    -- 取得設備名稱與使用者 email
    SELECT name INTO device_name FROM public.devices WHERE id = NEW.device_id;
    SELECT email INTO user_email FROM public.users WHERE id = NEW.user_id;

    IF TG_OP = 'INSERT' THEN
        payload = jsonb_build_object(
            'type', 'borrow',
            'deviceName', device_name,
            'userEmail', user_email,
            'purpose', NEW.purpose
        );
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'returned' AND OLD.status = 'active' THEN
        payload = jsonb_build_object(
            'type', 'return',
            'deviceName', device_name,
            'userEmail', user_email
        );
    ELSE
        RETURN NEW;
    END IF;

    PERFORM net.http_post(
        url := 'https://<your-project-ref>.supabase.co/functions/v1/send-telegram-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || '<your-anon-key>'
        ),
        body := payload
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_borrow_change ON public.borrows;
CREATE TRIGGER on_borrow_change
    AFTER INSERT OR UPDATE ON public.borrows
    FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();
