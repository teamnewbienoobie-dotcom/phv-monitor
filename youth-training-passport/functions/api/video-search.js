/**
 * /api/video-search — 幫動作庫找示範影片（教練）
 * GET            回報進度：幾個已設定 / 待審 / 待搜尋 / 不需要
 * POST { limit } 撈出待搜尋的動作去 YouTube 找，挑一支放進「待審」，其餘存成備選
 * POST { id }    只重找某一個動作
 *
 * 規則（教練定的）：影片必須 < 3 分鐘；成人示範可以接受。
 * 只存影片 ID，縮圖與播放都用 YouTube 官方網址，不下載影片、不自行截圖。
 */
import { json, parseJson, ytDuration, parseYouTube, CATEGORIES, CAT_LABEL, SEG_META } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

const SEG_LABEL = Object.fromEntries(Object.entries(SEG_META).map(([k, v]) => [k, `${v.letter} ${v.label}（${v.zh}）`]));

const MAX_SECONDS = 180;          // 教練規則：3 分鐘
const SEARCH_COST = 100;          // YouTube search.list 每次 100 單位
const DAILY_QUOTA_HINT = 10000;   // 免費額度，約等於一天 100 次搜尋
const MAX_PER_RUN = 15;           // 一批上限：受 Cloudflare 子請求數限制
const LLM_MODEL = 'gemini-3.6-flash';

/** 動作名稱 → 搜尋字串。以動作名稱為主，只補一個很輕的修飾語 */
function buildQuery(name, category) {
  const clean = String(name)
    .replace(/\([^)]*\)/g, ' ')          // 去掉 (8-10kg) 這種括號內容
    .replace(/\d+\s*(kg|公斤|inch)/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const hint = {
    strength: 'exercise', fms: 'exercise', mobility: 'drill',
    power: 'drill', plyo: 'drill', saq: 'drill', energy: 'drill',
  }[category] || 'exercise';
  return `${clean} ${hint}`;
}

const GOOD = [/how\s*to/i, /tutorial/i, /technique/i, /demo/i, /coaching/i, /form/i, /progression/i, /drill/i, /教學/, /示範/];
const BAD = [/compilation/i, /motivation/i, /fail/i, /vs\.?\s/i, /full\s+workout/i, /podcast/i, /reaction/i, /music/i];

function scoreVideo(v, name) {
  const title = v.title || '';
  const lower = title.toLowerCase();
  const words = String(name).replace(/\([^)]*\)/g, ' ').toLowerCase().split(/[^a-z0-9一-鿿]+/).filter(w => w.length > 2);
  let s = 0;
  const hit = words.filter(w => lower.includes(w)).length;
  s += words.length ? (hit / words.length) * 50 : 0;          // 標題有沒有講到這個動作，最重要
  for (const re of GOOD) if (re.test(title)) s += 6;
  for (const re of BAD) if (re.test(title)) s -= 14;
  // 教練規則：3 分鐘以內。20–120 秒最好，短示範最實用
  if (v.seconds != null) {
    if (v.seconds > MAX_SECONDS) s -= 60;
    else if (v.seconds >= 15 && v.seconds <= 120) s += 12;
    else if (v.seconds < 15) s -= 4;
  }
  s += Math.min(Math.log10((v.views || 0) + 10) * 3, 12);      // 觀看數只當微調
  return Math.round(s * 10) / 10;
}

