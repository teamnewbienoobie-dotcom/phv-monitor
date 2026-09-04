# 訓練護照 v2 規格書

> 兒童／青少年肌力與體能訓練的累積追蹤工具。
> 依 2026-09-02～03 兩輪 grilling 定案內容撰寫；權威訓練模型見 `knowledge/ypd/coach-workflow.md`。
> 線上：https://youth-training-passport.pages.dev（同專案、同 D1，以 migration 升級）

---

## 0. 一句話

**教練先把 6 週計畫放進系統，上完課只記「主軸 + RAMP 三個型態 + 偏離」，系統把七大元素的累積時間堆成一座俄羅斯方塊塔（給孩子）與一張目標 vs 實際的分布圖（給教練），檢核「這個成熟度階段該有的比例」有沒有練到。**

---

## 1. 七大分類 × 三階段 建議比重表（v2 目標值）

依 YPD Model（Baker 2021）各階段強調程度擬定，教練可在系統內直接改數字。**單位＝訓練時間佔比**，容差 ±5 個百分點（科學圖落在容差內為綠、超出為橘）。

| 元素 | 代碼 | 第一段 PHV 前（9–12） | 第二段 PHV 中（12–15） | 第三段 PHV 後（15–18） | 主要依據 |
|---|---|---|---|---|---|
| 基礎動作技能 | `fms` | **20%** | 10% | 5% | FMS 強調隨階段遞減（最大→中→最小） |
| 肌力 | `strength` | 20% | **25%** | **30%** | Foundation 徒手/低負荷 → Development 外部負荷進階 → Performance 週期化最佳化 |
| 爆發力 | `power` | 10% | 12% | 15% | 跳躍落地/藥球 → 速度導向阻力 → 橫跨力速曲線 |
| 增強式 | `plyo` | 10% | 12% | 15% | 低強度遊戲化 → 低中強度 → 全光譜 |
| 速度敏捷 | `saq` | **25%** | 20% | 18% | 「frequent opportunities to sprint」在 Foundation 最重；後期轉為技術精修 |
| 能量系統 | `energy` | 5% | 8% | 12% | Foundation「low priority」→ Performance「structured energy systems training」 |
| 活動度 | `mobility` | 10% | **13%** | 5% | Development 因生長期 ROM 受限而加重；Performance 依個人需求 |
| **合計** | | 100% | 100% | 100% | |

### 1.1 構件門檻（Q27：門檻 ∝ 目標佔比）

定義**一輪 = 200 分鐘**。某元素的構件門檻 = `200 × 目標佔比`，照著模型練，七種構件會等速產出。

| 元素 | PHV 前 | PHV 中 | PHV 後 |
|---|---|---|---|
| fms | 40 min | 20 | 10 |
| strength | 40 | 50 | 60 |
| power | 20 | 24 | 30 |
| plyo | 20 | 24 | 30 |
| saq | 50 | 40 | 36 |
| energy | 10 | 16 | 24 |
| mobility | 20 | 26 | 10 |

一堂 50 分鐘的課約產出 1～2 個構件 → 孩子每堂課都看得到塔長高。

---

## 2. 決策總表（grilling 定案）

