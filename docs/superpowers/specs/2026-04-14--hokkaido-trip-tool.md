# 北海道自駕遊旅遊網頁工具 — 設計規格

## 概述

兩個家庭共同前往北海道自駕遊（2026/8/5 - 8/12，共 8 天），需要一個個人操作的網頁工具，整合行程瀏覽、共同記帳、收據 AI 辨識、即時匯率、旅遊攻略。

- **使用者：** 單人操作（菜逼爸）
- **部署平台：** Cloudflare Pages + D1 + R2 + Workers AI
- **獨立專案：** 與 PHV Monitor 分開

---

## 架構

```
┌─────────────────────────────────────┐
│           Cloudflare Pages          │
│                                     │
│  index.html (SPA, vanilla JS)      │
│  ├── Day 1 ~ Day 8 分頁            │
│  ├── 共同記帳簿                      │
│  ├── 結算總覽                        │
│  └── 設定（家庭名稱、匯率）           │
│                                     │
├─────────────────────────────────────┤
│        Pages Functions (API)        │
│  /api/expenses    ← 記帳 CRUD       │
│  /api/ocr         ← 收據辨識        │
│  /api/rate        ← 匯率快取        │
│                                     │
├─────────────────────────────────────┤
│       Cloudflare Workers AI         │
│  ├── OCR 模型（圖片 → 文字）         │
│  └── LLM 模型（文字 → 結構化資料）   │
│                                     │
├─────────────────────────────────────┤
│          Cloudflare D1              │
│  ├── itinerary（行程 + 攻略連結）    │
│  ├── expenses（記帳紀錄）            │
│  └── settings（家庭名稱等）          │
│                                     │
├─────────────────────────────────────┤
│          Cloudflare R2              │
│  └── 收據照片儲存                    │
└─────────────────────────────────────┘
```

### 資料流

1. **行程資料** → 部署時透過 seed 腳本寫入 D1
2. **收據辨識** → 手機拍照 → 上傳 → Workers AI OCR → LLM 解析 → 使用者確認 → 存 D1，圖片存 R2
3. **匯率** → 每小時從免費 API 抓一次，快取在 D1
4. **攻略文章** → 部署前用 Firecrawl 爬好，存 D1

### 驗證方式

不需要登入系統。使用 Cloudflare Access 或簡易密碼保護限制存取。

---

## 頁面功能

### 1. 行程分頁（Day 1 ~ Day 8）

每日一個分頁，包含以下區塊：

- **日期標題：** 例如「8/5 (二) Day 1」
- **行程卡片：** 時間軸排列，每個景點一張卡片
  - 時間
  - 地名
  - Google Maps Embed API 小地圖（點擊可展開或跳轉 Google Maps App）
  - 攻略文章連結 2 篇（標題 + 摘要 + URL）
- **住宿卡片：** 底部固定，附地圖 + 住宿體驗文章 2 篇
- **當日花費摘要：** 該天記帳金額加總，顯示在分頁底部

### 2. 共同記帳簿

獨立分頁，功能：

- **拍照上傳：** 按鈕觸發手機相機拍收據
- **AI 自動辨識：** 回傳金額（日幣）、店名、分類（餐飲/交通/購物/娛樂/住宿/其他）
- **可編輯：** 辨識結果全部可手動修改
- **分帳設定：** 預設 50/50，可改比例（如 60/40）或指定固定金額
- **歸屬日期：** 自動帶當天日期，可手動修改
- **收據照片：** 縮圖保存，點擊可放大檢視
- **記帳列表：** 按日期分組，每筆顯示金額、分類圖示、分帳比例

**記帳模式：** 一人全額代墊，只記錄各方應分擔金額。

### 3. 結算總覽

- **總花費：** 日幣總額 + 台幣換算
- **分類圓餅圖：** 各分類佔比
- **各方應付金額：** 依分帳比例計算
- **結算結果：** 一行大字顯示「B 家庭需付給 A 家庭 ¥XX,XXX（約 NT$X,XXX）」
- **每日明細：** 可展開查看每天花費細項

### 4. 頂部常駐資訊

所有分頁頂部固定顯示：

- **即時匯率：** 1 JPY = X.XX TWD（附更新時間）
- **快速換算器：** 輸入日幣金額，即時顯示台幣

---

## 收據辨識流程

```
手機拍照 → 上傳圖片
              ↓
     Workers AI OCR 模型
     （圖片 → 日文文字）
              ↓
     Workers AI LLM 模型
     （日文文字 → JSON）
        {
          amount: 3500,
          store: "セブンイレブン",
          category: "購物",
          items: ["おにぎり", "お茶"]
        }
              ↓
     顯示辨識結果（可編輯）
              ↓
     使用者確認 → 選分帳比例 → 存 D1
```

圖片壓縮後上傳到 Cloudflare R2，D1 只存圖片 URL。

