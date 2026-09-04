/* 訓練護照 v2 — 教練端：本期課表 / 教練工具 / 後台（學員、組別、block、Sheet 匯入） */
'use strict';

const C = { athletes: null, groups: null, templates: null };
async function coachData(force) {
  if (!C.athletes || force) {
    const [a, g] = await Promise.all([api('/api/athletes'), api('/api/groups')]);
    C.athletes = a.athletes; C.groups = g.groups || [];
  }
  return C;
}
async function templates() { if (!C.templates) C.templates = await api('/api/blocks?templates=1'); return C.templates; }
const opt = (list, val, lbl = x => x, key = x => x) => list.map(x => `<option value="${esc(key(x))}" ${String(key(x)) === String(val) ? 'selected' : ''}>${esc(lbl(x))}</option>`).join('');
const rampChecks = (phase, selected) => `<div class="checks">${Object.entries(S.pp?.ramp_types?.[phase] || RAMP_FALLBACK[phase]).map(([k, t]) => `<label><input type="checkbox" name="${phase}" value="${k}" ${selected.includes(k) ? 'checked' : ''}>${esc(t.label)}</label>`).join('')}</div>`;
const RAMP_FALLBACK = {
  raise: { locomotion: { label: '跑動組合' }, animal_flow: { label: '動物流' }, sgm: { label: 'SGM 遊戲' } },
  activation: { activation: { label: '肌群啟動' }, core: { label: '核心穩定' } },
  mobilize: { dynamic_fms: { label: '動態伸展 + FMS' }, joint_flow: { label: '關節活動流' } },
  pot: { explosive_jump: { label: '高爆發跳躍' }, low_plyo: { label: '低強度增強式' }, iso_hold: { label: 'Isometric hold' }, short_accel: { label: '短距加速' } },
};
const checked = (root, name) => $$(`input[name="${name}"]:checked`, root).map(i => i.value);
const segHead = k => `<span class="badge" style="${segVars(k)}">${SEG[k].letter}</span> ${SEG[k].label} <span class="small muted">${SEG[k].zh}</span>`;

/* ===== 課表格狀（唯讀） ===== */
function planGrid(b, weekNow) {
  const weeks = [...Array(b.weeks).keys()];
  const segs = SEGS.filter(s => b.exercises.some(e => e.segment === s));
  return `<div class="scroll-x"><table class="grid"><thead><tr><th style="text-align:left">動作</th>${weeks.map(w => `<th class="${w + 1 === weekNow ? 'now' : ''}">W${w + 1}</th>`).join('')}</tr></thead><tbody>
    ${segs.map(s => `<tr><td class="seg" colspan="${b.weeks + 1}">${segHead(s)}</td></tr>${b.exercises.filter(e => e.segment === s).map(e => `<tr><td class="name"><i style="background:${catColor(e.category)}"></i>${esc(e.name)}${e.target_movement ? `<span class="small muted"> · ${esc(e.target_movement)}</span>` : ''}</td>${weeks.map(w => `<td class="dose ${w + 1 === weekNow ? 'now' : ''}">${esc(e.doses[w] || '')}</td>`).join('')}</tr>`).join('')}`).join('')}
  </tbody></table></div>`;
}