| # | 決定 |
|---|---|
| 模型 | 教練七大元素 `FMS / Strength / Power / Plyo / SAQ / Energy / Mobility`；3 階段各 3 年（PHV 前/中/後）；與 LTAD 表衝突時以教練版為準 |
| 階段判定 | 教練手動指定階段 + 身高體重紀錄（不自動估 PHV） |
| 層級 | session → block（4–6 週＝「月」，帶目標與處方強度）→ 季（2–3 個 block，帶目標）→ 年 → 3 年階段（統計層） |
| 課表歸屬 | 混合制：課表掛「訓練組」，學員加入組別共用；一對一學員可有專屬課表 |
| 計畫驅動 | 6 週格狀表先進系統（動作 × 週次 × 劑量）；上課只記偏離 |
| Session 結構 | 固定四段：Raise / Activation & Mobilization / Potentiation / 主訓練 |
| RAMP 記帳 | 三個子階段各選「內容型態」（可複選、分鐘可調，預設 5/7/5），系統自動歸類 |
| 主訓練 | 從 5 個主軸擇一：Strength / SAQ / Plyo / Power / Energy；FMS、Mobility 只在 RAMP |
| 劑量 | 單一自由文字欄，`@` 後面若是數字則同時解析成負荷 |
| 強度 | block 層處方強度（低/中/高）+ session 層 sRPE |
| 等級 | 只追蹤 RAMP 九個 Focus 的 Level 1–3；拿掉 v1 自創徽章 |
| 遊戲名 | SGM 記 遊戲名稱 + Target Movement + 分類三層 |
| 娛樂塔 | 七種標準俄羅斯方塊（等面積）= 七元素；門檻依比重校準；block 完成固化成一層 |
| 突破構件 | 教練手動頒發（金/銀/彩）+ 一句話刻印；萬用形狀可填塔上的洞；**不計入科學圖** |
| 科學圖 | 成對水平長條（目標 vs 實際），單一長期尺度，不做雷達圖 |
| 比較 | 教練端可並排看全部學員；家長端只看自己 + 同階段匿名平均線 |
| 存取 | 公開查詢頁，輸入學員 ID 即可看；教練密碼解鎖編輯與教練分頁；不考慮隱私 |
| 輸入捷徑 | Google Sheet 發布 CSV → App 一鍵抓；另有貼上文字框保底；一列＝一堂課 |
| 測驗 | v2 不做體能測驗資料表 |
| 9 年視圖 | 資料結構支援，畫面先到「年」 |

---

## 3. RAMP 內容型態 → 分類歸屬

| 子階段 | 型態代碼 | 顯示 | 歸類（分鐘平分） |
|---|---|---|---|
| Raise | `locomotion` | 跑動組合 | saq, energy |
| Raise | `animal_flow` | 動物流 | fms, mobility |
| Raise | `sgm` | SGM 遊戲 | saq, energy |
| A&M | `dynamic_fms` | 動態伸展 + FMS | mobility, fms |
| A&M | `activation` | 肌群啟動（橋式/迷你帶） | strength, fms |
| Potentiation | `explosive_jump` | 高爆發跳躍 | power |
| Potentiation | `low_plyo` | 低強度增強式 | plyo |
| Potentiation | `iso_hold` | Isometric hold | strength |
| Potentiation | `short_accel` | 短距加速 | saq |

複選時該子階段分鐘數再平分到各型態。主訓練分鐘全數記入主軸。

---

## 4. 資料模型（D1 / SQLite）

```
athletes         id, public_id(查詢用ID,唯一), nickname, avatar_initial, sex('M'/'F'/''), birth_year,
                 stage('pre'|'circa'|'post'), stage_started_on, group_id, notes, created_at
groups           id, name, notes
stage_targets    stage, category, target_pct, tolerance_pct        -- 7×3，可編輯
growth_log       id, athlete_id, measured_on, height_cm, weight_kg
seasons          id, owner_type('group'|'athlete'), owner_id, title, goal_text, start_date, end_date
blocks           id, owner_type('group'|'athlete'|'template'), owner_id, season_id, title, goal_text,
                 main_axis, intensity('low'|'mid'|'high'), weeks, start_date, end_date,
                 ramp_template_id, raise_types, am_types, pot_types (JSON), sort_order
block_exercises  id, block_id, segment('sgm'|'power'|'strength'|'main'), name, target_movement,
                 category, doses(JSON 6 格), sort_order
ramp_templates   id, name, focus(JSON: 9 Focus × 3 Level), raise_min, am_min, pot_min
focus_levels     id, athlete_id, focus_key, level, achieved_on        -- 歷史紀錄，最新一筆為現況
sessions         id, athlete_id, block_id, session_date, week_no, main_axis, duration_min,
                 raise_min, am_min, pot_min, main_min, raise_types, am_types, pot_types (JSON),
                 session_rpe, coach_note, source('app'|'sheet'), created_at
session_exercises id, session_id, name, dose, load_kg, category, target_movement, sort_order, from_plan
turning_blocks   id, athlete_id, tier('gold'|'silver'|'rainbow'), reason_type, sentence, granted_on
exercise_catalog id, category, name, use_count  (UNIQUE category+name)
```

