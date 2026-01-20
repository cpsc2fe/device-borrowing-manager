-- ============================================
-- 測試機借用系統 - 資料庫初始化腳本 (QR Code 版本)
-- ============================================
-- 使用方式：
-- 1. 登入 Supabase Dashboard
-- 2. 前往 SQL Editor
-- 3. 貼上此腳本並執行
--
-- 如果是從舊版本升級，請先執行 sql/migrate-to-qr.sql
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

-- 任何人（包含匿名）可以讀取設備列表
DROP POLICY IF EXISTS "Anyone can read devices" ON public.devices;
CREATE POLICY "Anyone can read devices"
ON public.devices FOR SELECT
TO anon, authenticated
USING (true);

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

-- 任何人可以讀取借用記錄（用於顯示誰在借用）
DROP POLICY IF EXISTS "Anyone can read borrows" ON public.borrows;
CREATE POLICY "Anyone can read borrows"
ON public.borrows FOR SELECT
TO anon, authenticated
USING (true);

-- 任何人可以建立借用記錄（透過 RPC 函數）
DROP POLICY IF EXISTS "Anyone can create borrows" ON public.borrows;
CREATE POLICY "Anyone can create borrows"
ON public.borrows FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 任何人可以更新借用記錄（用於歸還，透過 RPC 函數）
DROP POLICY IF EXISTS "Anyone can update borrows" ON public.borrows;
CREATE POLICY "Anyone can update borrows"
ON public.borrows FOR UPDATE
TO anon, authenticated
USING (true);

-- 管理員可以刪除借用記錄
DROP POLICY IF EXISTS "Admin can delete borrows" ON public.borrows;
CREATE POLICY "Admin can delete borrows"
ON public.borrows FOR DELETE
TO authenticated
USING (public.is_admin());

-- ----- telegram_config 資料表 -----

-- 管理員可以完全管理 Telegram 設定
DROP POLICY IF EXISTS "Admin can manage telegram_config" ON public.telegram_config;
CREATE POLICY "Admin can manage telegram_config"
ON public.telegram_config FOR ALL
TO authenticated
USING (public.is_admin());

-- 任何人可以讀取 Telegram 設定（前端發送通知用）
DROP POLICY IF EXISTS "Anyone can read telegram_config" ON public.telegram_config;
CREATE POLICY "Anyone can read telegram_config"
ON public.telegram_config FOR SELECT
TO anon, authenticated
USING (true);

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

-- ============================================
-- 8. 建立 View：設備詳情（含借用者資訊）
-- ============================================

DROP VIEW IF EXISTS public.devices_with_borrower;
CREATE VIEW public.devices_with_borrower AS
SELECT
    d.*,
    b.id AS active_borrow_id,
    b.borrower_name,
    b.borrower_email,
    b.purpose AS borrow_purpose,
    b.borrowed_at
FROM public.devices d
LEFT JOIN public.borrows b ON d.id = b.device_id AND b.status = 'active';

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

    -- 建立借用記錄
    INSERT INTO public.borrows (device_id, borrower_name, borrower_email, purpose, status)
    VALUES (p_device_id, TRIM(p_borrower_name), NULLIF(TRIM(p_borrower_email), ''), p_purpose, 'active')
    RETURNING id INTO v_borrow_id;

    -- 更新設備狀態
    UPDATE public.devices
    SET status = 'borrowed'
    WHERE id = p_device_id;

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

    -- 更新借用記錄
    UPDATE public.borrows
    SET status = 'returned', returned_at = NOW()
    WHERE id = p_borrow_id;

    -- 更新設備狀態
    UPDATE public.devices
    SET status = 'available'
    WHERE id = v_device_id;

    RETURN json_build_object(
        'success', true,
        'message', '歸還成功'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- 3. 開始使用系統！
-- ============================================
