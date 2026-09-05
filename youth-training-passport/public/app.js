/* 訓練護照 v2 — 前端核心：路由、API、公開頁（首頁 / 護照四分頁） */
'use strict';

const CATS = ['fms', 'strength', 'power', 'plyo', 'saq', 'energy', 'mobility'];
const CAT_LABEL = { fms: '基礎動作', strength: '肌力', power: '爆發力', plyo: '增強式', saq: '速度敏捷', energy: '能量系統', mobility: '活動度' };
const AXES = ['strength', 'saq', 'plyo', 'power', 'energy'];
const STAGE_LABEL = { pre: 'Pre-PHV（9–12）', circa: 'Circa-PHV（12–15）', post: 'Post-PHV（15–18）' };
const TIER_LABEL = { gold: '金', silver: '銀', rainbow: '彩虹' };
const REASON_LABEL = { level_up: '等級升級', breakthrough: '技術突破', attitude: '態度', other: '其他' };
/* 一堂課的五個板塊 A–E：安排與紀錄共用 */
const SEGS = ['raise', 'activation', 'mobilize', 'pot', 'main'];
const SEG = {
  raise: { letter: 'A', label: 'Raise', zh: '升溫', color: 'var(--c-saq)', ink: 'var(--c-saq-on)', min: 'raise_min', types: 'raise_types', def: 5 },
  activation: { letter: 'B', label: 'Activation', zh: '肌群啟動', color: 'var(--c-strength)', ink: 'var(--c-strength-on)', min: 'act_min', types: 'act_types', def: 4 },
  mobilize: { letter: 'C', label: 'Mobilize', zh: '活動度', color: 'var(--c-mobility)', ink: 'var(--c-mobility-on)', min: 'mob_min', types: 'mob_types', def: 4 },
  pot: { letter: 'D', label: 'Potentiation', zh: '激發', color: 'var(--c-power)', ink: 'var(--c-power-on)', min: 'pot_min', types: 'pot_types', def: 5 },
  main: { letter: 'E', label: 'Main Training', zh: '主訓練', color: 'var(--accent)', ink: 'var(--accent-ink)', min: 'main_min', types: null, def: null },
};
const SEG_LABEL = Object.fromEntries(SEGS.map(s => [s, `${SEG[s].letter} · ${SEG[s].label}`]));
const segVars = k => `--seg:${SEG[k].color};--seg-ink:${SEG[k].ink}`;

/* 內建頭像：五種小小運動員，用能力色系畫，深淺色都看得清楚 */
const AVATARS = {
  p1: { label: '衝刺', c: 'var(--c-saq)', d: '<circle cx="32" cy="19" r="9"/><path d="M32 29c-7 0-11 5-12 11l-6 12 6 3 6-11 1 12-9 12 5 4 12-14 1-9 8 7 9-2-1-6-8 1-4-9c-2-5-5-11-8-11z"/>' },
  p2: { label: '舉重', c: 'var(--c-strength)', d: '<circle cx="32" cy="17" r="9"/><path d="M14 30h36v6H14z"/><rect x="8" y="24" width="6" height="18" rx="2"/><rect x="50" y="24" width="6" height="18" rx="2"/><path d="M26 38h12v18h-6l-1-9-1 9h-4z"/>' },
  p3: { label: '跳躍', c: 'var(--c-power)', d: '<circle cx="34" cy="15" r="8"/><path d="M34 24c-6 0-9 4-11 9l-8 6 4 6 9-7 2 8-8 13 6 4 11-16 1-10 7 6 8-3-2-6-6 2-5-8c-2-4-4-4-8-4z"/>' },
  p4: { label: '平衡', c: 'var(--c-fms)', d: '<circle cx="32" cy="16" r="8"/><path d="M32 25c-4 0-6 3-6 7v8H12v6h14l-6 14h7l5-12 5 12h7l-6-14h14v-6H38v-8c0-4-2-7-6-7z"/>' },
  p5: { label: '翻滾', c: 'var(--c-mobility)', d: '<circle cx="32" cy="32" r="19" fill="none" stroke-width="5"/><circle cx="32" cy="20" r="6"/><path d="M25 40c2-6 5-9 9-9s7 4 8 9c-5 3-12 3-17 0z"/>' },
};
function avatarHtml(a, cls = 'avatar') {
  const v = a?.avatar || '';
  if (v.startsWith('data:')) return `<span class="${cls} pic"><img src="${esc(v)}" alt=""></span>`;
  const p = AVATARS[v];
  if (p) return `<span class="${cls} art" style="--av:${p.c}"><svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor" stroke="currentColor">${p.d}</g></svg></span>`;
  return `<span class="${cls}">${esc(a?.avatar_initial || (a?.nickname || '').slice(0, 1))}</span>`;
}
/* ---------- 動作示範影片：只存 YouTube 影片 ID，縮圖與播放都用官方網址 ---------- */
const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const fmtDur = s => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
/** 有影片就畫縮圖，沒有就畫一個灰底佔位 */
function thumbHtml(v, cls = 'thumb') {
  if (!v || !v.id) return `<span class="${cls} empty" aria-hidden="true"></span>`;
  return `<button type="button" class="${cls}" data-vid="${esc(v.id)}" data-vtitle="${esc(v.title || '')}" title="看示範">
    <img src="${ytThumb(v.id)}" alt="" loading="lazy"><span class="play" aria-hidden="true">▶</span></button>`;
}
/** 播放器：YouTube 官方 iframe（nocookie），符合條款也不用自己存影片 */
function playVideo(id, title) {
  const m = document.createElement('div');
  m.className = 'modal video';
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true">
    <div class="card-head"><div class="card-title">${esc(title || '動作示範')}</div><button class="btn sm ghost" id="v_x">關閉</button></div>
    <div class="vwrap"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1"
      title="${esc(title || '動作示範')}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>
    <a class="small" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">在 YouTube 開啟 ↗</a></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  $('#v_x', m).onclick = close;
  m.onclick = e => { if (e.target === m) close(); };
}
/** 把容器裡所有縮圖接上播放器（重繪後呼叫一次即可） */
function wireThumbs(root = document) {
  $$('[data-vid]', root).forEach(b => {
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); playVideo(b.dataset.vid, b.dataset.vtitle); };
    // 影片被下架時縮圖會 404，退回成一顆點，不要留一個破圖框
    const img = $('img', b);
    if (img) img.onerror = () => b.classList.add('dead');
  });
}

const doseText = e => {
  const body = e.sets && e.reps ? `${e.sets} × ${e.reps}` : (e.sets ? `${e.sets} 組` : (e.reps || e.dose || ''));
  return e.load_kg != null && e.load_kg !== '' ? `${body}${body ? ' ' : ''}@${e.load_kg}kg` : body;
};
const splitDose = d => {
  const s = String(d || '').trim();
  if (!s || s === '✓') return { sets: null, reps: '' };
  const m = s.match(/^(\d+)\s*[x×*]\s*(.+)$/i);
  return m ? { sets: parseInt(m[1], 10), reps: m[2].trim() } : { sets: null, reps: s };
};
const TOKEN_KEY = 'ytp-coach-token';

const S = { token: localStorage.getItem(TOKEN_KEY) || '', coach: false, tab: 'tower', pp: null, id: '', dist: 'stage' };