### 4.1 統計演算（讀取時計算，不落表）

```
每堂 session → 分類分鐘 map：
  main_axis += main_min
  for 子階段 in (raise, am, pot):
      每個型態 = 子階段分鐘 / 型態數
      每個型態的分鐘 / 該型態歸類數 → 加到各分類
累計（依階段區間過濾）→ 佔比 = 分類分鐘 / 總分鐘
構件數 = floor(分類累積分鐘 / 該階段門檻)；餘數 = 下一塊進度
```

---

## 5. API

| 路徑 | 方法 | 權限 | 用途 |
|---|---|---|---|
| `/api/auth` | POST/GET | — | 教練密碼換 token（沿用） |
| `/api/passport?id=` | GET | 公開 | 護照資料包：學員、階段目標、分類累積、塔構件、突破構件、Focus 等級、目前 block 與週次、最近紀錄、同階段基準 |
| `/api/athletes` | GET | 教練 | 全部學員（含塔高、分類佔比）供並排比較 |
| `/api/athletes` | POST/PUT | 教練 | 建立/更新學員（ID、暱稱、性別、出生年、階段、組別） |
| `/api/groups` | GET/POST | 教練 | 訓練組 |
| `/api/blocks?owner_type=&owner_id=` | GET | 教練 | 該組/學員的 block 列表（含動作格狀） |
| `/api/blocks` | POST | 教練 | 新建 block；`copy_from` 可從範本/舊 block 複製 |
| `/api/blocks?id=` | PUT/DELETE | 教練 | 更新格狀表 / 刪除 |
| `/api/templates` | GET | 教練 | 內建範本（Programme A/B、Sprints RAMP） |
| `/api/session` | POST | 教練 | 記錄一堂課（可一次多位學員） |
| `/api/session?id=` | DELETE | 教練 | 刪除 |
| `/api/import` | POST | 教練 | `{csv_url}` 或 `{text}` → 解析成 session 草稿（不寫入）；`{rows, commit:true}` 寫入 |
| `/api/turning-block` | POST/DELETE | 教練 | 頒發/撤回突破構件 |
| `/api/growth` | POST/DELETE | 教練 | 身高體重 |
| `/api/focus-level` | POST | 教練 | 設定某 Focus 的 Level（寫入歷史） |
| `/api/stage-targets` | GET/PUT | GET 公開 | 比重表 |

---

## 6. 畫面

```
#/            查詢頁：輸入 ID → #/p/<ID>；教練密碼入口 → #/coach
#/p/<ID>      護照頁（家長/孩子預設）
              分頁：🧱 我的塔 ｜ 📊 分布圖 ｜ 📒 紀錄 ｜ 📏 成長
              教練解鎖後加：🗓 本期課表 ｜ 🛠 教練工具
#/coach       教練總覽：學員並排（塔高、比例達標數）、組別、範本、Sheet 匯入
```

### 6.1 我的塔
- Canvas 繪製；每個元素固定一種 tetromino 與顏色；構件依累積順序落下堆疊（簡化版 Tetris 放置：由左至右尋找最低可放位置）
- block 完成時畫一條「層線」＋標題
- 突破構件：金/銀/彩 特殊質感；填入塔上最低空洞；點擊顯示刻印句子與日期
- 右側「下一塊」進度條 ×7

### 6.2 分布圖
- 七列成對水平長條：實際佔比（實色）vs 目標區間（淡色帶 = 目標 ± 容差）
- 尺度：目前階段全部累積（可切「全部歷史」）
- 落在區間內綠色標記 ✓、不足橘色 ▼、過多橘色 ▲；下方列出「下個 block 該補的元素」
- 同階段匿名平均：以細線標在每列

