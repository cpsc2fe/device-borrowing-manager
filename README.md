# 測試機借用系統

簡單的 QR Code 測試機借用管理系統，適合小型團隊使用。

## 功能特色

- **QR Code 借用** - 掃描設備上的 QR Code 即可借用/歸還
- **免登入借用** - 一般使用者不需註冊帳號，只需填寫姓名
- **Telegram 通知** - 借用/歸還自動發送通知到 Telegram 群組
- **管理員後台** - 管理設備、查看 QR Code、設定 Telegram

## 使用流程

### 借用設備
1. 掃描設備上的 QR Code
2. 填寫姓名（Email 選填）
3. 點擊「借用此設備」

### 歸還設備
1. 掃描設備上的 QR Code
2. 點擊「歸還此設備」

## 快速開始

詳細設定步驟請參考 [QUICK_START.md](./QUICK_START.md)

### 必要條件
- Node.js 18+
- Supabase 專案

### 安裝步驟

```bash
# 安裝依賴
npm install

# 設定環境變數
cp src/environments/environment.example.ts src/environments/environment.ts
# 編輯 environment.ts 填入 Supabase URL 和 Key

# 啟動開發伺服器
npm start
```

## 技術架構

- **前端**: Angular 17 + Angular Material
- **後端**: Supabase (PostgreSQL + Auth + Storage)
- **通知**: Telegram Bot API

## 文件

- [快速開始指南](./QUICK_START.md)
- [Supabase 設定](./SUPABASE_SETUP.md)
- [Telegram 設定](./TELEGRAM_SETUP.md)
- [UI 設計說明](./UI_DESIGN.md)

## 開發

```bash
# 啟動開發伺服器
npm start

# 建置專案
npm run build

# 執行測試
npm test
```