/* ---------- utils ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const catColor = c => `var(--c-${c})`;
const catVars = c => `--c:var(--c-${c});--c-deep:var(--c-${c}-deep)`;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? d.replace(/^\d{4}-/, '').replace('-', '/') : '';
const round1 = n => Math.round(n * 10) / 10;

/* ---------- toast ----------
 * 政策：靜默成功。畫面已經重繪、使用者看得到結果的動作 → 不出 toast。
 * 只有三種情況說話：失敗、看不見的非同步結果、可以復原的動作（附 Undo）。 */
function toast(msg, opt = {}) {
  const host = $('#toasts'); if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast' + (opt.tone === 'error' ? ' err' : '');
  el.innerHTML = `<span class="tmsg"></span>`;
  $('.tmsg', el).textContent = msg;
  let timer = null;
  const dismiss = () => { clearTimeout(timer); el.remove(); };
  if (opt.action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tact'; b.textContent = opt.action.label;
    b.onclick = () => { dismiss(); opt.action.run(); };
    el.appendChild(b);
  }
  host.appendChild(el);
  // 有 Undo 的留久一點；純錯誤訊息 4 秒
  const ms = opt.ms ?? (opt.action ? 8000 : 4000);
  timer = setTimeout(dismiss, ms);
  el.onmouseenter = () => clearTimeout(timer);
  el.onmouseleave = () => { timer = setTimeout(dismiss, 2000); };
  return dismiss;
}
const failToast = e => toast(e && e.message ? e.message : '操作沒成功，再試一次', { tone: 'error' });

/* 可復原的破壞性動作：先從畫面拿掉，給 8 秒 Undo，逾時才真的送出 DELETE。
 * 取代「reversible action 前面擋一個 confirm()」這個反模式。 */
function undoable({ message, onCommit, onRollback }) {
  let cancelled = false;
  const commit = async () => {
    if (cancelled) return;
    try { await onCommit(); }
    catch (e) { onRollback && onRollback(); failToast(e); }
  };
  const timer = setTimeout(commit, 8000);
  toast(message, {
    ms: 8000,
    action: { label: '復原', run: () => { cancelled = true; clearTimeout(timer); onRollback && onRollback(); } },
  });
}

/* 真的不可逆、會連鎖刪除的動作：不用原生 confirm，要求打出名稱。
 * 可逆的動作一律走 undoable()，不要擋彈窗。 */
function confirmDestructive({ title, detail, phrase, confirmLabel = '刪除', onConfirm }) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="cd_t">
    <h3 id="cd_t">${esc(title)}</h3>
    <p class="sec small">${detail}</p>
    <label class="field full">要確認的話，打出 <b>${esc(phrase)}</b>
      <input id="cd_in" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(phrase)}"></label>
    <p id="cd_err" class="msg err" hidden></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" id="cd_x">取消</button>
      <button class="btn danger" id="cd_go" disabled>${esc(confirmLabel)}</button></div></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  const input = $('#cd_in', m), go = $('#cd_go', m);
  input.oninput = () => { go.disabled = input.value.trim() !== phrase; };
  $('#cd_x', m).onclick = close;
  go.onclick = async () => {
    go.dataset.state = 'loading'; go.disabled = true;
    try { await onConfirm(); close(); }
    catch (e) {
      delete go.dataset.state; go.disabled = false;
      const el = $('#cd_err', m); el.textContent = e.message; el.hidden = false;
    }
  };
  input.focus();
}

