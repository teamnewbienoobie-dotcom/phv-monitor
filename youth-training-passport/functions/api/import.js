/**
 * /api/import — Google Sheet / 貼上文字 匯入（教練）
 * POST { csv_url }            抓取發布的 CSV → 解析 → 回傳草稿（不寫入）
 * POST { text }               貼上（tab / 逗號分隔，第一列標題）→ 草稿
 * POST { drafts, commit:true } 寫入草稿（每筆可帶 skip:true）
 *
 * 一列 = 一堂課。欄位（順序可換）：日期 | 對象 | 主軸 | Raise | A&M | Potentiation | 主訓練 | 總時長 | sRPE | 備註
 */
import { AXES, CATEGORIES, RAMP_TYPES, json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';
import { insertSession, blocksForAthlete, planForWeek, splitLoad } from '../_shared/sessions.js';
import { pickBlock, weekOf } from '../_shared/stats.js';

// ---------- CSV ----------
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
function parseTable(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.some(l => l.includes('\t'))) return lines.map(l => l.split('\t'));
  return parseCsv(text);
}

// ---------- 欄位對應 ----------
const HEAD = {
  date: ['日期', 'date', '上課日期'],
  target: ['對象', '組別', '學員', '組別/學員', '組別/學員id', 'target', 'group', 'athlete', 'id'],
  axis: ['主軸', 'axis', 'main', '主訓練主軸'],
  raise: ['raise', 'raise型態', 'raise 型態'],
  am: ['a&m', 'am', 'a&m型態', 'activation & mobilization'],
  act: ['activation', '啟動', '肌群啟動', 'activation型態'],
  mob: ['mobilize', 'mobilization', '活動度', '動態伸展', 'mobilize型態'],
  pot: ['potentiation', 'pot', 'potentiation型態', '增益', '增能', '激發'],
  main: ['主訓練', '主訓練動作', '動作', 'exercises', 'main training'],
  duration: ['總時長', '時長', 'duration', '分鐘', 'min'],
  rpe: ['srpe', 'rpe', '強度'],
  note: ['備註', 'note', 'notes', '註記'],
};
function mapHeader(cells) {
  const idx = {};
  cells.forEach((c, i) => {
    const k = String(c || '').trim().toLowerCase();
    for (const [field, names] of Object.entries(HEAD)) if (idx[field] == null && names.includes(k)) idx[field] = i;
  });
  return idx;
}

// ---------- 值解析 ----------
const AXIS_ALIAS = { strength: 'strength', 肌力: 'strength', saq: 'saq', 速度: 'saq', 敏捷: 'saq', 速度敏捷: 'saq', speed: 'saq', agility: 'saq',
  plyo: 'plyo', plyometric: 'plyo', 增強式: 'plyo', power: 'power', 爆發力: 'power', energy: 'energy', 'energy system': 'energy', 能量系統: 'energy', 體能: 'energy' };
function parseAxis(v) { return AXIS_ALIAS[String(v || '').trim().toLowerCase()] || null; }

function matchType(phase, tok) {
  const norm = s => s.replace(/\s/g, '').toLowerCase();
  const t = norm(tok);
  const hit = Object.entries(RAMP_TYPES[phase]).find(([code, def]) => code === t || norm(def.label) === t);
  return hit ? hit[0] : null;
}
function parseTypes(phase, v) {
  const out = []; const bad = [];
  const raw = String(v || '').trim();
  if (!raw) return { types: out, bad };
  const whole = matchType(phase, raw);            // 「動態伸展+FMS」本身就是一個型態名
  if (whole) return { types: [whole], bad };
  for (const tok of raw.split(/[+/、;]|\s{2,}/)) {
    const s = tok.trim(); if (!s) continue;
    const hit = matchType(phase, s);
    if (hit) out.push(hit); else bad.push(s);
  }
  return { types: out, bad };
}

function parseDate(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${new Date().getFullYear()}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}

