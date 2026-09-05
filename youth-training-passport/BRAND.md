# 訓練護照 · 品牌與視覺規範

> 適用範圍：**只有這個 app**（`youth-training-passport/`）。
> 其他專案（北海道、滑雪、總經儀表板）不套用這份文件。
> 定案來源：2026-09-05 grilling 全程，Q1–Q21 + 畫風比稿兩輪。

---

## 0. 這份文件管什麼

| 管 | 不管 |
|---|---|
| 顏色、字體、logo、畫風、鋼印、開場流程 | 功能規格（見 `SPEC-v2.md`） |
| 生圖用的 prompt 模板 | 訓練模型與比重（見 `knowledge/ypd/coach-workflow.md`） |
| landing page 的視覺與互動 | 教練後台的資訊架構 |

---

## 1. 品牌結構：雙層

```
菜逼爸教練 / The Newbie & Noobie        ← 母品牌（人）
  └── 訓練護照 / Youth Training Passport  ← 產品（物）
```

- **母品牌**由 `標準logo.png` 那顆圓形徽章代表。它講給**家長**聽 —— 溫暖、家庭、可信任。
- **產品**由**鋼印**代表（見 §5）。它講給**孩子**聽 —— 儀式、擁有、蓋章。
- 兩者靠同一組色票綁在一起。**不要把徽章當成 app icon 用**，它在 44px 會糊成一團。

### 露出位置

| 元件 | 位置 | 說話對象 |
|---|---|---|
| 圓形徽章 logo | **所有 topbar**（landing / 護照頁 / 教練後台）＋ footer colophon | 家長 |
| 鋼印 | landing 正中央（互動元件） | 孩子 |
| 文字商標「訓練護照」 | 所有 topbar，緊接在徽章右側 | 全部 |

> 徽章在 topbar 固定 30px。原本規劃只放 landing，實作時改成所有 topbar 都掛 ——
> 否則 landing 與內頁看起來像兩個產品。`.brand` 已改為 inline-flex 容納它。

---

## 2. 標準色

### 2.1 既有 token —— **一律不動**

`tokens.css` 的 paper / surface / ink / rule / 七元素色階 / gold / silver / good-warn-bad **全部保留原值**。

理由（實測）：定案主圖的天空上緣是 `#E6F8F2` = `oklch(96.4% 0.020 174)`，現有 `--paper` 是 `oklch(97.2% 0.008 165)`。兩者相差 0.8% 明度、0.012 彩度、9° 色相 —— **是同一個色族**。原本規劃的「改成暖奶油」已作廢。

七元素色階依賴 `--paper` 的冷色底做對比計算，動它會連鎖破壞 21 個 token。**不要動。**

### 2.2 新增 —— landing 天空層

只服務 landing page，工具頁不使用。

```css
--sky-hi:   oklch(96.4% 0.020 174);  /* #E6F8F2 天空上緣，幾乎等同 --paper */
--sky:      oklch(90.7% 0.062 213);  /* #B1ECF9 天空中段 */
--sky-deep: oklch(78.9% 0.092 239);  /* #81C3EF 天空下緣 */
--gold-ray: oklch(93.6% 0.051 90);   /* #F7E9C4 陽光光束 */
--gold-mon: oklch(84.6% 0.100 88);   /* #E8C97E 和柄雲紋 */
--navy:     oklch(27.9% 0.089 265);  /* #122554 深藍，主圖球衣色 */
```

### 2.3 品牌色

```css
--brand:       oklch(54.4% 0.171 30);   /* #BF3B2B 磚紅，取樣自 標準logo.png */
--brand-steel: oklch(49.7% 0.077 240);  /* #35688A 鋼藍，取樣自 標準logo.png */
```

### 2.4 ⚠️ 強制隔離規則：磚紅 vs 肌力紅

| | 值 |
|---|---|
| `--brand` | `oklch(54.4% 0.171 30)` |
| `--c-strength` | `oklch(56% 0.170 30)` |