async function api(path, opt = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opt.headers || {}) };
  if (S.token) headers.Authorization = `Bearer ${S.token}`;
  const res = await fetch(path, { ...opt, headers, body: opt.body != null && typeof opt.body !== 'string' ? JSON.stringify(opt.body) : opt.body });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.token && !path.startsWith('/api/auth')) { setToken(''); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
function setToken(t) { S.token = t; S.coach = !!t; if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
async function checkToken() { if (!S.token) { S.coach = false; return; } try { await api('/api/auth'); S.coach = true; } catch { setToken(''); } }

function askPassword(onOk) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card"><h3>教練登入</h3><p class="sec small">輸入教練密碼解鎖編輯功能。</p>
    <input id="pw" type="password" placeholder="密碼" autocomplete="current-password"><p id="pwerr" class="msg err" hidden></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" id="pwcancel">取消</button><button class="btn primary" id="pwok">登入</button></div></div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  $('#pwcancel', m).onclick = close;
  const go = async () => {
    try { const r = await api('/api/auth', { method: 'POST', body: { password: $('#pw', m).value } }); setToken(r.token); close(); onOk && onOk(); }
    catch (e) { const el = $('#pwerr', m); el.textContent = '密碼不對，再試一次'; el.hidden = false; }
  };
  $('#pwok', m).onclick = go; $('#pw', m).onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#pw', m).focus();
}
function logout() { setToken(''); route(); }

/* ---------- router ---------- */
function route() {
  const h = location.hash || '#/';
  // 教練後台是密度優先的工作台 → 給桌面寬版；護照維持單欄的閱讀寬度
  $('#app').classList.toggle('wide', h.startsWith('#/coach'));
  // 首頁是全出血的 landing，其他頁維持固定寬的閱讀欄
  $('#app').classList.toggle('home', !h.startsWith('#/coach') && !/^#\/p\//.test(h));
  const m = h.match(/^#\/p\/([^/?]+)/);
  if (m) return renderPassport(decodeURIComponent(m[1]));
  if (h.startsWith('#/coach')) return window.renderCoach ? renderCoach() : renderHome();
  renderHome();
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => { await checkToken(); route(); });

/* ---------- home ---------- */
function renderHome() {
  const app = $('#app');
  let lastId = '', lastName = '', opens = 0;
  try {
    lastId = localStorage.getItem('ytp-last-id') || '';
    lastName = localStorage.getItem('ytp-last-name') || '';
    opens = parseInt(localStorage.getItem('ytp-open-count') || '0', 10) || 0;
  } catch { /* 隱私模式：當第一次來 */ }
  const returning = !!(lastId && lastName);

  app.innerHTML = `
    <main class="lp-stage">
      <picture>
        <source media="(max-width:640px)" srcset="assets/hero-portrait.jpg">
        <img class="lp-hero" src="assets/hero-wide.jpg"
             alt="小小運動員站在最前方，八位世界運動選手層層堆疊在他們身後的陽光裡">
      </picture>

      <header class="lp-top">
        <a class="lp-brand" href="#/"><img src="assets/logo.png" alt=""><b>訓練護照</b></a>
        ${S.coach
          ? `<span class="row"><a class="lp-link" href="#/coach">教練後台</a><button class="lp-link" type="button" id="logout">登出</button></span>`
          : `<button class="lp-link" type="button" id="coachbtn">教練登入</button>`}
      </header>

      <div class="lp-head">
        <span class="lp-eyebrow">Youth Training Passport</span>
        <h1>你的訓練，一塊一塊蓋起來。</h1>
        <p>輸入教練給你的護照編號，蓋下屬於你的那個章。</p>
      </div>

      <div class="lp-foot">
        <button class="lp-seal" id="seal" type="button" ${returning ? '' : 'disabled'}
                aria-describedby="lphint"
                aria-label="${returning ? `長按印章，開啟 ${esc(lastName)} 的護照` : '長按印章開啟護照'}">
          <span class="lp-burst" aria-hidden="true">
            <span class="flash"></span>
            <span class="rays"></span>
            <svg class="ribbons" viewBox="-100 -100 200 200" aria-hidden="true">
              <path style="rotate:0deg;   animation-delay:60ms"  d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:45deg;  animation-delay:96ms"  d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:90deg;  animation-delay:72ms"  d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:135deg; animation-delay:120ms" d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:180deg; animation-delay:84ms"  d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:225deg; animation-delay:132ms" d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:270deg; animation-delay:66ms"  d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
              <path style="rotate:315deg; animation-delay:108ms" d="M10 3C31-13 59-26 95-24 71-6 41 9 12 9Z"></path>
            </svg>
          </span>
          <span class="ink" aria-hidden="true"></span>
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="track" cx="50" cy="50" r="47"></circle>
            <circle class="bar"   cx="50" cy="50" r="47"></circle>
          </svg>
          <span class="body">
            <span class="name" id="sealName">${returning ? esc(lastName) : ''}</span>
          </span>
          <span class="sparks" id="sparks" aria-hidden="true"></span>
        </button>

        <p class="lp-hint" id="lphint" role="status" aria-live="polite"></p>

        <form class="lp-enter" id="sf" autocomplete="off" ${returning ? 'hidden' : ''}>
          <input id="sid" inputmode="latin" autocapitalize="off" autocorrect="off" spellcheck="false"
                 placeholder="Ig9yNWU0sD23" aria-label="護照編號" value="${esc(lastId)}">
          <button type="submit">查詢</button>
        </form>
        ${returning ? `<button class="lp-flag" type="button" id="switchid">不是 ${esc(lastName)}？換一個編號</button>` : ''}
      </div>
    </main>

    <div class="page-in">
      <div class="folio"><div class="folio-title">塔是怎麼蓋的？</div>
        <p class="sec small">每堂課的時間會依「基礎動作、肌力、爆發力、增強式、速度敏捷、能量系統、活動度」七種能力分配。某一種能力累積到門檻分鐘數，就長出一塊那個顏色的方塊。一個 block（4–6 週）結束會畫一條完成線。教練看到你有突破，會額外送金、銀或彩虹方塊。</p>
        <div class="legend">${CATS.map(c => `<span><i style="background:${catColor(c)}"></i>${CAT_LABEL[c]}</span>`).join('')}</div></div>
      <footer class="colophon">訓練護照 · Youth Training Passport　—　方塊塔以七項能力的累積分鐘數換算；門檻＝200 分鐘 × 該階段目標比重。金／銀／彩虹方塊由教練依突破頒發，不計入科學圖。<br>資料由教練登錄，家長與學員為唯讀。編號請向教練索取。</footer>
    </div>`;

  wireLanding({ lastId, lastName, opens, returning });

  const cb = $('#coachbtn'); if (cb) cb.onclick = () => askPassword(() => { location.hash = '#/coach'; });
  const lo = $('#logout'); if (lo) lo.onclick = logout;
}

/* ---------- landing 的蓋章互動 ----------
 * 規格見 BRAND.md §5：長按 1.6 秒、三重回饋、第 3 次之後改短按。
 * 唯一鍵永遠是 public_id，名字只做刻印。 */
const HOLD_MS = 1600;
const SKIP_AFTER = 3;

function wireLanding(init) {
  const seal = $('#seal'), nameEl = $('#sealName'), hint = $('#lphint');
  const form = $('#sf'), input = $('#sid');
  if (!seal) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st = { id: init.lastId, name: init.lastName, opens: init.opens, holding: false, raf: 0, p: 0, done: false };
  const shortcut = () => reduce || st.opens >= SKIP_AFTER;

  const setP = v => { st.p = v; seal.style.setProperty('--p', v.toFixed(4)); };
  const say = (msg, warn) => { hint.textContent = msg; hint.classList.toggle('warn', !!warn); };

  say(init.returning
    ? (shortcut() ? '輕觸印章即可進入' : `歡迎回來，${init.lastName}。按住印章 1.6 秒`)
    : '先輸入護照編號');

  /* 查編號 → 章上刻名字。查不到就照實說，不要靜默失敗。 */
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) { say('先填教練給你的編號', true); input.focus(); return; }
    say('查詢中…');
    try {
      const pp = await api(`/api/passport?id=${encodeURIComponent(v)}`);
      engrave(pp.athlete.public_id, pp.athlete.nickname || pp.athlete.public_id);
    } catch {
      say('這個編號查不到。跟教練確認一下有沒有打錯', true);
      input.setAttribute('aria-invalid', 'true'); input.focus();
    }
  };
  if (input) input.oninput = () => { input.removeAttribute('aria-invalid'); };

  const sw = $('#switchid');
  if (sw) sw.onclick = () => {
    try { localStorage.removeItem('ytp-last-name'); } catch {}
    renderHome();
  };

  function engrave(id, name) {
    st.id = id; st.name = name;
    nameEl.textContent = name;
    seal.disabled = false;
    seal.setAttribute('aria-label', `長按印章，開啟 ${name} 的護照`);
    if (form) form.hidden = true;
    say(shortcut() ? '輕觸印章即可進入' : '按住印章 1.6 秒，蓋下你的章');
  }

  /* 呼吸法餘燼：向外飛散並略微上飄 */
  function emberBurst() {
    if (reduce) return;
    const box = $('#sparks');
    box.textContent = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + (Math.random() - .5) * .28;
      const dist = 78 + Math.random() * 86;
      const el = document.createElement('i');
      el.style.setProperty('--x', `${(Math.cos(a) * dist).toFixed(1)}px`);
      el.style.setProperty('--y', `${(Math.sin(a) * dist - 22).toFixed(1)}px`);
      el.style.setProperty('--s', `${(2.5 + Math.random() * 3.5).toFixed(1)}px`);
      el.style.setProperty('--t', `${(40 + Math.random() * 190).toFixed(0)}ms`);
      el.style.setProperty('--dur', `${(720 + Math.random() * 460).toFixed(0)}ms`);
      frag.appendChild(el);
    }
    box.appendChild(frag);
    setTimeout(() => { if (box.isConnected) box.textContent = ''; }, 1500);
  }

  function start(e) {
    if (seal.disabled || st.done) return;
    if (e && e.type === 'pointerdown' && e.button !== 0) return;
    if (shortcut()) { finish(); return; }
    if (st.holding) return;
    st.holding = true;
    seal.classList.remove('nudge');
    const t0 = performance.now() - st.p * HOLD_MS;
    cancelAnimationFrame(st.raf);
    const step = now => {
      if (!st.holding) return;
      const p = Math.min(1, (now - t0) / HOLD_MS);
      setP(p);
      if (p >= 1) { st.holding = false; finish(); return; }
      st.raf = requestAnimationFrame(step);
    };
    step(performance.now());
  }

  function release() {
    if (!st.holding || st.done) return;
    st.holding = false;
    cancelAnimationFrame(st.raf);
    if (st.p < 0.06) {                       // 幾乎等於短按
      setP(0);
      seal.classList.remove('nudge');
      void seal.offsetWidth;
      seal.classList.add('nudge');
      say('按住不放，別鬆手', true);
      return;
    }
    say('差一點 —— 再按久一點', true);        // 讓「差一點」被看見
    const from = st.p, t0 = performance.now(), dur = 260;
    const back = now => {
      const k = Math.min(1, (now - t0) / dur);
      setP(from * (1 - k * k));
      if (k < 1) st.raf = requestAnimationFrame(back); else setP(0);
    };
    st.raf = requestAnimationFrame(back);
  }

  function finish() {
    st.done = true;
    setP(1);
    seal.classList.add('done');
    emberBurst();
    say('已蓋章 · 開啟護照');
    try {
      localStorage.setItem('ytp-last-id', st.id);
      localStorage.setItem('ytp-last-name', st.name);
      localStorage.setItem('ytp-open-count', String(st.opens + 1));
    } catch { /* 隱私模式：不記就算了 */ }
    setTimeout(() => { location.hash = `#/p/${encodeURIComponent(st.id)}`; }, reduce ? 0 : 620);
  }

  // 第三層：iOS 還是可能在長按時想跳選單，touchstart 擋掉預設行為。
  // passive:false 才擋得住；pointer 事件不受影響，長按邏輯照跑。
  seal.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  seal.addEventListener('pointerdown', start);
  seal.addEventListener('pointerup', release);
  seal.addEventListener('pointercancel', release);
  seal.addEventListener('pointerleave', release);
  seal.addEventListener('contextmenu', e => e.preventDefault());
  seal.addEventListener('keydown', e => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault(); if (e.repeat) return; start(e);
  });
  seal.addEventListener('keyup', e => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault(); release();
  });
  seal.addEventListener('blur', release);
}