/* ===== block 編輯器（passport 課表分頁與後台共用） ===== */
function blockEditor(host, block, ctx, onDone) {
  // block: 既有（有 id）或新建草稿 { owner_type, owner_id, exercises: [] }
  const b = JSON.parse(JSON.stringify(block));
  b.exercises = b.exercises || []; b.weeks = b.weeks || 6;
  ['raise_types', 'act_types', 'mob_types', 'pot_types'].forEach(k => { b[k] = Array.isArray(b[k]) ? b[k] : []; });
  const seasons = ctx.seasons || [];
  const render = () => {
    host.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">${b.id ? '編輯 block' : '新增 block'}</div><button class="btn sm ghost" id="bcancel">取消</button></div>
      <div class="form">
        <label class="field full">名稱<input id="b_title" value="${esc(b.title || '')}"></label>
        <label class="field full">這個 block 的目標<textarea id="b_goal">${esc(b.goal_text || '')}</textarea></label>
        <label class="field">主軸<select id="b_axis">${opt(AXES, b.main_axis || 'strength', x => CAT_LABEL[x])}</select></label>
        <label class="field">強度<select id="b_int">${opt(['low', 'mid', 'high'], b.intensity || 'low', x => ({ low: '低', mid: '中', high: '高' })[x])}</select></label>
        <label class="field">週數<input id="b_weeks" type="number" min="1" max="12" value="${b.weeks}"></label>
        <label class="field">季<select id="b_season"><option value="">（不分季）</option>${opt(seasons, b.season_id, s => s.title, s => s.id)}</select></label>
        <label class="field">開始<input id="b_start" type="date" value="${esc(b.start_date || '')}"></label>
        <label class="field">結束<input id="b_end" type="date" value="${esc(b.end_date || '')}"></label>
        <div class="field full">A · Raise 型態${rampChecks('raise', b.raise_types)}</div>
        <div class="field full">B · Activation 型態${rampChecks('activation', b.act_types)}</div>
        <div class="field full">C · Mobilize 型態${rampChecks('mobilize', b.mob_types)}</div>
        <div class="field full">D · Potentiation 型態${rampChecks('pot', b.pot_types)}</div>
      </div>
      <div class="card-title">動作格狀 <small>每格填劑量，空白＝該週不做，✓＝有做（SGM）</small></div>
      <div class="scroll-x"><table class="grid" id="bgrid"><thead><tr><th>段</th><th style="text-align:left">動作</th><th>能力</th>${[...Array(b.weeks).keys()].map(w => `<th>W${w + 1}</th>`).join('')}<th></th></tr></thead><tbody>
        ${b.exercises.map((e, i) => `<tr data-i="${i}"><td><select class="e_seg">${opt(SEGS, e.segment || 'main', s => SEG_LABEL[s])}</select></td>
          <td class="name"><input class="e_name" value="${esc(e.name || '')}" placeholder="動作名"><input class="e_tm" value="${esc(e.target_movement || '')}" placeholder="目標動作（選填）" style="margin-top:3px"></td>
          <td><select class="e_cat">${opt(CATS, e.category || 'strength', c => CAT_LABEL[c])}</select></td>
          ${[...Array(b.weeks).keys()].map(w => `<td><input class="dose e_dose" data-w="${w}" value="${esc((e.doses || [])[w] || '')}"></td>`).join('')}
          <td><button class="btn xs danger e_del" title="刪除">×</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="row"><span class="small muted">從動作庫加：</span>${SEGS.map(s => `<button class="btn xs bpick" data-seg="${s}" style="${segVars(s)};border-color:var(--seg)">${SEG[s].letter}</button>`).join('')}<button class="btn sm" id="badd">＋ 空白列</button></div>
      <p class="small muted">劑量寫 3x8、2x5/腳、10m x4；空白＝該週不做，✓＝有做。負荷等記錄當天再加 @kg。</p>
      <p id="berr" class="msg err" hidden></p>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="bsave">儲存</button></div></div>`;
    const sync = () => {
      b.title = $('#b_title', host).value; b.goal_text = $('#b_goal', host).value; b.main_axis = $('#b_axis', host).value; b.intensity = $('#b_int', host).value;
      b.weeks = Math.min(12, Math.max(1, parseInt($('#b_weeks', host).value, 10) || 6)); b.season_id = $('#b_season', host).value || null;
      b.start_date = $('#b_start', host).value; b.end_date = $('#b_end', host).value;
      b.raise_types = checked(host, 'raise'); b.act_types = checked(host, 'activation');
      b.mob_types = checked(host, 'mobilize'); b.pot_types = checked(host, 'pot');
      b.exercises = $$('#bgrid tbody tr', host).map(tr => ({ segment: $('.e_seg', tr).value, name: $('.e_name', tr).value, target_movement: $('.e_tm', tr).value, category: $('.e_cat', tr).value, doses: $$('.e_dose', tr).map(i => i.value.trim()) }));
    };
    $('#b_weeks', host).onchange = () => { sync(); render(); };
    $('#badd', host).onclick = () => { sync(); b.exercises.push({ segment: b.exercises[b.exercises.length - 1]?.segment || 'main', name: '', category: b.main_axis || 'strength', doses: [] }); render(); $$('.e_name', host).pop()?.focus(); };
    $$('.bpick', host).forEach(btn => btn.onclick = () => {
      sync();
      const seg = btn.dataset.seg;
      pickExercises(seg, picked => {
        for (const it of picked) {
          if (!it) { b.exercises.push({ segment: seg, name: '', category: SEG_DEF_CAT[seg], doses: [] }); continue; }
          const dose = it.sets && it.reps ? `${it.sets}x${it.reps}` : (it.reps || '');
          b.exercises.push({ segment: seg, name: it.name, category: it.category, target_movement: '', doses: Array(b.weeks).fill(dose) });
        }
        render();
      });
    });
    $$('.e_del', host).forEach(btn => btn.onclick = () => { sync(); b.exercises.splice(Number(btn.closest('tr').dataset.i), 1); render(); });
    $('#bcancel', host).onclick = () => onDone(false);
    $('#bsave', host).onclick = async () => {
      sync();
      try {
        if (b.id) await api(`/api/blocks?id=${b.id}`, { method: 'PUT', body: b });
        else await api('/api/blocks', { method: 'POST', body: b });
        LIB = null; onDone(true);
      } catch (e) { const el = $('#berr', host); el.textContent = e.message; el.hidden = false; }
    };
  };
  render();
}

/* ===== 中期目標編輯（4–6 週的訓練方向） ===== */
let GOALS = null;
async function goalTemplates(force) { if (!GOALS || force) GOALS = await api('/api/goal-templates'); return GOALS; }
const PHASES = { '': '（不分期）', prep: '準備期', build: '強化期', peak: '爆發期', taper: '減量', recovery: '恢復' };

function addWeeks(dateStr, weeks) {
  const d = new Date((dateStr || today()) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + weeks * 7 - 1);
  return d.toISOString().slice(0, 10);
}

async function goalEditor(host, pp, initial) {
  const [tpls, cd] = await Promise.all([goalTemplates(), coachData()]);
  const cur = pp.current_block;
  const owner = pp.athlete.group
    ? { owner_type: 'group', owner_id: pp.athlete.group.id }
    : { owner_type: 'athlete', owner_id: cd.athletes.find(a => a.public_id === pp.athlete.public_id)?.id };

  let g = initial || (cur ? { ...cur } : {
    ...owner, title: '', goal_kind: 'general', phase: '', weeks: 6,
    start_date: today(), end_date: addWeeks(today(), 6), main_axis: 'strength', emphasis: {}, goal_text: '',
  });
  if (!g.owner_type) Object.assign(g, owner);
  g.emphasis = g.emphasis && Object.values(g.emphasis).some(v => v > 0) ? { ...g.emphasis } : {};

  const applyTpl = t => {
    g.title = t.name; g.goal_kind = t.kind; g.phase = t.phase; g.weeks = t.weeks;
    g.main_axis = t.main_axis; g.emphasis = { ...t.emphasis }; g.goal_text = t.note;
    g.goal_template_id = t.id;
    g.end_date = addWeeks(g.start_date, t.weeks);
  };

  const render = () => {
    const sum = CATS.reduce((a, c) => a + (Number(g.emphasis[c]) || 0), 0);
    host.innerHTML = `<div class="card-head"><div class="card-title">${cur ? '換／改中期目標' : '設定中期目標'}</div><button class="btn sm ghost" id="gcancel">取消</button></div>
      <p class="small sec">選一個範本或自己寫。目標比重＝這 4–6 週希望七種能力各佔多少時間，之後每堂課都會累積上去。</p>
      <div class="form">
        <label class="field full">從範本套用<select id="g_tpl"><option value="">（不套用，自己填）</option>
          <optgroup label="一般能力發展">${opt(tpls.templates.filter(t => t.kind === 'general'), g.goal_template_id, t => t.name, t => t.id)}</optgroup>
          <optgroup label="比賽週期化">${opt(tpls.templates.filter(t => t.kind === 'competition'), g.goal_template_id, t => t.name, t => t.id)}</optgroup>
        </select></label>
        <label class="field full">目標名稱<input id="g_title" value="${esc(g.title || '')}" placeholder="例：提升速度與敏捷"></label>
        <label class="field">類型<select id="g_kind">${opt(['general', 'competition'], g.goal_kind, k => k === 'competition' ? '比賽週期化' : '一般能力發展')}</select></label>
        <label class="field">期別<select id="g_phase">${opt(Object.keys(PHASES), g.phase || '', k => PHASES[k])}</select></label>
        <label class="field">開始<input id="g_start" type="date" value="${esc(g.start_date || today())}"></label>
        <label class="field">週數<input id="g_weeks" type="number" min="1" max="12" value="${g.weeks || 6}"></label>
        <label class="field">結束<input id="g_end" type="date" value="${esc(g.end_date || '')}"></label>
        <label class="field">主軸<select id="g_axis">${opt(AXES, g.main_axis || 'strength', x => CAT_LABEL[x])}</select></label>
        <label class="field full">給孩子的一句話<textarea id="g_text" placeholder="這段期間我們要練什麼？">${esc(g.goal_text || '')}</textarea></label>
      </div>
      <div class="card-title" style="font-size:14px">目標比重 <small class="${sum === 100 ? 'muted' : 'warn'}">合計 ${sum}%${sum === 100 ? '' : '（建議湊成 100，留白＝沿用階段建議值）'}</small></div>
      <div class="emph">${CATS.map(c => `<label class="ecell"><i style="background:${catColor(c)}"></i><span>${CAT_LABEL[c]}</span>
        <input class="g_em" data-c="${c}" type="number" min="0" max="100" value="${g.emphasis[c] ?? ''}" placeholder="0"></label>`).join('')}</div>
      <p class="small muted">歸屬：${owner.owner_type === 'group' ? `組別「${esc(pp.athlete.group.name)}」（全組共用）` : '這位學員個人'}</p>
      <p id="gerr" class="msg err" hidden></p>
      <div class="row" style="justify-content:space-between">
        ${cur ? `<button class="btn sm danger" id="gdel">刪除這個目標</button>` : '<span></span>'}
        <span class="row">${cur ? '<button class="btn sm" id="gnew">改成建立新目標</button>' : ''}<button class="btn primary" id="gsave">儲存</button></span>
      </div>`;

    const sync = () => {
      g.title = $('#g_title', host).value; g.goal_kind = $('#g_kind', host).value; g.phase = $('#g_phase', host).value;
      g.start_date = $('#g_start', host).value; g.weeks = parseInt($('#g_weeks', host).value, 10) || 6;
      g.end_date = $('#g_end', host).value; g.main_axis = $('#g_axis', host).value; g.goal_text = $('#g_text', host).value;
      g.emphasis = {};
      $$('.g_em', host).forEach(i => { const v = parseInt(i.value, 10); if (v > 0) g.emphasis[i.dataset.c] = v; });
    };
    $('#g_tpl', host).onchange = e => {
      const t = tpls.templates.find(x => String(x.id) === e.target.value);
      if (!t) return;
      sync(); applyTpl(t); render();
    };
    $('#g_weeks', host).onchange = () => { sync(); g.end_date = addWeeks(g.start_date, g.weeks); render(); };
    $('#g_start', host).onchange = () => { sync(); g.end_date = addWeeks(g.start_date, g.weeks); render(); };
    $$('.g_em', host).forEach(i => i.onchange = () => { sync(); render(); });
    $('#gcancel', host).onclick = () => renderPassport(S.id, true);
    if (cur) $('#gnew', host).onclick = () => { sync(); goalEditor(host, pp, { ...g, id: undefined, start_date: today(), end_date: addWeeks(today(), g.weeks) }); };
    if (cur) $('#gdel', host).onclick = () => {
      const id = cur.id;
      renderPassport(S.id, true);
      undoable({ message: `已刪除中期目標「${cur.title}」，記錄的課會保留`,
        onCommit: async () => { await api(`/api/blocks?id=${id}`, { method: 'DELETE' }); renderPassport(S.id, true); },
        onRollback: () => renderPassport(S.id, true) });
    };
    $('#gsave', host).onclick = async () => {
      sync();
      if (!g.title.trim()) return toast('先給目標一個名稱', { tone: 'error' });
      const body = { ...g, exercises: undefined };
      try {
        if (g.id) await api(`/api/blocks?id=${g.id}`, { method: 'PUT', body });
        else await api('/api/blocks', { method: 'POST', body });
        renderPassport(S.id, true);
      } catch (e) { const el = $('#gerr', host); el.textContent = e.message; el.hidden = false; }
    };
  };
  render();
}

/* ===== 動作庫挑選器 ===== */
const SEG_DEF_CAT = { raise: 'saq', activation: 'strength', mobilize: 'mobility', pot: 'power', main: 'strength' };
let LIB = null;
async function library() { if (!LIB) LIB = await api('/api/exercise-catalog'); return LIB; }

/**
 * 開啟動作庫，可複選；onPick 收到 [{name, category, sets, reps, note}]
 * segKey：預設只顯示掛在這個板塊的動作，可切「全部」
 */
async function pickExercises(segKey, onPick) {
  let lib = await library();
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  const sel = new Map();
  let scope = 'seg'; let q = '';

  // 外框只畫一次：搜尋框如果每次輸入都重建，游標會被打回開頭、字就變成倒的
  wrap.innerHTML = `<div class="card sheet">
    <div class="card-head"><div class="card-title"><span class="badge" style="${segVars(segKey)}">${SEG[segKey].letter}</span> 選動作 · ${SEG[segKey].label}</div><button class="btn sm ghost" id="pk_x">關閉</button></div>
    <div class="row"><input id="pk_q" placeholder="搜尋動作名稱或家族…" style="flex:1" autocomplete="off">
      <span class="seg"><button type="button" id="pk_seg" aria-pressed="true">本板塊</button><button type="button" id="pk_all" aria-pressed="false">全部</button></span></div>
    <div class="pk-list" id="pk_list"></div>
    <div class="row" style="justify-content:space-between">
      <button class="btn sm" id="pk_blank">＋ 自己打</button>
      <button class="btn primary" id="pk_ok" disabled>加入</button>
    </div></div>`;

  const listEl = $('#pk_list', wrap);
  const okBtn = $('#pk_ok', wrap);
  const qi = $('#pk_q', wrap);

  const drawList = () => {
    const groups = lib.library
      .filter(g => scope === 'all' || g.segment === segKey)
      .map(g => ({ ...g, items: g.items.filter(it => !q || (it.name + g.family).toLowerCase().includes(q)) }))
      .filter(g => g.items.length);
    listEl.innerHTML = groups.length ? groups.map(g => `<div class="pk-fam">${esc(g.family)}</div>${g.items.map(it => {
      const k = it.category + '|' + it.name;
      return `<div class="pk-row"><button type="button" class="pk-item${sel.has(k) ? ' on' : ''}" data-k="${esc(k)}">
        <i class="dot" style="background:${catColor(it.category)}"></i>
        <span class="nm">${esc(it.name)}${it.level ? `<em>L${it.level}</em>` : ''}${it.note ? `<span class="pkhint">${esc(it.note)}</span>` : ''}</span>
        <span class="d">${it.sets ? `${it.sets} × ` : ''}${esc(it.reps || '')}</span></button>${thumbHtml(it.video, 'thumb sm')}</div>`;
    }).join('')}`).join('') : `<p class="sec" style="padding:12px 2px">庫裡沒有${q ? `「${esc(qi.value.trim())}」` : '符合的動作'}。${q ? '可以直接建一個：' : '改用「自己打」也可以。'}</p>${q ? `<button type="button" class="btn sm" id="pk_new">＋ 把「${esc(qi.value.trim())}」加進動作庫</button>` : ''}`;

    okBtn.disabled = !sel.size;
    okBtn.textContent = sel.size ? `加入 ${sel.size} 個` : '加入';
    wireThumbs(listEl);
    $$('.pk-item', listEl).forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      if (sel.has(k)) sel.delete(k);
      else {
        const [cat, ...rest] = k.split('|');
        const name = rest.join('|');
        sel.set(k, lib.library.flatMap(g => g.items).find(x => x.category === cat && x.name === name));
      }
      b.classList.toggle('on', sel.has(k));
      okBtn.disabled = !sel.size;
      okBtn.textContent = sel.size ? `加入 ${sel.size} 個` : '加入';
    });
    const nb = $('#pk_new', listEl);
    if (nb) nb.onclick = async () => {
      const name = qi.value.trim();
      const cat = SEG_DEF_CAT[segKey];
      try {
        await api('/api/exercise-catalog', { method: 'POST', body: { name, category: cat, segment: segKey } });
        LIB = null; lib = await library();
        toast(`「${name}」已加進動作庫`);
        close();
        onPick([{ name, category: cat, segment: segKey, sets: '', reps: '' }]);
      } catch (e) { failToast(e); }
    };
  };

  $('#pk_x', wrap).onclick = close;
  $('#pk_blank', wrap).onclick = () => { close(); onPick([null]); };
  $('#pk_seg', wrap).onclick = () => { scope = 'seg'; $('#pk_seg', wrap).setAttribute('aria-pressed', 'true'); $('#pk_all', wrap).setAttribute('aria-pressed', 'false'); drawList(); };
  $('#pk_all', wrap).onclick = () => { scope = 'all'; $('#pk_seg', wrap).setAttribute('aria-pressed', 'false'); $('#pk_all', wrap).setAttribute('aria-pressed', 'true'); drawList(); };
  qi.oninput = () => { q = qi.value.trim().toLowerCase(); drawList(); };
  okBtn.onclick = () => { const picked = [...sel.values()]; close(); onPick(picked); };
  wrap.onclick = e => { if (e.target === wrap) close(); };
  drawList();
}

