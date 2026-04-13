# PHV Monitor — 多人資料庫功能設計文件

**日期：** 2026-04-13
**狀態：** 待實作

---

## 背景與目標

現有的 `phv-monitor.html` 是純前端單頁工具，所有計算在瀏覽器完成、不留紀錄。

本次改動目標：讓教練可以輸入運動員姓名，工具自動載入該人歷史紀錄，並在每次評估後將資料存入雲端資料庫，方便長期追蹤 10–20 名運動員的發育進展。

---

## 確認的需求

- 無登入系統，以**姓名**作為運動員識別碼
- 輸入姓名後自動查詢並顯示該人歷史紀錄
- 每次評估完成後自動存入資料庫
- 教練後台直接使用 **Cloudflare D1 原生 Dashboard** 查看所有資料
- 規模：10–20 人/月，不需付費方案

---

## 整體架構

```
phv-monitor.html  (Cloudflare Pages)
        │
        │  fetch() — 同網域，無 CORS 問題
        ▼
functions/api/records.js  (Cloudflare Pages Functions)
  ├── GET  /api/records?name=...
  └── POST /api/records
        │
        │  SQL
        ▼
D1 Database: phv_records
```

採用 **Cloudflare Pages Functions**（非獨立 Workers），優點：
- 與前端同網域，不需要 CORS header
- 無需 `wrangler.toml`，隨 Pages 一起部署
- D1 binding 直接在 Pages 設定中配置

### 元件一覽

| 元件 | 類型 | 部署位置 |
|---|---|---|
| `phv-monitor.html` | 前端 | Cloudflare Pages |
| `functions/api/records.js` | 後端 API | Cloudflare Pages Functions |
| `phv_records` table | 資料庫 | Cloudflare D1 |

### 名字比對規則

- 去除前後空白（`trim()`）
- 區分大小寫（「小明」≠「Xiao Ming」）
- 中文直接比對

---

## 資料庫結構

```sql
CREATE TABLE phv_records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  gender     TEXT NOT NULL,   -- 'male' | 'female'
  date       TEXT NOT NULL,   -- 'YYYY-MM-DD'
  age        REAL NOT NULL,
  height     REAL NOT NULL,   -- cm
  sit_height REAL NOT NULL,   -- cm
  weight     REAL NOT NULL,   -- kg
  mo         REAL NOT NULL,   -- Maturity Offset
  phv_age    REAL NOT NULL,   -- 預測 PHV 年齡（歲）
  stage      TEXT NOT NULL,   -- 'pre' | 'peak' | 'post'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_name ON phv_records(name);
```

### 存入 vs 不存入

| 欄位 | 存？ | 原因 |
|---|---|---|
| 姓名、性別、日期 | ✓ | 識別與查詢 |
| 年齡、身高、坐高、體重 | ✓ | 原始測量值，保留完整性 |
| MO、預測 PHV 年齡、發育階段 | ✓ | 計算結果，歷史列表直接使用 |
| Tanner 勾選項目 | ✗ | 選填且主觀，不存入 |
| 訓練建議文字 | ✗ | 由 stage 動態生成，不需存 |

---

## API 端點（Cloudflare Workers）

### GET `/api/records?name={name}`

查詢指定運動員的所有歷史紀錄。

**回傳格式：**
```json
[
  { "date": "2025-04-13", "mo": -0.6, "height": 148.2, "stage": "peak" },
  { "date": "2025-01-10", "mo": -1.8, "height": 145.0, "stage": "pre"  }
]
```
- 按 `date` 由新到舊排序
- 最多回傳 20 筆
- 查無資料時回傳空陣列 `[]`

### POST `/api/records`

存入一筆新的測量紀錄。

**請求 body（JSON）：**
```json
{
  "name": "小明",
  "gender": "male",
  "date": "2026-04-13",
  "age": 11.5,
  "height": 148.2,
  "sit_height": 79.5,
  "weight": 40.0,
  "mo": -0.6,
  "phv_age": 13.1,
  "stage": "peak"
}
```

**回傳：**
```json
{ "success": true, "id": 42 }
```

