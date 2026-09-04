/**
 * /api/athletes — 教練用
 * GET  全部學員 + 塔高、階段佔比、達標數（並排比較）
 * POST { public_id, nickname, avatar_initial, sex, birth_year, stage, stage_started_on, group_id, notes } 建立
 * PUT  ?id=<public_id> 更新（同欄位，可含新 public_id）
 */
import { CATEGORIES, STAGES, json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';
import { loadTargets, buildStats } from '../_shared/stats.js';

/** 頭像：內建 p1–p5，或上傳後壓成 data URI（上限約 200KB） */
function cleanAvatar(v) {
  const s = String(v || '').trim();
  if (/^p[1-5]$/.test(s)) return s;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= 200000) return s;
  return '';
}

function clean(body) {
  const stage = STAGES.includes(body.stage) ? body.stage : 'pre';
  return {
    public_id: String(body.public_id || '').trim(),
    nickname: String(body.nickname || '').trim(),
    avatar: cleanAvatar(body.avatar),
    avatar_initial: String(body.avatar_initial || '').trim().slice(0, 2),
    sex: ['M', 'F'].includes(body.sex) ? body.sex : '',
    birth_year: body.birth_year ? parseInt(body.birth_year, 10) : null,
    stage,
    stage_started_on: body.stage_started_on || null,
    group_id: body.group_id ? parseInt(body.group_id, 10) : null,
    notes: String(body.notes || ''),
  };
}

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);

  try {
    if (request.method === 'GET') {
      const athletes = (await env.DB.prepare('SELECT a.*, g.name AS group_name FROM athletes a LEFT JOIN groups g ON g.id=a.group_id ORDER BY g.name, a.nickname').all()).results;
      const sessions = (await env.DB.prepare('SELECT * FROM sessions').all()).results;
      const tbs = (await env.DB.prepare('SELECT * FROM turning_blocks').all()).results;
      const stageTargets = await loadTargets(env);
      const byA = {}; for (const s of sessions) (byA[s.athlete_id] ||= []).push(s);
      const tbBy = {}; for (const t of tbs) (tbBy[t.athlete_id] ||= []).push(t);
      const list = athletes.map(a => {
        const st = buildStats({ sessions: byA[a.id] || [], blocks: [], turningBlocks: tbBy[a.id] || [], stageTargets, athlete: a });
        const onTarget = CATEGORIES.filter(c => Math.abs(st.pct_stage[c] - st.targets[c].target) <= st.targets[c].tol).length;
        return {
          id: a.id, public_id: a.public_id, nickname: a.nickname, avatar: a.avatar, avatar_initial: a.avatar_initial, sex: a.sex,
          birth_year: a.birth_year, stage: a.stage, stage_started_on: a.stage_started_on, group_id: a.group_id, group_name: a.group_name, notes: a.notes,
          session_count: (byA[a.id] || []).length, brick_total: st.brick_total, wild_total: (tbBy[a.id] || []).length,
          bricks: st.bricks, pct_stage: st.pct_stage, targets: st.targets, on_target: onTarget,
          last_date: (byA[a.id] || []).map(s => s.session_date).sort().pop() || null,
        };
      });
      return json({ athletes: list });
    }

    if (request.method === 'POST') {
      const d = clean(await request.json());
      if (!d.public_id || !d.nickname) return json({ error: 'public_id 與 nickname 必填' }, 400);
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(d.public_id)) return json({ error: 'ID 只能用英數、- 與 _（3–32 字）' }, 400);
      const dup = await env.DB.prepare('SELECT id FROM athletes WHERE public_id=? COLLATE NOCASE').bind(d.public_id).first();
      if (dup) return json({ error: '這個 ID 已被使用' }, 409);
      const r = await env.DB.prepare(
        `INSERT INTO athletes (public_id, nickname, avatar, avatar_initial, sex, birth_year, stage, stage_started_on, group_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).bind(d.public_id, d.nickname, d.avatar, d.avatar_initial || d.nickname.slice(0, 1), d.sex, d.birth_year, d.stage, d.stage_started_on, d.group_id, d.notes).run();
      return json({ ok: true, id: r.meta.last_row_id, public_id: d.public_id });
    }

    if (request.method === 'PUT') {
      const pid = url.searchParams.get('id');
      const a = await env.DB.prepare('SELECT * FROM athletes WHERE public_id=? COLLATE NOCASE').bind(pid).first();
      if (!a) return json({ error: 'Not found' }, 404);
      const d = clean(await request.json());
      const newPid = d.public_id || a.public_id;
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(newPid)) return json({ error: 'ID 只能用英數、- 與 _（3–32 字）' }, 400);
      if (newPid.toLowerCase() !== a.public_id.toLowerCase()) {
        const dup = await env.DB.prepare('SELECT id FROM athletes WHERE public_id=? COLLATE NOCASE').bind(newPid).first();
        if (dup) return json({ error: '這個 ID 已被使用' }, 409);
      }
      await env.DB.prepare(
        `UPDATE athletes SET public_id=?, nickname=?, avatar=?, avatar_initial=?, sex=?, birth_year=?, stage=?, stage_started_on=?, group_id=?, notes=? WHERE id=?`
      ).bind(newPid, d.nickname || a.nickname, d.avatar, d.avatar_initial || a.avatar_initial, d.sex, d.birth_year, d.stage, d.stage_started_on, d.group_id, d.notes, a.id).run();
      return json({ ok: true, public_id: newPid });
    }

    if (request.method === 'DELETE') {
      // 刪學員：連同這位學員的所有紀錄一起刪掉，組別與課表不受影響
      const pid = url.searchParams.get('id');
      const a = await env.DB.prepare('SELECT * FROM athletes WHERE public_id=? COLLATE NOCASE').bind(pid).first();
      if (!a) return json({ error: 'Not found' }, 404);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM session_exercises WHERE session_id IN (SELECT id FROM sessions WHERE athlete_id=?)').bind(a.id),
        env.DB.prepare('DELETE FROM sessions WHERE athlete_id=?').bind(a.id),
        env.DB.prepare('DELETE FROM turning_blocks WHERE athlete_id=?').bind(a.id),
        env.DB.prepare('DELETE FROM focus_levels WHERE athlete_id=?').bind(a.id),
        env.DB.prepare('DELETE FROM growth_log WHERE athlete_id=?').bind(a.id),
        env.DB.prepare(`DELETE FROM block_exercises WHERE block_id IN (SELECT id FROM blocks WHERE owner_type='athlete' AND owner_id=?)`).bind(a.id),
        env.DB.prepare(`DELETE FROM blocks WHERE owner_type='athlete' AND owner_id=?`).bind(a.id),
        env.DB.prepare('DELETE FROM athletes WHERE id=?').bind(a.id),
      ]);
      return json({ ok: true });
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    console.error('athletes error:', err);
    return json({ error: err.message }, 500);
  }
}