/* ===== 記錄一堂課：五個板塊 A–E，每塊掛動作 ===== */

async function sessionForm(host, pp, editSession, onDone) {
  const cd = await coachData();
  const me = cd.athletes.find(a => a.public_id === pp.athlete.public_id);
  const mates = editSession ? [me] : (me?.group_id ? cd.athletes.filter(a => a.group_id === me.group_id) : [me]);
  let edit = editSession || null;
  let date = edit ? edit.date : today();
  let pre = null; let exs = []; let mins = {}; let axis = 'strength'; let dur = 50; let note = ''; let rpe = '';

  const load = async () => {
    const [p] = await Promise.all([
      api(`/api/session?id=${encodeURIComponent(pp.athlete.public_id)}&date=${date}`),
      library().catch(() => null),   // 讓 exRow 對得到示範影片
    ]);
    pre = p;
    const b = pre.block;
    if (edit) {
      // 事後修改：用這堂課記下來的內容，不要用本週計畫覆蓋
      exs = edit.exercises.map(e => ({ ...e, sets: e.sets ?? '', reps: e.reps ?? '', load_kg: e.load_kg ?? '' }));
      axis = edit.main_axis;
      dur = edit.duration_min;
      rpe = edit.session_rpe ?? '';
      note = edit.coach_note || '';
      mins = { raise: edit.raise_min ?? 5, activation: edit.act_min ?? 4, mobilize: edit.mob_min ?? 4, pot: edit.pot_min ?? 5 };
      edit = { ...edit, exercises: exs }; // 只用第一次載入的內容，之後改日期不再覆蓋
    } else {
      exs = pre.plan.map(p => ({ ...p, sets: p.sets ?? '', reps: p.reps ?? '', load_kg: '' }));
      axis = b?.main_axis || 'strength';
      mins = { raise: b?.raise_min ?? 5, activation: b?.act_min ?? 4, mobilize: b?.mob_min ?? 4, pot: b?.pot_min ?? 5 };
    }
    render();
  };

  const mainMin = () => Math.max(0, (parseInt(dur, 10) || 0) - SEGS.slice(0, 4).reduce((a, k) => a + (parseInt(mins[k], 10) || 0), 0));

  // 排課時也看得到示範縮圖：用（分類, 名稱）去動作庫對
  let vmap = null;
  const vidOf = e => {
    if (!vmap && LIB) {
      vmap = {};
      for (const g of LIB.library) for (const it of g.items) if (it.video) vmap[it.category + '|' + it.name.toLowerCase()] = it.video;
    }
    return vmap ? (vmap[e.category + '|' + String(e.name || '').toLowerCase()] || null) : null;
  };

  const exRow = (e, i) => `<div class="erow-edit" data-i="${i}">
    ${vidOf(e) ? thumbHtml(vidOf(e), 'thumb xs') : ''}
    <input class="x_name" value="${esc(e.name)}" placeholder="動作名稱" list="catalog">
    <span class="dz">
      <select class="x_cat" title="能力分類">${opt(CATS, e.category, c => CAT_LABEL[c])}</select>
      <input class="x_sets" value="${esc(e.sets ?? '')}" placeholder="組" inputmode="numeric">
      <input class="x_reps" value="${esc(e.reps ?? '')}" placeholder="次數／距離／秒">
      <input class="x_load" value="${esc(e.load_kg ?? '')}" placeholder="kg" inputmode="decimal">
    </span>
    <button class="btn xs x_del" title="移除">×</button></div>`;

  const groupCard = key => {
    const idx = exs.map((e, i) => i).filter(i => (exs[i].segment || 'main') === key);
    const m = SEG[key];
    const right = key === 'main'
      ? `<span class="chip" title="總時長減掉 A–D 的分鐘">${mainMin()} 分</span><button class="btn xs x_add" data-seg="${key}">＋ 動作</button>`
      : `<input class="mins" data-seg="${key}" type="number" min="0" value="${mins[key]}" title="${m.label} 分鐘"><span class="small muted">分</span><button class="btn xs x_add" data-seg="${key}">＋ 動作</button>`;
    return `<section class="sgrp" style="${segVars(key)}">
      <div class="sgrp-head"><span class="badge">${m.letter}</span><span class="t">${m.label}</span><span class="zh">${m.zh}</span><span class="sp"></span>${right}</div>
      <div class="sgrp-body${idx.length ? '' : ' empty'}">${idx.length ? idx.map(i => exRow(exs[i], i)).join('') : '還沒排動作，按右上「＋ 動作」'}</div>
    </section>`;
  };

  const render = () => {
    const b = pre.block;
    const setCount = exs.reduce((a, e) => a + (parseInt(e.sets, 10) || 0), 0);
    const keepY = window.scrollY; // 重繪不要把畫面彈到頁尾
    host.innerHTML = `<div class="form">
      <label class="field">日期<input id="s_date" type="date" value="${date}"></label>
      <div class="field">對象${mates.length > 1 ? `<div class="checks">${mates.map(a => `<label><input type="checkbox" name="who" value="${esc(a.public_id)}" ${a.public_id === pp.athlete.public_id ? 'checked' : ''}>${esc(a.nickname)}</label>`).join('')}</div>` : `<span>${esc(pp.athlete.nickname)}</span>`}</div>
      <div class="note full">${edit ? `修改 ${fmtDate(edit.date)} 這堂課${b ? ` · ${esc(b.title)}` : ''}` : (b ? `${esc(b.title)}${b.week_now ? ` · 第 ${b.week_now} 週` : ''}${pre.plan.length ? ' · 已依本週計畫預填' : ''}` : '這天沒有對應的中期目標，會記成獨立一堂課')}</div>
      <label class="field">總時長（分）<input id="s_dur" type="number" value="${dur}" min="1"></label>
      <label class="field">主訓練主軸<select id="s_axis">${opt(AXES, axis, x => CAT_LABEL[x])}</select></label>
      <label class="field">sRPE（1–10）<input id="s_rpe" type="number" min="1" max="10" value="${esc(rpe)}" placeholder="選填"></label>
      <div class="field full"><div class="statbar"><span class="s"><b>${exs.length}</b> 個動作</span><span class="s"><b>${setCount}</b> 組</span><span class="s"><b>${mainMin()}</b> 分主訓練</span></div></div>
    </div>
    <div class="sgrps" id="sgrps" style="margin-top:14px">${SEGS.map(groupCard).join('')}</div>
    <p class="small muted" style="margin-top:8px">每列＝一個動作：能力分類 · 組數 · 次數／距離／秒 · 重量（選填）。板塊分鐘會決定這堂課餵給哪些能力。</p>
    <div class="form" style="margin-top:10px"><label class="field full">備註<textarea id="s_note" placeholder="今天觀察到什麼？">${esc(note)}</textarea></label></div>
    <p id="serr" class="msg err" hidden></p>
    <div class="row" style="justify-content:flex-end;margin-top:10px">${edit ? '<button class="btn" id="scancel">取消</button>' : ''}<button class="btn primary" id="ssave">${edit ? '儲存修改' : '存這堂課'}</button></div>
    <datalist id="catalog"></datalist>`;

    const sync = () => {
      dur = $('#s_dur', host).value; axis = $('#s_axis', host).value; rpe = $('#s_rpe', host).value; note = $('#s_note', host).value;
      $$('.mins', host).forEach(i => { mins[i.dataset.seg] = i.value; });
      $$('.erow-edit', host).forEach(r => {
        const e = exs[Number(r.dataset.i)];
        e.name = $('.x_name', r).value; e.category = $('.x_cat', r).value;
        e.sets = $('.x_sets', r).value; e.reps = $('.x_reps', r).value; e.load_kg = $('.x_load', r).value;
      });
    };
    $('#s_date', host).onchange = e => { date = e.target.value; load(); };
    const refreshMain = () => {
      sync();
      const st = $$('.statbar .s b', host);
      if (st[0]) st[0].textContent = exs.filter(e => String(e.name).trim()).length;
      if (st[1]) st[1].textContent = exs.reduce((a, e) => a + (parseInt(e.sets, 10) || 0), 0);
      if (st[2]) st[2].textContent = mainMin();
      const chip = $('.sgrp:last-child .sgrp-head .chip', host); if (chip) chip.textContent = `${mainMin()} 分`;
    };
    $('#s_dur', host).oninput = refreshMain;
    $$('.mins', host).forEach(i => i.oninput = refreshMain);
    $$('.x_sets, .x_name', host).forEach(i => i.oninput = refreshMain);
    $('#s_axis', host).onchange = () => sync();
    $$('.x_add', host).forEach(btn => btn.onclick = () => {
      sync();
      const seg = btn.dataset.seg;
      pickExercises(seg, picked => {
        for (const it of picked) {
          exs.push(it
            ? { segment: seg, name: it.name, sets: it.sets ?? '', reps: it.reps || '', load_kg: '', category: it.category, target_movement: '', from_plan: 0 }
            : { segment: seg, name: '', sets: '', reps: '', load_kg: '', category: seg === 'main' ? axis : SEG_DEF_CAT[seg], target_movement: '', from_plan: 0 });
        }
        render();
        if (picked.length === 1 && !picked[0]) { const rows = $$('.erow-edit', host); rows[rows.length - 1] && $('.x_name', rows[rows.length - 1]).focus({ preventScroll: true }); }
      });
    });
    $$('.x_del', host).forEach(btn => btn.onclick = () => { sync(); exs.splice(Number(btn.closest('.erow-edit').dataset.i), 1); render(); });

    $('#ssave', host).onclick = async () => {
      sync();
      const ids = mates.length > 1 ? checked(host, 'who') : [pp.athlete.public_id];
      if (!ids.length) return toast('至少選一位學員', { tone: 'error' });
      const keep = exs.filter(e => String(e.name).trim());
      if (!keep.length) return toast('至少排一個動作', { tone: 'error' });
      const body = {
        athlete_ids: ids, session_date: date, block_id: b?.id || null, main_axis: axis, duration_min: dur,
        raise_min: mins.raise, act_min: mins.activation, mob_min: mins.mobilize, pot_min: mins.pot, main_min: mainMin(),
        session_rpe: rpe || null, coach_note: note,
        raise_types: b?.raise_types || [], act_types: b?.act_types || [], mob_types: b?.mob_types || [], pot_types: b?.pot_types || [],
        exercises: keep.map(e => ({
          segment: e.segment || 'main', name: e.name, sets: e.sets === '' ? null : parseInt(e.sets, 10),
          reps: e.reps || '', load_kg: e.load_kg === '' ? null : parseFloat(e.load_kg),
          category: e.category, target_movement: e.target_movement || '', from_plan: e.from_plan ? 1 : 0,
        })),
      };
      try {
        if (edit) {
          await api(`/api/session?id=${edit.id}`, { method: 'PUT', body });
          LIB = null;
          if (onDone) return onDone(true);
        } else {
          const r = await api('/api/session', { method: 'POST', body });
          LIB = null; toast(`已記錄 ${r.results.filter(x => !x.error).length} 位`);
        }
        S.tab = 'log'; renderPassport(S.id, true);
      } catch (e) { const el = $('#serr', host); el.textContent = e.message; el.hidden = false; }
    };
    if (edit) $('#scancel', host).onclick = () => onDone && onDone(false);
    api('/api/exercise-catalog').then(r => { const dl = $('#catalog', host); if (dl) dl.innerHTML = r.catalog.map(c => `<option value="${esc(c.name)}">`).join(''); }).catch(() => {});
    wireThumbs(host);
    window.scrollTo(0, keepY);
  };
  load();
}

