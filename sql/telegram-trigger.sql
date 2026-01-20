-- ============================================
-- Telegram 通知 Database Hook
-- ============================================
-- 使用 pg_net 擴充套件在資料庫層級自動發送 Telegram 通知
-- 當借用或歸還設備時，會自動觸發通知
--
-- 使用方式：
-- 1. 先執行 database.sql 建立基本資料表
-- 2. 在 Supabase Dashboard 執行此腳本
-- ============================================

-- 啟用 pg_net 擴充套件（用於發送 HTTP 請求）
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- 建立發送 Telegram 通知的函數
-- ============================================

CREATE OR REPLACE FUNCTION public.send_telegram_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_config RECORD;
    v_device RECORD;
    v_message TEXT;
    v_payload JSONB;
    v_all_devices RECORD;
    v_status_list TEXT := '';
    v_borrower_display TEXT;
    v_now TEXT;
BEGIN
    -- 取得 Telegram 設定
    SELECT * INTO v_config FROM public.telegram_config LIMIT 1;

    -- 如果未啟用或缺少設定，直接返回
    IF v_config IS NULL OR NOT v_config.is_enabled OR v_config.bot_token IS NULL OR v_config.chat_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 取得設備資訊
    SELECT * INTO v_device FROM public.devices WHERE id = COALESCE(NEW.device_id, OLD.device_id);

    IF v_device IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 格式化時間
    v_now := TO_CHAR(NOW() AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS');

    -- 建立借用者顯示名稱
    IF NEW.borrower_email IS NOT NULL AND NEW.borrower_email != '' THEN
        v_borrower_display := NEW.borrower_name || ' (' || NEW.borrower_email || ')';
    ELSE
        v_borrower_display := NEW.borrower_name;
    END IF;

    -- 根據操作類型建立訊息
    IF TG_OP = 'INSERT' THEN
        -- 借用通知
        v_message := '📱 設備借用通知' || E'\n';
        v_message := v_message || '━━━━━━━━━━━━━━━' || E'\n';
        v_message := v_message || '設備：' || v_device.name || E'\n';
        v_message := v_message || '借用者：' || v_borrower_display || E'\n';
        IF NEW.purpose IS NOT NULL AND NEW.purpose != '' THEN
            v_message := v_message || '用途：' || NEW.purpose || E'\n';
        END IF;
        v_message := v_message || '時間：' || v_now;

    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'returned' THEN
        -- 歸還通知
        v_message := '✅ 設備歸還通知' || E'\n';
        v_message := v_message || '━━━━━━━━━━━━━━━' || E'\n';
        v_message := v_message || '設備：' || v_device.name || E'\n';
        v_message := v_message || '歸還者：' || NEW.borrower_name || E'\n';
        v_message := v_message || '時間：' || v_now;
    ELSE
        -- 其他情況不發送通知
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 取得所有設備狀態
    v_message := v_message || E'\n\n📊 目前狀態：';

    FOR v_all_devices IN
        SELECT d.name, d.status, b.borrower_name as current_borrower
        FROM public.devices d
        LEFT JOIN public.borrows b ON d.id = b.device_id AND b.status = 'active'
        ORDER BY d.name
    LOOP
        IF v_all_devices.status = 'available' THEN
            v_message := v_message || E'\n' || '🟢 ' || v_all_devices.name || ' - 可借用';
        ELSIF v_all_devices.status = 'borrowed' THEN
            v_message := v_message || E'\n' || '🔴 ' || v_all_devices.name || ' - ' || COALESCE(v_all_devices.current_borrower, '未知');
        ELSIF v_all_devices.status = 'maintenance' THEN
            v_message := v_message || E'\n' || '🟡 ' || v_all_devices.name || ' - 維修中';
        END IF;
    END LOOP;

    -- 建立 Telegram API payload
    v_payload := jsonb_build_object(
        'chat_id', v_config.chat_id,
        'text', v_message
    );

    -- 如果有 thread_id，加入 payload
    IF v_config.thread_id IS NOT NULL AND v_config.thread_id != '' THEN
        v_payload := v_payload || jsonb_build_object('message_thread_id', v_config.thread_id::INTEGER);
    END IF;

    -- 使用 pg_net 發送 HTTP POST 請求到 Telegram API
    PERFORM net.http_post(
        url := 'https://api.telegram.org/bot' || v_config.bot_token || '/sendMessage',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := v_payload
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- 發生錯誤時記錄但不阻止操作
        RAISE WARNING 'Telegram notification failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 建立觸發器
-- ============================================

-- 刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS on_borrow_created ON public.borrows;
DROP TRIGGER IF EXISTS on_borrow_returned ON public.borrows;

-- 借用時發送通知
CREATE TRIGGER on_borrow_created
    AFTER INSERT ON public.borrows
    FOR EACH ROW
    EXECUTE FUNCTION public.send_telegram_notification();

-- 歸還時發送通知
CREATE TRIGGER on_borrow_returned
    AFTER UPDATE ON public.borrows
    FOR EACH ROW
    WHEN (OLD.status = 'active' AND NEW.status = 'returned')
    EXECUTE FUNCTION public.send_telegram_notification();

-- ============================================
-- 完成！
-- ============================================
-- 現在當有人借用或歸還設備時，系統會自動發送 Telegram 通知
-- 確保在 telegram_config 表中設定好 bot_token、chat_id 並將 is_enabled 設為 true
-- ============================================
