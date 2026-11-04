-- ============================================
-- 借機機 - 資料庫初始化腳本 (QR Code 版本)
-- ============================================
-- 使用方式：
-- 1. 登入 Supabase Dashboard
-- 2. 前往 SQL Editor
-- 3. 貼上此腳本並執行
-- ============================================

-- ============================================
-- 1. 建立資料表
-- ============================================

-- 使用者資料表（僅供管理員使用）
-- 與 Supabase Auth 的 auth.users 關聯
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 設備資料表
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    os TEXT,
    os_version TEXT,
    image_url TEXT,
    screen_password TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 借用記錄資料表（QR Code 版本 - 使用 borrower_name 而非 user_id）
CREATE TABLE IF NOT EXISTS public.borrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    borrower_name TEXT NOT NULL,
    borrower_email TEXT,
    purpose TEXT,
    borrowed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telegram 設定資料表
CREATE TABLE IF NOT EXISTS public.telegram_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_token TEXT,
    chat_id TEXT,
    thread_id TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設的 telegram_config 記錄（只會有一筆）
INSERT INTO public.telegram_config (is_enabled)
VALUES (false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. 建立索引（提升查詢效能）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices(status);
CREATE INDEX IF NOT EXISTS idx_borrows_device_id ON public.borrows(device_id);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON public.borrows(status);
CREATE INDEX IF NOT EXISTS idx_borrows_borrower_name ON public.borrows(borrower_name);

-- 每台設備最多一筆 active 借用
CREATE UNIQUE INDEX IF NOT EXISTS uniq_borrows_active_device
ON public.borrows(device_id) WHERE status = 'active';

-- ============================================
-- 3. 啟用 Row Level Security (RLS)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 建立輔助函數
-- ============================================

-- 檢查使用者是否為管理員
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 建立 RLS 政策
-- ============================================

-- ----- users 資料表 -----

-- 使用者可以讀取自己的資料
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 管理員可以讀取所有使用者
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
CREATE POLICY "Admin can read all users"
ON public.users FOR SELECT
TO authenticated
USING (public.is_admin());

-- ----- devices 資料表 -----

-- 只有管理員可以直接讀取 devices 表（含 screen_password）
-- 一般用戶透過 devices_with_borrower View 讀取（不含 screen_password）
DROP POLICY IF EXISTS "Anyone can read devices" ON public.devices;
DROP POLICY IF EXISTS "Admin can read devices" ON public.devices;
CREATE POLICY "Admin can read devices"
ON public.devices FOR SELECT
TO authenticated
USING (public.is_admin());

-- 只有管理員可以新增設備
DROP POLICY IF EXISTS "Admin can insert devices" ON public.devices;
CREATE POLICY "Admin can insert devices"
ON public.devices FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- 只有管理員可以更新設備
DROP POLICY IF EXISTS "Admin can update devices" ON public.devices;
CREATE POLICY "Admin can update devices"
ON public.devices FOR UPDATE
TO authenticated
USING (public.is_admin());

-- 只有管理員可以刪除設備
DROP POLICY IF EXISTS "Admin can delete devices" ON public.devices;
CREATE POLICY "Admin can delete devices"
ON public.devices FOR DELETE
TO authenticated
USING (public.is_admin());

-- ----- borrows 資料表 -----

-- 登入使用者可以讀取借用記錄（用於顯示誰在借用）
DROP POLICY IF EXISTS "Anyone can read borrows" ON public.borrows;
DROP POLICY IF EXISTS "Authenticated can read borrows" ON public.borrows;
CREATE POLICY "Authenticated can read borrows"
ON public.borrows FOR SELECT
TO authenticated
USING (true);

-- 不開放直接 INSERT / UPDATE：借用與歸還只能透過
-- borrow_device / return_device RPC（SECURITY DEFINER，不受 RLS 限制）
DROP POLICY IF EXISTS "Anyone can create borrows" ON public.borrows;
DROP POLICY IF EXISTS "Anyone can update borrows" ON public.borrows;

-- 管理員可以刪除借用記錄
DROP POLICY IF EXISTS "Admin can delete borrows" ON public.borrows;
CREATE POLICY "Admin can delete borrows"
ON public.borrows FOR DELETE
TO authenticated
USING (public.is_admin());

-- ----- telegram_config 資料表 -----

-- 只有管理員可以讀取和管理 Telegram 設定
-- Bot Token 是敏感資訊，不應暴露給前端
DROP POLICY IF EXISTS "Admin can manage telegram_config" ON public.telegram_config;
CREATE POLICY "Admin can manage telegram_config"
ON public.telegram_config FOR ALL
TO authenticated
USING (public.is_admin());

-- 移除匿名讀取權限（通知改由 Database Trigger 處理）
DROP POLICY IF EXISTS "Anyone can read telegram_config" ON public.telegram_config;

-- ============================================
-- 6. 建立 Trigger：自動建立 users 記錄
-- ============================================

-- 當使用者透過 Auth 註冊時，自動在 users 表建立對應記錄
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, created_at)
    VALUES (NEW.id, NEW.email, 'user', NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊的 trigger（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 建立 trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. 建立 Trigger：自動更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_devices_updated_at ON public.devices;
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_telegram_config_updated_at ON public.telegram_config;
CREATE TRIGGER update_telegram_config_updated_at
    BEFORE UPDATE ON public.telegram_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 管理員手動把設備從 borrowed 改成其他狀態時，自動結束 active 借用
-- （會觸發 on_borrow_returned，照常發出歸還通知）
CREATE OR REPLACE FUNCTION public.close_active_borrow()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.borrows
    SET status = 'returned', returned_at = NOW()
    WHERE device_id = NEW.id AND status = 'active';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.close_active_borrow() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS close_active_borrow_on_status_change ON public.devices;
CREATE TRIGGER close_active_borrow_on_status_change
    AFTER UPDATE OF status ON public.devices
    FOR EACH ROW
    WHEN (OLD.status = 'borrowed' AND NEW.status <> 'borrowed')
    EXECUTE FUNCTION public.close_active_borrow();

-- ============================================
-- 8. 建立 View：設備詳情（含借用者資訊）
-- ============================================

-- View 不包含 screen_password，一般用戶透過此 View 讀取
-- 注意：不可設定 security_invoker，View 需以 owner 權限繞過 devices 的 admin-only RLS
DROP VIEW IF EXISTS public.devices_with_borrower;
CREATE VIEW public.devices_with_borrower AS
SELECT
    d.id,
    d.name,
    d.brand,
    d.model,
    d.os,
    d.os_version,
    d.image_url,
    d.status,
    d.notes,
    d.created_at,
    d.updated_at,
    b.id AS active_borrow_id,
    b.borrower_name,
    b.borrower_email,
    b.purpose AS borrow_purpose,
    b.borrowed_at
FROM public.devices d
LEFT JOIN public.borrows b ON d.id = b.device_id AND b.status = 'active';

-- View 以 owner 權限執行、不受 RLS 限制，所以用 GRANT 控制：僅登入使用者可讀
REVOKE ALL ON public.devices_with_borrower FROM anon;
GRANT SELECT ON public.devices_with_borrower TO authenticated;

-- ============================================
-- 9. 建立 RPC 函數：借用設備（QR Code 版本）
-- ============================================

CREATE OR REPLACE FUNCTION public.borrow_device(
    p_device_id UUID,
    p_borrower_name TEXT,
    p_borrower_email TEXT DEFAULT NULL,
    p_purpose TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_device_status TEXT;
    v_borrow_id UUID;
BEGIN
    -- 檢查借用者名稱
    IF p_borrower_name IS NULL OR TRIM(p_borrower_name) = '' THEN
        RETURN json_build_object('success', false, 'error', '請輸入借用者姓名');
    END IF;

    -- 檢查設備是否可借用
    SELECT status INTO v_device_status
    FROM public.devices
    WHERE id = p_device_id
    FOR UPDATE;  -- 鎖定該行，防止競爭條件

    IF v_device_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', '設備不存在');
    END IF;

    IF v_device_status != 'available' THEN
        RETURN json_build_object('success', false, 'error', '設備目前不可借用');
    END IF;

    -- 更新設備狀態
    UPDATE public.devices
    SET status = 'borrowed'
    WHERE id = p_device_id;

    -- 建立借用記錄
    INSERT INTO public.borrows (device_id, borrower_name, borrower_email, purpose, status)
    VALUES (p_device_id, TRIM(p_borrower_name), NULLIF(TRIM(p_borrower_email), ''), p_purpose, 'active')
    RETURNING id INTO v_borrow_id;

    RETURN json_build_object(
        'success', true,
        'borrow_id', v_borrow_id,
        'message', '借用成功'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. 建立 RPC 函數：歸還設備（QR Code 版本）
-- ============================================

CREATE OR REPLACE FUNCTION public.return_device(
    p_borrow_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_device_id UUID;
    v_borrow_status TEXT;
BEGIN
    -- 取得借用記錄資訊
    SELECT device_id, status INTO v_device_id, v_borrow_status
    FROM public.borrows
    WHERE id = p_borrow_id
    FOR UPDATE;

    IF v_device_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', '借用記錄不存在');
    END IF;

    IF v_borrow_status != 'active' THEN
        RETURN json_build_object('success', false, 'error', '此設備已歸還');
    END IF;

    -- 必須先更新設備狀態：歸還通知 trigger 在借用記錄更新當下就會讀取設備狀態，
    -- 順序反過來會讓通知顯示設備仍為借用中。
    -- 更新設備時 close_active_borrow trigger 會結束這筆借用並發出歸還通知。
    UPDATE public.devices
    SET status = 'available'
    WHERE id = v_device_id;

    -- 保險：trigger 已處理時這裡不會更新任何資料，也不會重複發通知
    UPDATE public.borrows
    SET status = 'returned', returned_at = NOW()
    WHERE id = p_borrow_id AND status = 'active';

    RETURN json_build_object(
        'success', true,
        'message', '歸還成功'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 借用與歸還僅限登入使用者
REVOKE EXECUTE ON FUNCTION public.borrow_device(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.return_device(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrow_device(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_device(UUID) TO authenticated;

-- ============================================
-- 11. 建立 Storage Bucket 與 Policies
-- ============================================

-- 建立設備圖片 bucket（公開讀取）
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-images', 'device-images', true)
ON CONFLICT (id) DO NOTHING;

-- 允許管理員上傳圖片
DROP POLICY IF EXISTS "Admin can upload images" ON storage.objects;
CREATE POLICY "Admin can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-images' AND public.is_admin());

-- 允許任何人讀取圖片
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'device-images');

-- 允許管理員刪除圖片
DROP POLICY IF EXISTS "Admin can delete images" ON storage.objects;
CREATE POLICY "Admin can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'device-images' AND public.is_admin());

-- ============================================
-- 12. 啟用 pg_net 擴充套件（用於 Telegram 通知）
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- 13. 建立 Telegram 通知函數與觸發器
-- ============================================

-- 內部函數：所有設備目前狀態（借還通知與「發送借用狀況」共用）
CREATE OR REPLACE FUNCTION public._device_status_text()
RETURNS TEXT AS $$
DECLARE
    v_text TEXT := E'\n\n📊 目前狀態：';
    v_row RECORD;
BEGIN
    FOR v_row IN
        SELECT d.name, d.status, b.borrower_name AS current_borrower
        FROM public.devices d
        LEFT JOIN public.borrows b ON d.id = b.device_id AND b.status = 'active'
        ORDER BY d.name
    LOOP
        IF v_row.status = 'available' THEN
            v_text := v_text || E'\n' || '🟢 ' || v_row.name || ' - 可借用';
        ELSIF v_row.status = 'borrowed' THEN
            v_text := v_text || E'\n' || '🔴 ' || v_row.name || ' - ' || COALESCE(v_row.current_borrower, '未知');
        ELSIF v_row.status = 'maintenance' THEN
            v_text := v_text || E'\n' || '🟡 ' || v_row.name || ' - 維修中';
        END IF;
    END LOOP;

    RETURN v_text || E'\n\n🌐 系統連結：https://cpsc2fe.github.io/device-borrowing-manager/';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 內部函數：發送 Telegram 訊息；未啟用或設定不完整時回傳 false
CREATE OR REPLACE FUNCTION public._telegram_post(p_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
    v_payload JSONB;
BEGIN
    SELECT * INTO v_config FROM public.telegram_config ORDER BY updated_at DESC LIMIT 1;

    IF v_config IS NULL OR NOT v_config.is_enabled OR v_config.bot_token IS NULL OR v_config.chat_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_payload := jsonb_build_object('chat_id', v_config.chat_id, 'text', p_text);

    IF v_config.thread_id IS NOT NULL AND v_config.thread_id != '' THEN
        v_payload := v_payload || jsonb_build_object('message_thread_id', v_config.thread_id::INTEGER);
    END IF;

    -- pg_net 為非同步，這裡只代表請求已送出
    -- ponytail: 預設 5 秒逾時曾因 TLS 握手過慢而漏發；pg_net 不會重試，仍漏發再加排程重送 net._http_response 失敗項
    PERFORM net.http_post(
        url := 'https://api.telegram.org/bot' || v_config.bot_token || '/sendMessage',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := v_payload,
        timeout_milliseconds := 15000
    );
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 內部函數不可經由 API 直接呼叫（否則任何人都能對群組發任意訊息）
REVOKE EXECUTE ON FUNCTION public._device_status_text() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._telegram_post(TEXT) FROM PUBLIC, anon, authenticated;

-- 發送 Telegram 通知的函數
CREATE OR REPLACE FUNCTION public.send_telegram_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_device RECORD;
    v_message TEXT;
    v_borrower_display TEXT;
    v_now TEXT;
BEGIN
    -- Telegram 設定檢查由 _telegram_post 處理

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
        IF v_device.screen_password IS NOT NULL AND v_device.screen_password != '' THEN
            v_message := v_message || '螢幕密碼：' || v_device.screen_password || E'\n';
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

    PERFORM public._telegram_post(v_message || public._device_status_text());

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- 發生錯誤時記錄但不阻止操作
        RAISE WARNING 'Telegram notification failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 手動發送目前借用狀況到 Telegram（僅管理員可執行）
CREATE OR REPLACE FUNCTION public.send_borrow_status()
RETURNS JSON AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', '權限不足');
    END IF;

    IF NOT public._telegram_post(
        '📋 目前借用狀況' || E'\n' ||
        '━━━━━━━━━━━━━━━' || E'\n' ||
        '時間：' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS') ||
        public._device_status_text()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Telegram 通知未啟用或設定不完整');
    END IF;

    RETURN json_build_object('success', true, 'message', '已發送到 Telegram');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.send_borrow_status() FROM PUBLIC, anon;

-- ============================================
-- 14. 建立用戶管理 RPC 函數
-- ============================================

-- 建立用戶（僅管理員可執行）
-- 注意：此函數需要啟用 Supabase 的 supabase_admin 角色
CREATE OR REPLACE FUNCTION public.create_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'user'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 檢查是否為管理員
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', '權限不足');
    END IF;

    -- 檢查 email 格式
    IF p_email IS NULL OR TRIM(p_email) = '' OR p_email NOT LIKE '%@%' THEN
        RETURN json_build_object('success', false, 'error', '請輸入有效的 Email');
    END IF;

    -- 檢查密碼長度
    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RETURN json_build_object('success', false, 'error', '密碼至少需要 6 個字元');
    END IF;

    -- 檢查角色是否有效
    IF p_role NOT IN ('admin', 'user') THEN
        RETURN json_build_object('success', false, 'error', '無效的角色');
    END IF;

    -- 使用 Supabase Auth Admin API 建立用戶
    -- 透過 auth.users 表直接插入（需要 SECURITY DEFINER 權限）
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        LOWER(TRIM(p_email)),
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO v_user_id;

    -- 在 public.users 表中設定角色
    UPDATE public.users
    SET role = p_role
    WHERE id = v_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', '用戶建立成功'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', '此 Email 已被使用');
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除用戶（僅管理員可執行）
CREATE OR REPLACE FUNCTION public.delete_user(
    p_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    -- 檢查是否為管理員
    IF NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', '權限不足');
    END IF;

    -- 不能刪除自己
    IF p_user_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', '不能刪除自己的帳號');
    END IF;

    -- 刪除用戶（會自動連帶刪除 public.users 中的記錄，因為有 CASCADE）
    DELETE FROM auth.users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', '用戶不存在');
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', '用戶已刪除'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. 新增螢幕解鎖密碼欄位（若不存在）
-- ============================================

-- 新增欄位到 devices 表
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS screen_password TEXT;


-- ============================================
-- 完成！
-- ============================================
-- 執行完畢後，你應該可以在 Table Editor 看到以下資料表：
-- - users（僅供管理員認證用）
-- - devices
-- - borrows
-- - telegram_config
--
-- 以及一個 View：
-- - devices_with_borrower
--
-- 接下來請：
-- 1. 透過 Authentication > Users 建立管理員帳號
-- 2. 在 Table Editor > users 將該使用者的 role 改為 'admin'
-- 3. 在系統設定中配置 Telegram Bot Token 和 Chat ID
-- 4. 開始使用系統！
-- ============================================