async function searchOne(key, name, category, overrideQuery) {
  const q = overrideQuery ? String(overrideQuery).trim().slice(0, 120) : buildQuery(name, category);
  const su = new URL('https://www.googleapis.com/youtube/v3/search');
  su.search = new URLSearchParams({
    key, part: 'snippet', q, type: 'video', maxResults: '10',
    videoEmbeddable: 'true', safeSearch: 'strict', relevanceLanguage: 'en',
  }).toString();
  const sr = await fetch(su, { headers: { 'User-Agent': 'training-passport/7' } });
  if (!sr.ok) {
    const t = await sr.text();
    throw new Error(`YouTube 搜尋失敗（HTTP ${sr.status}）${t.slice(0, 160)}`);
  }
  const sj = await sr.json();
  const ids = (sj.items || []).map(i => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { query: q, candidates: [] };

  // 第二次呼叫拿時長與觀看數（只花 1 單位）
  const vu = new URL('https://www.googleapis.com/youtube/v3/videos');
  vu.search = new URLSearchParams({ key, part: 'snippet,contentDetails,statistics', id: ids.join(',') }).toString();
  const vr = await fetch(vu);
  const vj = vr.ok ? await vr.json() : { items: [] };
  const cands = (vj.items || []).map(v => ({
    id: v.id,
    title: v.snippet?.title || '',
    channel: v.snippet?.channelTitle || '',
    seconds: ytDuration(v.contentDetails?.duration),
    views: Number(v.statistics?.viewCount || 0),
  }));
  for (const c of cands) c.score = scoreVideo(c, name);
  // 3 分鐘是硬規則：超過就不要，寧可這個動作沒有影片
  const within = cands.filter(c => c.seconds != null && c.seconds <= MAX_SECONDS);
  within.sort((a, b) => b.score - a.score);
  return { query: q, candidates: within.slice(0, 8), dropped_long: cands.length - within.length };
}

const fmtDur = s => (s == null ? '?' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

/** 把一串影片 ID 補上標題／時長／觀看數。videos.list 一次最多 50 個、只花 1 單位 */
async function hydrate(key, ids) {
  if (!ids.length) return [];
  const vu = new URL('https://www.googleapis.com/youtube/v3/videos');
  vu.search = new URLSearchParams({ key, part: 'snippet,contentDetails,statistics,status', id: ids.slice(0, 50).join(',') }).toString();
  const vr = await fetch(vu);
  if (!vr.ok) throw new Error(`YouTube 取影片資訊失敗（HTTP ${vr.status}）${(await vr.text()).slice(0, 140)}`);
  const vj = await vr.json();
  return (vj.items || [])
    .filter(v => v.status?.embeddable !== false)     // 不能嵌入的就別選了
    .map(v => ({
      id: v.id,
      title: v.snippet?.title || '',
      channel: v.snippet?.channelTitle || '',
      seconds: ytDuration(v.contentDetails?.duration),
      views: Number(v.statistics?.viewCount || 0),
    }));
}

/**
 * 走一般網頁搜尋找 YouTube 網址，再用 videos.list 補資料。
 * YouTube 的 search.list 每次要 100 單位，這條路只花 1 單位，額度用完時的主力。
 */
async function searchViaWeb(env, name, category, overrideQuery) {
  const base = overrideQuery ? String(overrideQuery).trim().slice(0, 120) : buildQuery(name, category);
  const q = `site:youtube.com ${base}`;
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, limit: 10 }),
  });
  if (!r.ok) throw new Error(`網頁搜尋失敗（HTTP ${r.status}）${(await r.text()).slice(0, 140)}`);
  const j = await r.json();
  const ids = [];
  for (const w of (j.data?.web || [])) {
    const id = parseYouTube(w.url);
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return { query: q, candidates: [], dropped_long: 0 };
  const cands = await hydrate(env.YOUTUBE_API_KEY, ids);
  for (const c of cands) c.score = scoreVideo(c, name);
  const within = cands.filter(c => c.seconds != null && c.seconds <= MAX_SECONDS);
  within.sort((a, b) => b.score - a.score);
  return { query: q, candidates: within.slice(0, 8), dropped_long: cands.length - within.length };
}

/**
 * LLM 從候選裡挑一支並說明理由。挑不到就回 null（寧可空著也不要掛錯影片）。
 * 判斷交給模型，硬規則（3 分鐘）在進來之前就篩掉了。
 */