/* ---------- passport ---------- */
async function loadPassport(id) {
  const pp = await api(`/api/passport?id=${encodeURIComponent(id)}`);
  S.pp = pp; S.id = pp.athlete.public_id; localStorage.setItem('ytp-last-id', pp.athlete.public_id);
  return pp;
}

async function renderPassport(id, keepTab = false) {
  const app = $('#app');
  if (!keepTab || S.id !== id) app.innerHTML = '<p class="muted">載入中…</p>';
  let pp;
  try { pp = await loadPassport(id); }
  catch (e) {
    app.innerHTML = `<div class="topbar"><a class="brand" href="#/"><img src="assets/logo.png" alt="">訓練護照</a></div><div class="card"><h3>找不到這個 ID</h3><p class="sec">「${esc(id)}」不存在，確認一下教練給你的 ID 有沒有打錯（大小寫不分）。</p><a class="btn" href="#/">回首頁</a></div>`;
    return;
  }
  const a = pp.athlete;
  const tabs = [['tower', '我的塔'], ['dist', '分布圖'], ['goal', '中期目標'], ['log', '紀錄'], ['growth', '成長']];
  if (S.coach) tabs.push(['tools', '教練工具']);
  if (S.tab === 'plan') S.tab = 'goal';
  if (!tabs.some(t => t[0] === S.tab)) S.tab = 'tower';
  const age = a.birth_year ? `${new Date().getFullYear() - a.birth_year} 歲` : '';
  app.innerHTML = `
    <div class="topbar"><a class="brand" href="#/"><img src="assets/logo.png" alt="">訓練護照</a>
      ${S.coach ? `<span class="row"><a class="btn sm" href="#/coach">教練後台</a><button class="btn sm ghost" id="logout">登出</button></span>` : `<button class="btn sm ghost" id="coachbtn">教練登入</button>`}</div>
    <div class="header">
      <div class="header-text"><div class="eyebrow"><span class="mono">${esc(a.public_id)}</span>${pp.current_block ? ` · ${esc(pp.current_block.title)}` : ''}</div>
        <h1 class="header-name">${esc(a.nickname)}</h1>
        <div class="header-sub"><span>${esc(STAGE_LABEL[a.stage] || a.stage)}</span>${age ? `<span>${age}</span>` : ''}${a.group ? `<span>${esc(a.group.name)}</span>` : ''}</div></div>
      ${avatarHtml(a)}</div>
    ${goalBanner(pp)}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab ${['plan', 'tools'].includes(k) ? 'coach' : ''}" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${l}</button>`).join('')}</div>
    <div id="tabbody"></div>
    <footer class="colophon">護照 <b>${esc(a.public_id)}</b> · ${esc(STAGE_LABEL[a.stage] || a.stage)}${a.group ? ` · ${esc(a.group.name)}` : ''} · 已記錄 ${pp.session_count} 堂 / ${pp.total_minutes} 分鐘 · 方塊 ${pp.brick_total} 塊<br>訓練護照 · Youth Training Passport — 由教練登錄，家長與學員唯讀。</footer>`;
  $$('.tab').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; $$('.tab').forEach(x => x.setAttribute('aria-selected', x === b)); renderTab(); });
  const gb = $('#gb_set'); if (gb) gb.onclick = () => { S.tab = 'goal'; $$('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === 'goal')); renderTab(); };
  const cb = $('#coachbtn'); if (cb) cb.onclick = () => askPassword(() => renderPassport(id, true));
  const lo = $('#logout'); if (lo) lo.onclick = logout;
  renderTab();
}

function renderTab() {
  const body = $('#tabbody'); const pp = S.pp;
  const fn = { tower: viewTower, dist: viewDist, goal: viewGoal, log: viewLog, growth: viewGrowth, tools: window.viewTools }[S.tab];
  body.innerHTML = ''; fn && fn(body, pp);
}

/* ===== 中期目標 ===== */
const PHASE_LABEL = { prep: '準備期', build: '強化期', peak: '爆發期', taper: '減量', recovery: '恢復' };

function goalBanner(pp) {
  const b = pp.current_block;
  if (!b) return `<div class="goalbar none"><span class="gb-ic" aria-hidden="true"></span><span class="gb-t">還沒設定中期目標</span>${S.coach ? '<button class="btn xs" id="gb_set">去設定</button>' : ''}</div>`;
  const wk = b.week_now ? `第 ${b.week_now}/${b.weeks} 週` : '';
  return `<div class="goalbar"><span class="gb-ic" aria-hidden="true"></span>
    <span class="gb-t">${esc(b.title)}${b.phase ? ` <em>${PHASE_LABEL[b.phase] || esc(b.phase)}</em>` : ''}</span>
    <span class="gb-m">${wk}${b.end_date ? ` · 到 ${fmtDate(b.end_date)}` : ''}</span></div>`;
}

/** 這段期間 實際 vs 目標 的比重條 */
function goalBars(prog) {
  const maxPct = Math.max(40, ...CATS.map(c => Math.max(prog.pct[c] || 0, (prog.target[c] || 0) + 5))) + 4;
  const X = v => `${Math.min(100, v / maxPct * 100)}%`;
  return `<div class="dist">${CATS.map(c => {
    const act = prog.pct[c] || 0; const tgt = prog.target[c] || 0;
    const diff = round1(act - tgt);
    const state = Math.abs(diff) <= 5 ? 'ok' : (diff < 0 ? 'low' : 'high');
    return `<div class="drow"><div class="lbl" style="display:flex;align-items:center;gap:6px"><i style="width:9px;height:9px;border-radius:3px;background:${catColor(c)}"></i>${CAT_LABEL[c]}</div>
      <div class="track"><div class="band" style="left:${X(Math.max(0, tgt - 5))};width:calc(${X(tgt + 5)} - ${X(Math.max(0, tgt - 5))})"></div><div class="tgt" style="left:${X(tgt)}"></div>
        <div class="act" style="left:0;width:${X(act)};background:${catColor(c)}"></div></div>
      <div class="mark ${state}"><span class="tabular">${round1(act)}%</span><br>目標 ${tgt}%</div></div>`;
  }).join('')}</div>`;
}

function viewGoal(body, pp) {
  const b = pp.current_block;
  const p = b?.progress;
  const short = p ? CATS.map(c => ({ c, gap: (p.target[c] || 0) - (p.pct[c] || 0) })).filter(x => x.gap > 5).sort((a, z) => z.gap - a.gap).slice(0, 3) : [];
  body.innerHTML = `
    <div class="card" id="goalcard">
      ${b ? `<div class="card-head"><div><div class="eyebrow">${b.goal_kind === 'competition' ? '比賽週期' : '一般能力發展'}${b.phase ? ` · ${PHASE_LABEL[b.phase] || esc(b.phase)}` : ''}</div>
        <div class="card-title" style="font-size:19px">${esc(b.title)}</div></div>
        ${S.coach ? '<span class="row"><button class="btn sm" id="g_edit">換／改目標</button></span>' : ''}</div>
      <div class="statbar"><span class="s"><b>${b.week_now || 1}</b>/${b.weeks} 週</span><span class="s"><b>${p.sessions}</b> 堂課</span><span class="s"><b>${p.minutes}</b> 分鐘</span></div>
      ${b.goal_text ? `<p class="sec">${esc(b.goal_text)}</p>` : ''}
      <div class="card-title" style="font-size:14px">這段期間練成什麼樣${p.using_stage_default ? ' <small class="muted">（沒設目標比重，拿階段建議值當基準）</small>' : ''}</div>
      ${p.sessions ? goalBars(p) : '<p class="sec">這個目標期間還沒有紀錄。</p>'}
      ${short.length ? `<p class="small sec">還缺：${short.map(x => `<b style="color:${catColor(x.c)}">${CAT_LABEL[x.c]}</b> 少 ${Math.round(x.gap)}%`).join('、')}。下一堂可以往這邊補。</p>` : (p.sessions ? '<p class="small sec">目前七項都在目標範圍內（±5%）。</p>' : '')}
      <p class="small muted">${b.start_date || ''} → ${b.end_date || ''}</p>`
      : `<div class="card-title">還沒有中期目標</div>
         <p class="sec">中期目標是 4–6 週的訓練方向。設定後，每堂課都會累積到這個方向上，教練和學員都看得到現在在練什麼。</p>
         ${S.coach ? '<button class="btn primary" id="g_edit">設定中期目標</button>' : ''}`}
    </div>
    ${pp.next_block ? `<div class="card"><div class="card-title" style="font-size:14px">下一個目標</div><p class="sec">${esc(pp.next_block.title)} · ${fmtDate(pp.next_block.start_date)} 開始</p></div>` : ''}
    ${S.coach ? '<div class="card" id="logcard"><div class="card-title">記錄一堂課</div><div id="logform"><p class="muted">載入中…</p></div></div>' : ''}`;

  if (S.coach) {
    const ge = $('#g_edit', body);
    if (ge) ge.onclick = () => window.goalEditor($('#goalcard', body), pp);
    window.sessionForm($('#logform', body), pp);
  }
}

/* ===== 我的塔（Map / Diagram：塔是全頁的空間圖）===== */
const SHAPES = { // 7 種俄羅斯方塊（等面積 4 格）
  fms: [[0, 0], [1, 0], [2, 0], [3, 0]],       // I
  strength: [[0, 0], [1, 0], [0, 1], [1, 1]],  // O
  power: [[0, 0], [1, 0], [2, 0], [1, 1]],     // T
  plyo: [[1, 0], [2, 0], [0, 1], [1, 1]],      // S
  saq: [[0, 0], [1, 0], [1, 1], [2, 1]],       // Z
  energy: [[0, 0], [0, 1], [1, 1], [2, 1]],    // J
  mobility: [[2, 0], [0, 1], [1, 1], [2, 1]],  // L
};
function rotate(cells) { const r = cells.map(([x, y]) => [-y, x]); const mx = Math.min(...r.map(c => c[0])), my = Math.min(...r.map(c => c[1])); return r.map(([x, y]) => [x - mx, y - my]); }
function seeded(n) { let x = (n * 9301 + 49297) % 233280; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }

/** 把事件序列排成塔；回傳 { cells: Map "x,y"→piece, pieces, lines, height } */
function buildTower(events, W = 10) {
  const heights = new Array(W).fill(0); const cells = new Map(); const pieces = []; const lines = [];
  const colH = () => Math.max(0, ...heights);
  const fits = (cs, x0, y0) => cs.every(([x, y]) => x0 + x >= 0 && x0 + x < W && y0 + y >= 0 && !cells.has(`${x0 + x},${y0 + y}`));
  const place = (cs, x0, y0, piece) => { piece.cells = cs.map(([x, y]) => [x0 + x, y0 + y]); pieces.push(piece); for (const [x, y] of piece.cells) { cells.set(`${x},${y}`, piece); heights[x] = Math.max(heights[x], y + 1); } };
  for (const ev of events) {
    if (ev.type === 'layer') { lines.push({ y: colH(), title: ev.title, date: ev.date }); continue; }
    if (ev.type === 'wild') {
      // 先找洞（被蓋住的空格），沒有就放在最矮的柱子上
      let spot = null;
      for (let y = 0; y < colH() && !spot; y++) for (let x = 0; x < W; x++) if (!cells.has(`${x},${y}`) && y < heights[x]) { spot = [x, y]; break; }
      if (!spot) { const x = heights.indexOf(Math.min(...heights)); spot = [x, heights[x]]; }
      place([[0, 0]], spot[0], spot[1], { type: 'wild', ...ev });
      continue;
    }
    const rnd = seeded(ev.session_id * 7 + (ev.n || 1) * 13 + CATS.indexOf(ev.cat));
    let shape = SHAPES[ev.cat] || SHAPES.strength; const rots = Math.floor(rnd() * 4); for (let i = 0; i < rots; i++) shape = rotate(shape);
    let best = null;
    for (let r = 0; r < 4; r++) {
      const w = Math.max(...shape.map(c => c[0])) + 1;
      for (let x0 = 0; x0 <= W - w; x0++) {
        // 從上方落下：落在各柱頂之上，再往上推到不重疊為止
        let y0 = Math.max(0, ...shape.map(([x, y]) => heights[x0 + x] - y));
        while (!fits(shape, x0, y0)) y0++;
        const top = y0 + Math.max(...shape.map(c => c[1]));
        const holes = shape.reduce((acc, [x, y]) => acc + Math.max(0, (y0 + y) - heights[x0 + x]), 0);
        const score = top * 10 + holes * 3 + rnd() * 2;
        if (!best || score < best.score) best = { score, shape, x0, y0 };
      }
      shape = rotate(shape);
    }
    place(best.shape, best.x0, best.y0, { type: 'brick', ...ev });
  }
  return { cells, pieces, lines, height: colH(), W };
}

function viewTower(body, pp) {
  const tw = buildTower(pp.tower_events);
  const totalMin = pp.total_minutes;
  body.innerHTML = `
    <div class="folio">
      <div class="folio-head"><div class="folio-title">訓練塔 <small>${tw.pieces.filter(p => p.type === 'brick').length} 塊 · ${tw.pieces.filter(p => p.type === 'wild').length} 突破</small></div><span class="small muted">點方塊看故事</span></div>
      <div class="tower-wrap"><canvas id="tower" aria-label="訓練塔：目前 ${tw.pieces.filter(p => p.type === 'brick').length} 塊方塊，${tw.pieces.filter(p => p.type === 'wild').length} 塊突破方塊"></canvas><div id="pop" class="popover" hidden></div></div>
      <div class="legend">${CATS.map(c => `<span><i style="background:${catColor(c)}"></i>${CAT_LABEL[c]}</span>`).join('')}<span><i style="background:var(--gold)"></i>金</span><span><i style="background:var(--silver)"></i>銀</span></div>
      <div class="tiles"><div class="tile"><div class="v num">${pp.session_count}</div><div class="k">堂課</div></div><div class="tile"><div class="v num">${totalMin}</div><div class="k">總分鐘</div></div><div class="tile"><div class="v num">${pp.brick_total}</div><div class="k">方塊</div></div></div>
    </div>
    <div class="folio"><div class="folio-title">下一塊還差多少</div>
      ${CATS.map(c => { const b = pp.bricks[c]; const left = Math.max(0, Math.round(b.threshold - (b.minutes - b.count * b.threshold))); return `<div class="prow"><div class="lbl"><i style="background:${catColor(c)}"></i>${CAT_LABEL[c]}</div><div class="bar"><i style="width:${Math.round(b.progress * 100)}%;background:${catColor(c)}"></i></div><div class="val tabular">${left} 分</div></div>`; }).join('')}
      <p class="small muted">門檻 = 200 分鐘 × 該階段目標比重。累積到就長一塊。</p></div>
    ${pp.turning_blocks.length ? `<div class="folio"><div class="folio-title">突破紀錄</div>${pp.turning_blocks.slice().reverse().map(t => `<div class="tb ${t.tier}"><i></i><div><div class="s">${esc(t.sentence)}</div><div class="small muted">${TIER_LABEL[t.tier]}方塊 · ${esc(REASON_LABEL[t.reason_type] || t.reason_type)} · ${t.granted_on}</div></div></div>`).join('')}</div>` : ''}
    ${pp.next_block ? `<div class="note">下一個 block「${esc(pp.next_block.title)}」${pp.next_block.start_date} 開始，主軸：${CAT_LABEL[pp.next_block.main_axis] || ''}</div>` : ''}`;
  drawTower($('#tower'), tw, pp);
}

function drawTower(cv, tw, pp) {
  const W = tw.W; const rows = Math.max(5, tw.height + 3);   // 留白＝還能蓋多高；原本固定 8 行，剛開始蓋時空太多
  const cssW = cv.parentElement.clientWidth || 600;
  // 一塊方塊就是一塊方塊：格子有上限，不隨螢幕變大，否則塔會整個抽高、上面留一大片空白
  const cell = Math.min(46, Math.floor(cssW / W));
  const cssH = rows * cell;
  const offX = Math.round((cssW - W * cell) / 2);   // 塔置中
  const dpr = window.devicePixelRatio || 1;
  cv.width = cssW * dpr; cv.height = cssH * dpr; cv.style.height = cssH + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const col = v => cs.getPropertyValue(v).trim();
  const Y = y => cssH - (y + 1) * cell; // 格 y → 畫布 top
  ctx.fillStyle = col('--surface-2'); ctx.fillRect(0, 0, cssW, cssH);
  // 地基線
  ctx.strokeStyle = col('--rule'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, cssH - .5); ctx.lineTo(cssW, cssH - .5); ctx.stroke();
  const gap = 2;
  for (const p of tw.pieces) {
    let fill;
    if (p.type === 'wild') {
      if (p.tier === 'rainbow') { const g = ctx.createLinearGradient(0, 0, cell, cell); ['--c-strength', '--c-power', '--c-saq', '--c-fms', '--c-plyo'].forEach((v, i) => g.addColorStop(i / 4, col(v))); fill = g; }
      else fill = col(p.tier === 'gold' ? '--gold' : '--silver');
    } else fill = col(`--c-${p.cat}`);
    for (const [x, y] of p.cells) {
      ctx.fillStyle = fill;
      const px = offX + x * cell + gap / 2, py = Y(y) + gap / 2, s = cell - gap;
      ctx.beginPath(); ctx.roundRect(px, py, s, s, 3); ctx.fill();
      if (p.type === 'wild') { ctx.fillStyle = col('--paper'); ctx.font = `700 ${Math.round(cell * .55)}px 'Big Shoulders Display', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', px + s / 2, py + s / 2 + 1); }
    }
    // 每塊外框：鄰格不屬於同一塊就畫深線，讓相鄰同色方塊分得開
    ctx.strokeStyle = col('--rule'); ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [x, y] of p.cells) {
      const px = offX + x * cell + gap / 2, py = Y(y) + gap / 2, s = cell - gap;
      const other = (dx, dy) => tw.cells.get(`${x + dx},${y + dy}`) !== p;
      ctx.beginPath();
      if (other(0, 1)) { ctx.moveTo(px, py); ctx.lineTo(px + s, py); }
      if (other(0, -1)) { ctx.moveTo(px, py + s); ctx.lineTo(px + s, py + s); }
      if (other(-1, 0)) { ctx.moveTo(px, py); ctx.lineTo(px, py + s); }
      if (other(1, 0)) { ctx.moveTo(px + s, py); ctx.lineTo(px + s, py + s); }
      ctx.stroke();
    }
  }
  // block 完成線
  ctx.font = `700 11px 'Noto Sans TC', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  for (const l of tw.lines) {
    const y = Y(l.y) + cell; ctx.strokeStyle = col('--accent'); ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col('--accent-strong'); ctx.fillText(`${l.title} ✓ ${l.date}`, 6, y - 3);
  }
  // 點擊
  const pop = $('#pop');
  cv.onclick = e => {
    const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / cell); const y = Math.floor((cssH - (e.clientY - r.top)) / cell);
    const p = tw.cells.get(`${x},${y}`);
    if (!p) { pop.hidden = true; return; }
    pop.hidden = false;
    pop.innerHTML = p.type === 'wild' ? `<b>${TIER_LABEL[p.tier]}方塊 ★</b>${esc(p.sentence)}<br><span style="opacity:.7">${p.date}</span>`
      : `<b>${CAT_LABEL[p.cat]} 第 ${p.n} 塊</b>${p.date} 蓋好 · 累積 ${pp.thresholds[p.cat]} 分鐘`;
    clearTimeout(pop._t); pop._t = setTimeout(() => { pop.hidden = true; }, 3500);
  };
}

/* ===== 分布圖 ===== */
function viewDist(body, pp) {
  const useStage = S.dist === 'stage';
  const pct = useStage ? pp.pct_stage : pp.pct_all;
  const tot = useStage ? pp.totals_stage : pp.totals_all;
  const sum = CATS.reduce((a, c) => a + tot[c], 0);
  const maxPct = Math.max(40, ...CATS.map(c => Math.max(pct[c], pp.targets[c].target + pp.targets[c].tol, pp.baseline ? pp.baseline.pct[c] : 0))) + 4;
  const X = v => `${Math.min(100, v / maxPct * 100)}%`;
  const rows = CATS.map(c => {
    const t = pp.targets[c]; const v = pct[c]; const diff = v - t.target;
    const state = Math.abs(diff) <= t.tol ? 'ok' : diff < 0 ? 'low' : 'high';
    const mark = state === 'ok' ? '✓ 達標' : state === 'low' ? `▼ 少 ${round1(-diff)}%` : `▲ 多 ${round1(diff)}%`;
    return { c, t, v, diff, state, mark };
  });
  const fix = rows.filter(r => r.state === 'low').sort((a, b) => a.diff - b.diff);
  body.innerHTML = `
    <div class="card"><div class="card-head"><div class="card-title">七種能力的比重</div>
      <span class="seg"><button aria-pressed="${useStage}" data-d="stage">本階段</button><button aria-pressed="${!useStage}" data-d="all">全部</button></span></div>
      <p class="small sec">實際佔比（色條）對上目標區間（灰帶，${esc(STAGE_LABEL[pp.athlete.stage])} 建議值 ± 容忍度）。${pp.baseline ? `▲ 是同階段其他 ${pp.baseline.n} 位學員的平均。` : ''}</p>
      <div class="dist">${rows.map(r => `<div class="drow"><div class="lbl" style="display:flex;align-items:center;gap:6px"><i style="width:9px;height:9px;border-radius:3px;background:${catColor(r.c)}"></i>${CAT_LABEL[r.c]}</div>
        <div class="track"><div class="band" style="left:${X(Math.max(0, r.t.target - r.t.tol))};width:calc(${X(r.t.target + r.t.tol)} - ${X(Math.max(0, r.t.target - r.t.tol))})"></div><div class="tgt" style="left:${X(r.t.target)}"></div>
          <div class="act" style="left:0;width:${X(r.v)};background:${catColor(r.c)}"></div>${pp.baseline ? `<div class="base" style="left:${X(pp.baseline.pct[r.c])}"></div>` : ''}</div>
        <div class="mark ${r.state}"><span class="tabular">${round1(r.v)}%</span><br>${r.mark}</div></div>`).join('')}</div>
      <p class="small muted">${useStage ? `本階段自 ${pp.athlete.stage_started_on || '—'} 起` : '全部紀錄'}，共 ${Math.round(sum)} 分鐘。</p></div>
    <div class="card"><div class="card-title">下個 block 該補什麼</div>
      ${fix.length ? `<ul style="margin:0;padding-left:1.2em">${fix.map(r => `<li><b>${CAT_LABEL[r.c]}</b>：目前 ${round1(r.v)}%，目標 ${r.t.target}%，差 ${round1(-r.diff)} 個百分點（約 ${Math.round(-r.diff / 100 * Math.max(sum, 200))} 分鐘）</li>`).join('')}</ul>` : '<p class="sec">七項都在容忍範圍內，維持現在的配方就好。</p>'}
      ${rows.filter(r => r.state === 'high').length ? `<p class="small sec">偏多：${rows.filter(r => r.state === 'high').map(r => CAT_LABEL[r.c]).join('、')}——不用刻意減，讓其他項目追上來即可。</p>` : ''}</div>
    <details class="section"><summary>數字表</summary><div class="body"><div class="scroll-x"><table class="tbl"><thead><tr><th>能力</th><th class="r">分鐘</th><th class="r">實際 %</th><th class="r">目標 %</th><th class="r">容忍 ±</th>${pp.baseline ? '<th class="r">同儕 %</th>' : ''}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${CAT_LABEL[r.c]}</td><td class="r tabular">${Math.round(tot[r.c])}</td><td class="r tabular">${round1(r.v)}</td><td class="r tabular">${r.t.target}</td><td class="r tabular">${r.t.tol}</td>${pp.baseline ? `<td class="r tabular">${pp.baseline.pct[r.c]}</td>` : ''}</tr>`).join('')}</tbody></table></div></div></details>`;
  $$('.seg button', body).forEach(b => b.onclick = () => { S.dist = b.dataset.d; viewDist(body, pp); });
}

