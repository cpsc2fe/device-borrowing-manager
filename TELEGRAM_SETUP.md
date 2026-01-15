# Telegram Bot 設定教學

本文件說明如何建立 Telegram Bot 並設定群組通知。

---

## 目錄
1. [建立 Telegram Bot](#1-建立-telegram-bot)
2. [取得群組 Chat ID](#2-取得群組-chat-id)
3. [設定話題 Thread ID（選用）](#3-設定話題-thread-id選用)
4. [在系統中設定](#4-在系統中設定)
5. [測試通知](#5-測試通知)
6. [常見問題](#6-常見問題)

---

## 1. 建立 Telegram Bot

### Step 1：找到 BotFather
1. 開啟 Telegram
2. 搜尋 `@BotFather`
3. 點擊進入對話

### Step 2：建立新 Bot
1. 發送指令：`/newbot`
2. BotFather 會問你 Bot 的名稱，輸入：`測試機借用通知` （或你喜歡的名稱）
3. BotFather 會問你 Bot 的 username，輸入：`DeviceBorrowNotifyBot` （必須以 Bot 結尾，且需唯一）

### Step 3：取得 Bot Token
建立成功後，BotFather 會給你一串 Token，格式如下：
```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890
```

**請妥善保管這個 Token！** 這是你的 Bot 的密鑰。

### Step 4：設定 Bot 頭像和描述（選用）
發送以下指令給 BotFather：
- `/setuserpic` - 設定頭像
- `/setdescription` - 設定描述
- `/setabouttext` - 設定關於文字

---

## 2. 取得群組 Chat ID

### 方法一：使用 @userinfobot（推薦）

1. 把你的 Bot 加入目標群組
2. 把 `@userinfobot` 也加入同一個群組
3. 在群組中發送任意訊息
4. `@userinfobot` 會回覆群組的 Chat ID

群組 Chat ID 通常是**負數**開頭，例如：`-1001234567890`

5. 取得 Chat ID 後，可以把 `@userinfobot` 移出群組

### 方法二：使用 Telegram API

1. 把你的 Bot 加入目標群組
2. 在群組中發送任意訊息（讓 Bot 能「看到」這個群組）
3. 開啟瀏覽器，前往：
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```
將 `<YOUR_BOT_TOKEN>` 替換為你的 Bot Token

4. 在回傳的 JSON 中找到 `chat` 物件裡的 `id`：
```json
{
  "ok": true,
  "result": [
    {
      "message": {
        "chat": {
          "id": -1001234567890,  <-- 這就是 Chat ID
          "title": "測試機借用群",
          "type": "supergroup"
        }
      }
    }
  ]
}
```

### 方法三：使用 @RawDataBot

1. 把 `@RawDataBot` 加入群組
2. 它會自動回覆群組的詳細資訊，包含 Chat ID
3. 取得後移除此 Bot

---

## 3. 設定話題 Thread ID（選用）

如果你的群組有開啟「話題」功能，可以讓通知發送到特定話題。

### 什麼是話題？
Telegram 超級群組可以開啟「Topics」功能，讓群組像論壇一樣有多個討論區。

### 如何取得 Thread ID

1. 在群組中開啟目標話題
2. 複製話題的連結（右鍵 > Copy Link）
3. 連結格式如下：
```
https://t.me/c/1234567890/123/456
                          ↑↑↑
                          這是 Thread ID
```

或者使用 API 方式：
1. 在目標話題中發送訊息
2. 使用 `getUpdates` API 查看
3. 找到 `message_thread_id` 欄位

---

## 4. 在系統中設定

### 方式一：透過管理後台

1. 登入系統（使用管理員帳號）
2. 前往 **系統設定** 頁面
3. 填寫以下欄位：

| 欄位 | 範例值 | 說明 |
|-----|-------|------|
| Bot Token | `123456789:ABCdefGHI...` | 從 BotFather 取得 |
| 群組 Chat ID | `-1001234567890` | 群組 ID（負數） |
| 話題 Thread ID | `123` | 選填，如有使用話題 |
| 啟用通知 | ✓ | 勾選以啟用 |

4. 點擊「儲存設定」
5. 點擊「測試通知」確認是否成功

### 方式二：直接修改資料庫

在 Supabase Dashboard > Table Editor > telegram_config：

```sql
UPDATE telegram_config
SET
    bot_token = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ',
    chat_id = '-1001234567890',
    thread_id = NULL,  -- 或填入話題 ID
    is_enabled = true,
    updated_at = NOW()
WHERE id = (SELECT id FROM telegram_config LIMIT 1);
```

---

## 5. 測試通知

### 手動測試

使用 cURL 測試 Bot 是否正常：

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<CHAT_ID>",
    "text": "🔔 測試通知\n\n這是一則測試訊息，如果你看到這個，表示 Bot 設定正確！"
  }'
```

如果有使用話題：
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<CHAT_ID>",
    "message_thread_id": <THREAD_ID>,
    "text": "🔔 測試通知\n\n這是一則測試訊息！"
  }'
```

### 預期回應

成功時：
```json
{
  "ok": true,
  "result": {
    "message_id": 123,
    "chat": { ... },
    "text": "🔔 測試通知..."
  }
}
```

失敗時：
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: chat not found"
}
```

---

## 6. 常見問題

### Q1: Bot 無法發送訊息到群組

**可能原因：**
1. Bot 沒有被加入群組
2. Bot 沒有發言權限
3. Chat ID 不正確

**解決方案：**
1. 確認 Bot 已加入群組
2. 在群組設定中，確認 Bot 有「發送訊息」權限
3. 重新取得 Chat ID

### Q2: Chat ID 格式錯誤

**正確格式：**
- 私人對話：正整數，如 `123456789`
- 群組：負數，如 `-1001234567890`
- 超級群組：通常以 `-100` 開頭

### Q3: 話題 ID 無效

**解決方案：**
1. 確認群組有開啟「Topics」功能
2. 確認 Thread ID 是數字
3. 確認該話題存在且未被刪除

### Q4: 通知延遲

**可能原因：**
- Edge Function 冷啟動（第一次呼叫會較慢）
- Telegram API 偶爾會有延遲

**這是正常的**，通常延遲在 1-5 秒內。

### Q5: 通知訊息格式跑掉

**解決方案：**
確認訊息使用正確的格式化方式：
- 使用 `\n` 換行
- 可以使用 HTML 格式（設定 `parse_mode: "HTML"`）

HTML 格式範例：
```html
<b>粗體</b>
<i>斜體</i>
<code>程式碼</code>
<a href="https://example.com">連結</a>
```

### Q6: Bot Token 外洩怎麼辦？

1. 立即前往 BotFather
2. 發送 `/revoke` 指令
3. 選擇你的 Bot
4. 取得新的 Token
5. 更新系統設定

---

## 通知訊息格式

### 借用通知

```
📱 設備借用通知
━━━━━━━━━━━━━━━
設備：iPhone 15 Pro
借用者：user@example.com
時間：2026-01-14 09:00
用途：iOS App 測試

📊 目前狀態：
🟢 Samsung S24 - 可借用
🔴 iPhone 15 Pro - user@example.com
🔴 Pixel 8 - test@example.com
🟡 iPad Pro - 維修中
```

### 歸還通知

```
✅ 設備歸還通知
━━━━━━━━━━━━━━━
設備：iPhone 15 Pro
歸還者：user@example.com
時間：2026-01-15 17:30

📊 目前狀態：
🟢 Samsung S24 - 可借用
🟢 iPhone 15 Pro - 可借用
🔴 Pixel 8 - test@example.com
🟡 iPad Pro - 維修中
```

---

## 進階設定

### 設定 Bot 指令

你可以透過 BotFather 設定 Bot 的指令列表，讓使用者更容易使用：

1. 發送 `/setcommands` 給 BotFather
2. 選擇你的 Bot
3. 發送指令列表：
```
status - 查看目前設備狀態
help - 取得幫助
```

### 讓 Bot 能接收群組訊息

如果你想讓 Bot 能夠回應群組訊息（例如查詢設備狀態）：

1. 發送 `/setprivacy` 給 BotFather
2. 選擇你的 Bot
3. 選擇 `Disable`

這樣 Bot 就能看到群組中的所有訊息。

---

## 下一步

設定完成後，當使用者借用或歸還設備時，Telegram 群組會自動收到通知。

返回 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 完成 Edge Function 設定。
