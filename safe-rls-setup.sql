-- 安全的 RLS 策略設置 - 分步驟執行
-- 執行前請先檢查現有配置，避免衝突

-- ======= 第一步：檢查現有配置 =======
-- 執行這些查詢來查看現有的策略和觸發器

-- 1. 查看現有的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. 查看現有的觸發器
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
   OR trigger_name LIKE '%auth_user%';

-- 3. 查看現有的函數
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'check_user_exists')
   AND routine_schema = 'public';

-- ======= 第二步：清理可能衝突的策略（如果存在）=======
-- 只有在需要時才執行這些命令

-- 刪除可能存在的舊策略（如果存在衝突）
-- DROP POLICY IF EXISTS "Enable insert for auth users via trigger" ON public.users;
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
-- DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
-- DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- ======= 第三步：創建新的 RLS 策略 =======
-- 為 users 表創建適當的 RLS 策略

-- 允許觸發器函數插入新用戶（SECURITY DEFINER 權限）
DO $$
BEGIN
    -- 檢查策略是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Enable insert for auth users via trigger'
    ) THEN
        CREATE POLICY "Enable insert for auth users via trigger" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 允許用戶讀取自己的資料
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.users
            FOR SELECT USING (auth.uid() = id);
    END IF;
END $$;

-- 允許用戶更新自己的資料
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- 允許管理員讀取所有用戶資料
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Admins can view all users'
    ) THEN
        CREATE POLICY "Admins can view all users" ON public.users
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 允許管理員更新所有用戶資料
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'users' 
          AND policyname = 'Admins can update all users'
    ) THEN
        CREATE POLICY "Admins can update all users" ON public.users
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- ======= 第四步：備份並更新觸發器函數 =======
-- 備份現有函數（如果存在）
-- 可以先執行這個查詢來查看現有函數：
-- SELECT routine_definition FROM information_schema.routines 
-- WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 更新觸發器函數，加強錯誤處理
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- 檢查用戶是否已存在
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- 如果用戶已存在，直接返回，不插入重複資料
    RETURN NEW;
  END IF;

  -- 插入新用戶資料
  INSERT INTO public.users (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    'user',
    true,
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 如果發生唯一約束違反，忽略錯誤（用戶已存在）
    RETURN NEW;
  WHEN OTHERS THEN
    -- 記錄其他錯誤但不中斷註冊流程
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ======= 第五步：重新創建觸發器 =======
-- 只有在確認現有觸發器不會影響系統時才執行

-- 刪除現有觸發器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 創建新觸發器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======= 第六步：創建輔助函數 =======
-- 創建檢查用戶是否存在的函數
CREATE OR REPLACE FUNCTION public.check_user_exists(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$$;

-- ======= 第七步：驗證設置 =======
-- 執行這些查詢來確認一切都設置正確

-- 驗證策略
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 驗證觸發器
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 驗證函數
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'check_user_exists')
   AND routine_schema = 'public';