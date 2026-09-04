/**
 * 訓練模型常數與統計演算（後端共用）
 * 七大分類、RAMP 內容型態歸屬、分類分鐘計算、構件門檻
 */

export const CATEGORIES = ['fms', 'strength', 'power', 'plyo', 'saq', 'energy', 'mobility'];
export const AXES = ['strength', 'saq', 'plyo', 'power', 'energy']; // 主訓練可選主軸
export const STAGES = ['pre', 'circa', 'post'];
export const ROUND_MIN = 200; // 一輪 = 200 分鐘；構件門檻 = ROUND_MIN × 目標佔比

export const CAT_LABEL = {
  fms: '基礎動作', strength: '肌力', power: '爆發力', plyo: '增強式',
  saq: '速度敏捷', energy: '能量系統', mobility: '活動度',
};

/** 一堂課的五個板塊（A–E），動作都掛在板塊底下 */
export const SEGMENTS = ['raise', 'activation', 'mobilize', 'pot', 'main'];

export const SEG_META = {
  raise: { letter: 'A', label: 'Raise', zh: '升溫', cats: ['saq', 'energy'], min_key: 'raise_min', type_key: 'raise_types', def_min: 5 },
  activation: { letter: 'B', label: 'Activation', zh: '肌群啟動', cats: ['strength', 'fms'], min_key: 'act_min', type_key: 'act_types', def_min: 4 },
  mobilize: { letter: 'C', label: 'Mobilize', zh: '活動度', cats: ['mobility', 'fms'], min_key: 'mob_min', type_key: 'mob_types', def_min: 4 },
  pot: { letter: 'D', label: 'Potentiation', zh: '激發', cats: ['power', 'plyo'], min_key: 'pot_min', type_key: 'pot_types', def_min: 5 },
  main: { letter: 'E', label: 'Main Training', zh: '主訓練', cats: null, min_key: 'main_min', type_key: null, def_min: null },
};

/** 板塊內容型態 → 歸類（分鐘平分）。沒排動作時的後備歸類依據 */
export const RAMP_TYPES = {
  raise: {
    locomotion: { label: '跑動組合', cats: ['saq', 'energy'] },
    animal_flow: { label: '動物流', cats: ['fms', 'mobility'] },
    sgm: { label: 'SGM 遊戲', cats: ['saq', 'energy'] },
  },
  activation: {
    activation: { label: '肌群啟動', cats: ['strength', 'fms'] },
    core: { label: '核心穩定', cats: ['strength', 'fms'] },
  },
  mobilize: {
    dynamic_fms: { label: '動態伸展 + FMS', cats: ['mobility', 'fms'] },
    joint_flow: { label: '關節活動流', cats: ['mobility'] },
  },
  pot: {
    explosive_jump: { label: '高爆發跳躍', cats: ['power'] },
    low_plyo: { label: '低強度增強式', cats: ['plyo'] },
    iso_hold: { label: 'Isometric hold', cats: ['strength'] },
    short_accel: { label: '短距加速', cats: ['saq'] },
  },
};
// 舊資料相容：v2 的 am 階段
RAMP_TYPES.am = { ...RAMP_TYPES.mobilize, ...RAMP_TYPES.activation };

/** "3 組 × 8 次 @12kg" 的顯示字串 */
export function doseText(e) {
  const sets = e.sets ? `${e.sets} 組` : '';
  const reps = e.reps ? `${e.reps}` : '';
  const body = sets && reps ? `${sets} × ${reps}` : (sets || reps || String(e.dose || ''));
  return e.load_kg != null && e.load_kg !== '' ? `${body}${body ? ' ' : ''}@${e.load_kg}kg` : body;
}

/** "3x8"、"2x15sec"、"2x10m"、"3x12/leg" → { sets, reps } */
export function splitDose(doseStr) {
  const s = String(doseStr || '').trim();
  if (!s || s === '✓') return { sets: null, reps: '' };
  const m = s.match(/^(\d+)\s*[x×*]\s*(.+)$/i);
  if (m) return { sets: parseInt(m[1], 10), reps: m[2].trim() };
  return { sets: null, reps: s };
}

/** 教練自己打的動作會存進動作庫，歸在這個家族底下 */
export const CUSTOM_FAMILY = '自訂動作';
export const CUSTOM_SORT = 9000;

/**
 * 把一個動作記進動作庫：庫裡沒有就新增（家族＝自訂動作），有就累加使用次數。
 * 既有的內建動作不會被蓋掉分級與預設劑量；自訂動作則跟著最後一次的用法更新。
 */