/* ===== 教練工具 ===== */
async function viewTools(body, pp) {
  const cd = await coachData();
  const a = pp.athlete; const lv = pp.focus_levels || {};
  body.innerHTML = `
    <div class="card"><div class="card-title">頒發突破方塊 <small>會蓋進塔裡，不算進科學圖</small></div>
      <div class="form"><label class="field">等級<select id="t_tier">${opt(['silver', 'gold', 'rainbow'], 'silver', x => TIER_LABEL[x] + '方塊')}</select></label>
        <label class="field">原因<select id="t_reason">${opt(Object.keys(REASON_LABEL), 'breakthrough', x => REASON_LABEL[x])}</select></label>
        <label class="field full">一句話（孩子點方塊會看到）<input id="t_sent" placeholder="例：第一次完整做出 10 下箱上跳落地不晃"></label>
        <label class="field">日期<input id="t_date" type="date" value="${today()}"></label></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="t_go">頒發</button></div>
      ${pp.turning_blocks.length ? `<div class="small muted">已頒發 ${pp.turning_blocks.length} 塊：${pp.turning_blocks.map(t => `<span class="chip">${TIER_LABEL[t.tier]} ${esc(t.sentence.slice(0, 14))}… <button class="btn xs ghost" data-tbdel="${t.id}">×</button></span>`).join(' ')}</div>` : ''}</div>
    <div class="card"><div class="card-title">RAMP Focus 等級 <small>點一下設定現在的等級</small></div>
      <div class="focus9">${pp.focus_defs.map(f => { const L = lv[f.key]?.level || 0; return `<div class="fcell edit" data-key="${f.key}"><b>${esc(f.label)}</b>${[1, 2, 3].map(i => `<button class="${i === L ? 'on' : ''}" data-l="${i}">L${i} ${esc(f.levels[i - 1])}</button>`).join('')}</div>`; }).join('')}</div></div>
    <div class="card"><div class="card-title">量身高體重</div>
      <div class="form"><label class="field">日期<input id="g_date" type="date" value="${today()}"></label><label class="field">身高 cm<input id="g_h" type="number" step="0.1" inputmode="decimal"></label><label class="field">體重 kg<input id="g_w" type="number" step="0.1" inputmode="decimal"></label></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="g_go">記錄</button></div></div>
    <div class="card"><div class="card-title">學員資料</div>${athleteForm(a, cd.groups, true)}
      <div class="row" style="justify-content:space-between"><button class="btn sm danger" id="a_del">刪除學員</button><button class="btn primary" id="a_save">儲存</button></div><p id="a_err" class="msg err" hidden></p></div>`;
  wireAvatarPicker(body);
  $('#a_del').onclick = () => {
    const n = pp.session_count;
    confirmDestructive({
      title: `刪除學員「${a.nickname}」`,
      detail: `會一併刪掉 <b>${n}</b> 堂課的紀錄、突破方塊、身高體重與個人目標。<b>這個動作無法復原，也沒有 8 秒可以反悔。</b>`,
      phrase: a.nickname,
      confirmLabel: '永久刪除',
      onConfirm: async () => {
        await api(`/api/athletes?id=${encodeURIComponent(a.public_id)}`, { method: 'DELETE' });
        C.athletes = null; location.hash = '#/coach';
      },
    });
  };
  $('#t_go').onclick = async () => {
    const sentence = $('#t_sent').value.trim(); if (!sentence) return toast('寫一句話給孩子', { tone: 'error' });
    await api('/api/turning-block', { method: 'POST', body: { athlete_id: a.public_id, tier: $('#t_tier').value, reason_type: $('#t_reason').value, sentence, granted_on: $('#t_date').value } });
    S.tab = 'tower'; renderPassport(S.id, true);
  };
  $$('[data-tbdel]').forEach(b => b.onclick = () => {
    const chip = b.closest('.chip'); const id = b.dataset.tbdel;
    if (chip) chip.hidden = true;
    undoable({ message: '已收回這塊突破方塊',
      onCommit: async () => { await api(`/api/turning-block?id=${id}`, { method: 'DELETE' }); renderPassport(S.id, true); },
      onRollback: () => { if (chip) chip.hidden = false; } });
  });
  $$('.fcell.edit button').forEach(b => b.onclick = async () => {
    const key = b.closest('.fcell').dataset.key; const cur = lv[key]?.level || 0; const level = Number(b.dataset.l) === cur ? 0 : Number(b.dataset.l);
    await api('/api/focus-level', { method: 'POST', body: { athlete_id: a.public_id, focus_key: key, level, achieved_on: today() } });
    toast(level ? `${key} → L${level}` : '已清除'); renderPassport(S.id, true);
  });
  $('#g_go').onclick = async () => {
    const h = $('#g_h').value, w = $('#g_w').value; if (!h && !w) return toast('至少填一項', { tone: 'error' });
    await api('/api/growth', { method: 'POST', body: { athlete_id: a.public_id, measured_on: $('#g_date').value, height_cm: h || null, weight_kg: w || null } });
    S.tab = 'growth'; renderPassport(S.id, true);
  };
  $('#a_save').onclick = async () => {
    try { const r = await api(`/api/athletes?id=${encodeURIComponent(a.public_id)}`, { method: 'PUT', body: readAthleteForm(body) }); C.athletes = null; location.hash = `#/p/${encodeURIComponent(r.public_id)}`; if (r.public_id === a.public_id) renderPassport(S.id, true); }
    catch (e) { const el = $('#a_err'); el.textContent = e.message; el.hidden = false; }
  };
}
function athleteForm(a, groups, edit) {
  return `<div class="form">
    <label class="field">ID（搜尋用）<input id="a_pid" value="${esc(a.public_id || '')}" placeholder="英數 3–32 字" autocapitalize="off"></label>
    <label class="field">暱稱<input id="a_nick" value="${esc(a.nickname || '')}"></label>
    <div class="field full">頭像
      <div class="avpick" id="a_avpick">
        ${Object.entries(AVATARS).map(([k, v]) => `<button type="button" class="avopt${a.avatar === k ? ' on' : ''}" data-av="${k}" title="${v.label}">${avatarHtml({ avatar: k }, 'avatar sm')}</button>`).join('')}
        <button type="button" class="avopt${!a.avatar ? ' on' : ''}" data-av="" title="用文字">${avatarHtml({ avatar_initial: a.avatar_initial || a.nickname?.slice(0, 1) || '?' }, 'avatar sm')}</button>
        <label class="avopt up" title="上傳照片">＋<span class="sr">上傳照片</span><input type="file" id="a_avfile" accept="image/*" hidden></label>
      </div>
      <input type="hidden" id="a_av_val" value="${esc(a.avatar || '')}">
      <span class="small muted" id="a_avmsg">選一個，或上傳照片（會自動裁成方形縮圖）。</span>
    </div>
    <label class="field">頭像文字<input id="a_av" value="${esc(a.avatar_initial || '')}" maxlength="2" placeholder="沒選圖時顯示"></label>
    <label class="field">性別<select id="a_sex"><option value="">—</option>${opt(['M', 'F'], a.sex, x => x === 'M' ? '男' : '女')}</select></label>
    <label class="field">出生年<input id="a_by" type="number" value="${a.birth_year || ''}" placeholder="2019"></label>
    <label class="field">階段<select id="a_stage">${opt(['pre', 'circa', 'post'], a.stage || 'pre', x => STAGE_LABEL[x])}</select></label>
    <label class="field">階段起算日<input id="a_ss" type="date" value="${esc(a.stage_started_on || '')}"></label>
    <label class="field">組別<select id="a_grp"><option value="">（無）</option>${opt(groups, a.group?.id ?? a.group_id, g => g.name, g => g.id)}</select></label>
    <label class="field full">備註<textarea id="a_notes">${esc(a.notes || '')}</textarea></label></div>`;
}
function readAthleteForm(root) {
  return { public_id: $('#a_pid', root).value.trim(), nickname: $('#a_nick', root).value.trim(), avatar: $('#a_av_val', root)?.value || '', avatar_initial: $('#a_av', root).value.trim(), sex: $('#a_sex', root).value, birth_year: $('#a_by', root).value || null, stage: $('#a_stage', root).value, stage_started_on: $('#a_ss', root).value || null, group_id: $('#a_grp', root).value || null, notes: $('#a_notes', root).value };
}

