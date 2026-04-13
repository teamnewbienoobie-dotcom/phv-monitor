# Claude 使用指南

## 使用者資訊

- **慣用名稱**：菜逼爸 (Cai Bi Ba)
- **職業**：體能教練（專注兒童與青少年體能發展）
- **家庭**：育有一子，約 7 歲，參與三鐵運動（小小運動員）

## 背景與興趣

- 積極研究與實踐青少年體能發展（LTAD network、Youth Physical Development model）
- 經營 YouTube 頻道「菜逼爸教練」（內容包含影片策略、剪輯、縮圖、腳本製作）

## 內容創作平台

- **YouTube**：www.youtube.com/@NewbieNoobie1
- **網誌**：newbie-and-noobie.super.site

---

## 互動原則

### 語言
- 預設使用**繁體中文**回應

### 語氣
- **平衡同理心與直言不諱**：真誠驗證感受，同時溫柔且直接地糾正重大錯誤資訊

### 個人化整合
- 將使用者背景資訊**隱形整合**至回應中
- **嚴禁**使用前言子句或導引句，例如：
  - ❌「基於你的背景...」
  - ❌「既然你是體能教練...」
  - ❌「你曾提到...」

### 回應格式
- 使用**高度可掃描**的格式：標題、條列、粗體關鍵字
- 避免密集文字牆
- 優先考慮一目了然的清晰度

---

## 自訂指令

| 指令 | 功能 |
|---|---|
| `/morning` | 早晨日報：昨日 Gmail 回顧 + 今日 Calendar 行程 + 待辦彙整 |

---

## 可用 MCP 工具

| 工具 | 狀態 | 功能 |
|---|---|---|
| `firecrawl` | ✓ | 網頁爬蟲、抓取網站內容（Markdown 格式） |
| `filesystem` | ✓ | 讀寫本機檔案（桌面、Documents、Downloads） |
| `playwright` | ✓ | 瀏覽器自動化、截圖、操作網頁 |

---

## 早晨日報自動化設定

每天 **09:00 台灣時間** 自動發送日報到 LINE（無需手動觸發）。

### 架構
```
WSL cron (UTC 01:00) → /home/tw5215/morning-report/morning.py → gws → LINE Messaging API
```

### 關鍵路徑與設定
| 項目 | 值 |
|---|---|
| 腳本（WSL） | `/home/tw5215/morning-report/morning.py` |
| 腳本（Windows） | `C:\Users\aa093\OneDrive\桌面\claudeagent\morning.py` |
| gws 路徑 | `/usr/bin/gws` |
| Google 帳號 | `team.newbienoobie@gmail.com` |
| LINE User ID | `U719c000741b49833a0ecca36d1be3659` |
| LINE Channel ID | `2009776836` |
| Cron | `0 1 * * * /usr/bin/python3 /home/tw5215/morning-report/morning.py` |

### 開機自動啟動
在 `shell:startup` 資料夾放 `wsl-cron.vbs`：
```vbs
Set oShell = CreateObject("WScript.Shell")
oShell.Run "wsl.exe -d Ubuntu -u root service cron start", 0, False
```

### 手動測試
```bash
wsl -d Ubuntu -- python3 /home/tw5215/morning-report/morning.py
```

---

## 專案技術規則

### Firecrawl JS SDK (`@mendable/firecrawl-js`)

- 正確 import：`const { FirecrawlClient } = require('@mendable/firecrawl-js')`
  - ❌ `FirecrawlApp` 不存在，勿使用
- 初始化：`new FirecrawlClient({ apiKey: process.env.FIRECRAWL_API_KEY })`
- 爬單頁：`client.scrape('https://...', { formats: ['markdown'] })`
  - ❌ `scrapeUrl(...)` 不存在，勿使用
- 爬整站：`client.crawl('https://...', { limit: 10 })`
- API Key 存於 `.env`，透過 `dotenv` 載入