**這兩個在數值上是同一個顏色。** 不是相近，是一樣。所以：

1. **`--brand` 永遠不當 UI 狀態色** —— 不做連結色、不做 focus、不做選取態。系統互動色仍然是 `--accent`（靛 286）。
2. **兩者不同框。** `--brand` 只活在 landing、topbar、footer、鋼印。`--c-strength` 只活在方塊塔與分布圖。
3. **萬一必須同框**，`--brand` 那一塊要帶 3px 墨黑描邊（因為它是「品牌物件」），七元素色塊維持無描邊（因為它們是「資料」）。描邊的有無就是類別標記。

### 2.5 色彩職責總表

| 顏色 | 職責 | 禁止 |
|---|---|---|
| `--paper` / `--surface` | 工具頁的底 | 用在 landing 天空 |
| `--sky` 系列 | landing 的底 | 進入工具頁 |
| `--brand` 磚紅 | 品牌露出、鋼印、主 CTA | 任何 UI 狀態 |
| `--accent` 靛 286 | 連結、focus、選取 | 品牌露出 |
| 七元素色階 | 塔、分布圖、圖例 | 離開資料視覺化的範圍 |
| `--gold` / `--silver` | 突破構件 | 一般裝飾 |

---

## 3. Logo 規範

**來源檔**：`C:\Users\aa093\OneDrive\桌面\ChatGPT - 小小運動員和菜逼爸教練_files\`

| 檔案 | 用途 |
|---|---|
| `標準logo.png` | 主識別。完整彩色版 |
| `newbienoobie去背原圖.png` | 疊在任何底色上時使用 |
| `漫畫logo.png` | 線稿版。做浮水印、鋼印線稿、載入動畫 |
| `角色1–5.png` | 舊版復古繪本風角色圖。**已被鬼滅風取代，勿用於新素材** |

### 使用規則

- **最小尺寸 72px**。低於此改用文字商標。
- **淨空區** ≥ 徽章直徑的 12%。
- **不得**：改色、加陰影、加漸層、變形、旋轉、局部裁切。
- 深色底上使用去背版，不要自己加白框。

---

## 4. 美術風格：鬼滅之刃（ufotable）

2026-09-05 兩輪比稿定案。九種畫風測試後選定。

### 語彙

| 項目 | 規格 |
|---|---|
| 線條 | 細緻精練的描邊，粗細有變化，非均一 |
| 上色 | 扁平主色 + 柔和漸層陰影，不是硬邊 cel |
| 光 | 體積光光束、逆光輪廓光、漂浮光粒子 |
| 背景 | 水彩質感漸層天空，**和柄雲紋**（金色，低不透明度） |
| 色調 | 高明度、天藍為主、金色點綴、寶石色系角色服裝 |
| 情緒 | 明亮、朝氣、陽光。**不是**鬼滅原作的悲壯與夜戰 |

### 4.1 可複用 STYLE BLOCK

生任何新素材時，主體描述後面接這一段：

```
STYLE: Demon Slayer Kimetsu no Yaiba (ufotable). Delicate refined linework
with varying weight. Flat base colors with soft luminous gradient shading.
Radiant volumetric sunlight, glowing atmospheric particles, strong rim light
on every figure. Luminous watercolor-like gradient sky. Traditional Japanese
wagara cloud pattern motifs in gold at low opacity in the corners.
Bright high-key palette — sky blue dominant, warm gold accents, jewel-tone
costumes. Joyful uplifting daytime energy. Cinematic anime key visual quality.

PALETTE: sky #B1ECF9 / #81C3EF, sky-high #E6F8F2, gold #F7E9C4 / #E8C97E,
navy #122554, brick red #BF3B2B, white.