---

## 資料庫結構（D1）

### itinerary

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 主鍵 |
| day | INTEGER | 第幾天（1-8） |
| time | TEXT | 時間 |
| title | TEXT | 景點/活動名稱 |
| type | TEXT | spot / hotel |
| lat | REAL | 緯度 |
| lng | REAL | 經度 |
| articles | TEXT | JSON，2 篇攻略連結 |

### expenses

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 主鍵 |
| day | INTEGER | 歸屬日期（第幾天） |
| amount_jpy | INTEGER | 日幣金額 |
| store | TEXT | 店名 |
| category | TEXT | 分類 |
| split_type | TEXT | ratio / fixed |
| split_a | REAL | A 方佔比或金額 |
| split_b | REAL | B 方佔比或金額 |
| receipt_url | TEXT | R2 圖片連結 |
| created_at | TEXT | 建立時間 |

### settings

| 欄位 | 型別 | 說明 |
|---|---|---|
| key | TEXT PRIMARY KEY | 設定名稱 |
| value | TEXT | 設定值 |

預設 settings：`family_a_name`、`family_b_name`

---

## 分帳計算邏輯

一人全額代墊，結算時計算對方應付總額：

```
每筆費用：
  比例模式：B 應付 = amount_jpy × split_b
  固定模式：B 應付 = split_b（直接是金額）

結算：
  B 家庭總應付 = 所有費用中 B 的分擔加總
  → 換算台幣 = B 總應付 × 當時匯率
```

---

## 攻略文章爬蟲

### 執行時機

部署前跑一次腳本，結果存入 D1。

### 搜尋關鍵字規則

| 類型 | 關鍵字模板 |
|---|---|
| 景點 | `{景點名} 旅遊攻略` |
| 餐廳 | `{餐廳名} 食記` |
| 飯店/民宿 | `{住宿名} 住宿心得` |
| 活動 | `{活動名} 體驗分享` |

### 流程

```
行程景點列表 → 組合搜尋關鍵字 → Firecrawl search API → 取前 2 篇 → 存 D1
```

每篇儲存：標題、URL、摘要片段。

---

## 行程資料（seed data）

| Day | 日期 | 行程 | 住宿 |
|---|---|---|---|
| 1 | 8/5 (二) | 抵達新千歲 → 租車 → 富良野 | 富良野民宿 |
| 2 | 8/6 (三) | 美瑛租自行車、四季彩之丘、森林精靈露台、超市採買 | 富良野民宿 |
| 3 | 8/7 (四) | 旭山動物園、旭川拉麵村 → 札幌 | 札幌民宿（燒肉晚餐） |
| 4 | 8/8 (五) | 札幌市區自由活動 → 仁木町 | 仁木町民宿 |
| 5 | 8/9 (六) | 尻別川漂流（HANAZONO）、TREE TREKKING | 仁木町民宿 |
| 6 | 8/10 (日) | 果園採櫻桃藍莓、小樽運河（YOICHYA 海鮮丼飯） | 機場航站飯店 |
| 7 | 8/11 (一) | F VILLAGE 棒球園區、看球賽 | 機場航站飯店 |
| 8 | 8/12 (二) | 退房 → 回台灣 | — |

### 租車資訊

- 預約號碼：202604-033082
- LINE：@JHS4331B
- 接駁：大廳出來右轉（電梯或電扶梯）前往一樓出口右轉找站牌 30 號
- 新千歲機場店：〒066-0015 北海道千歲市青葉 8 丁目 9 番 8

---

## 專案結構

```
hokkaido-trip/
├── index.html              ← SPA 主頁面
├── wrangler.toml           ← Cloudflare 設定（D1 + R2 + AI）
├── functions/
│   └── api/
│       ├── expenses.js     ← 記帳 CRUD
│       ├── ocr.js          ← 收據辨識（Workers AI）
│       └── rate.js         ← 匯率快取
├── scripts/
│   ├── seed-itinerary.js   ← 寫入行程資料到 D1
│   └── crawl-articles.js   ← 爬攻略文章存 D1
└── schema.sql              ← D1 建表語句
```

---

## 部署步驟

1. `wrangler d1 create hokkaido-trip-db` — 建資料庫
2. `wrangler r2 create hokkaido-trip-receipts` — 建圖片儲存桶
3. `wrangler d1 execute hokkaido-trip-db --file=schema.sql` — 建表
4. `node scripts/seed-itinerary.js` — 寫入行程資料
5. `node scripts/crawl-articles.js` — 爬攻略文章
6. `wrangler pages deploy` — 部署上線

---

## UI 設計

前端實作時將呼叫 `/ui-ux-pro-max` skill 進行 UI/UX 設計與美化。

設計方向：
- 手機優先（旅途中主要用手機操作）
- 日式旅遊風格配色
- 高可讀性、大按鈕、易操作
