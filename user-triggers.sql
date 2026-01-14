-- 1. 建立一個函數，當 auth.users 有新使用者時會被觸發
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 插入新用戶到 public.users 表
  INSERT INTO public.users (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    'user',  -- 預設角色
    true,    -- 預設啟用
    now(),   -- 創建時間
    now()    -- 更新時間
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 如果用戶已存在（重複註冊），忽略錯誤
    RETURN NEW;
  WHEN OTHERS THEN
    -- 其他錯誤，記錄並繼續
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 在 auth.users 表上建立觸發器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 建立一個管理員用戶的函數（可選）
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET role = 'admin', updated_at = now()
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用範例：將某個用戶設為管理員
-- SELECT public.make_user_admin('admin@example.com');