/* ===== 紀錄 ===== */
/** 一個板塊的唯讀卡：A 徽章 + 色軌 + 動作列 */
/* 折疊時露出幾個動作。一堂課可能記到 26 個動作，全展開整頁滑不完。
 * 3 個以內不折疊 —— 那樣的折疊鈕只是噪音。 */
const SEG_PEEK = 3;
let segUid = 0;

function segGroup(key, exs, opt = {}) {
  const m = SEG[key];
  const foldable = exs.length > SEG_PEEK;
  const id = `sg${++segUid}`;
  const rows = exs.map((e, i) => `<div class="erow ${e.from_plan ? '' : 'adhoc'}${foldable && i >= SEG_PEEK ? ' more' : ''}">
      ${e.video ? thumbHtml(e.video, 'thumb xs') : `<i class="dot" style="background:${catColor(e.category)}" title="${CAT_LABEL[e.category] || ''}"></i>`}
      <span class="nm">${esc(e.name)}${e.target_movement ? ` <em>${esc(e.target_movement)}</em>` : ''}</span>
      <span class="ds">${esc(doseText(e))}</span></div>`).join('');
  const meta = `<span class="t">${m.label}</span><span class="zh">${m.zh}</span><span class="sp"></span>` +
    `${foldable ? `<span class="chip n">${exs.length} 個</span>` : ''}` +
    `${opt.right || (opt.mins != null ? `<span class="chip">${opt.mins} 分</span>` : '')}`;
  const head = foldable
    ? `<button type="button" class="sgrp-head fold" aria-expanded="false" aria-controls="${id}">
         <span class="badge">${m.letter}</span>${meta}<span class="chev" aria-hidden="true">▾</span></button>`
    : `<div class="sgrp-head"><span class="badge">${m.letter}</span>${meta}</div>`;
  return `<section class="sgrp${foldable ? ' foldable' : ''}"${foldable ? ' data-open="false"' : ''} style="${segVars(key)}">
    ${head}
    <div class="sgrp-body${rows ? '' : ' empty'}" id="${id}">${rows || (opt.emptyText || '這個板塊沒有排動作')}${
      foldable ? `<button type="button" class="sgrp-more">還有 ${exs.length - SEG_PEEK} 個動作</button>` : ''}</div>
  </section>`;
}