### 6.3 本期課表（教練）
- 目前 block 的格狀表：SGM / POWER / STRENGTH 三區段 × 6 週；點格可改劑量
- RAMP 卡：模板名、三個子階段的型態與分鐘
- 「記錄今天」按鈕 → 表單預填：主軸、RAMP 型態、本週處方動作（可改劑量 / 打勾缺席 / 加臨時動作）

### 6.4 教練工具
- 頒發突破構件（等級 + 理由類型 + 一句話）
- Focus 等級九宮格（點一下升級）
- 身高體重紀錄
- 學員資料（階段、性別、組別）

---

## 7. Google Sheet 匯入格式

一列＝一堂課，第一列為標題列（欄名固定，順序可換）：

| 日期 | 對象 | 主軸 | Raise | A&M | Potentiation | 主訓練 | 總時長 | sRPE | 備註 |
|---|---|---|---|---|---|---|---|---|---|
| 2026/9/3 | A班 | Strength | 動物流 | 動態伸展+FMS | 低強度增強式 | 照計畫, Kettlebell Deadlift 2x15@12kg | 50 | 6 | |
| 2026/9/5 | Ig9yNWU0sD23 | SAQ | SGM | 動態伸展+FMS | 短距加速 | 3x20m Startle Starts, 3x40m Build | 55 | 7 | 缺席: 小明 |

- **對象**：組別名稱或學員 ID；組別會展開成每位成員一筆；備註內 `缺席: ID1, ID2` 排除
- **型態**：中文顯示名或代碼皆可，多個用 `+` 或 `/` 分隔
- **主訓練**：`動作 劑量@負荷` 逗號分隔；`照計畫` 帶入當週處方；同名動作覆寫處方
- **主軸**：Strength / SAQ / Plyo / Power / Energy（中英皆可）
- 匯入流程：抓取 → 預覽（逐列顯示解析結果與警告）→ 確認寫入；已存在同日同學員的紀錄會標示「重複」預設跳過

---

# v3 增補：一堂課＝五個板塊 A–E（2026-09-03）

> 取代 v2 的「RAMP 三段 + 主訓練」記錄方式。安排與紀錄共用同一套板塊語言。

## v3.1 板塊

| 代號 | 板塊 | 中文 | 顏色 | 預設分鐘 | 沒排動作時的歸類 |
|---|---|---|---|---|---|
| A | Raise | 升溫 | 速度敏捷綠 | 5 | saq, energy |
| B | Activation | 肌群啟動 | 肌力紅 | 4 | strength, fms |
| C | Mobilize | 活動度 | 活動度粉 | 4 | mobility, fms |
| D | Potentiation | 激發 | 爆發力琥珀 | 5 | power, plyo |
| E | Main Training | 主訓練 | 品牌紫 | 總時長 − A~D | 主軸 |

## v3.2 分類分鐘的算法（改動重點）

**板塊的分鐘，依「該板塊實際排的動作」平分到各動作的能力分類。**

- 例：Raise 5 分排 arm swing jogging（速度敏捷）→ 5 分全記 saq
- 例：Main 33 分排 40m 衝刺（速度敏捷）→ 33 分全記 saq（不再固定記主軸）
- 該板塊沒排動作 → 退回板塊型態（`raise_types` / `act_types` / `mob_types` / `pot_types`）
- 型態也空 → 退回上表的預設歸類；主訓練退回主軸

構件門檻與塔的邏輯不變。

## v3.3 動作的欄位

每個動作記：**能力分類 · 組數 · 次數／距離／秒 · 重量(kg)**。
`reps` 是文字（可寫 `20m`、`30 秒`、`10 步/腳`）；`sets` 是數字；`dose` 仍保留成 `3x8` 形式供舊資料與 Sheet 相容。

## v3.4 schema 變更（`migrate-v3.sql`）