/** "Kettlebell Deadlift 2x15@12kg" → {name, dose} ；也接受 "3x20m Startle Starts" */
function parseExercise(tok) {
  const parts = tok.trim().split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^\d/.test(last) || /^@/.test(last)) return { name: parts.slice(0, -1).join(' '), dose: last };
    if (/^\d/.test(parts[0])) return { name: parts.slice(1).join(' '), dose: parts[0] };
  }
  return { name: tok.trim(), dose: '' };
}

// ---------- 草稿 ----------
async function buildDrafts(env, table) {
  if (table.length < 2) return { error: '至少要有標題列與一列資料' };
  const idx = mapHeader(table[0]);
  if (idx.date == null || idx.target == null) return { error: '找不到「日期」與「對象」欄位' };

  const athletes = (await env.DB.prepare('SELECT * FROM athletes').all()).results;
  const groups = (await env.DB.prepare('SELECT * FROM groups').all()).results;
  const catalog = (await env.DB.prepare('SELECT category, name FROM exercise_catalog').all()).results;
  const catByName = {}; for (const c of catalog) catByName[c.name.toLowerCase()] = c.category;
  const byPid = {}; for (const a of athletes) byPid[a.public_id.toLowerCase()] = a;
  const blockCache = {};
  const drafts = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r]; const get = f => idx[f] == null ? '' : String(row[idx[f]] ?? '').trim();
    const warnings = [];
    const date = parseDate(get('date'));
    if (!date) { drafts.push({ row: r + 1, error: `日期無法解析：「${get('date')}」` }); continue; }

    const target = get('target');
    const note = get('note');
    const absent = new Set();
    const absentMatch = note.match(/缺席\s*[:：]\s*([^\n]+)/);
    if (absentMatch) absentMatch[1].split(/[,，、\s]+/).filter(Boolean).forEach(x => absent.add(x.toLowerCase()));

    let members = [];
    const g = groups.find(x => x.name.toLowerCase() === target.toLowerCase());
    if (g) members = athletes.filter(a => a.group_id === g.id);
    else if (byPid[target.toLowerCase()]) members = [byPid[target.toLowerCase()]];
    else {
      members = target.split(/[,，、\s]+/).map(x => byPid[x.toLowerCase()]).filter(Boolean);
      if (!members.length) { drafts.push({ row: r + 1, error: `對象「${target}」不是組別也不是學員 ID` }); continue; }
    }
    members = members.filter(a => !absent.has(a.public_id.toLowerCase()) && !absent.has(a.nickname.toLowerCase()));
    if (!members.length) { drafts.push({ row: r + 1, error: `「${target}」沒有出席成員` }); continue; }

    const axis = parseAxis(get('axis'));
    if (get('axis') && !axis) warnings.push(`主軸「${get('axis')}」看不懂，改用 block 預設`);
    const rT = parseTypes('raise', get('raise')), pT = parseTypes('pot', get('pot'));
    // Activation / Mobilize 可以各自一欄，也可以沿用舊的 A&M 一欄
    const amRaw = get('am');
    const aT = get('act') ? parseTypes('activation', get('act')) : parseTypes('activation', amRaw);
    const mT = get('mob') ? parseTypes('mobilize', get('mob')) : parseTypes('mobilize', amRaw);
    if (amRaw && !get('act') && !get('mob') && !aT.types.length && !mT.types.length) warnings.push(`A&M 型態看不懂：${amRaw}`);
    for (const [ph, t] of [['Raise', rT], ['Potentiation', pT]]) if (t.bad.length) warnings.push(`${ph} 型態看不懂：${t.bad.join('、')}`);
    if (get('act') && aT.bad.length) warnings.push(`Activation 型態看不懂：${aT.bad.join('、')}`);
    if (get('mob') && mT.bad.length) warnings.push(`Mobilize 型態看不懂：${mT.bad.join('、')}`);
    const duration = parseInt(get('duration'), 10) || 50;
    const rpe = parseInt(get('rpe'), 10) || null;

    for (const a of members) {
      const key = a.id;
      blockCache[key] ||= await blocksForAthlete(env, a);
      const block = pickBlock(blockCache[key], date);
      const week = block ? weekOf(block, date) : null;
      const mainAxis = axis || block?.main_axis || 'strength';
      const plan = await planForWeek(env, block, week);
      const tokens = get('main').split(/[,，;；\n]/).map(t => t.trim()).filter(Boolean);
      let exercises = [];
      const w = [...warnings];
      const usePlan = tokens.some(t => /^(照計畫|照表|照課表|plan|as planned)$/i.test(t));
      if (usePlan) {
        if (!block) w.push('寫了「照計畫」但這天沒有生效的 block');
        exercises = plan.map(e => ({ ...e }));
      }
      for (const t of tokens) {
        if (/^(照計畫|照表|照課表|plan|as planned)$/i.test(t)) continue;
        const { name, dose } = parseExercise(t);
        const { dose: d2, load_kg } = splitLoad(dose);
        const hit = exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (hit) { hit.dose = d2 || hit.dose; hit.load_kg = load_kg; hit.from_plan = 0; }
        else exercises.push({ segment: 'main', name, dose: d2, load_kg, category: catByName[name.toLowerCase()] || mainAxis, target_movement: '', from_plan: 0 });
      }
      const dup = await env.DB.prepare('SELECT id FROM sessions WHERE athlete_id=? AND session_date=?').bind(a.id, date).first();
      const ramp = { raise_types: rT.types.length ? rT.types : (block ? JSON.parse(block.raise_types) : []),
        act_types: aT.types.length ? aT.types : (block?.act_types ? JSON.parse(block.act_types) : []),
        mob_types: mT.types.length ? mT.types : (block?.mob_types ? JSON.parse(block.mob_types) : []),
        pot_types: pT.types.length ? pT.types : (block ? JSON.parse(block.pot_types) : []) };
      drafts.push({
        row: r + 1, athlete_id: a.public_id, nickname: a.nickname, session_date: date, block_id: block?.id || null, block_title: block?.title || '', week_no: week,
        main_axis: mainAxis, duration_min: duration, raise_min: 5, act_min: 4, mob_min: 4, pot_min: 5, ...ramp,
        session_rpe: rpe, coach_note: note, exercises, warnings: w, duplicate: !!dup, skip: !!dup,
      });
    }
  }
  return { drafts, header: idx };
}