/** 折疊／展開一個板塊。標題與「還有 N 個」都能觸發。 */
function toggleSegGroup(grp) {
  const open = grp.dataset.open !== 'true';
  grp.dataset.open = String(open);
  const head = $('.sgrp-head.fold', grp);
  if (head) head.setAttribute('aria-expanded', String(open));
  const more = $('.sgrp-more', grp);
  if (more) more.textContent = open ? '收起' : `還有 ${$$('.erow.more', grp).length} 個動作`;
}

function sessionCard(s, coach) {
  const cm = s.category_minutes || {};
  const bar = CATS.filter(c => cm[c] > 0).map(c => `<i style="flex:${cm[c]};background:${catColor(c)}" title="${CAT_LABEL[c]} ${cm[c]} 分"></i>`).join('');
  const by = Object.fromEntries(SEGS.map(k => [k, []]));
  for (const e of s.exercises) (by[e.segment] || by.main).push(e);
  const mins = { raise: s.raise_min, activation: s.act_min, mobilize: s.mob_min, pot: s.pot_min, main: s.main_min };
  const legacy = [['Raise', s.raise_types, 'raise'], ['Activation', s.act_types, 'activation'], ['Mobilize', s.mob_types, 'mobilize'], ['Potentiation', s.pot_types, 'pot']];
  const setCount = s.exercises.reduce((a, e) => a + (Number(e.sets) || 0), 0);
  return `<div class="sess" data-sid="${s.id}">
    <div class="sess-head"><div class="sess-date">${fmtDate(s.date)}</div><div class="sess-meta">${esc(s.block_title || '未排入 block')}${s.week_no ? ` · 第 ${s.week_no} 週` : ''}${s.source === 'sheet' ? ' · 表單' : ''}</div>
      <span class="chip axis" style="${catVars(s.main_axis)}">${CAT_LABEL[s.main_axis]}</span>${coach ? `<button class="btn xs" data-edit="${s.id}">改</button><button class="btn xs danger" data-del="${s.id}">刪</button>` : ''}</div>
    <div class="statbar"><span class="s"><b>${s.duration_min}</b> 分鐘</span><span class="s"><b>${s.exercises.length}</b> 個動作</span>${setCount ? `<span class="s"><b>${setCount}</b> 組</span>` : ''}${s.session_rpe ? `<span class="s"><b>${s.session_rpe}</b> RPE</span>` : ''}</div>
    <div class="minibricks" style="height:6px">${bar}</div>
    <div class="sgrps">${SEGS.map(k => {
      const named = ((legacy.find(l => l[2] === k) || [])[1] || []).map(t => S.pp.ramp_types[k]?.[t]?.label || t).join('＋');
      if (!by[k].length && !(mins[k] && (named || k === 'main'))) return '';
      return segGroup(k, by[k], { mins: mins[k] ?? null, emptyText: named ? `${named}（沒逐項記動作）` : '沒逐項記動作' });
    }).join('')}</div>
    ${s.coach_note ? `<p class="small sec"><b class="muted">教練備註　</b>${esc(s.coach_note)}</p>` : ''}</div>`;
}
function viewLog(body, pp) {
  body.innerHTML = `<div class="folio">${pp.sessions.length ? pp.sessions.map(s => sessionCard(s, S.coach)).join('') : '<p class="sec">還沒有訓練紀錄。</p>'}
    ${pp.session_count > pp.sessions.length ? `<p class="small muted">只顯示最近 ${pp.sessions.length} 堂（共 ${pp.session_count} 堂）。</p>` : ''}
    <p class="small muted">A–E＝一堂課的五個板塊。＋ 記號＝計畫外加練的動作。色條＝這堂課七種能力的分鐘分配。有縮圖的動作點一下可以看示範。</p></div>`;
  wireThumbs(body);
  body.addEventListener('click', e => {
    const t = e.target.closest('.sgrp-head.fold, .sgrp-more');
    if (t) toggleSegGroup(t.closest('.sgrp'));
  });
  $$('[data-del]', body).forEach(b => b.onclick = () => {
    const row = b.closest('.sess'); if (!row) return;
    const id = b.dataset.del;
    row.hidden = true;                                   // 先從畫面拿掉
    undoable({
      message: '已刪除這堂課的紀錄',
      onCommit: async () => { await api(`/api/session?id=${id}`, { method: 'DELETE' }); renderPassport(S.id, true); },
      onRollback: () => { row.hidden = false; },
    });
  });
  $$('[data-edit]', body).forEach(b => b.onclick = () => {
    const s = pp.sessions.find(x => String(x.id) === b.dataset.edit);
    const card = b.closest('.sess');
    const host = document.createElement('div');
    card.replaceWith(host);
    host.innerHTML = '<p class="muted">載入中…</p>';
    window.sessionForm(host, pp, s, ok => { if (ok) renderPassport(S.id, true); else renderTab(); });
  });
}