/** 頭像選擇：內建五款或上傳（前端縮成 256px 方形 webp/jpeg，存 data URI） */
function wireAvatarPicker(root) {
  const val = $('#a_av_val', root); if (!val) return;
  const pick = $('#a_avpick', root);
  const setOn = el => { $$('.avopt', pick).forEach(b => b.classList.toggle('on', b === el)); };
  $$('.avopt[data-av]', pick).forEach(b => b.onclick = () => { val.value = b.dataset.av; setOn(b); });
  const file = $('#a_avfile', root);
  if (file) file.onchange = async () => {
    const f = file.files?.[0]; if (!f) return;
    const msg = $('#a_avmsg', root);
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const S2 = 256, cv = document.createElement('canvas'); cv.width = cv.height = S2;
      const side = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S2, S2);
      let out = cv.toDataURL('image/webp', 0.85);
      if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', 0.85);
      if (out.length > 190000) out = cv.toDataURL('image/jpeg', 0.7);
      val.value = out;
      const up = $('.avopt.up', pick);
      up.innerHTML = `<img src="${out}" alt="">`;
      setOn(up);
      msg.textContent = `已選好照片（${Math.round(out.length / 1024)} KB）`;
    } catch { msg.textContent = '這張圖讀不進來，換一張試試。'; }
  };
}

/* ===== #/coach 後台 ===== */
async function renderCoach() {
  const app = $('#app');
  if (!S.coach) { app.innerHTML = `<div class="topbar"><a class="brand" href="#/">訓練護照</a></div><div class="card"><h3>教練後台</h3><p class="sec">需要教練密碼。</p><button class="btn primary" id="login">登入</button></div>`; $('#login').onclick = () => askPassword(renderCoach); return; }
  app.innerHTML = `<div class="topbar"><a class="brand" href="#/">訓練護照</a><span class="row"><span class="chip">教練模式</span><button class="btn sm ghost" id="logout">登出</button></span></div><p class="muted">載入中…</p>`;
  $('#logout').onclick = logout;
  const cd = await coachData(true);
  app.innerHTML = `<div class="topbar"><a class="brand" href="#/">訓練護照</a><span class="row"><span class="chip">教練模式</span><button class="btn sm ghost" id="logout">登出</button></span></div>
    <div class="card"><div class="card-head"><div class="card-title">學員 <small>${cd.athletes.length} 位</small></div><button class="btn sm" id="anew">＋ 新學員</button></div><div id="anewform" hidden></div>
      <div class="alist">${cd.athletes.map(a => `<a class="arow" href="#/p/${encodeURIComponent(a.public_id)}">${avatarHtml(a, 'av')}
        <div><div class="nm">${esc(a.nickname)} <span class="small muted">${esc(a.public_id)}</span></div><div class="sub">${a.group_name ? esc(a.group_name) + ' · ' : ''}${STAGE_LABEL[a.stage]?.split('（')[0]} · ${a.session_count} 堂${a.last_date ? ' · 最近 ' + fmtDate(a.last_date) : ''}</div>
          <div class="minibricks">${CATS.map(c => `<i style="background:${Math.abs(a.pct_stage[c] - a.targets[c].target) <= a.targets[c].tol ? catColor(c) : 'var(--border)'}" title="${CAT_LABEL[c]} ${a.pct_stage[c]}%"></i>`).join('')}</div></div>
        <div class="stat"><b class="num">${a.brick_total}</b> 塊<br>${a.on_target}/7 達標</div></a>`).join('')}</div></div>
    <details class="section"><summary>組別 <span class="small muted">${cd.groups.length} 組</span></summary><div class="body" id="groups"></div></details>
    <details class="section"><summary>中期目標與週課表 <span class="small muted">進階</span></summary><div class="body" id="blocks"></div></details>
    <details class="section"><summary>動作庫</summary><div class="body" id="lib"></div></details>
    <details class="section"><summary>從 Google Sheet 匯入</summary><div class="body" id="import"></div></details>
    <details class="section"><summary>各階段目標比重</summary><div class="body" id="targets"></div></details>`;
  $('#logout').onclick = logout;
  $('#anew').onclick = () => { const f = $('#anewform'); f.hidden = !f.hidden; if (!f.innerHTML) { f.innerHTML = athleteForm({ stage: 'pre', stage_started_on: today() }, cd.groups) + `<div class="row" style="justify-content:flex-end;margin:8px 0"><button class="btn primary" id="a_create">建立</button></div><p id="a_err" class="msg err" hidden></p>`; wireAvatarPicker(f);
    $('#a_create').onclick = async () => { try { const r = await api('/api/athletes', { method: 'POST', body: readAthleteForm(f) }); toast(`已建立，ID：${r.public_id}`); renderCoach(); } catch (e) { const el = $('#a_err', f); el.textContent = e.message; el.hidden = false; } }; } };
  groupsPanel($('#groups'), cd);
  blocksPanel($('#blocks'), cd);
  libraryPanel($('#lib'));
  importPanel($('#import'));
  targetsPanel($('#targets'));
}

