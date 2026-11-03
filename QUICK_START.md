# 快速上手指南

本指南將幫助你在 **10 分鐘內** 將專案跑起來。

## 前置需求

確保你的電腦已安裝：
- [Node.js](https://nodejs.org/) 18+ (建議使用 LTS 版本)
- [npm](https://www.npmjs.com/) 9+ (隨 Node.js 安裝)
- [Angular CLI](https://angular.io/cli) 17+

檢查版本：
```bash
node -v    # 應顯示 v18.x.x 或更高
npm -v     # 應顯示 9.x.x 或更高
ng version # 應顯示 Angular CLI 17.x.x
```

如果沒有 Angular CLI：
```bash
npm install -g @angular/cli
```

---

## Step 1：建立 Supabase 專案（5 分鐘）

### 1.1 註冊/登入 Supabase
1. 前往 [supabase.com](https://supabase.com)
2. 點擊 "Start your project"
3. 使用 GitHub 帳號登入（最快）

### 1.2 建立新專案
1. 點擊 "New Project"
2. 填寫資訊：
   - **Name**: `device-borrowing-manager`
   - **Database Password**: 設定一個強密碼（記下來！）
   - **Region**: 選擇 `Northeast Asia (Tokyo)` 或最近的區域
3. 點擊 "Create new project"
4. 等待約 2 分鐘讓專案建立完成

### 1.3 取得 API Keys
1. 進入專案後，點擊左側 **Settings** (齒輪圖示)
2. 點擊 **API**
3. 複製以下資訊（稍後會用到）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

---

## Step 2：設定資料庫（2 分鐘）

### 2.1 執行 SQL 腳本
1. 在 Supabase Dashboard 點擊左側 **SQL Editor**
2. 點擊 "New query"
3. 複製 `sql/database.sql` 的完整內容貼上
4. 點擊 "Run" 執行

如果看到綠色的 "Success" 訊息，表示資料庫設定完成。

### 2.2 建立管理員帳號
1. 點擊左側 **Authentication**
2. 點擊 **Users** 標籤
3. 點擊 "Add user" > "Create new user"
4. 填寫：
   - Email: 你的 Email
   - Password: 設定密碼
5. 點擊 "Create user"

接著設定為管理員：
1. 點擊左側 **Table Editor**
2. 選擇 `users` 資料表
3. 找到剛建立的使用者
4. 將 `role` 欄位改為 `admin`
5. 點擊 "Save"

---

## Step 3：設定前端專案（3 分鐘）

### 3.1 Clone 專案
```bash
git clone <your-repo-url>
cd device-borrowing-manager
```

### 3.2 安裝依賴
```bash
npm install
```

### 3.3 設定環境變數
1. 複製環境變數範本：
```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

2. 編輯 `src/environments/environment.ts`：
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://xxxxx.supabase.co',      // 貼上你的 Project URL
  supabaseKey: 'eyJhbGciOiJIUzI1NiIs...'         // 貼上你的 anon public key
};
```

### 3.4 啟動開發伺服器
```bash
ng serve
```

打開瀏覽器前往 `http://localhost:4200`

---

## Step 4：驗證設定

### 4.1 新增設備
1. 點擊右上角「管理員」按鈕
2. 使用管理員帳號登入
3. 前往「設備管理」
4. 新增一台測試設備

### 4.2 取得 QR Code
1. 在設備管理頁面，點擊設備的 QR Code 按鈕
2. 列印 QR Code 並貼在實體設備上

### 4.3 測試借用流程
1. 掃描 QR Code（或直接前往 `/device/設備ID`）
2. 填寫姓名
3. 點擊「借用此設備」
4. 確認借用成功

---

## 設定 Telegram 通知（選用）

詳細步驟請參考 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

1. 建立 Telegram Bot
2. 取得 Bot Token 和 Chat ID
3. 在系統設定頁面輸入相關資訊並啟用

> 💡 通知由資料庫 Trigger 自動發送（使用 pg_net 擴充），Bot Token 安全存放在資料庫中

---

## 常見問題

**Q: 登入時顯示 "Invalid API key"**
A: 確認 `environment.ts` 中的 `supabaseKey` 是否正確複製

**Q: 看到 "permission denied" 錯誤**
A: 確認 SQL 腳本是否完整執行成功

**Q: 無法新增設備**
A: 確認你的帳號在 `users` 資料表中的 `role` 是 `admin`

**Q: QR Code 掃描後無法開啟**
A: 確認系統已部署到可公開存取的網址

---

## 下一步

- 📖 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - 了解 Supabase 完整設定
- 🎨 [UI_DESIGN.md](./UI_DESIGN.md) - 了解 UI 設計規範
- 🤖 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - 設定 Telegram 通知

---

## 專案結構

```
device-borrowing-manager/
├── src/
│   ├── app/
│   │   ├── core/                 # 核心服務
│   │   │   ├── services/
│   │   │   │   ├── device.service.ts
│   │   │   │   ├── borrow.service.ts
│   │   │   │   └── supabase.service.ts
│   │   │   └── guards/
│   │   │       ├── auth.guard.ts
│   │   │       └── admin.guard.ts
│   │   ├── shared/               # 共用元件
│   │   │   └── components/
│   │   │       ├── layout/
│   │   │       ├── confirm-dialog/
│   │   │       └── qr-dialog/
│   │   ├── features/             # 功能模組
│   │   │   ├── auth/             # 管理員登入
│   │   │   ├── devices/          # 設備列表、借用頁
│   │   │   └── admin/            # 管理後台
│   │   ├── app.component.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   └── environment.ts        # Supabase 設定（開發與部署共用）
│   └── styles.css
├── sql/
│   └── database.sql              # 資料庫 Schema（含 Telegram Trigger）
├── angular.json
└── package.json
```

---

## 開發指令

```bash
# 啟動開發伺服器
ng serve

# 建置生產版本
ng build --configuration production

# 執行單元測試
ng test
```