- `sessions`：新增 `act_min` / `mob_min` / `act_types` / `mob_types`（由 `am_min`、`am_types` 對半拆出；舊欄位保留）
- `session_exercises`：新增 `segment` / `sets` / `reps`；舊 `dose` 自動拆解
- `blocks`：新增 `act_types` / `mob_types`
- `ramp_templates`：新增 `act_min` / `mob_min`
- `block_exercises.segment`：`sgm`→`raise`、`power`→`pot`、`strength`→`main`
- 已記錄且來自計畫的動作，依課表回填正確板塊

## v3.5 Sheet 匯入

標題列改為 `日期 | 對象 | 主軸 | 時長 | Raise | Activation | Mobilize | Potentiation | 主訓練 | RPE | 備註`。
舊的單一 `A&M` 欄仍相容（自動拆成 Activation + Mobilize）。
新增型態代碼：`core`（核心穩定 → strength, fms）、`joint_flow`（關節活動流 → mobility）。

---

# v4 增補：動作庫（2026-09-03）

`exercise_catalog` 從「用過的名字」升級成有分級、有預設劑量、有板塊歸屬的動作庫。

## v4.1 欄位

| 欄位 | 用途 |
|---|---|
| `segment` | 預設掛在哪個板塊（A–E） |
| `family` | 動作家族，例如「力量A｜硬舉」「跳躍落地 B · 水平位移」 |
| `level` | 分級 1–7（力量矩陣）或 1–6（體操跑酷），沒分級就 NULL |
| `def_sets` / `def_reps` | 預設組數與次數，挑進課表時自動帶入 |
| `note` | 教練提示，例如「角度小於 45 度，通過錐筒維持速度」 |
| `is_library` | 1＝會出現在挑選器；0＝只出現在打字建議 |

## v4.2 內容

183 個動作，來源是使用者上傳的 LTAD Network 教材（15 張表）：

- 速度敏捷遊戲（11）· 加速（8）· 減速與後退（3）· 橫向與切入（7）
- 技術鑽練｜加速（7）· 技術鑽練｜最大速度（6）· 最大速度跑（4）
- 跳躍落地 A / B / C（17）· FMS 地板熱身（19）
- Foundation Strength Matrix A / B，各 5 家族 × 7 級（70）
- 體操與跑酷技能，5 家族 × 6 級（30）

seed 檔 `seed-library.sql` + `seed-library-strength.sql`，用 ON CONFLICT 更新，可重跑。

## v4.3 挑選器

排課與記錄的「＋ 動作」開啟挑選器：依板塊過濾、家族分組、可搜尋、可複選。
選完自動帶入能力分類與預設組數次數。搜尋無結果時可一鍵把該名稱建進動作庫。

## v4.4 自動記憶

記錄一堂課或存 block 課表時，庫裡沒有的動作會自動收進家族「自訂動作」
（`catalogUpsert()` in `_shared/model.js`），下次排課就選得到。
內建動作的分級與預設劑量不會被使用紀錄覆蓋，只有自訂動作會跟著最後一次用法更新。

教練後台「動作庫」面板管理全部動作：搜尋、板塊篩選、家族摺疊、逐項改／刪、多選批次移除、整組移除。

---

# v6 增補：中期目標與頭像（2026-09-04）

## v6.1 中期目標取代「本期課表」分頁

`blocks` 就是中期目標（4–6 週）。新增欄位：

| 欄位 | 用途 |
|---|---|
| `goal_kind` | `general` 一般能力發展 ／ `competition` 比賽週期化 |
| `phase` | 比賽期別：prep / build / peak / taper / recovery |
| `emphasis` | JSON，這段期間七大分類各佔多少百分比；空＝沿用階段建議值 |
| `goal_template_id` | 套用的範本 |

新表 `goal_templates`，10 個內建範本可改可增：

- **一般能力發展**：提升速度與敏捷、建立肌力基礎、動作品質與活動度、爆發力與彈性、體能與恢復力
- **比賽週期化**：準備期（賽前 12–9 週）、專項強化期（8–5 週）、爆發期（4–2 週）、賽前減量（1 週）、賽後恢復

「🎯 中期目標」分頁**公開**，教練與學員都看得到；護照頁最上方永遠有一條目標橫幅。
分頁內容：目標名稱與期別、第幾週、這段期間累積幾堂幾分鐘、
**實際比重 vs 目標比重的橫條**、以及「還缺什麼」。