function normalizeSheetUrl(u) {
  const s = String(u || '').trim();
  let m = s.match(/docs\.google\.com\/spreadsheets\/d\/e\/([^/]+)\/pub/);
  if (m) { const url = new URL(s); url.searchParams.set('output', 'csv'); return url.toString(); }
  m = s.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (m) { const gid = (s.match(/[#&?]gid=(\d+)/) || [])[1] || '0'; return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`; }
  return s;
}

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await request.json();
    if (body.commit && Array.isArray(body.drafts)) {
      const results = [];
      for (const d of body.drafts) {
        if (d.skip || d.error) { results.push({ row: d.row, skipped: true }); continue; }
        const athlete = await env.DB.prepare('SELECT * FROM athletes WHERE public_id=? COLLATE NOCASE').bind(String(d.athlete_id)).first();
        if (!athlete) { results.push({ row: d.row, error: '找不到學員' }); continue; }
        const r = await insertSession(env, athlete, { ...d, source: 'sheet' });
        results.push({ row: d.row, athlete_id: athlete.public_id, id: r.id });
      }
      return json({ ok: true, results });
    }
    let text = body.text;
    if (body.csv_url) {
      const res = await fetch(normalizeSheetUrl(body.csv_url), { redirect: 'follow', headers: { 'User-Agent': 'training-passport/2' } });
      if (!res.ok) return json({ error: `抓不到 CSV（HTTP ${res.status}）。請確認已「發布到網路」並選 CSV。` }, 400);
      text = await res.text();
      if (/^\s*<!doctype html|<html/i.test(text)) return json({ error: '抓到的是網頁不是 CSV。請用「檔案 → 共用 → 發布到網路 → 逗號分隔值 (.csv)」的網址。' }, 400);
    }
    if (!text) return json({ error: '請提供 csv_url 或 text' }, 400);
    const out = await buildDrafts(env, parseTable(text));
    if (out.error) return json({ error: out.error }, 400);
    return json(out);
  } catch (err) {
    console.error('import error:', err);
    return json({ error: err.message }, 500);
  }
}