/* ===== 成長 ===== */
function sparkline(points, key, color) {
  const vals = points.map(p => p[key]).filter(v => v != null);
  if (vals.length < 2) return '';
  const w = 300, h = 90, pad = 14; const min = Math.min(...vals), max = Math.max(...vals); const span = (max - min) || 1;
  const xs = points.map((p, i) => pad + i / (points.length - 1) * (w - pad * 2));
  const ys = points.map(p => h - pad - ((p[key] - min) / span) * (h - pad * 2));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const last = points.length - 1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${xs[last]} ${h - pad} L${xs[0]} ${h - pad} Z" fill="${color}" opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${points.map((p, i) => `<circle cx="${xs[i]}" cy="${ys[i]}" r="${i === last ? 4 : 3}" fill="${color}"/>`).join('')}</svg>`;
}
function viewGrowth(body, pp) {
  const g = pp.growth; const lastG = g[g.length - 1];
  const lv = pp.focus_levels || {};
  body.innerHTML = `
    <div class="card"><div class="card-head"><div class="card-title">身高體重</div>${lastG ? `<span class="small muted">最近 ${lastG.measured_on}</span>` : ''}</div>
      ${lastG ? `<div class="tiles"><div class="tile"><div class="v num">${lastG.height_cm ?? '—'}</div><div class="k">公分</div></div><div class="tile"><div class="v num">${lastG.weight_kg ?? '—'}</div><div class="k">公斤</div></div><div class="tile"><div class="v num">${g.length}</div><div class="k">次量測</div></div></div>` : '<p class="sec">還沒有量測紀錄。</p>'}
      ${sparkline(g, 'height_cm', 'var(--accent)')}
      ${g.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>日期</th><th class="r">身高 cm</th><th class="r">體重 kg</th></tr></thead><tbody>${g.slice().reverse().map(r => `<tr><td>${r.measured_on}</td><td class="r tabular">${r.height_cm ?? ''}</td><td class="r tabular">${r.weight_kg ?? ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="small muted">身高快速抽高的那段時間（PHV），教練會把課表往協調與活動度調。</p></div>
    <div class="card"><div class="card-title">RAMP Focus 等級 <small>熱身裡的 9 個焦點動作</small></div>
      <div class="focus9">${pp.focus_defs.map(f => { const L = lv[f.key]?.level || 0; return `<div class="fcell"><b>${esc(f.label)}</b><div class="dots">${[1, 2, 3].map(i => `<i class="${i <= L ? 'on' : ''}"></i>`).join('')}</div><span class="muted">${L ? `L${L} ${esc(f.levels[L - 1])}` : '尚未開始'}</span></div>`; }).join('')}</div></div>`;
}