/* ===== 動作庫管理：自己加的動作在這裡改名、換分類、刪除 ===== */
async function libraryPanel(host) {
  host.innerHTML = '<p class="muted">載入中…</p>';
  LIB = null;
  const lib = await library();
  let q = ''; let scope = 'all'; const sel = new Set(); let editing = null; let onlySug = false;
  let vScope = ''; let vAuto = false; let vRunning = false; let vFilter = '';   // 找影片的範圍、是否直接上線、是否正在接力跑

  const allItems = () => lib.library.flatMap(g => g.items.map(it => ({ ...it, family: g.family })));

  const vidBadge = it => {
    if (it.video_status === 'suggested') return '<em class="vb sug">待審</em>';
    if (it.video_status === 'skip') return '<em class="vb">不用影片</em>';
    if (it.video_status === 'nomatch') return '<em class="vb">找不到</em>';
    return '';
  };
  const view = it => `<div class="lib-item${it.video_status === 'suggested' ? ' sug' : ''}" data-id="${it.id}">
    <label class="lk"><input type="checkbox" class="l_ck" ${sel.has(it.id) ? 'checked' : ''}></label>
    ${it.video ? thumbHtml(it.video, 'thumb xs') : `<i class="dot" style="background:${catColor(it.category)}" title="${CAT_LABEL[it.category]}"></i>`}
    <span class="nm">${esc(it.name)}${it.level ? `<em>L${it.level}</em>` : ''}${it.custom ? '<em class="cu">自訂</em>' : ''}${vidBadge(it)}</span>
    <span class="d">${it.sets ? `${it.sets} × ` : ''}${esc(it.reps || '')}</span>
    <span class="sg" title="預設板塊" style="${segVars(it.segment)}">${SEG[it.segment].letter}</span>
    <button class="btn xs l_vid" title="貼影片連結">🎬</button>${it.video_status === 'nomatch' ? '<button class="btn xs l_requery" title="換關鍵字重搜">🔍</button>' : ''}<button class="btn xs l_edit">改</button><button class="btn xs danger l_del" title="從動作庫移除">×</button>
    ${it.video_status === 'suggested' ? `<div class="vsug" data-id="${it.id}">
      <div class="vs-info"><b>${esc(it.video.title)}</b><span class="small muted">${esc(it.video.channel)}${it.video.seconds != null ? ` · ${fmtDur(it.video.seconds)}` : ''}${it.video_reason ? ` · AI：${esc(it.video_reason)}` : ''}</span></div>
      <div class="row"><button class="btn xs primary v_ok">用這支</button><button class="btn xs v_next"${(it.video_alts || []).length ? '' : ' disabled'}>換一支${(it.video_alts || []).length ? `（還有 ${it.video_alts.length}）` : ''}</button><button class="btn xs v_skip">不用影片</button></div>
    </div>` : ''}</div>`;

  const editRow = it => `<div class="lib-row edit" data-id="${it.id}">
    <input class="l_name" value="${esc(it.name)}">
    <select class="l_cat">${opt(CATS, it.category, c => CAT_LABEL[c])}</select>
    <select class="l_seg">${opt(SEGS, it.segment, s => `${SEG[s].letter} ${SEG[s].label}`)}</select>
    <input class="l_sets" value="${esc(it.sets ?? '')}" placeholder="組" inputmode="numeric">
    <input class="l_reps" value="${esc(it.reps || '')}" placeholder="次數／距離">
    <span class="row" style="gap:4px"><button class="btn xs primary l_save">存</button><button class="btn xs l_cancel">取消</button></span></div>`;

  const total = allItems().length;
  const custom = allItems().filter(i => i.custom).length;
  // 外框只畫一次，搜尋框才不會被重建（中文輸入法尤其怕）
  host.innerHTML = `<p class="small sec">動作庫共 <b>${total}</b> 個（自訂 <b>${custom}</b> 個）。用不到的動作可以直接移除；移除只影響之後排課的選單，<b>已經記錄的課不受影響</b>。</p>
    <div class="row"><input id="l_q" placeholder="搜尋動作或家族…" style="flex:1;min-width:150px" autocomplete="off">
      <span class="seg" id="l_scope"><button type="button" data-s="all" aria-pressed="true">全部</button>${SEGS.map(s => `<button type="button" data-s="${s}" aria-pressed="false" title="${SEG[s].label}">${SEG[s].letter}</button>`).join('')}</span></div>
    <div class="row"><span class="small muted">篩選</span><span class="seg" id="l_vfilter">
      <button type="button" data-v="" aria-pressed="true">全部</button>
      <button type="button" data-v="has" aria-pressed="false">有影片</button>
      <button type="button" data-v="suggested" aria-pressed="false">待審</button>
      <button type="button" data-v="nomatch" aria-pressed="false">找不到</button>
      <button type="button" data-v="missing" aria-pressed="false">沒影片</button></span></div>
    <div class="vbar" id="l_vbar"></div>
    <div class="lib-groups" id="l_list"></div>
    <p id="l_err" class="msg err" hidden></p>
    <div class="row" id="l_bulk" style="justify-content:space-between" hidden>
      <span class="small sec">已選 <b id="l_n">0</b> 個</span>
      <span class="row"><button class="btn sm" id="l_clear">取消選取</button><button class="btn sm danger" id="l_delsel">移除選取的</button></span></div>
    <div class="card-title" style="font-size:14px;margin-top:8px">＋ 直接加一個動作</div>
    <div class="lib-row">
      <input id="l_new_name" placeholder="動作名稱">
      <select id="l_new_cat">${opt(CATS, 'strength', c => CAT_LABEL[c])}</select>
      <select id="l_new_seg">${opt(SEGS, 'main', s => `${SEG[s].letter} ${SEG[s].label}`)}</select>
      <input id="l_new_sets" placeholder="組" inputmode="numeric">
      <input id="l_new_reps" placeholder="次數／距離">
      <button class="btn sm primary" id="l_add">加入</button>
    </div>
    <p class="small muted">記錄一堂課或存課表時，庫裡沒有的動作會自動收進「自訂動作」。</p>`;

  const listEl = $('#l_list', host);
  const bulk = $('#l_bulk', host);
  const err = m => { const el = $('#l_err', host); el.textContent = m; el.hidden = !m; };

  /* ---- 示範影片：進度、批次搜尋、逐項審核 ---- */
  const vbar = $('#l_vbar', host);
  const drawVideoBar = async () => {
    let st;
    try { st = await api('/api/video-search'); } catch { vbar.hidden = true; return; }
    const need = st.pending + st.none;
    const catNeed = st.need_by_category || {};
    const targetCount = () => (vScope ? (catNeed[vScope] || 0) : need);
    vbar.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span class="small sec">示範影片：<b>${st.ok}</b> 已上線 · <b class="${st.suggested ? 'warn' : ''}">${st.suggested}</b> 待審 · <b>${need}</b> 還沒找${st.nomatch ? ` · ${st.nomatch} 找過沒有` : ''}${st.skip ? ` · ${st.skip} 標為不用` : ''}</span>
      <span class="row">${st.suggested ? `<button class="btn xs" id="v_review" aria-pressed="${onlySug}">只看待審</button>` : ''}</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">
        <select id="v_scope" style="flex:0 1 12rem"><option value="">全部（${need}）</option>${CATS.filter(c => catNeed[c]).map(c => `<option value="${c}" ${vScope === c ? 'selected' : ''}>${CAT_LABEL[c]}（${catNeed[c]}）</option>`).join('')}</select>
        <label class="vchk"><input type="checkbox" id="v_auto" ${vAuto ? 'checked' : ''}>AI 挑完直接上線</label>
        <button class="btn sm primary" id="v_run"${targetCount() ? '' : ' disabled'}>${targetCount() ? `開始找（${targetCount()} 個）` : '這個範圍都找過了'}</button>
      </div>
      ${st.has_key ? '' : '<p class="small warn" style="margin:6px 0 0">還沒設定 YouTube API 金鑰，自動搜尋不能用。可以先自己貼連結（每列的 🎬）。</p>'}
      ${st.has_llm ? '' : '<p class="small warn" style="margin:6px 0 0">還沒設定 GEMINI_API_KEY，會改用關鍵字評分排序。</p>'}
      <p class="small muted" style="margin:6px 0 0">流程：YouTube 依動作名稱撈候選 → 砍掉超過 3 分鐘的 → ${st.has_llm ? 'AI 判斷哪一支真的是這個動作' : '關鍵字評分'} → ${vAuto ? '<b>直接上線</b>' : '標成待審等你按'}。<b>都對不上就留空</b>，不硬掛。</p>`;
    const rv = $('#v_review', vbar); if (rv) rv.onclick = () => { onlySug = !onlySug; rv.setAttribute('aria-pressed', onlySug); draw(); };
    $('#v_scope', vbar).onchange = e => { vScope = e.target.value; drawVideoBar(); };
    $('#v_auto', vbar).onchange = e => { vAuto = e.target.checked; drawVideoBar(); };
    const run = $('#v_run', vbar);
    if (run) run.onclick = async () => {
      // 一批 15 個是 Cloudflare 的上限，這裡自動接力跑完整個範圍
      const total = targetCount();
      vRunning = true;
      let ok = 0, none = 0, bad = 0, seen = 0, stopMsg = '';
      const prog = document.createElement('p');
      prog.className = 'small sec'; prog.style.margin = '6px 0 0';
      vbar.appendChild(prog);
      run.hidden = true;
      const stop = document.createElement('button');
      stop.className = 'btn sm danger'; stop.textContent = '停下來';
      stop.onclick = () => { vRunning = false; stop.disabled = true; stop.textContent = '這批跑完就停…'; };
      run.parentNode.appendChild(stop);
      const paint = () => { prog.innerHTML = `處理中… <b>${seen}/${total}</b>　已上線 <b>${ok}</b>・沒有合適的 <b>${none}</b>${bad ? `・出錯 <b>${bad}</b>` : ''}`; };
      paint();

      while (vRunning && seen < total) {
        let r;
        try {
          r = await api('/api/video-search', { method: 'POST', body: { limit: st.per_run, auto: vAuto, category: vScope || undefined } });
        } catch (e) { stopMsg = e.message; break; }
        if (!r.searched) break;                       // 這個範圍沒東西可跑了
        ok += r.done.reduce((a, x) => a + (x.count || 1), 0); none += r.skipped.length; bad += r.failed.length; seen += (r.covered || r.searched);
        paint();
        if (r.quota_exhausted) { stopMsg = 'YouTube 今天的額度用完了，明天再跑剩下的'; break; }
      }
      vRunning = false;
      const parts = [`${ok} 支${vAuto ? '已上線' : '待審'}`];
      if (none) parts.push(`${none} 個沒有合適的`);
      if (bad) parts.push(`${bad} 個出錯`);
      toast(stopMsg ? `${parts.join('，')}｜${stopMsg}` : parts.join('，'), stopMsg ? { tone: 'error', ms: 9000 } : {});
      LIB = null; libraryPanel(host);
    };
  };

  const draw = () => {
    const groups = lib.library
      .filter(g => scope === 'all' || g.segment === scope)
      .map(g => ({ ...g, items: g.items.filter(it => (!q || (it.name + g.family).toLowerCase().includes(q))
        && (!onlySug || it.video_status === 'suggested')
        && (!vFilter
          || (vFilter === 'has' && it.video)
          || (vFilter === 'missing' && !it.video)
          || (vFilter === it.video_status))) }))
      .filter(g => g.items.length);

    listEl.innerHTML = groups.length ? groups.map(g => `
      <details class="libfam"${q || scope !== 'all' || onlySug || vFilter ? ' open' : ''}>
        <summary><span>${esc(g.family)} <span class="small muted">${g.items.length}</span></span>
          <span class="row" style="gap:6px"><button class="btn xs l_fam_sel" data-f="${esc(g.family)}">全選</button><button class="btn xs danger l_fam_del" data-f="${esc(g.family)}">移除整組</button></span></summary>
        <div class="libitems">${g.items.map(it => (editing === it.id ? editRow(it) : view(it))).join('')}</div>
      </details>`).join('') : '<p class="sec">沒有符合的動作。</p>';

    const refreshBulk = () => {
      bulk.hidden = !sel.size;
      $('#l_n', host).textContent = sel.size;
      $('#l_delsel', host).textContent = `移除選取的 ${sel.size} 個`;
    };
    refreshBulk();

    // 勾選不重畫清單，避免捲動位置跑掉
    $$('.l_ck', listEl).forEach(ck => ck.onchange = () => {
      const id = Number(ck.closest('.lib-item').dataset.id);
      ck.checked ? sel.add(id) : sel.delete(id);
      refreshBulk();
    });
    $$('.l_fam_sel', host).forEach(b => b.onclick = e => {
      e.preventDefault();
      const fam = b.dataset.f;
      allItems().filter(i => i.family === fam).forEach(i => sel.add(i.id));
      draw();
    });
    $$('.l_fam_del', host).forEach(b => b.onclick = async e => {
      e.preventDefault();
      const fam = b.dataset.f;
      const n = allItems().filter(i => i.family === fam).length;
      const grp = b.closest('.libfam'); if (grp) grp.hidden = true;
      undoable({ message: `已從動作庫移除「${fam}」整組 ${n} 個動作`,
        onCommit: async () => { await api(`/api/exercise-catalog?family=${encodeURIComponent(fam)}`, { method: 'DELETE' }); libraryPanel(host); },
        onRollback: () => { if (grp) grp.hidden = false; } });
    });
    wireThumbs(listEl);
    const itemById = id => allItems().find(i => i.id === id);
    const setVideo = async (id, body) => {
      await api(`/api/exercise-catalog?id=${id}`, { method: 'PUT', body });
      LIB = null; lib = await library(); draw(); drawVideoBar();
    };
    $$('.v_ok', listEl).forEach(b => b.onclick = async () => {
      const id = Number(b.closest('.vsug').dataset.id); const it = itemById(id);
      try { await setVideo(id, { video: it.video.id, video_title: it.video.title, video_channel: it.video.channel, video_seconds: it.video.seconds }); }
      catch (e) { err(e.message); }
    });
    $$('.v_next', listEl).forEach(b => b.onclick = async () => {
      const id = Number(b.closest('.vsug').dataset.id); const it = itemById(id);
      const alts = it.video_alts || []; if (!alts.length) return;
      const next = alts[0];
      // 換一支：把目前這支排到備選最後，讓教練可以繞一圈
      it.video_alts = [...alts.slice(1), { ...it.video }];
      it.video = { id: next.id, title: next.title, channel: next.channel, seconds: next.seconds };
      await api(`/api/exercise-catalog?id=${id}`, { method: 'PUT', body: { video: next.id, video_title: next.title, video_channel: next.channel, video_seconds: next.seconds } });
      await api(`/api/exercise-catalog?id=${id}`, { method: 'PUT', body: { video_status: 'pending' } });
      it.video_status = 'suggested';
      draw();
    });
    $$('.v_skip', listEl).forEach(b => b.onclick = async () => {
      const id = Number(b.closest('.vsug').dataset.id);
      try { await setVideo(id, { video_status: 'skip' }); } catch (e) { err(e.message); }
    });
    $$('.l_vid', listEl).forEach(b => b.onclick = async () => {
      const id = Number(b.closest('.lib-item').dataset.id); const it = itemById(id);
      const url = prompt(`「${it.name}」的示範影片\n貼 YouTube 網址（清空＝拿掉影片）`, it.video ? `https://youtu.be/${it.video.id}` : '');
      if (url === null) return;
      try { await setVideo(id, { video: url.trim(), video_title: '', video_channel: '' }); }
      catch (e) { err(e.message); }
    });
    // 搜不到的動作：自己換一組英文關鍵字再讓 AI 挑一次
    $$('.l_requery', listEl).forEach(b => b.onclick = async () => {
      const id = Number(b.closest('.lib-item').dataset.id); const it = itemById(id);
      const q = prompt(`「${it.name}」用什麼關鍵字去 YouTube 找？\n（AI 一樣會判斷是不是這個動作，不是就還是留空）`, it.name);
      if (!q || !q.trim()) return;
      b.dataset.state = 'loading'; b.disabled = true;
      try {
        const r = await api('/api/video-search', { method: 'POST', body: { id, auto: true, query: q.trim() } });
        if (r.done.length) toast(`找到：${r.done[0].video.title.slice(0, 30)}`);
        else toast(r.skipped[0]?.reason || r.failed[0]?.reason || '還是沒有合適的', { tone: 'error' });
        LIB = null; lib = await library(); draw(); drawVideoBar();
      } catch (e) { delete b.dataset.state; b.disabled = false; err(e.message); }
    });
    $$('.l_edit', host).forEach(b => b.onclick = () => { editing = Number(b.closest('.lib-item').dataset.id); draw(); });
    $$('.l_cancel', host).forEach(b => b.onclick = () => { editing = null; draw(); });
    $$('.l_save', host).forEach(b => b.onclick = async () => {
      const r = b.closest('.lib-row');
      try {
        await api(`/api/exercise-catalog?id=${r.dataset.id}`, { method: 'PUT', body: {
          name: $('.l_name', r).value, category: $('.l_cat', r).value, segment: $('.l_seg', r).value,
          sets: $('.l_sets', r).value, reps: $('.l_reps', r).value } });
        editing = null; libraryPanel(host);
      } catch (ex) { err(ex.message); }
    });
    $$('.l_del', host).forEach(b => b.onclick = async () => {
      const r = b.closest('.lib-item');
      const nm = $('.nm', r).textContent.trim();
      const id = r.dataset.id;
      r.hidden = true;
      undoable({ message: `已從動作庫移除「${nm}」`,
        onCommit: async () => { await api(`/api/exercise-catalog?id=${id}`, { method: 'DELETE' }); sel.delete(Number(id)); libraryPanel(host); },
        onRollback: () => { r.hidden = false; } });
    });
    const clr = $('#l_clear', host); if (clr) clr.onclick = () => { sel.clear(); draw(); };
    const dsel = $('#l_delsel', host); if (dsel) dsel.onclick = async () => {
      const ids = [...sel]; const n2 = ids.length;
      const rows = ids.map(i => $(`.lib-item[data-id="${i}"]`, host)).filter(Boolean);
      rows.forEach(r => r.hidden = true);
      undoable({ message: `已從動作庫移除 ${n2} 個動作`,
        onCommit: async () => { await api(`/api/exercise-catalog?ids=${ids.join(',')}`, { method: 'DELETE' }); sel.clear(); libraryPanel(host); },
        onRollback: () => rows.forEach(r => r.hidden = false) });
    };
    $('#l_add', host).onclick = async () => {
      const name = $('#l_new_name', host).value.trim();
      if (!name) return toast('請填動作名稱', { tone: 'error' });
      try {
        await api('/api/exercise-catalog', { method: 'POST', body: {
          name, category: $('#l_new_cat', host).value, segment: $('#l_new_seg', host).value,
          sets: $('#l_new_sets', host).value, reps: $('#l_new_reps', host).value } });
        libraryPanel(host);
      } catch (ex) { err(ex.message); }
    };
  };

  drawVideoBar();
  const qi = $('#l_q', host);
  qi.oninput = () => { q = qi.value.trim().toLowerCase(); draw(); };
  $$('#l_scope button', host).forEach(b => b.onclick = () => {
    scope = b.dataset.s;
    $$('#l_scope button', host).forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  });
  $$('#l_vfilter button', host).forEach(b => b.onclick = () => {
    vFilter = b.dataset.v;
    $$('#l_vfilter button', host).forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  });
  draw();
}