NEGATIVE: no night scenes, no blood, no combat, no somber mood,
no dark backgrounds, no neon, no halftone dots, no photorealism.
```

### 4.2 角色設定（生圖時必須逐字照抄）

**小小運動員（男）**
```
a 10-year-old Asian boy with messy black hair, white athletic tank top,
navy blue shorts, white crew socks, navy running shoes
```

**小小運動員（女）**
```
a 10-year-old Asian girl with a high ponytail and blunt bangs,
white athletic tank top, navy blue shorts, white crew socks, pink running shoes
```

### 4.2.1 角色聖經（2026-09-05 建立）

存於 `character-bible/`。**生任何新素材前，先把對應的三視圖當 image reference 餵進去** ——
不這樣做，每次生出來的臉都會是不同人。

| 檔案 | 內容 |
|---|---|
| `男孩-三視圖.jpg` / `女孩-三視圖.jpg` | 正面／側面／背面，含頭肩腰膝對位輔助線 |
| `男孩-表情表.jpg` / `女孩-表情表.jpg` | 9 宮格：堅定／大笑／喘／驚訝／專注／失落／驕傲／吶喊／平靜 |
| `00-角色聖經總覽.jpg` | 四張一起看 |
| `*.png` | 2K 原始檔，留在磁碟不進版控 |

**生圖時的用法**（Magnific `images_generate`）：

```
references: [{ "type": "image", "identifier": "<三視圖的 creation id>" }]
```

本聖經本身就是用定案主圖（八人金字塔直式 A）當 reference 生的，所以臉與已上線的 landing 一致。

### 4.2.2 角色配色碼

實際從三視圖取樣，非目測。

| 部位 | 男孩 | 女孩 |
|---|---|---|
| 髮 | `#343336` | `#2F302F` |
| 膚 | `#FED7BB` | `#FFDBC3` |
| 白背心 | `#F4F5F7` | `#F4F5F9` |
| 深藍短褲 | `#3B4468` | `#404668` |
| 白襪 | `#F5ECE6` | `#F5F4EF` |
| 跑鞋 | `#404668` 深藍（同短褲色族） | 粉珊瑚系 `≈#E3A19F`※ |

※ 女孩鞋色取樣落在邊緣混色帶（`#D7BBBA` 亮部 ～ `#B27D83` 暗部），容差較大，以畫面為準。

**短褲的深藍 `#3B4468` 與 landing 主圖球衣的 `--navy #122554` 不同**——
前者是角色服裝色，後者是 UI token。兩者不要互相替換。

### 4.3 Landing 主圖

**檔案**：`style-tests/主圖-鬼滅之刃-B.png`（2752×1536，16:9）

**構圖規則**：
- 兩個小小運動員**必須在正中央**。
- 其他角色左右對稱散開，由外而內按身高遞減。
- 使用時：`object-fit: cover; object-position: center;`
- 手機直式會裁成 9:16，中央兩個孩子仍在安全區內（已驗證，見 `主圖-鬼滅之刃-手機裁切預覽.jpg`）。

---

## 5. 鋼印（landing 主互動元件）

### 造型

- 圓形，外圈星芒鋸齒邊，**單色磚紅 `--brand`** + 墨黑厚描邊。
- 外圈弧形字：`YOUTH TRAINING PASSPORT`
- 中心：奔跑孩童剪影
- 中心下方：一條刻名字的橫線
- 鬼滅風的**發光粒子**繞著章飄（用 CSS，不用圖）

> 環一定要單色。多色鋸齒環縮到 44px 會糊 —— 已在比稿第一輪驗證過。

### 版面位置

**壓在畫面下緣中央，斜壓過兩個孩子的腳邊。**

理由：主圖正中央是兩個孩子的臉，鋼印疊上去會蓋住。真實護照的鋼印本來就會壓過照片邊緣，所以這個擺法同時解決版面與物理正確性。手機裁切後仍在安全區。

### 互動規格