### 錯誤處理

| 情境 | HTTP 狀態 | 前端行為 |
|---|---|---|
| GET 查無資料 | 200 + `[]` | 顯示「尚無紀錄」 |
| POST 缺少必填欄位 | 400 | 顯示「資料不完整，請重試」 |
| D1 連線失敗 | 500 | 顯示「儲存失敗，請重試」，不影響評估結果顯示 |

### CORS 設定

使用 Pages Functions，前端與 API 同網域，**不需要 CORS header**。

---

## 前端改動（phv-monitor.html）

### 改動 1：名字輸入欄位

位置：Step 1 表單最頂部，性別按鈕之前。

行為：
- `onblur`（離開欄位時）觸發 `lookupHistory(name)`
- 名字為空時不觸發查詢

```html
<!-- 新增在 .gender-wrap 之前 -->
<div class="inp-group">
  <label>運動員姓名</label>
  <input type="text" id="athleteName" placeholder="輸入姓名後自動載入歷史紀錄"
         onblur="lookupHistory(this.value.trim())">
</div>
```

### 改動 2：歷史紀錄面板

位置：名字欄位下方，預設隱藏，有資料時顯示。

顯示欄位：日期、MO 偏移值、身高（cm）、發育階段。

狀態：
- 查詢中：顯示「載入中…」
- 有資料：顯示表格（最新在上）
- 無資料：顯示「尚無紀錄，這將是第一筆」
- 查詢失敗：顯示「查詢失敗」

### 改動 3：送出後自動存檔

在現有 `run()` 函式結尾新增一行呼叫：

```javascript
// run() 函式最後（計算與渲染完成後）新增：
// 現有變數：mirwaldMO（MO值）、gender、age、height、sitH、weight
// phvAge = age - mirwaldMO（預測 PHV 年齡）
// stageKey = mo < -1 ? 'pre' : mo <= 1 ? 'peak' : 'post'
saveRecord({
  name: document.getElementById('athleteName').value.trim(),
  gender,
  age,
  height,
  sit_height: sitH,
  weight,
  mo: mirwaldMO,
  phv_age: age - mirwaldMO,
  stage: mirwaldMO < -1 ? 'pre' : mirwaldMO <= 1 ? 'peak' : 'post',
  date: new Date().toISOString().slice(0, 10)
});
```

若姓名為空，`saveRecord()` 直接 return，不呼叫 API。

### 新增的 JS 函式

| 函式 | 說明 |
|---|---|
| `lookupHistory(name)` | 呼叫 GET API，成功後呼叫 `renderHistory()` |
| `renderHistory(records)` | 將回傳資料渲染成歷史表格 |
| `saveRecord(data)` | 呼叫 POST API，失敗時顯示小型錯誤提示 |

### 不動的程式碼

以下現有函式**完全不改**：
- `setGender()`
- `renderChecklist()`
- `toggleCheck()`
- `estimateTanner()`
- `run()`（只在結尾加一行呼叫）
- 所有 CSS 樣式

---

## 檔案結構

```
claudeagent/
├── phv-monitor.html          ← 修改（加名字欄、歷史面板、saveRecord）
└── functions/
    └── api/
        └── records.js        ← 新增（Cloudflare Pages Functions API）
```

`wrangler.toml` 不需要。D1 binding 在 Cloudflare Pages Dashboard 的 Settings → Functions → D1 database bindings 中設定，binding name 為 `DB`。

---

## 部署流程

1. 在 Cloudflare Dashboard 建立 D1 database，名稱為 `phv-db`
2. 在 D1 console 執行 CREATE TABLE SQL 建立資料表
3. 在 Pages 專案 Settings → Functions → D1 database bindings，加入 binding name `DB`，指向 `phv-db`
4. `git push` 到 GitHub，Pages 自動部署前端 + Functions

---

## 範圍外（本次不做）

- 運動員管理介面（新增/刪除/改名）
- 資料匯出（CSV/Excel）
- 圖表趨勢視覺化
- 自訂後台管理頁面
- 使用者登入系統
