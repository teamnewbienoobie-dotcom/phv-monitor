/**
 * /api/exercise-catalog — 動作庫
 * GET                       公開；?category= / ?segment= 可篩選
 * POST   { name, category, segment, sets, reps, note }   教練：直接加一個動作進庫
 * PUT    ?id=  { ...同上 }                                教練：改動作內容
 * DELETE ?id=                                            教練：從庫裡移除（不影響已記錄的課）
 */
import { CATEGORIES, SEGMENTS, CUSTOM_FAMILY, CUSTOM_SORT, parseYouTube, parseJson, json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

function fields(b) {
  const name = String(b.name || '').trim();
  return {
    name,
    category: CATEGORIES.includes(b.category) ? b.category : 'strength',
    segment: SEGMENTS.includes(b.segment) ? b.segment : 'main',
    note: String(b.note || '').slice(0, 200),
    def_sets: b.sets != null && b.sets !== '' ? Math.max(1, parseInt(b.sets, 10) || 1) : null,
    def_reps: String(b.reps || '').slice(0, 60),
  };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (request.method === 'GET') {
      const cat = url.searchParams.get('category');
      const seg = url.searchParams.get('segment');
      const where = [];
      const binds = [];
      if (cat && CATEGORIES.includes(cat)) { where.push('category=?'); binds.push(cat); }
      if (seg && SEGMENTS.includes(seg)) { where.push('segment=?'); binds.push(seg); }
      const rows = (await env.DB.prepare(
        `SELECT id, category, name, segment, family, level, note, def_sets, def_reps, is_library, use_count,
                video_id, video_title, video_channel, video_seconds, video_status, video_alts, video_reason
         FROM exercise_catalog ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY is_library DESC, sort_order, use_count DESC, name`
      ).bind(...binds).all()).results;

      const groups = [];
      const byFamily = {};
      for (const r of rows) {
        if (!r.is_library) continue;
        const fam = r.family || CUSTOM_FAMILY;
        // 同一個家族若橫跨多個板塊（自訂動作就會這樣），要拆成各自的組，板塊篩選才準
        const key = fam + '' + r.segment;
        if (!byFamily[key]) { byFamily[key] = { family: fam, segment: r.segment, custom: fam === CUSTOM_FAMILY, items: [] }; groups.push(byFamily[key]); }
        byFamily[key].items.push({
          id: r.id, name: r.name, category: r.category, segment: r.segment, level: r.level,
          note: r.note, sets: r.def_sets, reps: r.def_reps, custom: key === CUSTOM_FAMILY, use_count: r.use_count,
          video: r.video_id ? { id: r.video_id, title: r.video_title, channel: r.video_channel, seconds: r.video_seconds } : null,
          video_status: r.video_status, video_alts: parseJson(r.video_alts, []), video_reason: r.video_reason || '',
        });
      }
      return json({
        catalog: rows.map(r => ({ category: r.category, name: r.name, use_count: r.use_count })),
        library: groups,
        custom_family: CUSTOM_FAMILY,
      });
    }

    if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);

    if (request.method === 'POST') {
      const f = fields(await request.json());
      if (!f.name) return json({ error: '動作名稱必填' }, 400);
      await env.DB.prepare(
        `INSERT INTO exercise_catalog (category, name, segment, family, level, note, def_sets, def_reps, is_library, sort_order, use_count, video_status)
         VALUES (?,?,?,?,NULL,?,?,?,1,?,0,'pending')
         ON CONFLICT(category, name) DO UPDATE SET
           segment=excluded.segment, note=excluded.note, def_sets=excluded.def_sets, def_reps=excluded.def_reps, is_library=1`
      ).bind(f.category, f.name, f.segment, CUSTOM_FAMILY, f.note, f.def_sets, f.def_reps, CUSTOM_SORT).run();
      return json({ ok: true });
    }

    if (request.method === 'PUT') {
      if (!id) return json({ error: 'id 必填' }, 400);
      const b = await request.json();

      // 只動影片欄位：貼連結、採用建議、換一支、標記不需要影片
      if (b.video !== undefined || b.video_status !== undefined) {
        if (b.video_status === 'skip') {
          await env.DB.prepare(`UPDATE exercise_catalog SET video_status='skip', video_alts='[]' WHERE id=?`).bind(id).run();
          return json({ ok: true });
        }
        if (b.video_status === 'pending') {
          await env.DB.prepare(`UPDATE exercise_catalog SET video_status='pending' WHERE id=?`).bind(id).run();
          return json({ ok: true });
        }
        const vid = parseYouTube(b.video);
        if (b.video && !vid) return json({ error: '看不懂這個 YouTube 網址，貼影片頁網址或 11 碼 ID 都可以' }, 400);
        if (!vid) { // 清空
          await env.DB.prepare(`UPDATE exercise_catalog SET video_id='', video_title='', video_channel='', video_seconds=NULL, video_status='none' WHERE id=?`).bind(id).run();
          return json({ ok: true });
        }
        await env.DB.prepare(
          `UPDATE exercise_catalog SET video_id=?, video_title=?, video_channel=?, video_seconds=?, video_status='ok', video_checked_on=date('now') WHERE id=?`
        ).bind(vid, String(b.video_title || ''), String(b.video_channel || ''), b.video_seconds ?? null, id).run();
        return json({ ok: true, video_id: vid });
      }

      const f = fields(b);
      if (!f.name) return json({ error: '動作名稱必填' }, 400);
      await env.DB.prepare(
        'UPDATE exercise_catalog SET name=?, category=?, segment=?, note=?, def_sets=?, def_reps=? WHERE id=?'
      ).bind(f.name, f.category, f.segment, f.note, f.def_sets, f.def_reps, id).run();
      return json({ ok: true });
    }

    if (request.method === 'DELETE') {
      // ?id=  單一；?ids=1,2,3  批次；?family=  整個家族
      const ids = (url.searchParams.get('ids') || id || '').split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s));
      const family = url.searchParams.get('family');
      if (family) {
        const r = await env.DB.prepare('DELETE FROM exercise_catalog WHERE family=?').bind(family).run();
        return json({ ok: true, removed: r.meta.changes });
      }
      if (!ids.length) return json({ error: 'id 必填' }, 400);
      const ph = ids.map(() => '?').join(',');
      const r = await env.DB.prepare(`DELETE FROM exercise_catalog WHERE id IN (${ph})`).bind(...ids).run();
      return json({ ok: true, removed: r.meta.changes });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) return json({ error: '同分類底下已經有同名動作了' }, 400);
    return json({ error: err.message }, 500);
  }
}