| 項目 | 規格 |
|---|---|
| 觸發 | 長按 **1.6 秒**（不是 3 秒 —— 手機上 3 秒體感過久） |
| 回饋 | 三重疊加：章身下壓 + 環形進度繞章一圈 + 墨水由中心往外滲 |
| 短按 | 章彈一下 + 提示「按住不放」。不可以沒反應 |
| 中途放開 | 墨水回吸、進度歸零、章彈回。要讓「差一點」被看見 |
| 完成 | 蓋章音效感的視覺頓點 → 轉場進工具頁 |
| **回訪** | **第 3 次之後改成短按直接進**，或提供「跳過」 |
| 無障礙 | Space / Enter 按住等效；`prefers-reduced-motion` 直接跳過動畫 |

> 「第 3 次後改短按」不可省略。儀式感是一次性的，第 5 次它就是摩擦。

---

## 6. 開場流程

```
首次
  輸入護照編號 (Ig9yNWU0sD23)
    → API 回傳學員資料
    → 章面浮現名字「小恩」
    → 長按 1.6s 蓋章
    → 進入護照工具頁

回訪（localStorage 有 ytp-last-id）
  直接顯示已刻好名字的章
    → 長按（第 3 次後短按）
    → 進入
```

**唯一鍵永遠是 `public_id`，不是名字。** 名字只做顯示與刻印，不做查詢 —— 名字不唯一，且會讓任何人查到別人小孩的紀錄。

---

## 7. 字體

沿用現有，**不新增字體**。

| 角色 | 字體 | 用途 |
|---|---|---|
| display | `Big Shoulders Display` 700/900 | 標題、數字、masthead |
| body | `Noto Sans TC` 400/500/700/900 | 內文 |
| outlier | `JetBrains Mono` 400/700 | **只有兩個位置**：護照 ID 本身、輸入 ID 的欄位 |

> outlier 的 2+1 規則：outlier ≤ 2 slots。不要擴散使用。

---

## 8. 語氣

沿用「菜逼爸寫作系統」（見根目錄 `CLAUDE.md`）。針對本 app 的補充：

- **對孩子說話**：短句、具體、第二人稱。「你的塔蓋到第 4 層了。」
- **對家長說話**：說明機制、不說教。「這堂課的時間會分配到七種能力上。」
- **錯誤訊息**：說發生什麼 + 怎麼修。不道歉、不模糊。
  - ✅「這個編號查不到。跟教練確認一下有沒有打錯。」
  - ❌「很抱歉，發生錯誤。」
- **按鈕**：說清楚會發生什麼。「查看」→ 完成後 toast「已開啟」。

---

## 9. 檔案與同步規則

| 檔案 | 說明 |
|---|---|
| `tokens.css` | 可攜的 token 主檔 |
| `public/index.html` 第 10–927 行 `<style>` | **上面那份的內嵌副本。改一邊必須改另一邊。** |
| `public/app.js` | 公開側：路由、`renderHome()`、護照四分頁 |
| `public/coach.js` | 教練後台。**只跟著換色票，版面與資訊密度不動** |
| `public/assets/` | 上線用素材：`hero.jpg`（1920×1072）、`stamp.png`（去背 640）、`logo.png`（去背 320） |
| `prototype-landing.html` | Landing 原型。在專案根目錄，直接吃 `tokens.css`，用本機 http server 開 |
| `style-tests/` | 畫風比稿素材與定案主圖（原始 2K 檔） |

### 鐵則

1. 畫面上任何顏色與字體**必須走 `var(--token)`**，不可寫死 hex 或 font-family。
2. 三個主題狀態都要處理：bare `:root`（light）、`@media (prefers-color-scheme: dark)` 加 `:root:not([data-theme="light"])` 守衛、`:root[data-theme="dark"]`。
3. landing 的天空層在 dark mode 要壓暗，但**不可翻轉成夜景** —— 品牌情緒是白天。

---

*最後更新：2026-09-05*