export function catalogUpsert(env, { category, name, segment, sets, reps }) {
  return env.DB.prepare(
    // 新動作直接排進找影片的佇列
    `INSERT INTO exercise_catalog (category, name, segment, family, level, note, def_sets, def_reps, is_library, sort_order, use_count, video_status)
     VALUES (?,?,?,?,NULL,'',?,?,1,?,1,'pending')
     ON CONFLICT(category, name) DO UPDATE SET
       use_count = use_count + 1,
       is_library = 1,
       segment  = CASE WHEN exercise_catalog.family = ? THEN excluded.segment  ELSE exercise_catalog.segment  END,
       def_sets = CASE WHEN exercise_catalog.family = ? THEN excluded.def_sets ELSE exercise_catalog.def_sets END,
       def_reps = CASE WHEN exercise_catalog.family = ? THEN excluded.def_reps ELSE exercise_catalog.def_reps END,
       family   = CASE WHEN exercise_catalog.family = '' THEN ? ELSE exercise_catalog.family END`
  ).bind(
    category, String(name).trim(), SEGMENTS.includes(segment) ? segment : 'main', CUSTOM_FAMILY,
    sets != null && sets !== '' ? parseInt(sets, 10) || null : null, String(reps || ''), CUSTOM_SORT,
    CUSTOM_FAMILY, CUSTOM_FAMILY, CUSTOM_FAMILY, CUSTOM_FAMILY,
  );
}

/** 從各種 YouTube 網址或直接貼的 ID 取出 11 碼影片 ID */
export function parseYouTube(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

/** ISO8601 時長 → 秒 */
export function ytDuration(iso) {
  const m = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}

export function parseJson(s, fallback) {
  try { const v = JSON.parse(s); return v == null ? fallback : v; } catch { return fallback; }
}

/**
 * 一堂課 → { fms: min, strength: min, ... }
 * 每個板塊的分鐘，優先按「該板塊實際排的動作」平分到各動作的分類；
 * 沒排動作才退回板塊型態（舊資料 / Sheet 匯入），再退回板塊預設分類。
 */
export function sessionCategoryMinutes(s) {
  const out = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  const exs = (Array.isArray(s.exercises) ? s.exercises : []).filter(e => CATEGORIES.includes(e.category));
  const legacyAm = s.act_min == null && s.mob_min == null;

  for (const seg of SEGMENTS) {
    const meta = SEG_META[seg];
    let minutes = Number(s[meta.min_key] ?? 0) || 0;
    if (legacyAm && (seg === 'activation' || seg === 'mobilize')) {
      const am = Number(s.am_min || 0);
      minutes = seg === 'activation' ? Math.floor(am / 2) : am - Math.floor(am / 2);
    }
    if (!minutes) continue;

    const mine = exs.filter(e => (e.segment || 'main') === seg);
    if (mine.length) {
      const per = minutes / mine.length;
      for (const e of mine) out[e.category] += per;
      continue;
    }
    if (seg === 'main') {
      const axis = AXES.includes(s.main_axis) || CATEGORIES.includes(s.main_axis) ? s.main_axis : 'strength';
      out[axis] += minutes;
      continue;
    }
    let types = (Array.isArray(s[meta.type_key]) ? s[meta.type_key] : parseJson(s[meta.type_key], []))
      .filter(t => RAMP_TYPES[seg][t]);
    if (!types.length && legacyAm && (seg === 'activation' || seg === 'mobilize')) {
      types = (Array.isArray(s.am_types) ? s.am_types : parseJson(s.am_types, [])).filter(t => RAMP_TYPES[seg][t]);
    }
    if (types.length) {
      const perType = minutes / types.length;
      for (const t of types) {
        const cats = RAMP_TYPES[seg][t].cats;
        for (const c of cats) out[c] += perType / cats.length;
      }
    } else {
      for (const c of meta.cats) out[c] += minutes / meta.cats.length;
    }
  }
  return out;
}

export function thresholdsFor(targets) {
  // targets: {cat: pct}
  const t = {};
  for (const c of CATEGORIES) t[c] = Math.max(5, Math.round(ROUND_MIN * (targets[c] || 0) / 100));
  return t;
}

/** 累積分鐘 + 門檻 → 每個分類的構件數與下一塊進度 */
export function bricksFor(totals, thresholds) {
  const out = {};
  for (const c of CATEGORIES) {
    const th = thresholds[c] || ROUND_MIN;
    const m = totals[c] || 0;
    out[c] = { count: Math.floor(m / th), progress: (m % th) / th, threshold: th, minutes: Math.round(m) };
  }
  return out;
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}
