# 提醒本本 (Reminder Notebook)

個人用推送提醒 Web App（PWA）。支援「每 X 分鐘 / 小時 / 天」循環提醒，並透過 Web Push 在背景推送。

瀏覽器分頁 favicon 使用 Kumamon 圖示。

## 功能

- 新增 / 停用 / 刪除提醒
- 間隔：分鐘、小時、天
- 浮動膠囊式 Toast 提示（Floating Capsule / Pill Toast）
- PWA + Web Push 通知（即使關閉分頁也能收到）
- 資料存於你的 Supabase

## 部署步驟

### 1. 資料庫

在 Supabase Dashboard → SQL Editor 執行 `schema.sql`。

### 2. Edge Function

```bash
# 如果還沒安裝 CLI
npm i -g supabase

# 登入並連結專案
supabase login
supabase link --project-ref xmbxdhlczolshrdxbwnm

# 部署（關閉 JWT 驗證，因為我們用自訂 x-cron-secret）
supabase functions deploy send-reminders --no-verify-jwt
```

VAPID Private Key 與 `CRON_SECRET` 已直接寫在 `supabase/functions/send-reminders/index.ts` 內，無需額外設定 Secrets。

### 3. 排程（Cron）

在 SQL Editor 執行 `cron.sql`。

這會每 1 分鐘呼叫一次 Edge Function，檢查到期提醒並發送 Push。

### 4. 前端

把整個 `reminder-notebook` 資料夾放到任何靜態主機即可：

- Cloudflare Pages / GitHub Pages / Netlify / Vercel
- 或本地用 `npx serve .`

**注意**：Web Push 需要 HTTPS（localhost 除外）。

### 5. 使用

1. 用手機或電腦打開網頁
2. 點「啟用推送通知」並允許權限
3. 新增提醒（例如每 30 分鐘喝水）
4. 關掉分頁也能收到系統通知

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `index.html` | 主介面 + 邏輯 |
| `sw.js` | Service Worker（處理 Push） |
| `manifest.json` | PWA 設定 |
| `schema.sql` | 資料表 |
| `cron.sql` | 每分鐘排程 |
| `supabase/functions/send-reminders/index.ts` | 發送推送的 Edge Function |

## 自訂

- 想改驗證字串：同時修改 Edge Function 裡的 `CRON_SECRET` 與 `cron.sql` 裡的 `x-cron-secret`
- 想改推送圖示：改 `index.ts` 與 `sw.js` 裡的 icon URL
- 想改 cron 頻率：把 `* * * * *` 改成 `*/5 * * * *`（每 5 分鐘）等

## 注意事項

- 這是個人使用設計，RLS 目前允許 anon 全開。正式多人使用請加強權限。
- iOS 需要把網站「加入主畫面」後，從主畫面圖示開啟，推送才比較穩定（iOS 16.4+）。
- 第一次啟用推送後，記得保留該瀏覽器/裝置的訂閱。