async function rankWithLLM(env, ex, candidates) {
  const key = env.GEMINI_API_KEY;
  if (!key || !candidates.length) return null;
  const list = candidates.map((c, i) =>
    `${i}. 標題：${c.title}\n   頻道：${c.channel}｜長度：${fmtDur(c.seconds)}｜觀看：${c.views}`).join('\n');
  const prompt = `你在幫一個兒童與青少年肌力體能教練，替訓練動作挑一支 YouTube 示範影片。
這些動作出自青少年長期運動發展（LTAD）課程，有些是遊戲化的敏捷訓練，名字取得很口語。

動作名稱：${ex.name}
能力分類：${ex.categoryLabel}
課堂板塊：${ex.segmentLabel}

候選影片：
${list}

判斷原則，依重要性排序：

1. 影片必須發生在「體能訓練或運動訓練」的情境：教練帶練、鑽練示範、動作教學。
   很多訓練動作的名字跟其他領域撞名。只要影片其實屬於別的領域，一律不選，例如：
   電影或迷因片段、料理食譜、單一運動項目的個人技術招式（例如籃球過人、足球假動作）、
   遊戲實況、音樂。標題字面一樣不代表是同一件事。

2. 影片示範的必須就是「${ex.name}」這個動作或這個鑽練本身。
   名稱相近但實際是另一個動作（例如 Split Squat 對上 Bulgarian Split Squat）不要選。

3. 要是教學或示範，不要比賽片段、不要訓練 vlog、不要多動作的完整課表影片。

4. 成人或兒童示範都可以接受，不用特別偏好。

5. 只要你需要用「跟這個動作有關聯」「精神類似」這種理由才能說服自己，就代表不對，match 給 false。
   留空是完全可以接受的結果，掛錯影片比沒有影片糟。

請先逐支判定，再從判定通過的裡面挑一支。pick 只能填 match 為 true 的編號；
一支都沒通過就填 null。不要挑一支你自己判定為 false 的影片。

只回 JSON，不要其他文字：
{"verdicts":[{"i":0,"match":true 或 false,"why":"<10 字以內>"}, ...依序每一支],
 "pick": <候選編號，或 null>, "reason": "<20 字以內的中文理由>"}`;

  // maxOutputTokens 要留夠：這個模型會先花 token 思考，額度太小會 MAX_TOKENS 空手而回
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 4000 },
    }),
  });
  if (!r.ok) throw new Error(`LLM 排序失敗（HTTP ${r.status}）`);
  const j = await r.json();
  const cand = j.candidates?.[0];
  if (cand?.finishReason && cand.finishReason !== 'STOP') throw new Error(`LLM 沒講完（${cand.finishReason}）`);
  let out;
  try { out = JSON.parse(cand?.content?.parts?.[0]?.text || ''); } catch { return null; }

  const i = out?.pick;
  if (i == null || !Number.isInteger(i) || i < 0 || i >= candidates.length) return null;
  // 它會挑一支自己剛判定為「不是這個動作」的影片，所以以逐支判定為準；
  // 沒有逐支判定就不採用——寧可留空，也不要放一個沒被檢查過的結論進去。
  const verdicts = Array.isArray(out.verdicts) ? out.verdicts : null;
  if (!verdicts) return null;
  const verdict = verdicts.find(v => v && Number(v.i) === i);
  if (!verdict || verdict.match !== true) return null;
  return { video: candidates[i], reason: String(out.reason || '').slice(0, 60) };
}

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  try {
    const counts = (await env.DB.prepare(
      `SELECT video_status st, count(*) n FROM exercise_catalog WHERE is_library=1 GROUP BY video_status`
    ).all()).results;
    const by = Object.fromEntries(counts.map(r => [r.st, r.n]));
    const byCat = (await env.DB.prepare(
      `SELECT category, count(*) n FROM exercise_catalog
       WHERE is_library=1 AND video_id='' AND video_status IN ('pending','none') GROUP BY category`
    ).all()).results;
    const stats = {
      ok: by.ok || 0, suggested: by.suggested || 0, pending: by.pending || 0,
      skip: by.skip || 0, none: by.none || 0, nomatch: by.nomatch || 0,
      need_by_category: Object.fromEntries(byCat.map(r => [r.category, r.n])),
      has_key: !!env.YOUTUBE_API_KEY,
      has_llm: !!env.GEMINI_API_KEY,
      has_web: !!env.FIRECRAWL_API_KEY,
      per_run: MAX_PER_RUN,
      per_day: Math.floor(DAILY_QUOTA_HINT / SEARCH_COST),
    };

    if (request.method === 'GET') return json(stats);

    if (request.method === 'POST') {
      if (!env.YOUTUBE_API_KEY) {
        return json({ error: '還沒設定 YouTube API 金鑰。到 Google Cloud 建一個啟用 YouTube Data API v3 的 API key，再執行：npx wrangler pages secret put YOUTUBE_API_KEY' }, 400);
      }
      const body = await request.json().catch(() => ({}));
      // 一個動作要打 3 次外部 API（YT search + YT videos + LLM），
      // Cloudflare 單一請求的子請求有上限，所以一批最多 15 個
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 15, 1), MAX_PER_RUN);
      const auto = body.auto === true;                       // true = AI 挑完直接上線，不進待審
      const cat = CATEGORIES.includes(body.category) ? body.category : null;
      const retry = body.retry === true;   // 把「找過但沒找到」的再試一次
      // 搜尋來源：yt = YouTube search.list（每次 100 單位）；web = 一般網頁搜尋 + videos.list（1 單位）
      const useWeb = body.source === 'web' && !!env.FIRECRAWL_API_KEY;
      if (body.source === 'web' && !env.FIRECRAWL_API_KEY) {
        return json({ error: '還沒設定 FIRECRAWL_API_KEY，網頁搜尋來源不能用' }, 400);
      }

      const raw = body.id
        ? (await env.DB.prepare('SELECT id, name, category, segment FROM exercise_catalog WHERE id=?').bind(body.id).all()).results
        : (await env.DB.prepare(
            `SELECT id, name, category, segment FROM exercise_catalog
             WHERE is_library=1 AND video_id='' AND video_status IN (${retry ? "'pending','none','nomatch'" : "'pending','none'"})
             ${cat ? 'AND category=?' : ''}
             ORDER BY use_count DESC, sort_order LIMIT ?`
          ).bind(...(cat ? [cat, limit * 3] : [limit * 3])).all()).results;

      // 同一個動作的不同重量／等級（Kettlebell Deadlift 8-10kg / 10-12kg…）查的是同一件事，
      // 合併成一次搜尋再把結果套用回去，省配額
      const groups = new Map();
      for (const r of raw) {
        const key = `${r.category}|${buildQuery(r.name, r.category).toLowerCase()}`;
        if (!groups.has(key)) {
          if (groups.size >= limit) continue;         // 這批的搜尋次數上限
          groups.set(key, { lead: r, rows: [] });
        }
        groups.get(key).rows.push(r);
      }
      const rows = [...groups.values()];

      const done = []; const skipped = []; const failed = []; let quotaOut = false;
      let searched = 0;
      for (const grp of rows) {
        const lead = grp.lead;            // 用來搜尋與判斷的代表動作
        const members = grp.rows;         // 同一次搜尋要套用的所有動作（不同重量／等級）
        const ids = members.map(m => m.id);
        const names = members.map(m => m.name);
        const markAll = async (sql) => {
          const ph = ids.map(() => '?').join(',');
          await env.DB.prepare(sql.replace('__IDS__', ph)).bind(...ids).run();
        };
        try {
          searched++;
          const { candidates, query, dropped_long } = useWeb
            ? await searchViaWeb(env, lead.name, lead.category, body.query)
            : await searchOne(env.YOUTUBE_API_KEY, lead.name, lead.category, body.query);
          if (!candidates.length) {
            await markAll(`UPDATE exercise_catalog SET video_status='nomatch', video_alts='[]' WHERE id IN (__IDS__)`);
            skipped.push({ ids, name: names.join('、'), reason: dropped_long ? `只有超過 3 分鐘的（${dropped_long} 支）` : '搜不到影片' });
            continue;
          }
          let pick = null; let reason = '';
          if (env.GEMINI_API_KEY) {
            let llm;
            try {
              llm = await rankWithLLM(env, {
                name: lead.name,
                categoryLabel: CAT_LABEL[lead.category] || lead.category,
                segmentLabel: SEG_LABEL[lead.segment] || lead.segment,
              }, candidates);
            } catch (e) {
              // AI 沒判斷成功就不要硬上：這批是直接上線的，錯的影片比沒影片糟
              failed.push({ ids, name: names.join('、'), reason: e.message });
              continue;
            }
            if (!llm) {
              await markAll(`UPDATE exercise_catalog SET video_status='nomatch', video_alts='[]' WHERE id IN (__IDS__)`);
              skipped.push({ ids, name: names.join('、'), reason: 'AI 判斷候選都不是這個動作' });
              continue;
            }
            pick = llm.video; reason = llm.reason;
          } else {
            pick = candidates[0]; reason = '關鍵字評分最高（沒有 AI 排序）';
          }

          const alts = candidates.filter(c => c.id !== pick.id);
          const ph = ids.map(() => '?').join(',');
          await env.DB.prepare(
            `UPDATE exercise_catalog SET video_id=?, video_title=?, video_channel=?, video_seconds=?,
                    video_status=?, video_alts=?, video_reason=?, video_checked_on=date('now') WHERE id IN (${ph})`
          ).bind(pick.id, pick.title, pick.channel, pick.seconds, auto ? 'ok' : 'suggested',
            JSON.stringify(alts), reason, ...ids).run();
          done.push({ ids, name: names.join('、'), count: ids.length, video: pick, reason, query });
        } catch (e) {
          failed.push({ ids, name: names.join('、'), reason: e.message });
          if (/quota|quotaExceeded|403/i.test(e.message)) { quotaOut = true; break; }
        }
      }
      return json({ ok: true, auto, category: cat, source: useWeb ? 'web' : 'yt', done, skipped, failed, searched, groups: rows.length, covered: done.reduce((a,x)=>a+x.ids.length,0) + skipped.reduce((a,x)=>a+x.ids.length,0), quota_exhausted: quotaOut });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