function groupsPanel(host, cd) {
  host.innerHTML = `${cd.groups.map(g => `<div class="row" style="justify-content:space-between"><span><b>${esc(g.name)}</b> <span class="small muted">${g.member_count ?? cd.athletes.filter(a => a.group_id === g.id).length} 人</span></span><span class="row"><button class="btn xs" data-ren="${g.id}">改名</button><button class="btn xs danger" data-gdel="${g.id}">刪</button></span></div>`).join('')}
    <div class="row"><input id="g_name" placeholder="新組別名稱，例：B班"><button class="btn sm" id="g_add">＋ 新增</button></div>`;
  $('#g_add', host).onclick = async () => { const name = $('#g_name', host).value.trim(); if (!name) return; await api('/api/groups', { method: 'POST', body: { name } }); C.athletes = null; renderCoach(); };
  $$('[data-ren]', host).forEach(b => b.onclick = async () => { const g = cd.groups.find(x => String(x.id) === b.dataset.ren); const name = prompt('新名稱', g.name); if (!name) return; await api(`/api/groups?id=${g.id}`, { method: 'PUT', body: { name, notes: g.notes || '' } }); C.athletes = null; renderCoach(); });
  $$('[data-gdel]', host).forEach(b => b.onclick = () => {
    const chip = b.closest('.chip'); const id = b.dataset.gdel;
    if (chip) chip.hidden = true;
    undoable({ message: '已刪除組別，成員變成無組別（課表保留）',
      onCommit: async () => { await api(`/api/groups?id=${id}`, { method: 'DELETE' }); C.athletes = null; renderCoach(); },
      onRollback: () => { if (chip) chip.hidden = false; } });
  });
}