週課表格狀（`block_exercises`）移到 `#/coach` →「中期目標與週課表（進階）」，護照頁不再出現。

## v6.2 頭像

`athletes.avatar`：`p1`–`p5` 五款內建 SVG（衝刺／舉重／跳躍／平衡／翻滾，用七能力配色），
或上傳照片（前端裁成 256px 方形存 data URI，上限約 200KB）。沒設就退回頭像文字。

## v6.3 其他

- `PUT /api/session?id=` 事後修改一堂已記錄的課，用 `force_id` 保留原本的 id
- `DELETE /api/athletes?id=` 刪學員，連同紀錄、突破構件、身高體重、個人目標

---

# v7–v8 增補：動作示範影片（2026-09-04）

## v7.1 只存影片 ID

`exercise_catalog` 新增 `video_id`（11 碼）、`video_title`、`video_channel`、
`video_seconds`、`video_status`、`video_alts`、`video_reason`。

縮圖用 `https://i.ytimg.com/vi/<id>/mqdefault.jpg`，播放用 youtube-nocookie iframe。

> ⚠️ **不下載影片、不自行截圖**——那違反 YouTube 服務條款。
> 用官方縮圖與官方播放器則完全合規，那本來就是給人嵌入用的。

## v7.2 狀態機

| `video_status` | 意思 |
|---|---|
| `pending` | 待搜尋（新動作預設） |
| `suggested` | AI 找到了，等教練按 |
| `ok` | 已確認／已上線 |
| `nomatch` | 找過但沒有合適的（**不會再被預設佇列撈回去重搜**） |
| `skip` | 教練標記這個動作不用影片 |

## v7.3 搜尋與挑選流程

1. YouTube `search.list` 依動作名稱撈 10 支（100 單位／次）
2. `videos.list` 取時長與觀看數（1 單位）
3. **硬砍超過 3 分鐘的**（教練規則；成人示範可接受）
4. Gemini 判斷哪一支真的是這個動作
5. `auto:true` 直接上線，否則存成待審；**都對不上就留空，不硬掛**

同一個動作的不同重量／等級（`Kettlebell Deadlift (8-10kg / 10-12kg / 12-14kg)`）
合併成一次搜尋再套用回去，省配額。

## v7.4 LLM 挑片踩過的三個坑

1. **`gemini-2.5-flash` 已下架**（404），要用 `gemini-3.6-flash`。
   該模型會先花 token 思考，`maxOutputTokens` 給太小會 `finishReason=MAX_TOKENS`
   回空字串——給 4000。
2. **模型會挑一支自己剛判定為不符的影片**：理由寫「與體能訓練情境不符」卻仍回傳該編號。
   解法是要求逐支 `verdicts:[{i,match,why}]`，程式端只接受 `verdicts[pick].match === true`，
   而且**沒有逐支判定就整個不採用**。
3. LLM 呼叫失敗時**不要退回關鍵字評分**。在「直接上線」模式下，
   那等於把沒被檢查過的結果放行。出錯就留空。

## v7.5 配額

免費額度 10,000 單位／日，搜尋每次 100 單位 → **一天約 100 個動作**。
太平洋時間午夜歸零。一批上限 15 次搜尋（每個動作 3 個外部請求，受 Cloudflare 子請求數限制），
前端會自動接力跑完整個範圍，額度用完自動停下並說明。

## v7.6 實測命中率

| 分類 | 命中 |
|---|---|
| 速度敏捷 | 24 / 46 |
| 肌力 | 17 / 22 |

留空的多半是 LTAD 自創命名（Pursuit、Seaweed、Separate & Devastate、High/Low Bar Press Up），
YouTube 上沒有對應內容，AI 正確地拒絕。這類動作用「🔍 換關鍵字重搜」或「🎬 自己貼連結」處理，
實測換成 `wall drill isometric hold sprint acceleration` 這種描述式關鍵字後就找得到。
