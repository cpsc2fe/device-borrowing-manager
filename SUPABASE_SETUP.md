# Supabase 完整設定教學

本文件詳細說明如何設定 Supabase，即使你不熟悉 Supabase 也能順利完成。

---

## 目錄
1. [建立專案](#1-建立專案)
2. [設定資料庫](#2-設定資料庫)
3. [設定 Row Level Security (RLS)](#3-設定-row-level-security-rls)
4. [設定 Authentication](#4-設定-authentication)
5. [設定 Storage](#5-設定-storage)
6. [設定 Edge Functions](#6-設定-edge-functions)
7. [設定 Database Triggers](#7-設定-database-triggers)
8. [前端整合](#8-前端整合)
9. [常見問題](#9-常見問題)

---

## 1. 建立專案

### 1.1 註冊帳號
1. 前往 [supabase.com](https://supabase.com)
2. 點擊 "Start your project"
3. 使用 GitHub 登入（推薦，最快）

### 1.2 建立新專案
1. 點擊 "New Project"
2. 選擇你的 Organization（預設會有一個）
3. 填寫專案資訊：

| 欄位 | 值 | 說明 |
|-----|---|------|
| Name | `device-borrowing-manager` | 專案名稱 |
| Database Password | `your-strong-password` | **請記下這個密碼！** |
| Region | `Northeast Asia (Tokyo)` | 選擇最近的區域 |
| Pricing Plan | `Free` | 免費方案足夠使用 |

4. 點擊 "Create new project"
5. 等待 1-2 分鐘讓專案初始化

### 1.3 記錄重要資訊
進入專案後，前往 **Settings > API**，記錄以下資訊：

```
Project URL:     https://xxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (僅用於後端，不要放在前端！)
```

---

## 2. 設定資料庫

### 2.1 執行 SQL 腳本
1. 點擊左側選單 **SQL Editor**
2. 點擊 "New query"
3. 複製 `sql/database.sql` 的完整內容
4. 貼上並點擊 "Run"

### 2.2 驗證資料表建立成功
1. 點擊左側選單 **Table Editor**
2. 應該看到以下資料表：
   - `users`
   - `devices`
   - `borrows`
   - `telegram_config`

---

## 3. 設定 Row Level Security (RLS)

> **什麼是 RLS？**
> Row Level Security 是 PostgreSQL 的安全機制，可以控制每個使用者能存取哪些資料。這是 Supabase 安全性的核心。

### 3.1 RLS 政策總覽

| 資料表 | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | 自己的資料 | - | 自己的資料 | - |
| devices | 所有人 | Admin | Admin | Admin |
| borrows | 所有人（用於顯示狀態） | 登入者 | 自己的借用 | Admin |
| telegram_config | Admin | Admin | Admin | Admin |

### 3.2 啟用 RLS
在 SQL Editor 執行以下指令（已包含在 sql/database.sql 中）：

```sql
-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
```

### 3.3 建立 RLS 政策

**users 資料表政策：**
```sql
-- 使用者只能讀取自己的資料
CREATE POLICY "Users can read own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 使用者可以更新自己的資料
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);
```

**devices 資料表政策：**
```sql
-- 所有登入者可以讀取設備列表
CREATE POLICY "Anyone can read devices"
ON devices FOR SELECT
TO authenticated
USING (true);

-- 只有 Admin 可以新增設備
CREATE POLICY "Admin can insert devices"
ON devices FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 只有 Admin 可以更新設備
CREATE POLICY "Admin can update devices"
ON devices FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 只有 Admin 可以刪除設備
CREATE POLICY "Admin can delete devices"
ON devices FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

**borrows 資料表政策：**
```sql
-- 所有登入者可以讀取借用記錄（用於顯示設備狀態）
CREATE POLICY "Anyone can read borrows"
ON borrows FOR SELECT
TO authenticated
USING (true);

-- 登入者可以建立借用記錄
CREATE POLICY "Users can create borrows"
ON borrows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 使用者只能更新自己的借用記錄（用於歸還）
CREATE POLICY "Users can update own borrows"
ON borrows FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admin 可以刪除任何借用記錄
CREATE POLICY "Admin can delete borrows"
ON borrows FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

**telegram_config 資料表政策：**
```sql
-- 只有 Admin 可以操作 telegram_config
CREATE POLICY "Admin full access to telegram_config"
ON telegram_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

---

## 4. 設定 Authentication

### 4.1 啟用 Email 認證
1. 點擊左側選單 **Authentication**
2. 點擊 **Providers**
3. 確認 **Email** 已啟用（預設應該是啟用的）

### 4.2 設定 Email 範本（選用）
1. 點擊 **Email Templates**
2. 可以自訂以下信件範本：
   - Confirm signup（確認註冊）
   - Reset password（重設密碼）

範例：
```
主旨：確認你的 測試機借用系統 帳號

Hi,

請點擊以下連結確認你的帳號：
{{ .ConfirmationURL }}

如果你沒有註冊，請忽略此郵件。
```

### 4.3 建立管理員帳號
1. 點擊 **Authentication > Users**
2. 點擊 "Add user" > "Create new user"
3. 填寫 Email 和 Password
4. 點擊 "Create user"

設定為管理員：
1. 前往 **Table Editor > users**
2. 找到該使用者
3. 將 `role` 改為 `admin`
4. 儲存

### 4.4 自動建立 users 記錄
當使用者透過 Auth 註冊時，需要自動在 `users` 表建立對應記錄。

在 SQL Editor 執行：
```sql
-- 建立 trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'user', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. 設定 Storage

用於儲存設備照片。

### 5.1 建立 Bucket
1. 點擊左側選單 **Storage**
2. 點擊 "New bucket"
3. 填寫：
   - Name: `device-images`
   - Public bucket: **開啟**（讓圖片可以公開存取）
4. 點擊 "Create bucket"

### 5.2 設定 Storage 政策
點擊 bucket 名稱 > **Policies** > "New Policy"

**允許登入者上傳圖片：**
```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-images');
```

**允許任何人讀取圖片：**
```sql
CREATE POLICY "Anyone can read device images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'device-images');
```

**只有 Admin 可以刪除圖片：**
```sql
CREATE POLICY "Admin can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'device-images'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

---

## 6. 設定 Edge Functions

Edge Functions 用於發送 Telegram 通知。

### 6.1 安裝 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (使用 scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 或使用 npm
npm install -g supabase
```

### 6.2 登入 Supabase CLI
```bash
supabase login
```
這會開啟瀏覽器讓你授權。

### 6.3 初始化專案
```bash
cd device-borrowing-manager
supabase init
supabase link --project-ref <your-project-ref>
```

`project-ref` 可以在 Supabase Dashboard URL 中找到：
`https://supabase.com/dashboard/project/xxxxxxxxxxxxx`
                                    ↑ 這個就是 project-ref

### 6.4 建立 Telegram 通知 Function
```bash
supabase functions new send-telegram-notification
```

編輯 `supabase/functions/send-telegram-notification/index.ts`：
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  type: 'borrow' | 'return'
  deviceName: string
  userEmail: string
  purpose?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 取得 Telegram 設定
    const { data: config } = await supabase
      .from('telegram_config')
      .select('*')
      .eq('is_enabled', true)
      .single()

    if (!config) {
      return new Response(
        JSON.stringify({ message: 'Telegram notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: NotificationPayload = await req.json()

    // 取得所有設備狀態
    const { data: devices } = await supabase
      .from('devices')
      .select(`
        id,
        name,
        status,
        borrows!inner (
          user_id,
          users!inner (email)
        )
      `)
      .order('name')

    // 組合訊息
    let message = ''
    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })

    if (payload.type === 'borrow') {
      message = `📱 設備借用通知\n━━━━━━━━━━━━━━━\n設備：${payload.deviceName}\n借用者：${payload.userEmail}\n時間：${now}`
      if (payload.purpose) {
        message += `\n用途：${payload.purpose}`
      }
    } else {
      message = `✅ 設備歸還通知\n━━━━━━━━━━━━━━━\n設備：${payload.deviceName}\n歸還者：${payload.userEmail}\n時間：${now}`
    }

    // 加入設備狀態列表
    message += '\n\n📊 目前狀態：'
    devices?.forEach(device => {
      if (device.status === 'available') {
        message += `\n🟢 ${device.name} - 可借用`
      } else if (device.status === 'borrowed') {
        const borrower = device.borrows?.[0]?.users?.email || '未知'
        message += `\n🔴 ${device.name} - ${borrower}`
      } else if (device.status === 'maintenance') {
        message += `\n🟡 ${device.name} - 維修中`
      }
    })

    // 發送 Telegram 訊息
    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`
    const telegramPayload: any = {
      chat_id: config.chat_id,
      text: message,
      parse_mode: 'HTML'
    }

    // 如果有設定 thread_id（話題 ID）
    if (config.thread_id) {
      telegramPayload.message_thread_id = parseInt(config.thread_id)
    }

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 6.5 部署 Function
```bash
supabase functions deploy send-telegram-notification
```

---

## 7. 設定 Database Triggers

當借用/歸還發生時，自動呼叫 Edge Function 發送通知。

### 7.1 建立 Trigger Function
在 SQL Editor 執行：

```sql
-- 需要先啟用 http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 建立通知函數
CREATE OR REPLACE FUNCTION notify_telegram()
RETURNS TRIGGER AS $$
DECLARE
  device_name TEXT;
  user_email TEXT;
  payload JSONB;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- 取得設備名稱
  SELECT name INTO device_name FROM devices WHERE id = NEW.device_id;

  -- 取得使用者 email
  SELECT email INTO user_email FROM users WHERE id = NEW.user_id;

  -- 判斷是借用還是歸還
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

  -- 呼叫 Edge Function (非同步，不阻塞)
  -- 注意：這裡使用 pg_net extension，需要在 Supabase Dashboard 啟用
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

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_borrow_change ON borrows;
CREATE TRIGGER on_borrow_change
  AFTER INSERT OR UPDATE ON borrows
  FOR EACH ROW EXECUTE FUNCTION notify_telegram();
```

### 7.2 啟用 pg_net Extension
1. 前往 **Database > Extensions**
2. 搜尋 `pg_net`
3. 點擊 "Enable"

---

## 8. 前端整合

### 8.1 安裝 Supabase JS Client
```bash
npm install @supabase/supabase-js
```

### 8.2 建立 Supabase Service
`src/app/core/services/supabase.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    // 監聽認證狀態變化
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
    });
  }

  get client() {
    return this.supabase;
  }

  get user$() {
    return this.currentUser.asObservable();
  }

  // 登入
  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  // 登出
  async signOut() {
    return this.supabase.auth.signOut();
  }

  // 取得當前使用者
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  // 取得使用者角色
  async getUserRole(): Promise<'admin' | 'user' | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role ?? 'user';
  }
}
```

### 8.3 建立 Device Service
`src/app/core/services/device.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Device {
  id: string;
  name: string;
  brand: string;
  model: string;
  os: string;
  os_version: string;
  image_url: string | null;
  status: 'available' | 'borrowed' | 'maintenance';
  notes: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  constructor(private supabase: SupabaseService) {}

  // 取得所有設備
  async getDevices() {
    const { data, error } = await this.supabase.client
      .from('devices')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Device[];
  }

  // 取得設備詳情（含目前借用者）
  async getDeviceWithBorrower(deviceId: string) {
    const { data, error } = await this.supabase.client
      .from('devices')
      .select(`
        *,
        borrows!inner (
          id,
          purpose,
          borrowed_at,
          users!inner (email)
        )
      `)
      .eq('id', deviceId)
      .eq('borrows.status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // 新增設備
  async createDevice(device: Partial<Device>) {
    const { data, error } = await this.supabase.client
      .from('devices')
      .insert(device)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 更新設備
  async updateDevice(id: string, device: Partial<Device>) {
    const { data, error } = await this.supabase.client
      .from('devices')
      .update(device)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 刪除設備
  async deleteDevice(id: string) {
    const { error } = await this.supabase.client
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
```

### 8.4 建立 Borrow Service
`src/app/core/services/borrow.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class BorrowService {
  constructor(private supabase: SupabaseService) {}

  // 借用設備
  async borrowDevice(deviceId: string, purpose?: string) {
    const user = await this.supabase.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // 開始交易
    // 1. 建立借用記錄
    const { error: borrowError } = await this.supabase.client
      .from('borrows')
      .insert({
        user_id: user.id,
        device_id: deviceId,
        purpose: purpose || null,
        borrowed_at: new Date().toISOString(),
        status: 'active'
      });

    if (borrowError) throw borrowError;

    // 2. 更新設備狀態
    const { error: deviceError } = await this.supabase.client
      .from('devices')
      .update({ status: 'borrowed' })
      .eq('id', deviceId);

    if (deviceError) throw deviceError;
  }

  // 歸還設備
  async returnDevice(borrowId: string, deviceId: string) {
    // 1. 更新借用記錄
    const { error: borrowError } = await this.supabase.client
      .from('borrows')
      .update({
        returned_at: new Date().toISOString(),
        status: 'returned'
      })
      .eq('id', borrowId);

    if (borrowError) throw borrowError;

    // 2. 更新設備狀態
    const { error: deviceError } = await this.supabase.client
      .from('devices')
      .update({ status: 'available' })
      .eq('id', deviceId);

    if (deviceError) throw deviceError;
  }

  // 取得我的借用記錄
  async getMyBorrows() {
    const user = await this.supabase.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .from('borrows')
      .select(`
        *,
        devices (id, name, brand, model, image_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // 取得目前正在借用的記錄
  async getActiveBorrows() {
    const user = await this.supabase.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .from('borrows')
      .select(`
        *,
        devices (id, name, brand, model, image_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  }
}
```

---

## 9. 常見問題

### Q1: RLS 政策不生效？
**解決方案：**
1. 確認已執行 `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;`
2. 在 Table Editor 中確認 "RLS Enabled" 是開啟的
3. 使用 SQL Editor 測試：
```sql
-- 以特定使用者身份測試
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM devices;
```

### Q2: Edge Function 部署失敗？
**解決方案：**
1. 確認已執行 `supabase login`
2. 確認已執行 `supabase link --project-ref xxx`
3. 檢查 Function 程式碼有無語法錯誤

### Q3: Telegram 通知沒有收到？
**解決方案：**
1. 確認 `telegram_config` 表中的 `is_enabled` 是 `true`
2. 確認 Bot Token 正確
3. 確認 Chat ID 正確（群組 ID 是負數）
4. 確認 Bot 已被加入群組並有發言權限
5. 查看 Edge Function Logs：Dashboard > Edge Functions > Logs

### Q4: 圖片上傳失敗？
**解決方案：**
1. 確認 Storage bucket 存在
2. 確認 Storage 政策已設定
3. 檢查圖片大小是否超過限制（免費方案單檔 50MB）

### Q5: 借用時設備狀態沒有更新？
**解決方案：**
1. 確認 `devices` 表的 RLS 政策允許更新
2. 使用 RPC 函數來確保原子性操作

---

## 下一步

- 🎨 [UI_DESIGN.md](./UI_DESIGN.md) - 了解 UI 設計規範
- 🤖 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - 設定 Telegram 通知