async function blocksPanel(host, cd) {
  const owners = [...cd.groups.map(g => ({ k: `group:${g.id}`, l: `組別：${g.name}` })), ...cd.athletes.map(a => ({ k: `athlete:${a.id}`, l: `個人：${a.nickname}` }))];
  let ownerKey = localStorage.getItem('ytp-owner') || owners[0]?.k || '';
  const draw = async () => {
    const [ot, oid] = ownerKey.split(':');
    const r = await api(`/api/blocks?owner_type=${ot}&owner_id=${oid}`);
    host.innerHTML = `<div class="row"><select id="owner">${opt(owners, ownerKey, o => o.l, o => o.k)}</select><button class="btn sm" id="bnew">＋ 新 block</button><button class="btn sm ghost" id="snew">＋ 季</button></div>
      ${r.seasons.length ? `<div class="chips">${r.seasons.map(s => `<span class="chip">季：${esc(s.title)} ${fmtDate(s.start_date)}–${fmtDate(s.end_date)} <button class="btn xs ghost" data-sdel="${s.id}">×</button></span>`).join('')}</div>` : ''}
      <div id="blist">${r.blocks.length ? r.blocks.map(b => `<details class="section" style="box-shadow:none"><summary><span>${esc(b.title)} <span class="small muted">${b.start_date || '?'} → ${b.end_date || '?'} · ${CAT_LABEL[b.main_axis]} · ${b.exercises.length} 動作</span></span></summary><div class="body"><div class="row"><button class="btn sm" data-bedit="${b.id}">編輯</button><button class="btn sm" data-bcopy="${b.id}">複製成新 block</button><button class="btn sm danger" data-bdel="${b.id}">刪除</button></div>${planGrid(b, null)}</div></details>`).join('') : '<p class="sec">還沒有 block。從範本開始最快。</p>'}</div>
      <div id="bedit"></div>`;
    $('#owner', host).onchange = e => { ownerKey = e.target.value; localStorage.setItem('ytp-owner', ownerKey); draw(); };
    $('#snew', host).onclick = async () => { const title = prompt('季名稱（例：2026 秋季）'); if (!title) return; const start = prompt('開始日 YYYY-MM-DD', today()); const end = prompt('結束日 YYYY-MM-DD', ''); await api('/api/seasons', { method: 'POST', body: { owner_type: ot, owner_id: oid, title, start_date: start, end_date: end } }); draw(); };
    $$('[data-sdel]', host).forEach(b => b.onclick = () => {
      const chip = b.closest('.chip'); const id = b.dataset.sdel;
      if (chip) chip.hidden = true;
      undoable({ message: '已刪除這個季（block 保留）',
        onCommit: async () => { await api(`/api/seasons?id=${id}`, { method: 'DELETE' }); draw(); },
        onRollback: () => { if (chip) chip.hidden = false; } });
    });
    const edit = (draft) => { blockEditor($('#bedit', host), draft, { seasons: r.seasons }, () => draw()); $('#bedit', host).scrollIntoView({ behavior: 'smooth' }); };
    $('#bnew', host).onclick = async () => {
      const t = await templates();
      const pick = prompt(`從範本開始？輸入編號，留空＝空白\n${t.blocks.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`);
      const tpl = pick ? t.blocks[parseInt(pick, 10) - 1] : null;
      edit(tpl ? { ...tpl, id: undefined, owner_type: ot, owner_id: oid, start_date: '', end_date: '', exercises: tpl.exercises.map(e => ({ ...e, id: undefined })) } : { owner_type: ot, owner_id: oid, title: '', weeks: 6, exercises: [] });
    };
    $$('[data-bedit]', host).forEach(b => b.onclick = () => edit(r.blocks.find(x => String(x.id) === b.dataset.bedit)));
    $$('[data-bcopy]', host).forEach(b => b.onclick = () => { const src = r.blocks.find(x => String(x.id) === b.dataset.bcopy); edit({ ...src, id: undefined, title: src.title + '（複製）', start_date: '', end_date: '', exercises: src.exercises.map(e => ({ ...e, id: undefined })) }); });
    $$('[data-bdel]', host).forEach(b => b.onclick = () => {
      const chip = b.closest('.chip'); const id = b.dataset.bdel;
      if (chip) chip.hidden = true;
      undoable({ message: '已刪除 block',
        onCommit: async () => { await api(`/api/blocks?id=${id}`, { method: 'DELETE' }); draw(); },
        onRollback: () => { if (chip) chip.hidden = false; } });
    });
  };
  if (ownerKey) draw(); else host.innerHTML = '<p class="sec">先建立學員或組別。</p>';
}

function importPanel(host) {
  const savedUrl = localStorage.getItem('ytp-sheet-url') || '';
  host.innerHTML = `<p class="small sec">Google Sheet 一列＝一堂課，欄位：<b>日期 | 對象（組別或 ID）| 主軸 | 時長 | Raise | Activation | Mobilize | Potentiation | 主訓練 | RPE | 備註</b>（Activation／Mobilize 也可以合成舊的一欄 A&amp;M）。主訓練寫「照計畫」會自動帶入當週處方；偏離寫成「動作 劑量@負荷」逗號分隔；缺席在備註寫「缺席: ID」。</p>
    <label class="field">Sheet 發布的 CSV 連結（檔案 → 共用 → 發布到網路 → CSV）<input id="i_url" value="${esc(savedUrl)}" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"></label>
    <div class="row"><button class="btn primary sm" id="i_fetch">抓取並預覽</button><span class="small muted">或直接貼上表格文字 ↓</span></div>
    <textarea id="i_text" placeholder="從 Sheet 複製（含標題列）貼這裡" style="min-height:80px"></textarea>
    <div class="row"><button class="btn sm" id="i_parse">解析貼上內容</button></div>
    <div id="i_prev"></div>`;
  const preview = (r) => {
    const pv = $('#i_prev', host);
    if (!r.drafts.length) { pv.innerHTML = '<p class="msg err">沒有解析到任何列。</p>'; return; }
    pv.innerHTML = `<div class="scroll-x"><table class="tbl"><thead><tr><th>寫入</th><th>日期</th><th>學員</th><th>block/週</th><th>主軸</th><th>動作</th><th>提醒</th></tr></thead><tbody>
      ${r.drafts.map((d, i) => d.error ? `<tr><td></td><td colspan="6" class="msg err">第 ${d.row} 列：${esc(d.error)}</td></tr>` : `<tr><td><input type="checkbox" data-i="${i}" ${d.skip ? '' : 'checked'}></td><td class="tabular">${d.session_date}</td><td>${esc(d.nickname)}</td><td class="small">${esc(d.block_title || '—')}${d.week_no ? ` W${d.week_no}` : ''}</td><td>${CAT_LABEL[d.main_axis]}</td><td class="small">${d.exercises.map(e => `${esc(e.name)} ${esc(e.dose)}${e.load_kg != null ? '@' + e.load_kg : ''}`).join('、') || '—'}</td><td class="small" style="color:var(--warn)">${d.duplicate ? '⚠ 同日已有紀錄 ' : ''}${d.warnings.map(esc).join('；')}</td></tr>`).join('')}
    </tbody></table></div><div class="row" style="justify-content:flex-end"><button class="btn primary" id="i_commit">寫入勾選的 ${r.drafts.filter(d => !d.error && !d.skip).length} 筆</button></div>`;
    $('#i_commit', pv).onclick = async () => {
      $$('input[data-i]', pv).forEach(cb => { r.drafts[Number(cb.dataset.i)].skip = !cb.checked; });
      const res = await api('/api/import', { method: 'POST', body: { drafts: r.drafts, commit: true } });
      const ok = (res.results || []).filter(x => x.id).length; toast(`已寫入 ${ok} 堂`); pv.innerHTML = `<p class="msg ok">已寫入 ${ok} 堂課。</p>`; C.athletes = null;
    };
  };
  $('#i_fetch', host).onclick = async () => { const url = $('#i_url', host).value.trim(); if (!url) return; localStorage.setItem('ytp-sheet-url', url); $('#i_prev', host).innerHTML = '<p class="muted">抓取中…</p>'; try { preview(await api('/api/import', { method: 'POST', body: { csv_url: url } })); } catch (e) { $('#i_prev', host).innerHTML = `<p class="msg err">${esc(e.message)}</p>`; } };
  $('#i_parse', host).onclick = async () => { const text = $('#i_text', host).value; if (!text.trim()) return; try { preview(await api('/api/import', { method: 'POST', body: { text } })); } catch (e) { $('#i_prev', host).innerHTML = `<p class="msg err">${esc(e.message)}</p>`; } };
}

async function targetsPanel(host) {
  const r = await api('/api/stage-targets'); const T = r.targets;
  host.innerHTML = `<p class="small sec">每階段七項加總 100%。門檻分鐘 = 200 × 比重。改完按儲存，所有學員的塔與圖立即套用。</p>
    <div class="scroll-x"><table class="tbl"><thead><tr><th>能力</th>${['pre', 'circa', 'post'].map(s => `<th class="r">${STAGE_LABEL[s].split('（')[0]}</th>`).join('')}<th class="r">容忍 ±</th></tr></thead><tbody>
    ${CATS.map(c => `<tr><td style="white-space:nowrap">${CAT_LABEL[c]}</td>${['pre', 'circa', 'post'].map(s => `<td class="r"><input data-s="${s}" data-c="${c}" type="number" value="${T[s]?.[c]?.target ?? ''}" style="width:52px;text-align:right;padding:5px 6px"></td>`).join('')}<td class="r"><input data-tol="${c}" type="number" value="${T.pre?.[c]?.tol ?? 5}" style="width:48px;text-align:right;padding:5px 6px"></td></tr>`).join('')}
    </tbody></table></div><div class="row" style="justify-content:flex-end"><button class="btn primary sm" id="t_save">儲存</button></div>`;
  $('#t_save', host).onclick = async () => {
    const rows = [];
    for (const s of ['pre', 'circa', 'post']) for (const c of CATS) rows.push({ stage: s, category: c, target_pct: $(`input[data-s="${s}"][data-c="${c}"]`, host).value, tolerance_pct: $(`input[data-tol="${c}"]`, host).value });
    await api('/api/stage-targets', { method: 'PUT', body: { rows } });
  };
}

window.viewTools = viewTools; window.renderCoach = renderCoach; window.sessionForm = sessionForm; window.goalEditor = goalEditor;
