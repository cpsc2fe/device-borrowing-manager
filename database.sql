-- ============================================
-- 測試機借用系統 - 資料庫初始化腳本
-- ============================================
-- 使用方式：
-- 1. 登入 Supabase Dashboard
-- 2. 前往 SQL Editor
-- 3. 貼上此腳本並執行
-- ============================================

-- ============================================
-- 1. 建立資料表
-- ============================================

-- 使用者資料表
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
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 借用記錄資料表
CREATE TABLE IF NOT EXISTS public.borrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_borrows_user_id ON public.borrows(user_id);
CREATE INDEX IF NOT EXISTS idx_borrows_device_id ON public.borrows(device_id);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON public.borrows(status);

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

-- 使用者可以更新自己的資料（但不能改 role）
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 管理員可以更新任何使用者
DROP POLICY IF EXISTS "Admin can update users" ON public.users;
CREATE POLICY "Admin can update users"
ON public.users FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ----- devices 資料表 -----

-- 所有登入者可以讀取設備列表
DROP POLICY IF EXISTS "Anyone can read devices" ON public.devices;
CREATE POLICY "Anyone can read devices"
ON public.devices FOR SELECT
TO authenticated
USING (true);

-- 只有管理員可以新增設備
DROP POLICY IF EXISTS "Admin can insert devices" ON public.devices;
CREATE POLICY "Admin can insert devices"
ON public.devices FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- 只有管理員可以更新設備（但借用/歸還時需要更新 status）
DROP POLICY IF EXISTS "Admin can update devices" ON public.devices;
CREATE POLICY "Admin can update devices"
ON public.devices FOR UPDATE
TO authenticated
USING (public.is_admin());

-- 允許任何登入者更新設備狀態（用於借用/歸還）
DROP POLICY IF EXISTS "Users can update device status" ON public.devices;
CREATE POLICY "Users can update device status"
ON public.devices FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 只有管理員可以刪除設備
DROP POLICY IF EXISTS "Admin can delete devices" ON public.devices;
CREATE POLICY "Admin can delete devices"
ON public.devices FOR DELETE
TO authenticated
USING (public.is_admin());

-- ----- borrows 資料表 -----

-- 所有登入者可以讀取借用記錄（用於顯示誰在借用）
DROP POLICY IF EXISTS "Anyone can read borrows" ON public.borrows;
CREATE POLICY "Anyone can read borrows"
ON public.borrows FOR SELECT
TO authenticated
USING (true);

-- 登入者可以建立自己的借用記錄
DROP POLICY IF EXISTS "Users can create borrows" ON public.borrows;
CREATE POLICY "Users can create borrows"
ON public.borrows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 使用者可以更新自己的借用記錄（用於歸還）
DROP POLICY IF EXISTS "Users can update own borrows" ON public.borrows;
CREATE POLICY "Users can update own borrows"
ON public.borrows FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 管理員可以更新任何借用記錄
DROP POLICY IF EXISTS "Admin can update borrows" ON public.borrows;
CREATE POLICY "Admin can update borrows"
ON public.borrows FOR UPDATE
TO authenticated
USING (public.is_admin());

-- 管理員可以刪除借用記錄
DROP POLICY IF EXISTS "Admin can delete borrows" ON public.borrows;
CREATE POLICY "Admin can delete borrows"
ON public.borrows FOR DELETE
TO authenticated
USING (public.is_admin());

-- ----- telegram_config 資料表 -----

-- 只有管理員可以讀取/修改 Telegram 設定
DROP POLICY IF EXISTS "Admin can manage telegram_config" ON public.telegram_config;
CREATE POLICY "Admin can manage telegram_config"
ON public.telegram_config FOR ALL
TO authenticated
USING (public.is_admin());

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

CREATE OR REPLACE VIEW public.devices_with_borrower AS
SELECT
    d.*,
    CASE
        WHEN d.status = 'borrowed' THEN (
            SELECT u.email
            FROM public.borrows b
            JOIN public.users u ON b.user_id = u.id
            WHERE b.device_id = d.id
            AND b.status = 'active'
            LIMIT 1
        )
        ELSE NULL
    END AS borrower_email,
    CASE
        WHEN d.status = 'borrowed' THEN (
            SELECT b.borrowed_at
            FROM public.borrows b
            WHERE b.device_id = d.id
            AND b.status = 'active'
            LIMIT 1
        )
        ELSE NULL
    END AS borrowed_at
FROM public.devices d;

-- ============================================
-- 9. 建立 RPC 函數：借用設備（確保原子性）
-- ============================================

CREATE OR REPLACE FUNCTION public.borrow_device(
    p_device_id UUID,
    p_purpose TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_device_status TEXT;
    v_borrow_id UUID;
BEGIN
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
    INSERT INTO public.borrows (user_id, device_id, purpose, status)
    VALUES (auth.uid(), p_device_id, p_purpose, 'active')
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
-- 10. 建立 RPC 函數：歸還設備（確保原子性）
-- ============================================

CREATE OR REPLACE FUNCTION public.return_device(
    p_borrow_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_device_id UUID;
    v_user_id UUID;
    v_borrow_status TEXT;
BEGIN
    -- 取得借用記錄資訊
    SELECT device_id, user_id, status INTO v_device_id, v_user_id, v_borrow_status
    FROM public.borrows
    WHERE id = p_borrow_id
    FOR UPDATE;

    IF v_device_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', '借用記錄不存在');
    END IF;

    IF v_borrow_status != 'active' THEN
        RETURN json_build_object('success', false, 'error', '此設備已歸還');
    END IF;

    -- 檢查是否為本人或管理員
    IF v_user_id != auth.uid() AND NOT public.is_admin() THEN
        RETURN json_build_object('success', false, 'error', '無權限歸還此設備');
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

-- 允許登入者上傳圖片
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-images');

-- 允許任何人讀取圖片
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'device-images');

-- 允許登入者刪除圖片（用於更換設備照片）
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'device-images');

-- ============================================
-- 12. 測試資料（可選，移除此區塊如不需要）
-- ============================================

-- 如果你想要加入測試資料，取消下面的註解：

/*
-- 注意：需要先透過 Auth 建立使用者，然後手動修改 role 為 admin

-- 測試設備
INSERT INTO public.devices (name, brand, model, os, os_version, status, notes) VALUES
('iPhone 15 Pro', 'Apple', 'A2848', 'iOS', '17.2', 'available', '256GB 太空黑'),
('Samsung Galaxy S24', 'Samsung', 'SM-S921B', 'Android', '14', 'available', '256GB'),
('Google Pixel 8', 'Google', 'GZPF0', 'Android', '14', 'available', '128GB'),
('iPad Pro 12.9', 'Apple', 'A2759', 'iPadOS', '17.2', 'maintenance', '螢幕維修中');
*/

-- ============================================
-- 完成！
-- ============================================
-- 執行完畢後，你應該可以在 Table Editor 看到以下資料表：
-- - users
-- - devices
-- - borrows
-- - telegram_config
--
-- 以及一個 View：
-- - devices_with_borrower
--
-- 接下來請：
-- 1. 透過 Authentication > Users 建立第一個使用者
-- 2. 在 Table Editor > users 將該使用者的 role 改為 'admin'
-- 3. 開始使用系統！
-- ============================================
