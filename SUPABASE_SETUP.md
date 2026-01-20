# Supabase 完整設定教學

本文件詳細說明如何設定 Supabase，即使你不熟悉 Supabase 也能順利完成。

---

## 目錄
1. [建立專案](#1-建立專案)
2. [設定資料庫](#2-設定資料庫)
3. [理解 Row Level Security (RLS)](#3-理解-row-level-security-rls)
4. [設定 Authentication](#4-設定-authentication)
5. [設定 Storage](#5-設定-storage)
6. [Telegram 通知機制](#6-telegram-通知機制)
7. [前端整合](#7-前端整合)
8. [常見問題](#8-常見問題)

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
```

> ⚠️ `service_role` key 是高權限金鑰，本系統不需要使用，請勿放在前端！

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
   - `users` - 管理員帳號（與 Supabase Auth 連動）
   - `devices` - 設備資料
   - `borrows` - 借用記錄（使用 borrower_name 而非 user_id）
   - `telegram_config` - Telegram 設定

3. 應該看到以下 View：
   - `devices_with_borrower` - 設備清單含借用者資訊

---

## 3. 理解 Row Level Security (RLS)

> **什麼是 RLS？**
> Row Level Security 是 PostgreSQL 的安全機制，可以控制每個使用者能存取哪些資料。

### 3.1 本系統的 RLS 政策

本系統採用 **QR Code 借用模式**，一般使用者不需登入即可借用設備：

| 資料表 | 匿名用戶 | 登入用戶 | 管理員 |
|-------|---------|---------|-------|
| users | ❌ | 讀取自己 | 讀取全部 |
| devices | ✅ 讀取 | ✅ 讀取 | ✅ 完整權限 |
| borrows | ✅ 讀取/新增/更新 | ✅ 讀取/新增/更新 | ✅ 完整權限 |
| telegram_config | ❌ | ❌ | ✅ 完整權限 |

### 3.2 為什麼 borrows 允許匿名存取？

因為借用流程是：
1. 使用者掃描設備上的 QR Code
2. 進入借用頁面，填寫姓名（不需登入）
3. 系統透過 RPC 函數 `borrow_device` 原子性地建立借用記錄

這樣設計的好處：
- 使用者無需註冊帳號
- 降低使用門檻
- 透過 Telegram 通知追蹤借用紀錄

### 3.3 為什麼 telegram_config 只允許管理員存取？

`telegram_config` 儲存了 Bot Token，這是敏感資訊。透過限制只有管理員可以存取，可以：
- 防止 Bot Token 洩露
- 通知由 Database Trigger 直接發送，不經過前端

---

## 4. 設定 Authentication

### 4.1 建立管理員帳號
1. 點擊 **Authentication > Users**
2. 點擊 "Add user" > "Create new user"
3. 填寫 Email 和 Password
4. 點擊 "Create user"

### 4.2 設定為管理員
1. 前往 **Table Editor > users**
2. 找到該使用者（應該已自動建立）
3. 將 `role` 欄位改為 `admin`
4. 儲存

> 💡 系統有設定 Trigger，當使用者透過 Auth 建立時會自動在 `users` 表建立對應記錄，預設 role 為 `user`。

### 4.3 關於一般使用者

本系統的一般使用者（借用設備的人）**不需要註冊帳號**。他們只需要：
1. 掃描設備上的 QR Code
2. 填寫姓名即可借用

---

## 5. 設定 Storage

用於儲存設備照片。

### 5.1 自動建立
執行 `sql/database.sql` 時會自動建立 `device-images` bucket 和相關政策。

### 5.2 手動建立（如果需要）
1. 點擊左側選單 **Storage**
2. 點擊 "New bucket"
3. 填寫：
   - Name: `device-images`
   - Public bucket: **開啟**
4. 點擊 "Create bucket"

### 5.3 Storage 政策
- 任何人可以讀取圖片（公開）
- 只有管理員可以上傳/刪除圖片

---

## 6. Telegram 通知機制

本系統使用 **Database Trigger + pg_net** 實現自動通知，不需要 Edge Functions。

### 6.1 運作原理

```
借用/歸還 → borrows 表變更 → Trigger 觸發 → pg_net 發送 HTTP 請求 → Telegram API
```

### 6.2 優點
- **可靠**：通知在資料庫層級觸發，不依賴前端
- **安全**：Bot Token 存在資料庫，只有管理員可以存取
- **簡單**：不需要部署 Edge Functions

### 6.3 設定步驟
1. 在系統中以管理員登入
2. 前往「系統設定」
3. 填寫 Telegram Bot Token 和 Chat ID
4. 啟用通知

詳細設定請參考 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

### 6.4 Trigger 說明

`database.sql` 包含以下 Trigger：

```sql
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
```

---

## 7. 前端整合

### 7.1 安裝 Supabase JS Client
```bash
npm install @supabase/supabase-js
```

### 7.2 環境設定
`src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://xxxxxxxxxx.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIs...'  // anon public key
};
```

### 7.3 Supabase Service

主要功能：
- `signIn(email, password)` - 管理員登入
- `signOut()` - 登出
- `isAdmin()` - 檢查是否為管理員
- `user$` - 使用者狀態 Observable

### 7.4 Device Service

主要功能：
- `getDevices()` - 取得設備列表（含借用者資訊）
- `getDevice(id)` - 取得單一設備
- `createDevice(device)` - 新增設備（管理員）
- `updateDevice(id, device)` - 更新設備（管理員）
- `deleteDevice(id)` - 刪除設備（管理員）

### 7.5 Borrow Service

主要功能：
- `borrowDevice(deviceId, borrowerName, borrowerEmail?, purpose?)` - 借用設備
- `returnDevice(borrowId)` - 歸還設備

這些方法呼叫資料庫的 RPC 函數，確保原子性操作：

```typescript
// 借用設備
const result = await this.supabase.client.rpc('borrow_device', {
  p_device_id: deviceId,
  p_borrower_name: borrowerName,
  p_borrower_email: borrowerEmail || null,
  p_purpose: purpose || null
});

// 歸還設備
const result = await this.supabase.client.rpc('return_device', {
  p_borrow_id: borrowId
});
```

---

## 8. 常見問題

### Q1: 設備列表顯示為空？
**可能原因：**
1. 資料庫沒有設備資料
2. RLS 政策問題

**解決方案：**
1. 在 Table Editor 確認 `devices` 表有資料
2. 確認 RLS 政策允許匿名讀取
3. 檢查瀏覽器 Console 是否有錯誤訊息

### Q2: 借用失敗？
**可能原因：**
1. 設備狀態不是 `available`
2. 沒有填寫借用者姓名

**解決方案：**
1. 確認設備狀態為「可借用」
2. 確認已填寫姓名欄位

### Q3: Telegram 通知沒有收到？
**解決方案：**
1. 確認已在系統設定中啟用通知
2. 確認 Bot Token 正確
3. 確認 Chat ID 正確（群組 ID 是負數，如 `-1001234567890`）
4. 確認 Bot 已被加入群組並有發言權限
5. 檢查 Supabase Logs 是否有錯誤

### Q4: 圖片上傳失敗？
**解決方案：**
1. 確認已以管理員身份登入
2. 確認 `device-images` bucket 存在
3. 檢查圖片大小是否超過限制（免費方案單檔 50MB）

### Q5: 管理員登入後看不到管理功能？
**解決方案：**
1. 確認 `users` 表中該帳號的 `role` 是 `admin`
2. 嘗試登出後重新登入

### Q6: pg_net 擴充套件錯誤？
**解決方案：**
1. 前往 **Database > Extensions**
2. 搜尋 `pg_net`
3. 確認已啟用（應該在執行 database.sql 時自動啟用）

---

## 下一步

- 📖 [QUICK_START.md](./QUICK_START.md) - 快速上手指南
- 🎨 [UI_DESIGN.md](./UI_DESIGN.md) - 了解 UI 設計規範
- 🤖 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - 設定 Telegram 通知
