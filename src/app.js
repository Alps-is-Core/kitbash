/* Kitbash editor.
   The page being designed lives in a same-origin iframe running the Tailwind Play CDN.
   Everything the user builds is plain DOM with Tailwind classes; builder-only state is kept in
   data-* attributes (data-kb name, data-drop, data-free, data-kb-lock, data-kb-hidden) that are
   stripped on export. Overlays (selection, handles, guides) live inside the iframe in .kb-ov nodes. */
(() => {
'use strict';

/* ════════════════════════ utilities ════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LIB = window.KB_LIB;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SANDBOXED = (() => { try { return window.self !== window.top; } catch { return true; } })();
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const TW = '<script src="https://cdn.tailwindcss.com/3.4.17"><\/script>';
const SVG_NS = 'http://www.w3.org/2000/svg';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const ico = (p) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  cursor: ico('<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>'),
  hand: ico('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
  frame: ico('<path d="M22 6H2M22 18H2M6 2v20M18 2v20"/>'),
  square: ico('<rect x="4" y="4" width="16" height="16" rx="1"/>'),
  circle: ico('<circle cx="12" cy="12" r="9"/>'),
  type: ico('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  image: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  undo: ico('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: ico('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  eye: ico('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: ico('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>'),
  lock: ico('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: ico('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.9-1"/>'),
  layout: ico('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
  contrast: ico('<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor"/>'),
  keyboard: ico('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8"/>'),
  code: ico('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  search: ico('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  x: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  sliders: ico('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  download: ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  upload: ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'),
  chevDown: ico('<path d="m6 9 6 6 6-6"/>'),
  chevRight: ico('<path d="m9 18 6-6-6-6"/>'),
  up: ico('<path d="m18 15-6-6-6 6"/>'),
  down: ico('<path d="m6 9 6 6 6-6"/>'),
  parent: ico('<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'),
  dup: ico('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  trash: ico('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  alL: ico('<path d="M4 3v18"/><rect x="8" y="6" width="10" height="4" rx="1"/><rect x="8" y="14" width="6" height="4" rx="1"/>'),
  alC: ico('<path d="M12 3v18"/><rect x="6" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>'),
  alR: ico('<path d="M20 3v18"/><rect x="6" y="6" width="10" height="4" rx="1"/><rect x="10" y="14" width="6" height="4" rx="1"/>'),
  alT: ico('<path d="M3 4h18"/><rect x="6" y="8" width="4" height="10" rx="1"/><rect x="14" y="8" width="4" height="6" rx="1"/>'),
  alM: ico('<path d="M3 12h18"/><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>'),
  alB: ico('<path d="M3 20h18"/><rect x="6" y="6" width="4" height="10" rx="1"/><rect x="14" y="10" width="4" height="6" rx="1"/>'),
  distH: ico('<path d="M4 3v18M20 3v18"/><rect x="9" y="7" width="6" height="10" rx="1"/>'),
  distV: ico('<path d="M3 4h18M3 20h18"/><rect x="7" y="9" width="10" height="6" rx="1"/>'),
  arrowDown: ico('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
  arrowRight: ico('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  wrap: ico('<path d="M3 6h18M3 12h15a3 3 0 1 1 0 6h-4"/><path d="m16 16-2 2 2 2M3 18h7"/>'),
  text: ico('<path d="M17 6H3M21 12H3M15 18H3"/>'),
  box: ico('<rect x="3" y="3" width="18" height="18" rx="2"/>'),
  group: ico('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="7" y="7" width="10" height="10" rx="1"/>'),
  comp: ico('<path d="M12 2 7 7l5 5 5-5zM12 12l-5 5 5 5 5-5zM2 12l5-5 5 5-5 5zM12 12l5-5 5 5-5 5z"/>'),
  link: ico('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  btn: ico('<rect x="3" y="8" width="18" height="8" rx="4"/>'),
  input: ico('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11v2"/>'),
  list: ico('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  pipette: ico('<path d="m2 22 1-1h3l9-9M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>'),
  rotate: ico('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
};
const GRIP = '<svg class="grip" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="8" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="8" cy="12" r="1.3"/></svg>';
$$('[data-icon]').forEach((n) => n.insertAdjacentHTML('afterbegin', IC[n.dataset.icon] || ''));

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
async function copyText(text, okMsg = 'Copied to clipboard') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); return true; }
  catch { toast('Your browser blocked clipboard access. Use the Export dialog and copy from there.'); return false; }
}
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const modKey = MAC ? '⌘' : 'Ctrl+';

/* ════════════════════════ project & pages ════════════════════════ */
const PKEY = 'kitbash:project:v2';
let project = (() => {
  try { const p = JSON.parse(store.get(PKEY)); if (p && Array.isArray(p.pages) && p.pages.length) return p; } catch {}
  const legacy = store.get('kitbash:v1');
  return { kitbash: 2, pages: [{ id: uid(), name: 'Page 1', html: legacy || null }], current: null, mine: [] };
})();
project.mine = project.mine || [];
if (!project.pages.some((p) => p.id === project.current)) project.current = project.pages[0].id;
const curPage = () => project.pages.find((p) => p.id === project.current);
let saveT;
function saveProject() { clearTimeout(saveT); saveT = setTimeout(() => store.set(PKEY, JSON.stringify(project)), 300); }

/* ════════════════════════ library ════════════════════════ */
const KITS = [...LIB.kits, { id: 'mine', name: 'Mine', note: 'Components you saved from the canvas (⌥⌘K)', license: '' }];
const kitById = Object.fromEntries(KITS.map((k) => [k.id, k]));
const libById = Object.fromEntries(LIB.items.map((i) => [i.id, i]));
const mineItems = () => project.mine.map((m) => ({ id: 'mine-' + m.id, kit: 'mine', cat: 'My components', name: m.name, html: m.html }));
const allItems = () => [...mineItems(), ...LIB.items];
const itemById = (id) => (id.startsWith('mine-') ? mineItems().find((i) => i.id === id) : libById[id]);

/* ════════════════════════ palette ════════════════════════ */
let kitFilter = store.get('kitbash:kit') || 'all';
function renderChips() {
  const counts = {}; allItems().forEach((i) => (counts[i.kit] = (counts[i.kit] || 0) + 1));
  const kits = KITS.filter((k) => k.id !== 'mine' || counts.mine);
  if (!kitById[kitFilter] && kitFilter !== 'all') kitFilter = 'all';
  $('#kitChips').innerHTML = `<button class="chip ${kitFilter === 'all' ? 'on' : ''}" data-kit="all">All <em>${LIB.items.length + (counts.mine || 0)}</em></button>` +
    kits.map((k) => `<button class="chip ${kitFilter === k.id ? 'on' : ''}" data-kit="${k.id}" style="--k:var(--k-${k.id})"><i></i>${esc(k.name)} <em>${counts[k.id] || 0}</em></button>`).join('');
  const k = kitById[kitFilter];
  $('#kitNote').innerHTML = k ? `<b>${esc(k.name)}</b> · ${esc(k.note)}.${k.license === 'MIT' ? ' Recreated in plain Tailwind in the style of this MIT-licensed kit.' : ''}`
    : 'Plain-Tailwind recreations in the style of shadcn/ui, Flowbite, HyperUI, Preline, Meraki UI and Magic UI. Drag onto the canvas or click to insert.';
}
function renderPalette() {
  const q = $('#q').value.trim().toLowerCase();
  const list = allItems().filter((i) => (kitFilter === 'all' || i.kit === kitFilter) &&
    (!q || (i.name + ' ' + i.cat + ' ' + kitById[i.kit].name).toLowerCase().includes(q)));
  const groups = new Map();
  list.forEach((i) => { const key = i.kit + '|' + i.cat; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
  $('#palList').innerHTML = list.length ? [...groups].map(([key, arr]) => {
    const [kit, cat] = key.split('|');
    return `<div class="pal-group" style="--k:var(--k-${kit})"><h4><i></i>${kitFilter === 'all' ? esc(kitById[kit].name) + ' · ' : ''}${esc(cat)}</h4><div class="pal-items">${arr.map((i) =>
      `<button class="pal-item" draggable="true" data-id="${i.id}" title="Drag onto the canvas, or click to insert">${GRIP}<span>${esc(i.name)}</span>${kit === 'mine' ? `<span class="x" data-del="${i.id}" title="Remove from library">${IC.x}</span>` : ''}</button>`).join('')}</div></div>`;
  }).join('') : `<div class="pal-empty">${q ? `No components match “${esc(q)}”.` : 'Select something on the canvas and press ⌥⌘K to save it here.'}</div>`;
}
$('#kitChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kit]'); if (!b) return;
  kitFilter = b.dataset.kit; store.set('kitbash:kit', kitFilter); renderChips(); renderPalette();
});
$('#q').addEventListener('input', renderPalette);
const palList = $('#palList');
palList.addEventListener('dragstart', (e) => {
  const it = e.target.closest('.pal-item'); if (!it) return;
  drag = { kind: 'new', id: it.dataset.id };
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', 'kb:' + it.dataset.id);
  hidePreview();
});
palList.addEventListener('dragend', () => { drag = null; hideDrop(); });
palList.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { e.stopPropagation(); project.mine = project.mine.filter((m) => 'mine-' + m.id !== del.dataset.del); saveProject(); renderChips(); renderPalette(); toast('Removed from your library'); return; }
  const it = e.target.closest('.pal-item'); if (!it) return;
  const nodes = buildEntry(it.dataset.id);
  insertNodes(nodes, true);
  toast(`Added ${itemById(it.dataset.id).name}`);
  if (matchMedia('(max-width: 860px)').matches) setMobile('canvas');
});

/* hover preview */
const pv = $('#pv'), pvFrame = $('#pvFrame');
pvFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8">${TW}<style>body{margin:0;padding:16px;background:#fff}</style></head><body></body></html>`;
let pvT, pvId;
palList.addEventListener('mouseover', (e) => {
  const it = e.target.closest('.pal-item');
  if (!it || drag || matchMedia('(hover: none), (max-width: 860px)').matches) return;
  if (pvId === it.dataset.id && !pv.hidden) return;
  clearTimeout(pvT); pvT = setTimeout(() => showPreview(it), 160);
});
palList.addEventListener('mouseleave', hidePreview);
function showPreview(it) {
  const item = itemById(it.dataset.id); const d = pvFrame.contentDocument; if (!item || !d || !d.body) return;
  pvId = item.id; d.body.innerHTML = item.html;
  $('#pvName').textContent = item.name; $('#pvKit').textContent = kitById[item.kit].name + ' · ' + item.cat;
  const r = it.getBoundingClientRect(), pr = $('#leftPanel').getBoundingClientRect();
  pv.hidden = false;
  const fit = () => {
    const h = clamp(Math.ceil(d.body.getBoundingClientRect().height), 90, 900);
    pvFrame.style.height = h + 'px'; $('#pvBody').style.height = Math.round(h * 0.6667) + 'px';
    pv.style.left = (pr.right + 10) + 'px';
    pv.style.top = Math.max(56, Math.min(r.top - 20, innerHeight - pv.offsetHeight - 12)) + 'px';
  };
  fit(); requestAnimationFrame(() => requestAnimationFrame(fit)); setTimeout(fit, 140);
}
function hidePreview() { clearTimeout(pvT); pv.hidden = true; pvId = null; }

/* ════════════════════════ canvas iframe ════════════════════════ */
const frame = $('#canvas'), frameBox = $('#frameBox'), stageScroll = $('#stageScroll');
let doc, win, root;
const ov = {};
let sel = [];                 // selected elements, primary is last
const primary = () => sel[sel.length - 1] || null;
let editing = null, drag = null, dropT = null, gesture = null;
let preview = false, tool = 'move', spaceDown = false, altDown = false, hoverEl = null, clip = null;
let zoom = 1, vpWidth = 0;

const BUILDER_CSS = `
:root{--kbz:1}
html,body{min-height:100%}
body{background:#fff}
#root{min-height:100vh}
#root:empty{display:flex;align-items:center;justify-content:center}
#root:empty::after{content:"Drag components here, or draw with the Frame (F) and shape tools";font:500 15px/1.4 system-ui,sans-serif;color:#8a90a8;border:2px dashed #cfd4ea;border-radius:16px;padding:48px 32px;margin:48px;text-align:center}
[data-drop]:empty:not(#root){min-height:72px;outline:1.5px dashed #b4bce4;outline-offset:-4px;background-color:rgba(70,90,255,.04)}
[data-drop]:empty:not(#root):not([data-free])::after{content:"Drop here";display:flex;height:72px;align-items:center;justify-content:center;font:500 12px system-ui,sans-serif;color:#8a90b8}
[data-kb-hidden]{display:none!important}
html.kb-grid [data-free]{background-image:linear-gradient(rgba(53,70,216,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(53,70,216,.09) 1px,transparent 1px)!important;background-size:8px 8px!important}
html.kb-preview [data-drop]:empty{outline:none;background:none;min-height:0}
html.kb-preview [data-drop]:empty::after{display:none}
[contenteditable="true"]{outline:calc(2px / var(--kbz)) solid #3546d8!important;outline-offset:2px;cursor:text}
html.kb-draw,html.kb-draw *{cursor:crosshair!important}
html.kb-hand,html.kb-hand *{cursor:grab!important}
html.kb-grabbing,html.kb-grabbing *{cursor:grabbing!important;user-select:none!important}
html.kb-moving,html.kb-moving *{cursor:default!important;user-select:none!important}
.kb-ov{position:absolute;pointer-events:none;z-index:2147483000;display:none;box-sizing:border-box}
.kb-layer{position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483000}
.kb-layer>*{position:absolute;box-sizing:border-box}
#kb-hover{outline:calc(1.5px / var(--kbz)) solid #3546d8;outline-offset:-1px}
#kb-sel{outline:calc(1.5px / var(--kbz)) solid #3546d8}
#kb-multi>div{outline:calc(1px / var(--kbz)) solid #3546d8}
#kb-drop{background:#3546d8;border-radius:2px;box-shadow:0 0 0 calc(1.5px / var(--kbz)) #fff}
#kb-into{outline:calc(2px / var(--kbz)) dashed #3546d8;outline-offset:-2px;background:rgba(53,70,216,.06)}
#kb-tag,#kb-name,#kb-size{font:600 calc(10.5px / var(--kbz))/1 system-ui,sans-serif;padding:calc(3px / var(--kbz)) calc(5px / var(--kbz));border-radius:calc(3px / var(--kbz));white-space:nowrap}
#kb-tag,#kb-size{background:#3546d8;color:#fff}
#kb-name{color:#3546d8;padding-left:0;background:none}
#kb-handles>i{width:calc(8px / var(--kbz));height:calc(8px / var(--kbz));background:#fff;border:calc(1.5px / var(--kbz)) solid #3546d8;pointer-events:auto;border-radius:1px}
#kb-guides>div{background:#f2297a}
#kb-guides>span{background:#f2297a;color:#fff;font:600 calc(10px / var(--kbz))/1 system-ui,sans-serif;padding:calc(2px / var(--kbz)) calc(4px / var(--kbz));border-radius:calc(3px / var(--kbz));white-space:nowrap}
#kb-band{outline:calc(1px / var(--kbz)) solid #3546d8;background:rgba(53,70,216,.08)}
html.kb-preview .kb-ov,html.kb-preview .kb-layer{display:none!important}
`;

function initFrame(fill) {
  frame.srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${TW}<script>tailwind.config={darkMode:'class'}<\/script><style>${BUILDER_CSS}</style></head><body><div id="root" data-drop></div></body></html>`;
  frame.addEventListener('load', () => {
    doc = frame.contentDocument; win = frame.contentWindow; root = doc.getElementById('root');
    fill();
    buildOverlay(); bindFrame(); layout();
    resetHistory(); renderAll();
    setTimeout(place, 300);
  }, { once: true });
}

function buildOverlay() {
  const mk = (id, cls = 'kb-ov') => { const d = doc.createElement('div'); d.id = id; d.className = cls; doc.body.appendChild(d); return d; };
  ov.hover = mk('kb-hover'); ov.sel = mk('kb-sel'); ov.drop = mk('kb-drop'); ov.into = mk('kb-into');
  ov.tag = mk('kb-tag'); ov.name = mk('kb-name'); ov.size = mk('kb-size'); ov.band = mk('kb-band');
  ov.multi = mk('kb-multi', 'kb-layer'); ov.guides = mk('kb-guides', 'kb-layer'); ov.handles = mk('kb-handles', 'kb-layer');
  ov.handles.innerHTML = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => `<i data-h="${h}" style="cursor:${h}-resize"></i>`).join('');
  ov.handles.addEventListener('pointerdown', startResize);
}
const isOv = (el) => !!(el && el.closest && el.closest('.kb-ov, .kb-layer'));

/* ── zoom & viewport ── */
function layout() {
  if (!doc) return;
  const sw = stageScroll.clientWidth - 28, sh = stageScroll.clientHeight - 18;
  const w = vpWidth || Math.max(320, Math.round(sw / zoom));
  const h = Math.max(200, Math.round(sh / zoom));
  frame.style.width = w + 'px'; frame.style.height = h + 'px'; frame.style.transform = `scale(${zoom})`;
  frameBox.style.width = Math.round(w * zoom) + 'px'; frameBox.style.height = Math.round(h * zoom) + 'px';
  doc.documentElement.style.setProperty('--kbz', zoom);
  $('#zoomPct').textContent = Math.round(zoom * 100) + '%';
  placeSoon();
}
function setZoom(z) { zoom = clamp(Math.round(z * 100) / 100, 0.1, 4); layout(); }
function fitZoom() { const sw = stageScroll.clientWidth - 28; setZoom(vpWidth ? Math.min(1, sw / vpWidth) : 1); }
const ZSTEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];
function zoomStep(dir) { const i = ZSTEPS.findIndex((s) => s >= zoom - 0.001); setZoom(dir > 0 ? (ZSTEPS[ZSTEPS.findIndex((s) => s > zoom + 0.001)] || 4) : (ZSTEPS[Math.max(0, (i < 0 ? ZSTEPS.length : i) - 1)] || 0.1)); }
$('#vpSel').addEventListener('change', (e) => { vpWidth = +e.target.value; fitZoom(); });
$('#zoomIn').onclick = () => zoomStep(1);
$('#zoomOut').onclick = () => zoomStep(-1);
$('#zoomPct').onclick = (e) => openMenu(e.currentTarget, [
  ['Zoom to fit', 'zoomFit', '⇧1'], ['Zoom to 50%', () => setZoom(0.5)], ['Zoom to 100%', 'zoom100', '⇧0'], ['Zoom to 200%', () => setZoom(2)],
]);
new ResizeObserver(() => layout()).observe(stageScroll);

/* ── geometry helpers ── */
function boxOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height }; }
function put(node, b) { node.style.left = b.x + 'px'; node.style.top = b.y + 'px'; node.style.width = b.w + 'px'; node.style.height = b.h + 'px'; node.style.display = 'block'; }
const isAbs = (el) => el && el !== root && win.getComputedStyle(el).position === 'absolute';
const toParent = (x, y) => { const r = frame.getBoundingClientRect(); return { x: r.left + x * zoom, y: r.top + y * zoom }; };
const chainOf = (el) => { const c = []; for (let n = el; n && n !== root; n = n.parentElement) c.unshift(n); return c; };

/* ── naming ── */
const TAGNAME = { h1: 'Heading', h2: 'Heading', h3: 'Heading', h4: 'Heading', h5: 'Heading', h6: 'Heading', p: 'Text', span: 'Text', a: 'Link', img: 'Image', button: 'Button', svg: 'Icon', input: 'Input', textarea: 'Textarea', select: 'Select', label: 'Label', ul: 'List', ol: 'List', li: 'List item', nav: 'Nav', header: 'Header', footer: 'Footer', section: 'Section', form: 'Form', table: 'Table', hr: 'Divider', aside: 'Aside', main: 'Main', article: 'Article', blockquote: 'Quote', pre: 'Code', code: 'Code', details: 'Details', summary: 'Summary' };
function nameOf(el) {
  if (!el) return '';
  if (el === root) return curPage().name;
  if (el.dataset && el.dataset.kb) return el.dataset.kb;
  const t = el.localName;
  if (!el.children.length && el.textContent.trim() && t !== 'svg') return el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28);
  return TAGNAME[t] || (t === 'div' ? (el.hasAttribute('data-free') ? 'Frame' : 'Box') : t);
}
function iconOf(el) {
  const t = el.localName;
  if (el.hasAttribute('data-free')) return IC.frame;
  if (el.dataset.kb && project.mine.some((m) => m.name === el.dataset.kb)) return IC.comp;
  if (/^(h\d|p|span|label|strong|em|small|li|blockquote)$/.test(t) && !el.children.length) return IC.type;
  if (t === 'img') return IC.image;
  if (t === 'svg') return IC.circle;
  if (t === 'a') return IC.link;
  if (t === 'button') return IC.btn;
  if (/^(input|textarea|select)$/.test(t)) return IC.input;
  if (/^(ul|ol)$/.test(t)) return IC.list;
  if (el.dataset.kb === 'Group' || LIB.items.some((i) => i.name === el.dataset.kb)) return IC.group;
  const cs = win.getComputedStyle(el);
  if (cs.display.includes('flex')) return cs.flexDirection.startsWith('column') ? IC.arrowDown : IC.arrowRight;
  return IC.box;
}

/* ── picking (Figma-style: click selects at the current depth, double-click drills in, ⌘-click goes deepest) ── */
function pickable(t) {
  let el = t && (t.nodeType === 1 ? t : t.parentElement);
  if (!el || isOv(el) || !root.contains(el) || el === root) return null;
  const svg = el.closest('svg'); if (svg && root.contains(svg)) el = svg;
  return el;
}
function pickSmart(t, deep) {
  const el = pickable(t); if (!el) return null;
  const chain = chainOf(el);
  const li = chain.findIndex((n) => n.hasAttribute('data-kb-lock'));
  if (li >= 0) chain.length = li;
  if (!chain.length) return null;
  if (deep) return chain[chain.length - 1];
  const ctx = new Set([root]); const p = primary();
  if (p && root.contains(p)) for (let n = p.parentElement; n && n !== root; n = n.parentElement) ctx.add(n);
  // frames are transparent to clicks (like Figma/Canva): their direct children are selectable straight away
  let pick = chain[0];
  for (const n of chain) if (ctx.has(n.parentElement) || n.parentElement.hasAttribute('data-free')) pick = n;
  return pick;
}
const NOEDIT = /^(img|input|textarea|select|svg|hr|br|video|iframe|canvas)$/;
const ownText = (el) => !!el && !NOEDIT.test(el.localName) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
const isTextual = (el) => !!el && !NOEDIT.test(el.localName) && !!el.textContent.trim() &&
  (ownText(el) || [...el.children].every((c) => /^(a|b|strong|em|i|span|small|code|kbd|br|u|s|mark|sup|sub)$/.test(c.localName)));

/* ── overlays ── */
function place() {
  if (!doc) return;
  sel = sel.filter((n) => root.contains(n) && !n.hasAttribute('data-kb-hidden'));
  if (hoverEl && !root.contains(hoverEl)) hoverEl = null;
  const p = primary();
  const busy = gesture && gesture.active;
  if (hoverEl && !sel.includes(hoverEl) && !drag && !busy) put(ov.hover, boxOf(hoverEl)); else ov.hover.style.display = 'none';
  ov.multi.innerHTML = sel.length > 1 ? sel.map((n) => { const b = boxOf(n); return `<div style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>`; }).join('') : '';
  if (p && !editing && !(gesture && gesture.type === 'flow' && gesture.active)) {
    const b = sel.length > 1 ? unionBox(sel.map(boxOf)) : boxOf(p);
    put(ov.sel, b);
    const z = zoom;
    ov.name.textContent = sel.length > 1 ? `${sel.length} layers` : nameOf(p);
    ov.name.style.display = 'block'; ov.name.style.width = 'auto'; ov.name.style.height = 'auto';
    ov.name.style.left = b.x + 'px'; ov.name.style.top = Math.max(win.scrollY, b.y - 18 / z) + 'px';
    ov.size.textContent = `${Math.round(b.w)} × ${Math.round(b.h)}`;
    ov.size.style.display = 'block'; ov.size.style.width = 'auto'; ov.size.style.height = 'auto';
    ov.size.style.left = (b.x + b.w / 2 - ov.size.offsetWidth / 2) + 'px'; ov.size.style.top = (b.y + b.h + 6 / z) + 'px';
    if (sel.length === 1 && tool === 'move' && !preview) {
      ov.handles.style.display = 'block';
      const hs = 8 / z, pos = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
      for (const i of ov.handles.children) { const [fx, fy] = pos[i.dataset.h]; i.style.left = (b.x + b.w * fx - hs / 2) + 'px'; i.style.top = (b.y + b.h * fy - hs / 2) + 'px'; }
    } else ov.handles.style.display = 'none';
  } else { ['sel', 'name', 'size'].forEach((k) => (ov[k].style.display = 'none')); ov.handles.style.display = 'none'; }
  if (!busy && !altDown) ov.guides.innerHTML = '';
  refreshGeom();
}
let placeQ = false;
function placeSoon() { if (placeQ) return; placeQ = true; requestAnimationFrame(() => { placeQ = false; place(); }); }
function unionBox(bs) { const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y)); return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }; }

function select(els, opts = {}) {
  if (editing && !(Array.isArray(els) ? els : [els]).includes(editing)) editing.blur();
  sel = (Array.isArray(els) ? els : [els]).filter(Boolean).filter((n) => n !== root);
  if (opts.reveal !== false) expandTo(primary());
  place(); renderInspector(); renderTree(); updateInfo();
}
function updateInfo() {
  const p = primary();
  $('#stageInfo').textContent = preview ? 'Preview: links and forms are live, editing is paused. Press Esc to return.'
    : sel.length > 1 ? `${sel.length} layers selected`
    : p ? `${nameOf(p)}  ·  <${p.localName}>` : `${curPage().name}  ·  drag components in, or draw with F / R / O / T`;
}

/* ════════════════════════ frame events ════════════════════════ */
function bindFrame() {
  doc.addEventListener('pointerdown', onPointerDown, true);
  doc.addEventListener('pointermove', onPointerMove, true);
  doc.addEventListener('pointerup', onPointerUp, true);
  doc.addEventListener('pointercancel', onPointerUp, true);
  doc.addEventListener('mousemove', onHover);
  doc.addEventListener('mouseleave', () => { hoverEl = null; placeSoon(); });
  doc.addEventListener('click', (e) => {
    if (preview) { if (e.target.closest('a[href]')) e.preventDefault(); return; }
    if (isOv(e.target) || (editing && editing.contains(e.target))) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  doc.addEventListener('dblclick', onDblClick, true);
  doc.addEventListener('contextmenu', onContextMenu, true);
  doc.addEventListener('submit', (e) => e.preventDefault(), true);
  doc.addEventListener('dragover', onDragOver);
  doc.addEventListener('drop', onDrop);
  doc.addEventListener('dragleave', (e) => { if (!e.relatedTarget) hideDrop(); });
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('keyup', onKeyUp);
  doc.addEventListener('copy', onCopy); doc.addEventListener('cut', onCut); doc.addEventListener('paste', onPaste);
  doc.addEventListener('wheel', onWheel, { passive: false });
  win.addEventListener('scroll', placeSoon, { passive: true });
  win.addEventListener('resize', placeSoon);
  new MutationObserver(placeSoon).observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
  try { new ResizeObserver(placeSoon).observe(doc.body); } catch {}
}

function onHover(e) {
  altDown = e.altKey;
  if (preview || drag || (gesture && gesture.active) || tool !== 'move' || spaceDown) return;
  const t = pickSmart(e.target, e.metaKey || e.ctrlKey);
  if (t !== hoverEl) { hoverEl = t; placeSoon(); }
  if (e.altKey && primary()) measure(primary(), hoverEl && hoverEl !== primary() ? hoverEl : primary().parentElement);
  else if (ov.guides.innerHTML && !gesture) ov.guides.innerHTML = '';
}

function onWheel(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  setZoom(zoom * Math.exp(-e.deltaY * 0.01));
}

/* ── pointer gestures: select, move (free or flow), marquee, draw, pan ── */
function onPointerDown(e) {
  if (preview || isOv(e.target)) return;
  if (editing && editing.contains(e.target)) return;
  if (editing) editing.blur();
  hideMenu();
  const pt = { x: e.clientX, y: e.clientY, sx: e.screenX, sy: e.screenY };
  if (e.button === 1 || spaceDown || tool === 'hand') { e.preventDefault(); gesture = { type: 'pan', ...pt, active: true }; doc.documentElement.classList.add('kb-grabbing'); capture(e); return; }
  if (e.button !== 0) return;
  if (['frame', 'rect', 'ellipse', 'text'].includes(tool)) { e.preventDefault(); gesture = { type: 'draw', ...pt, active: true }; capture(e); return; }
  const deep = e.metaKey || e.ctrlKey;
  const el = pickSmart(e.target, deep);
  const deepest = pickable(e.target);
  // marquee: empty page, or the empty area of a frame that's already the selection context
  const frameBg = deepest && deepest.hasAttribute('data-free') && !deep && (sel.includes(deepest) || (primary() && primary().parentElement === deepest));
  if (!el || frameBg) {
    e.preventDefault();
    gesture = { type: 'band', ...pt, scope: frameBg ? deepest : root, base: e.shiftKey ? [...sel] : [] };
    if (!e.shiftKey) select(frameBg ? [deepest] : []);
    gesture.pendingSel = frameBg ? [deepest] : [];
    capture(e); return;
  }
  e.preventDefault();
  if (e.shiftKey) { select(sel.includes(el) ? sel.filter((n) => n !== el) : [...sel, el]); if (!sel.includes(el)) return; }
  else if (!sel.includes(el)) select([el]);
  else if (sel[sel.length - 1] !== el) { sel = [...sel.filter((n) => n !== el), el]; renderInspector(); }
  const p = primary();
  const free = isAbs(p);
  gesture = { type: free ? 'free' : 'flow', ...pt, el: p, items: free ? sel.filter(isAbs).map((n) => ({ el: n, x0: n.offsetLeft, y0: n.offsetTop })) : null, active: false };
  capture(e);
}
function capture(e) { try { doc.documentElement.setPointerCapture(e.pointerId); } catch {} }

function onPointerMove(e) {
  const g = gesture; if (!g) return;
  const dx = e.clientX - g.x, dy = e.clientY - g.y;
  if (!g.active) { if (Math.hypot(dx, dy) < 3) return; g.active = true; hoverEl = null;
    if (g.type === 'free' || g.type === 'flow') doc.documentElement.classList.add('kb-moving');
    if (g.type === 'flow') { drag = { kind: 'move', el: g.el }; g.el.style.opacity = '0.35'; }
  }
  if (g.type === 'pan') {
    const sdx = e.screenX - g.sx, sdy = e.screenY - g.sy; g.sx = e.screenX; g.sy = e.screenY;
    stageScroll.scrollLeft -= sdx; win.scrollBy(0, -sdy / zoom); return;
  }
  if (g.type === 'draw') { const b = normRect(g.x, g.y, e.clientX, e.clientY); put(ov.band, { x: b.x + win.scrollX, y: b.y + win.scrollY, w: b.w, h: b.h }); sizeLabel(b.w, b.h, b.x + win.scrollX + b.w / 2, b.y + win.scrollY + b.h); return; }
  if (g.type === 'band') {
    const b = normRect(g.x, g.y, e.clientX, e.clientY);
    put(ov.band, { x: b.x + win.scrollX, y: b.y + win.scrollY, w: b.w, h: b.h });
    const hit = [...g.scope.children].filter((c) => !isOv(c) && !c.hasAttribute('data-kb-hidden') && !c.hasAttribute('data-kb-lock') && intersects(c.getBoundingClientRect(), b));
    sel = [...new Set([...g.base, ...hit])]; if (!sel.length && g.pendingSel.length) sel = g.pendingSel;
    place(); return;
  }
  if (g.type === 'free') {
    let ddx = dx, ddy = dy;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) ddy = 0; else ddx = 0; }
    const lead = g.items.find((i) => i.el === g.el) || g.items[0];
    let nx = lead.x0 + ddx, ny = lead.y0 + ddy;
    const snap = e.metaKey || e.ctrlKey ? null : snapGuides(lead.el, nx, ny, lead.el.offsetWidth, lead.el.offsetHeight, g.items.map((i) => i.el));
    if (snap) { nx += snap.dx; ny += snap.dy; }
    const ox = nx - lead.x0, oy = ny - lead.y0;
    g.items.forEach((i) => { i.el.style.left = Math.round(i.x0 + ox) + 'px'; i.el.style.top = Math.round(i.y0 + oy) + 'px'; i.el.style.right = 'auto'; i.el.style.bottom = 'auto'; });
    place(); if (snap) drawGuides(lead.el.parentElement, snap); return;
  }
  if (g.type === 'flow') {
    const t = computeDrop(e.clientX, e.clientY, doc.elementFromPoint(e.clientX, e.clientY));
    if (t) { dropT = t; showDrop(t); }
  }
}
function onPointerUp(e) {
  const g = gesture; gesture = null; if (!g) return;
  doc.documentElement.classList.remove('kb-grabbing', 'kb-moving');
  try { doc.documentElement.releasePointerCapture(e.pointerId); } catch {}
  if (g.type === 'pan') return;
  if (g.type === 'draw') { ov.band.style.display = 'none'; ov.guides.innerHTML = ''; finishDraw(g, e); return; }
  if (g.type === 'band') { ov.band.style.display = 'none'; select(sel, { reveal: false }); return; }
  if (!g.active) return;
  if (g.type === 'free') {
    g.items.forEach((i) => setPos(i.el, parseFloat(i.el.style.left), parseFloat(i.el.style.top)));
    ov.guides.innerHTML = ''; commit(); return;
  }
  if (g.type === 'flow') {
    g.el.style.opacity = ''; cleanStyle(g.el);
    const t = dropT; hideDrop(); drag = null;
    if (t) {
      if (t.c.hasAttribute('data-free')) { const l = local(t.c, e.clientX, e.clientY); makeAbs(g.el, t.c, l.x - 10, l.y - 10); }
      else { stripAbs(g.el); t.c.insertBefore(g.el, t.before); }
      commit(); select([g.el]);
    } else place();
  }
}
const normRect = (x1, y1, x2, y2) => ({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
const intersects = (r, b) => r.left < b.x + b.w && r.right > b.x && r.top < b.y + b.h && r.bottom > b.y;
function local(c, x, y) { const r = c.getBoundingClientRect(); return { x: x - r.left - c.clientLeft + c.scrollLeft, y: y - r.top - c.clientTop + c.scrollTop }; }
function sizeLabel(w, h, cx, y) { ov.guides.innerHTML = `<span style="left:${cx}px;top:${y + 6 / zoom}px;transform:translateX(-50%);background:#3546d8">${Math.round(w)} × ${Math.round(h)}</span>`; }

/* ── smart guides ── */
function snapGuides(el, nx, ny, w, h, moving) {
  const par = el.parentElement; const T = 5 / zoom;
  const xs = [0, par.clientWidth / 2, par.clientWidth], ys = [0, par.clientHeight / 2, par.clientHeight];
  for (const s of par.children) {
    if (moving.includes(s) || isOv(s) || s.hasAttribute('data-kb-hidden') || s.offsetParent !== par) continue;
    xs.push(s.offsetLeft, s.offsetLeft + s.offsetWidth / 2, s.offsetLeft + s.offsetWidth);
    ys.push(s.offsetTop, s.offsetTop + s.offsetHeight / 2, s.offsetTop + s.offsetHeight);
  }
  let bx = null, by = null;
  for (const off of [0, w / 2, w]) for (const c of xs) { const d = c - (nx + off); if (Math.abs(d) <= T && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, c }; }
  for (const off of [0, h / 2, h]) for (const c of ys) { const d = c - (ny + off); if (Math.abs(d) <= T && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, c }; }
  return { dx: bx ? bx.d : 0, dy: by ? by.d : 0, gx: bx ? bx.c : null, gy: by ? by.c : null };
}
function drawGuides(par, s) {
  const pb = boxOf(par), ox = pb.x + par.clientLeft - par.scrollLeft, oy = pb.y + par.clientTop - par.scrollTop, t = 1 / zoom;
  let h = '';
  if (s.gx !== null) h += `<div style="left:${ox + s.gx - t / 2}px;top:${pb.y}px;width:${t}px;height:${pb.h}px"></div>`;
  if (s.gy !== null) h += `<div style="left:${pb.x}px;top:${oy + s.gy - t / 2}px;width:${pb.w}px;height:${t}px"></div>`;
  ov.guides.innerHTML = h;
}
/* ⌥-hover: red distance lines between the selection and another layer (or its parent) */
function measure(a, b) {
  if (!a || !b || b === doc.body || b === doc.documentElement) { ov.guides.innerHTML = ''; return; }
  const A = boxOf(a), B = boxOf(b), t = 1 / zoom; let h = '';
  const line = (x, y, w, hh, n) => { h += `<div style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px"></div>`; if (n > 0) h += `<span style="left:${x + w / 2}px;top:${y + hh / 2}px;transform:translate(-50%,-50%)">${Math.round(n)}</span>`; };
  const cy = A.y + A.h / 2, cx = A.x + A.w / 2;
  const inside = A.x >= B.x && A.y >= B.y && A.x + A.w <= B.x + B.w && A.y + A.h <= B.y + B.h;
  if (inside) {
    line(B.x, cy, A.x - B.x, t, A.x - B.x); line(A.x + A.w, cy, B.x + B.w - A.x - A.w, t, B.x + B.w - A.x - A.w);
    line(cx, B.y, t, A.y - B.y, A.y - B.y); line(cx, A.y + A.h, t, B.y + B.h - A.y - A.h, B.y + B.h - A.y - A.h);
  } else {
    if (B.x >= A.x + A.w) line(A.x + A.w, cy, B.x - A.x - A.w, t, B.x - A.x - A.w);
    else if (B.x + B.w <= A.x) line(B.x + B.w, cy, A.x - B.x - B.w, t, A.x - B.x - B.w);
    if (B.y >= A.y + A.h) line(cx, A.y + A.h, t, B.y - A.y - A.h, B.y - A.y - A.h);
    else if (B.y + B.h <= A.y) line(cx, B.y + B.h, t, A.y - B.y - B.h, A.y - B.y - B.h);
    h += `<div style="left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;background:none;outline:${t}px dashed #f2297a"></div>`;
  }
  ov.guides.innerHTML = h;
}

/* ── resize handles ── */
function startResize(e) {
  const hnd = e.target.closest('[data-h]'); const el = primary(); if (!hnd || !el) return;
  e.preventDefault(); e.stopPropagation();
  const abs = isAbs(el);
  const g = { type: 'resize', h: hnd.dataset.h, el, abs, x: e.clientX, y: e.clientY, x0: el.offsetLeft, y0: el.offsetTop, w0: el.offsetWidth, h0: el.offsetHeight, active: true };
  doc.documentElement.classList.add('kb-moving');
  const move = (ev) => {
    let dx = ev.clientX - g.x, dy = ev.clientY - g.y;
    const H = g.h; let w = g.w0, h = g.h0;
    if (H.includes('e')) w = g.w0 + dx; if (H.includes('w')) w = g.w0 - dx;
    if (H.includes('s')) h = g.h0 + dy; if (H.includes('n')) h = g.h0 - dy;
    if (ev.shiftKey && H.length === 2) { const r = Math.max(w / g.w0, h / g.h0); w = g.w0 * r; h = g.h0 * r; }
    if (ev.altKey) { w = g.w0 + (w - g.w0) * 2; h = g.h0 + (h - g.h0) * 2; }
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (H.includes('e') || H.includes('w')) el.style.width = w + 'px';
    if (H.includes('n') || H.includes('s')) el.style.height = h + 'px';
    el.style.maxWidth = 'none';
    if (g.abs) {
      let x = g.x0, y = g.y0;
      if (ev.altKey) { x = g.x0 - (w - g.w0) / 2; y = g.y0 - (h - g.h0) / 2; }
      else { if (H.includes('w')) x = g.x0 + g.w0 - w; if (H.includes('n')) y = g.y0 + g.h0 - h; }
      el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
    }
    g.w = w; g.hh = h; place();
  };
  const up = () => {
    doc.removeEventListener('pointermove', move, true); doc.removeEventListener('pointerup', up, true);
    doc.documentElement.classList.remove('kb-moving');
    gesture = null;
    if (g.w === undefined) { place(); return; }
    const H = g.h;
    if (H.includes('e') || H.includes('w')) { setCls(el, 'width', `w-[${g.w}px]`); setCls(el, 'maxw', ''); setCls(el, 'size', ''); }
    if (H.includes('n') || H.includes('s')) { setCls(el, 'height', `h-[${g.hh}px]`); setCls(el, 'size', ''); }
    if (g.abs) setPos(el, parseFloat(el.style.left), parseFloat(el.style.top));
    el.style.width = ''; el.style.height = ''; el.style.maxWidth = '';
    later(() => cleanStyle(el));
    commit(); renderInspector();
  };
  gesture = g;
  doc.addEventListener('pointermove', move, true); doc.addEventListener('pointerup', up, true);
}

/* ── drawing tools ── */
function finishDraw(g, e) {
  const b = normRect(g.x, g.y, e.clientX, e.clientY);
  const tiny = b.w < 4 && b.h < 4;
  const kind = tool;
  const defs = { frame: [400, 300], rect: [120, 120], ellipse: [120, 120], text: [0, 0] };
  const w = Math.round(tiny ? defs[kind][0] : b.w), h = Math.round(tiny ? defs[kind][1] : b.h);
  const under = doc.elementFromPoint(g.x, g.y);
  const host = under && root.contains(under) ? under.closest('[data-free]') : null;
  let el = doc.createElement(kind === 'text' ? 'p' : 'div');
  if (kind === 'frame') { el.className = `relative overflow-hidden bg-white ring-1 ring-zinc-200 h-[${h}px] ` + (!host && w > root.clientWidth * 0.9 ? 'w-full' : `w-[${w}px]`); el.dataset.kb = 'Frame'; el.setAttribute('data-free', ''); el.setAttribute('data-drop', ''); }
  if (kind === 'rect') { el.className = `w-[${w}px] h-[${h}px] bg-zinc-300`; el.dataset.kb = 'Rectangle'; }
  if (kind === 'ellipse') { el.className = `w-[${w}px] h-[${h}px] rounded-full bg-zinc-300`; el.dataset.kb = 'Ellipse'; }
  if (kind === 'text') { el.className = 'text-2xl font-semibold text-zinc-900' + (tiny ? '' : ` w-[${w}px]`); el.textContent = 'Type something'; el.dataset.kb = 'Text'; }
  if (host) { const l = local(host, Math.min(g.x, e.clientX), Math.min(g.y, e.clientY)); host.appendChild(el); makeAbs(el, host, l.x, l.y); }
  else { const t = computeDrop(g.x, g.y, under) || { c: root, before: null }; if (t.c.hasAttribute('data-free')) { const l = local(t.c, g.x, g.y); t.c.appendChild(el); makeAbs(el, t.c, l.x, l.y); } else t.c.insertBefore(el, t.before); }
  setTool('move'); commit(); select([el]);
  if (kind === 'text') setTimeout(() => startEdit(el), 30);
}

/* ── positioning helpers ── */
const later = (fn) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(fn, 40)));
function cleanStyle(el) { ['left', 'top', 'right', 'bottom', 'opacity'].forEach((p) => el.style.removeProperty(p)); if (!el.getAttribute('style')) el.removeAttribute('style'); }
function setPos(el, x, y) {
  setCls(el, 'inset', ''); setCls(el, 'translate', '');
  setCls(el, 'left', `left-[${Math.round(x)}px]`); setCls(el, 'top', `top-[${Math.round(y)}px]`);
  later(() => cleanStyle(el));
}
function ensurePositioned(c) { if (c !== root && win.getComputedStyle(c).position === 'static') c.classList.add('relative'); }
function makeAbs(el, parent, x, y) {
  if (el.parentElement !== parent) parent.appendChild(el);
  ensurePositioned(parent);
  setCls(el, 'pos', 'absolute');
  setCls(el, 'margin', '');
  setPos(el, Math.max(0, x), Math.max(0, y));
}
function stripAbs(el) { setCls(el, 'pos', ''); setCls(el, 'inset', ''); setCls(el, 'left', ''); setCls(el, 'top', ''); cleanStyle(el); }
function toggleAbsolute(el) {
  if (!el) return;
  if (isAbs(el)) { stripAbs(el); commit(); renderInspector(); return; }
  const par = el.parentElement; ensurePositioned(par);
  const pr = par.getBoundingClientRect(), r = el.getBoundingClientRect();
  const x = r.left - pr.left - par.clientLeft + par.scrollLeft, y = r.top - pr.top - par.clientTop + par.scrollTop;
  setCls(el, 'width', `w-[${Math.round(r.width)}px]`);
  setCls(el, 'pos', 'absolute'); setPos(el, x, y);
  commit(); renderInspector();
}

/* ════════════════════════ HTML5 drag & drop (palette, files, flow reorder) ════════════════════════ */
function computeDrop(x, y, target) {
  let el = target && target.nodeType === 1 ? target : target && target.parentElement;
  if (!el || isOv(el)) return dropT;
  if (el === doc.documentElement || el === doc.body) el = root;
  if (!root.contains(el) && el !== root) return null;
  let c = el.closest('[data-drop]') || root;
  while (c !== root && (c.hasAttribute('data-kb-lock') || c.closest('[data-kb-lock]'))) c = c.parentElement.closest('[data-drop]') || root;
  if (drag && drag.kind === 'move') while (c !== root && (c === drag.el || drag.el.contains(c))) c = c.parentElement.closest('[data-drop]') || root;
  const kids = [...c.children].filter((k) => k !== (drag && drag.el) && !isOv(k) && !k.hasAttribute('data-kb-hidden'));
  if (c.hasAttribute('data-free')) return { c, before: null, row: false, kids: [], free: true };
  const cs = win.getComputedStyle(c);
  const row = (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')) || (cs.display.includes('grid') && cs.gridTemplateColumns.trim().split(/\s+/).length > 1);
  let before = null;
  for (const k of kids) {
    if (isAbs(k)) continue;
    const r = k.getBoundingClientRect();
    if (row ? (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) : (y < r.top + r.height / 2)) { before = k; break; }
  }
  return { c, before, row, kids: kids.filter((k) => !isAbs(k)) };
}
function showDrop(t) {
  const cb = boxOf(t.c);
  if (t.c !== root) {
    put(ov.into, cb); ov.tag.textContent = (t.free ? 'Place in ' : 'Into ') + nameOf(t.c);
    Object.assign(ov.tag.style, { display: 'block', left: cb.x + 'px', top: Math.max(win.scrollY, cb.y - 20 / zoom) + 'px', width: 'auto', height: 'auto' });
  } else { ov.into.style.display = 'none'; ov.tag.style.display = 'none'; }
  if (!t.kids.length) { ov.drop.style.display = 'none'; if (t.c === root) put(ov.into, cb); return; }
  const ref = t.before || t.kids[t.kids.length - 1], r = boxOf(ref), end = !t.before, th = 4 / zoom;
  if (t.row) put(ov.drop, { x: (end ? r.x + r.w : r.x) - th / 2, y: r.y, w: th, h: r.h });
  else put(ov.drop, { x: r.x, y: (end ? r.y + r.h : r.y) - th / 2, w: r.w, h: th });
}
function hideDrop() { dropT = null; if (!doc) return; ['drop', 'into', 'tag'].forEach((k) => ov[k] && (ov[k].style.display = 'none')); }
function onDragOver(e) {
  if (preview) return;
  e.preventDefault();
  const t = computeDrop(e.clientX, e.clientY, e.target); if (!t) return;
  dropT = t; showDrop(t);
  e.dataTransfer.dropEffect = drag && drag.kind === 'move' ? 'move' : 'copy';
}
function onDrop(e) {
  if (preview) return;
  e.preventDefault();
  const t = computeDrop(e.clientX, e.clientY, e.target) || { c: root, before: null };
  hideDrop();
  const dt = e.dataTransfer;
  let nodes = [];
  if (drag && drag.kind === 'new') nodes = buildEntry(drag.id);
  else if (dt.files && dt.files.length) {
    [...dt.files].filter((f) => f.type.startsWith('image/')).forEach((f) => readImage(f, (src) => placeNodes([imgNode(src, f.name)], t, e)));
    drag = null; return;
  } else {
    const txt = dt.getData('text/plain');
    if (txt.startsWith('kb:')) nodes = buildEntry(txt.slice(3));
    else if (txt) nodes = [textNode(txt)];
  }
  drag = null;
  placeNodes(nodes, t, e);
}
function placeNodes(nodes, t, e) {
  if (!nodes.length) return;
  if (t.c.hasAttribute('data-free')) { const l = local(t.c, e.clientX, e.clientY); nodes.forEach((n, i) => makeAbs(n, t.c, l.x + i * 16, l.y + i * 16)); }
  else nodes.forEach((n) => t.c.insertBefore(n, t.before && t.before.parentNode === t.c ? t.before : null));
  commit(); select(nodes);
  setTimeout(place, 120); setTimeout(place, 400);
}
function readImage(f, cb) { const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); }
function imgNode(src, name = 'Image') { const img = doc.createElement('img'); img.src = src; img.alt = name.replace(/\.[^.]+$/, ''); img.className = 'w-full max-w-xl rounded-xl object-cover'; img.dataset.kb = 'Image'; return img; }
function textNode(txt) { const p = doc.createElement('p'); p.className = 'text-base leading-7 text-zinc-700'; p.textContent = txt; p.dataset.kb = 'Text'; return p; }

/* build nodes from a library id or template entry */
function fromHtml(html, name) {
  const t = doc.createElement('template'); t.innerHTML = html.trim();
  const els = [...t.content.childNodes].filter((c) => c.nodeType === 1 || (c.nodeType === 3 && c.textContent.trim()));
  let n;
  if (els.length === 1 && els[0].nodeType === 1) n = els[0];
  else { n = doc.createElement('div'); n.append(...t.content.childNodes); }
  if (name) n.setAttribute('data-kb', name);
  return n;
}
function buildEntry(entry) {
  if (Array.isArray(entry)) {
    const [id, kids] = entry; const [n] = buildEntry(id); if (!n) return [];
    const slot = n.matches('[data-drop]') ? n : n.querySelector('[data-drop]');
    if (slot) { slot.innerHTML = ''; kids.forEach((k) => buildEntry(k).forEach((c) => slot.appendChild(c))); }
    return [n];
  }
  const it = itemById(entry); return it ? [fromHtml(it.html, it.name)] : [];
}
/* insert after the selection (or into it when it's an empty drop container / a frame) */
function insertNodes(nodes, scroll) {
  if (!nodes.length || !doc) return;
  let p = primary(); if (p && !root.contains(p)) p = null;
  if (p && p.hasAttribute('data-free')) nodes.forEach((n, i) => makeAbs(n, p, 24 + i * 16, 24 + i * 16));
  else if (p && isAbs(p)) nodes.forEach((n, i) => makeAbs(n, p.parentElement, p.offsetLeft + 24 + i * 16, p.offsetTop + 24 + i * 16));
  else {
    let parent = root, before = null;
    if (p) {
      if (p.matches('[data-drop]')) parent = p;
      else { parent = p.parentElement.closest('[data-drop]') || root; let a = p; while (a.parentElement !== parent) a = a.parentElement; before = a.nextSibling; }
    }
    nodes.forEach((n) => parent.insertBefore(n, before));
  }
  commit(); select(nodes);
  if (scroll) nodes[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  setTimeout(place, 150); setTimeout(place, 450);
}

/* ════════════════════════ text editing ════════════════════════ */
function onDblClick(e) {
  if (preview || isOv(e.target)) return;
  e.preventDefault();
  // pointer capture retargets dblclick to <html>, so resolve the element under the cursor ourselves
  const deep = pickSmart(doc.elementFromPoint(e.clientX, e.clientY), true); if (!deep) return;
  if (isTextual(deep)) startEdit(deep); else select([deep]);
}
function startEdit(el) {
  if (!el || !isTextual(el)) { if (el) select([el]); return; }
  if (sel[0] !== el || sel.length !== 1) select([el]);
  editing = el;
  [...el.children].forEach((c) => { if (NOEDIT.test(c.localName) || !c.textContent.trim()) { c.setAttribute('contenteditable', 'false'); c.setAttribute('data-kb-prot', ''); } });
  el.contentEditable = 'true'; el.spellcheck = false;
  frame.focus(); win.focus(); el.focus();  // pointerdown is preventDefault'ed, so the iframe never took focus on its own
  const r = doc.createRange(); r.selectNodeContents(el); const s = win.getSelection(); s.removeAllRanges(); s.addRange(r);
  place();
  el.addEventListener('blur', endEdit, { once: true });
}
function endEdit() {
  if (!editing) return;
  const el = editing; editing = null;
  el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck');
  el.querySelectorAll('[data-kb-prot]').forEach((c) => { c.removeAttribute('contenteditable'); c.removeAttribute('data-kb-prot'); });
  commit(); place(); renderInspector();
}

/* ════════════════════════ commands ════════════════════════ */
const sameParent = (els) => els.length && els.every((n) => n.parentElement === els[0].parentElement);
const docOrder = (els) => [...els].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
function bump(n, d = 16) {
  const l = [...n.classList].find((c) => /^left-\[-?\d+(\.\d+)?px\]$/.test(c)), t = [...n.classList].find((c) => /^top-\[-?\d+(\.\d+)?px\]$/.test(c));
  if (l) { n.classList.replace(l, `left-[${parseFloat(l.slice(6)) + d}px]`); }
  if (t) { n.classList.replace(t, `top-[${parseFloat(t.slice(5)) + d}px]`); }
}
/* Canva-style ungroup: every child keeps its exact look and position but becomes a free layer.
   In a flow layout the component is swapped for a same-sized freeform frame; a styled container
   (background, border, shadow) is kept behind the pieces as its own "background" layer. */
const BAKE = [
  ['color', (v) => `text-[${v.replace(/\s+/g, '')}]`],
  ['fontSize', (v) => `text-[${v}]`],
  ['fontWeight', (v) => `font-[${v}]`],
  ['lineHeight', (v) => (v === 'normal' ? '' : `leading-[${v}]`)],
  ['letterSpacing', (v) => (v === 'normal' ? '' : `tracking-[${v}]`)],
  ['textAlign', (v) => ({ start: 'text-left', left: 'text-left', center: 'text-center', right: 'text-right', end: 'text-right', justify: 'text-justify' }[v] || '')],
  ['textTransform', (v) => ({ uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize' }[v] || '')],
  ['fontFamily', (v) => (/mono/i.test(v) ? 'font-mono' : /serif/i.test(v) && !/sans-serif/i.test(v.split(',')[0]) ? 'font-serif' : '')],
];
const hasLook = (cs) => (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' ||
  ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0) || cs.boxShadow !== 'none';
function ungroupOne(g) {
  const kids = [...g.children].filter((k) => !isOv(k));
  const gcs = win.getComputedStyle(g), gr = g.getBoundingClientRect();
  const snaps = kids.map((k) => { const cs = win.getComputedStyle(k); return { k, r: k.getBoundingClientRect(), text: ownText(k) || isTextual(k), before: BAKE.map(([p]) => cs[p]) }; });
  const par = g.parentElement, name = nameOf(g);
  let host;
  if (isAbs(g) || par.hasAttribute('data-free')) host = par;
  else {
    host = doc.createElement('div');
    host.dataset.kb = name; host.setAttribute('data-free', ''); host.setAttribute('data-drop', '');
    const pr = par.getBoundingClientRect(), padX = parseFloat(win.getComputedStyle(par).paddingLeft) + parseFloat(win.getComputedStyle(par).paddingRight);
    const full = Math.abs(gr.width - (pr.width - padX)) < 2;
    host.className = `relative ${full ? 'w-full' : `w-[${Math.round(gr.width)}px]`} h-[${Math.round(gr.height)}px]`;
    [...g.classList].filter((c) => G.margin.test(c) || /^(shrink-0|self-\w+)$/.test(c)).forEach((c) => host.classList.add(c));
    g.replaceWith(host);
  }
  const hr = host.getBoundingClientRect(); const base = { x: hr.left + host.clientLeft - host.scrollLeft, y: hr.top + host.clientTop - host.scrollTop };
  const out = [];
  if (hasLook(gcs)) {
    const bg = doc.createElement('div'); bg.className = g.getAttribute('class') || ''; bg.dataset.kb = name + ' background';
    ['width', 'height', 'maxw', 'size', 'margin', 'pos', 'inset', 'left', 'top', 'display', 'dir', 'gap', 'items', 'justify', 'wrap', 'cols', 'p', 'px', 'py'].forEach((k) => setCls(bg, k, ''));
    bg.classList.add(`w-[${Math.round(gr.width)}px]`, `h-[${Math.round(gr.height)}px]`);
    if (host !== par) host.appendChild(bg); else g.before(bg);
    makeAbs(bg, host, gr.left - base.x, gr.top - base.y); out.push(bg);
  }
  if (host === par) g.remove();
  snaps.forEach(({ k, r, text, before }) => {
    host.appendChild(k);
    setCls(k, 'margin', ''); setCls(k, 'maxw', ''); setCls(k, 'size', '');
    const cs = win.getComputedStyle(k);
    BAKE.forEach(([p, fn], i) => { if (cs[p] !== before[i]) { const c = fn(before[i]); if (c) k.classList.add(c); } });
    setCls(k, 'width', `w-[${Math.round(r.width)}px]`);
    if (!text) setCls(k, 'height', `h-[${Math.round(r.height)}px]`);
    makeAbs(k, host, r.left - base.x, r.top - base.y);
    out.push(k);
  });
  return out;
}
const CMD = {
  undo, redo,
  del() {
    if (!sel.length) return;
    const p = primary(); const next = p.nextElementSibling || p.previousElementSibling;
    sel.forEach((n) => n.remove()); commit();
    select(next && root.contains(next) && !isOv(next) ? [next] : []);
  },
  dup() {
    if (!sel.length) return;
    const out = docOrder(sel).map((n) => { const c = n.cloneNode(true); n.after(c); if (isAbs(n)) bump(c); return c; });
    commit(); select(out);
  },
  copy() { if (!sel.length) return; clip = docOrder(sel).map((n) => n.outerHTML); toast(sel.length > 1 ? `Copied ${sel.length} layers` : 'Copied'); },
  cut() { CMD.copy(); CMD.del(); },
  paste() { if (!clip) return; const nodes = clip.map((h) => fromHtml(h)); nodes.forEach((n) => { if (n.classList.contains('absolute')) bump(n); }); pasteNodes(nodes); },
  group() {
    if (!sel.length) return; if (!sameParent(sel)) return toast('Group layers that share the same parent.');
    const els = docOrder(sel), par = els[0].parentElement, g = doc.createElement('div');
    g.dataset.kb = 'Group'; g.setAttribute('data-drop', '');
    els[0].before(g);
    if (els.every(isAbs)) {
      const xs = els.map((n) => n.offsetLeft), ys = els.map((n) => n.offsetTop);
      const x = Math.min(...xs), y = Math.min(...ys);
      const w = Math.max(...els.map((n) => n.offsetLeft + n.offsetWidth)) - x, h = Math.max(...els.map((n) => n.offsetTop + n.offsetHeight)) - y;
      g.className = `absolute left-[${x}px] top-[${y}px] w-[${w}px] h-[${h}px]`;
      els.forEach((n) => { const nx = n.offsetLeft - x, ny = n.offsetTop - y; g.appendChild(n); setPos(n, nx, ny); });
    } else els.forEach((n) => g.appendChild(n));
    ensurePositioned(par); commit(); select([g]);
  },
  ungroup() {
    const groups = sel.filter((g) => [...g.children].some((k) => !isOv(k)));
    if (!groups.length) return toast('Select a component or group to ungroup.');
    const out = groups.flatMap(ungroupOne);
    commit(); select(out);
    toast(out.length === 1 ? 'Ungrouped' : `Ungrouped into ${out.length} layers. Drag, resize or double-click to edit each one.`);
  },
  forward() { docOrder(sel).reverse().forEach((n) => { const s = n.nextElementSibling; if (s && !isOv(s)) s.after(n); }); commit(); },
  backward() { docOrder(sel).forEach((n) => { const s = n.previousElementSibling; if (s) s.before(n); }); commit(); },
  front() { docOrder(sel).forEach((n) => n.parentElement.appendChild(n)); commit(); },
  back() { docOrder(sel).reverse().forEach((n) => n.parentElement.prepend(n)); commit(); },
  autolayout() {
    sel.forEach((n) => { const cs = win.getComputedStyle(n); if (!cs.display.includes('flex') && !cs.display.includes('grid')) { setCls(n, 'display', 'flex'); setCls(n, 'dir', 'flex-col'); setCls(n, 'gap', 'gap-4'); } n.setAttribute('data-drop', ''); });
    commit(); renderInspector();
  },
  removeAutolayout() { sel.forEach((n) => { setCls(n, 'display', ''); setCls(n, 'dir', ''); setCls(n, 'gap', ''); setCls(n, 'items', ''); setCls(n, 'justify', ''); setCls(n, 'wrap', ''); }); commit(); renderInspector(); },
  frameSel() {
    if (!sel.length || !sameParent(sel)) return;
    const els = docOrder(sel), f = doc.createElement('div'); f.dataset.kb = 'Frame'; f.setAttribute('data-drop', '');
    f.className = 'flex flex-col gap-4'; els[0].before(f); els.forEach((n) => f.appendChild(n)); commit(); select([f]);
  },
  component() {
    const p = primary(); if (!p) return;
    const name = p.dataset.kb && !/^(Group|Frame|Text|Rectangle|Ellipse|Image)$/.test(p.dataset.kb) ? p.dataset.kb : `Component ${project.mine.length + 1}`;
    p.dataset.kb = name;
    const c = p.cloneNode(true); c.querySelectorAll('[data-kb-lock]').forEach((n) => n.removeAttribute('data-kb-lock'));
    project.mine.unshift({ id: uid(), name, html: c.outerHTML });
    commit(); renderChips(); renderPalette(); toast(`Saved “${name}” to Insert › Mine`);
  },
  copyHtml() { if (sel.length) copyText(codeFor(docOrder(sel), 'html'), 'Copied as HTML'); },
  copyJsx() { if (sel.length) copyText(codeFor(docOrder(sel), 'react-inner'), 'Copied as JSX'); },
  hide() { const hide = !sel.every((n) => n.hasAttribute('data-kb-hidden')); sel.forEach((n) => n.toggleAttribute('data-kb-hidden', hide)); commit(); select([]); },
  lock() { sel.forEach((n) => n.toggleAttribute('data-kb-lock')); commit(); select([]); toast('Locked. Unlock it from the Layers panel.'); },
  parent() { const p = primary(); if (p && p.parentElement && p.parentElement !== root) select([p.parentElement]); },
  child() { const p = primary(); if (!p) return; if (isTextual(p) && !p.children.length) return startEdit(p); const c = [...p.children].find((k) => !isOv(k)); if (c) select([c]); },
  selectAll() { const p = primary(); const par = p ? p.parentElement : root; select([...par.children].filter((n) => !isOv(n) && !n.hasAttribute('data-kb-hidden') && !n.hasAttribute('data-kb-lock'))); },
  selectNone() { select([]); },
  absolute() { toggleAbsolute(primary()); },
  alignL: () => align('x', 0), alignC: () => align('x', 0.5), alignR: () => align('x', 1),
  alignT: () => align('y', 0), alignM: () => align('y', 0.5), alignB: () => align('y', 1),
  distH: () => distribute('x'), distV: () => distribute('y'),
  zoomIn: () => zoomStep(1), zoomOut: () => zoomStep(-1), zoomFit: fitZoom, zoom100: () => setZoom(1),
  preview: togglePreview,
  grid() { doc.documentElement.classList.toggle('kb-grid'); toast(doc.documentElement.classList.contains('kb-grid') ? 'Frame grid on' : 'Frame grid off'); },
  code: () => openCode(),
  keys: () => openModal('keysModal'),
  importHtml: () => { openModal('importModal'); $('#importTa').focus(); },
  placeImage: () => $('#imgFile').click(),
  newPage: () => addPage(),
  save: saveFile,
  open: () => $('#openFile').click(),
  moveUp() { const p = primary(); const s = p && p.previousElementSibling; if (s) { s.before(p); commit(); } },
  moveDown() { const p = primary(); const s = p && p.nextElementSibling; if (s && !isOv(s)) { s.after(p); commit(); } },
};
function pasteNodes(nodes) {
  const p = primary();
  if (p && p.hasAttribute('data-free')) { nodes.forEach((n) => { p.appendChild(n); if (!n.classList.contains('absolute')) makeAbs(n, p, 24, 24); }); commit(); select(nodes); }
  else if (p && isAbs(p) && nodes.every((n) => n.classList.contains('absolute'))) { nodes.forEach((n) => p.parentElement.appendChild(n)); commit(); select(nodes); }
  else insertNodes(nodes.map((n) => { if (n.classList.contains('absolute') && !(p && p.parentElement && p.parentElement.hasAttribute('data-free'))) stripAbs(n); return n; }));
}
function align(axis, f) {
  const els = sel.filter(isAbs); if (!els.length) return toast('Alignment works on layers placed freely inside a frame.');
  const P = axis === 'x' ? ['offsetLeft', 'offsetWidth', 'clientWidth'] : ['offsetTop', 'offsetHeight', 'clientHeight'];
  let lo, hi;
  if (els.length === 1) { lo = 0; hi = els[0].parentElement[P[2]]; }
  else { lo = Math.min(...els.map((n) => n[P[0]])); hi = Math.max(...els.map((n) => n[P[0]] + n[P[1]])); }
  els.forEach((n) => { const v = lo + (hi - lo - n[P[1]]) * f; axis === 'x' ? setPos(n, v, n.offsetTop) : setPos(n, n.offsetLeft, v); });
  commit();
}
function distribute(axis) {
  const els = sel.filter(isAbs); if (els.length < 3) return toast('Select three or more free layers to distribute.');
  const P = axis === 'x' ? ['offsetLeft', 'offsetWidth'] : ['offsetTop', 'offsetHeight'];
  const s = [...els].sort((a, b) => a[P[0]] - b[P[0]]);
  const lo = s[0][P[0]], hi = Math.max(...s.map((n) => n[P[0]] + n[P[1]]));
  const gap = (hi - lo - s.reduce((a, n) => a + n[P[1]], 0)) / (s.length - 1);
  let at = lo; const pos = s.map((n) => { const v = at; at += n[P[1]] + gap; return v; });
  s.forEach((n, i) => (axis === 'x' ? setPos(n, pos[i], n.offsetTop) : setPos(n, n.offsetLeft, pos[i])));
  commit();
}
function run(name) { if (typeof name === 'function') return name(); const f = CMD[name]; if (f) f(); }

/* ── context menu & generic menus ── */
const menu = $('#menu');
let menuOwner = null;
function openMenu(anchor, items, at) {
  menu.innerHTML = items.map((it, i) => {
    if (it === '-') return '<hr>';
    const [label, , key, dis, cls] = it;
    return `<button data-i="${i}"${dis ? ' disabled' : ''}${cls ? ` class="${cls}"` : ''}>${esc(label)}${key ? `<small>${esc(key)}</small>` : ''}</button>`;
  }).join('');
  menu._items = items; menu.hidden = false; menuOwner = anchor;
  let x, y;
  if (at) { x = at.x; y = at.y; } else { const r = anchor.getBoundingClientRect(); x = r.left; y = r.bottom + 6; }
  menu.style.left = Math.max(8, Math.min(x, innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, innerHeight - menu.offsetHeight - 8)) + 'px';
}
function hideMenu() { menu.hidden = true; menuOwner = null; }
menu.addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const it = menu._items[+b.dataset.i]; const keep = it[5];
  if (!keep) hideMenu();
  run(it[1]);
});
document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !e.target.closest('#menu') && e.target !== menuOwner && !(menuOwner && menuOwner.contains(e.target))) hideMenu(); });
function onContextMenu(e) {
  if (preview) return;
  e.preventDefault();
  const el = pickSmart(e.target, e.metaKey || e.ctrlKey);
  if (el && !sel.includes(el)) select([el]);
  const has = sel.length > 0, abs = has && isAbs(primary()), M = modKey;
  const hidden = has && sel.every((n) => n.hasAttribute('data-kb-hidden'));
  openMenu(null, [
    ['Copy', 'copy', M + 'C', !has], ['Paste', 'paste', M + 'V', !clip], ['Duplicate', 'dup', M + 'D', !has], ['Delete', 'del', '⌫', !has], '-',
    ['Copy as HTML', 'copyHtml', '', !has], ['Copy as JSX', 'copyJsx', '', !has], '-',
    ['Group selection', 'group', M + 'G', !has], ['Ungroup', 'ungroup', '⇧' + M + 'G', !has || !primary().children.length], ['Frame selection', 'frameSel', '⌥' + M + 'G', !has],
    ['Add auto layout', 'autolayout', '⇧A', !has], [abs ? 'Remove absolute position' : 'Absolute position', 'absolute', '', !has], '-',
    ['Bring to front', 'front', '⌥' + M + ']', !has], ['Bring forward', 'forward', M + ']', !has], ['Send backward', 'backward', M + '[', !has], ['Send to back', 'back', '⌥' + M + '[', !has], '-',
    ['Create component', 'component', '⌥' + M + 'K', !has], ['Select parent', 'parent', '⇧↵', !has], [hidden ? 'Show' : 'Hide', 'hide', '⇧' + M + 'H', !has], ['Lock', 'lock', '⇧' + M + 'L', !has],
  ], toParent(e.clientX, e.clientY));
}

/* ════════════════════════ keyboard & clipboard ════════════════════════ */
const typingIn = (t) => editing || (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
function onKey(e) {
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase(), t = e.target;
  if (editing && (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey && !/^(p|li|blockquote|td)$/.test(editing.localName)))) { e.preventDefault(); const el = editing; editing.blur(); select([el]); return; }
  if (typingIn(t)) return;
  if (e.key === 'Escape') {
    if (!menu.hidden) return hideMenu();
    for (const id of ['codeModal', 'importModal', 'keysModal']) if (!$('#' + id).hidden) return closeModal(id);
    if (preview) return togglePreview();
    if (tool !== 'move') return setTool('move');
    return select([]);
  }
  if (e.key === ' ' && !spaceDown) { spaceDown = true; doc && doc.documentElement.classList.add('kb-hand'); e.preventDefault(); return; }
  if (e.key === 'Alt') { altDown = true; return; }
  if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
  if (mod && k === 'y') { e.preventDefault(); return redo(); }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); return zoomStep(1); }
  if (mod && k === '-') { e.preventDefault(); return zoomStep(-1); }
  if (mod && k === '0') { e.preventDefault(); return setZoom(1); }
  if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); return fitZoom(); }
  if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); return setZoom(1); }
  if (mod && e.altKey && k === 'p') { e.preventDefault(); return togglePreview(); }
  if (mod && e.shiftKey && k === 'k') { e.preventDefault(); return run('placeImage'); }
  if (mod && k === 's') { e.preventDefault(); return saveFile(); }
  if (mod && k === 'o') { e.preventDefault(); return run('open'); }
  if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) { e.preventDefault(); return openModal('keysModal'); }
  if (preview) return;
  if (!mod && !e.altKey) {
    const tools = { v: 'move', h: 'hand', f: 'frame', r: 'rect', o: 'ellipse', t: 'text' };
    if (!e.shiftKey && tools[k]) { e.preventDefault(); return setTool(tools[k]); }
    if (e.shiftKey && k === 'a') { e.preventDefault(); return run('autolayout'); }
  }
  if (mod && k === 'a') { e.preventDefault(); return run('selectAll'); }
  if (!sel.length) return;
  if (mod && e.altKey && k === 'k') { e.preventDefault(); return run('component'); }
  if (mod && e.altKey && k === 'g') { e.preventDefault(); return run('frameSel'); }
  if (mod && k === 'g') { e.preventDefault(); return run(e.shiftKey ? 'ungroup' : 'group'); }
  if (mod && k === 'd') { e.preventDefault(); return run('dup'); }
  if (mod && e.shiftKey && k === 'h') { e.preventDefault(); return run('hide'); }
  if (mod && e.shiftKey && k === 'l') { e.preventDefault(); return run('lock'); }
  if (mod && e.code === 'BracketRight') { e.preventDefault(); return run(e.altKey ? 'front' : 'forward'); }
  if (mod && e.code === 'BracketLeft') { e.preventDefault(); return run(e.altKey ? 'back' : 'backward'); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return run('del'); }
  if (e.key === 'Enter') { e.preventDefault(); return run(e.shiftKey ? 'parent' : 'child'); }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const abs = sel.filter(isAbs);
    if (abs.length && !e.altKey) {
      const d = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      abs.forEach((n) => setPos(n, n.offsetLeft + dx, n.offsetTop + dy)); commitSoon(); return;
    }
    if (e.key === 'ArrowUp') return run('moveUp');
    if (e.key === 'ArrowDown') return run('moveDown');
  }
}
function onKeyUp(e) {
  if (e.key === ' ') { spaceDown = false; doc && doc.documentElement.classList.remove('kb-hand'); }
  if (e.key === 'Alt') { altDown = false; if (doc && !gesture) ov.guides.innerHTML = ''; }
}
document.addEventListener('keydown', onKey);
document.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', () => { spaceDown = false; altDown = false; doc && doc.documentElement.classList.remove('kb-hand'); });

function onCopy(e) {
  if (typingIn(e.target) || !sel.length || preview) return;
  if (doc && win.getSelection().toString() && !sel.length) return;
  e.preventDefault(); CMD.copy();
  const html = codeFor(docOrder(sel), 'html');
  e.clipboardData.setData('text/plain', html); e.clipboardData.setData('text/html', html);
}
function onCut(e) { if (typingIn(e.target) || !sel.length || preview) return; onCopy(e); CMD.del(); }
function onPaste(e) {
  if (preview) return;
  if (editing) { e.preventDefault(); doc.execCommand('insertText', false, e.clipboardData.getData('text/plain')); return; }
  if (typingIn(e.target) || !doc) return;
  e.preventDefault();
  const cd = e.clipboardData;
  const file = [...(cd.files || [])].find((f) => f.type.startsWith('image/'));
  if (file) return readImage(file, (src) => pasteNodes([imgNode(src, 'Pasted image')]));
  const txt = cd.getData('text/plain').trim();
  const ours = clip && txt === codeFor(clip.map((h) => fromHtml(h)), 'html');
  if (clip && (ours || !txt)) return CMD.paste();
  if (/^\s*</.test(txt)) {
    const t = doc.createElement('template'); t.innerHTML = txt.replace(/<script[\s\S]*?<\/script>/gi, '');
    const nodes = [...t.content.children].map((n) => { if (!n.dataset.kb) n.dataset.kb = 'Pasted ' + (TAGNAME[n.localName] || n.localName); return n; });
    if (nodes.length) { pasteNodes(nodes); toast(`Pasted ${nodes.length} element${nodes.length > 1 ? 's' : ''}`); }
    return;
  }
  if (txt) pasteNodes([textNode(txt)]);
}
document.addEventListener('copy', onCopy); document.addEventListener('cut', onCut); document.addEventListener('paste', onPaste);

/* stage background: pan with space / hand / middle button, click to deselect */
stageScroll.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#frameBox')) return;
  if (e.button === 1 || spaceDown || tool === 'hand') {
    e.preventDefault(); let sx = e.screenX, sy = e.screenY; stageScroll.setPointerCapture(e.pointerId); stageScroll.classList.add('panning');
    const mv = (ev) => { stageScroll.scrollLeft -= ev.screenX - sx; stageScroll.scrollTop -= ev.screenY - sy; if (win) win.scrollBy(0, -(ev.screenY - sy) / zoom); sx = ev.screenX; sy = ev.screenY; };
    const up = () => { stageScroll.removeEventListener('pointermove', mv); stageScroll.removeEventListener('pointerup', up); stageScroll.classList.remove('panning'); };
    stageScroll.addEventListener('pointermove', mv); stageScroll.addEventListener('pointerup', up); return;
  }
  if (e.button === 0 && !preview) select([]);
});
stageScroll.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * 0.01)); } }, { passive: false });

/* ════════════════════════ tools & preview ════════════════════════ */
function setTool(t) {
  tool = t;
  $$('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  if (doc) { doc.documentElement.classList.toggle('kb-draw', ['frame', 'rect', 'ellipse', 'text'].includes(t)); doc.documentElement.classList.toggle('kb-hand', t === 'hand'); }
  stageScroll.classList.toggle('hand', t === 'hand');
  hoverEl = null; place();
}
$$('[data-tool]').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
$('#imgTool').onclick = () => $('#imgFile').click();
$('#imgFile').onchange = (e) => { const f = e.target.files[0]; if (f) readImage(f, (src) => pasteNodes([imgNode(src, f.name)])); e.target.value = ''; };
function togglePreview() {
  preview = !preview; $('#previewBtn').classList.toggle('on', preview);
  doc.documentElement.classList.toggle('kb-preview', preview);
  if (preview) { if (editing) editing.blur(); hoverEl = null; }
  updateInfo(); place();
}
$('#previewBtn').onclick = togglePreview;

/* ════════════════════════ history (per page) ════════════════════════ */
const hists = {};
const H = () => (hists[project.current] = hists[project.current] || { stack: [], i: -1 });
function snap() { return root.innerHTML.replace(/ contenteditable="(true|false)"| spellcheck="false"| data-kb-prot=""/g, ''); }
function resetHistory() { const h = H(); h.stack = [snap()]; h.i = 0; updateUndo(); }
function commit() {
  const s = snap(), h = H(); curPage().html = s; saveProject();
  if (h.stack[h.i] !== s) { h.stack = h.stack.slice(0, h.i + 1); h.stack.push(s); if (h.stack.length > 200) h.stack.shift(); h.i = h.stack.length - 1; }
  updateUndo(); renderTree(); placeSoon();
}
let cST; function commitSoon() { clearTimeout(cST); cST = setTimeout(() => { commit(); renderInspector(); }, 300); placeSoon(); }
function restore() { const h = H(); editing = null; root.innerHTML = h.stack[h.i]; curPage().html = h.stack[h.i]; saveProject(); sel = []; hoverEl = null; updateUndo(); renderAll(); }
function undo() { const h = H(); if (h.i > 0) { h.i--; restore(); } }
function redo() { const h = H(); if (h.i < h.stack.length - 1) { h.i++; restore(); } }
function updateUndo() { const h = H(); $('#undoBtn').disabled = h.i <= 0; $('#redoBtn').disabled = h.i >= h.stack.length - 1; }
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;

/* ════════════════════════ pages ════════════════════════ */
function switchPage(id) {
  if (id === project.current) return;
  if (editing) editing.blur();
  curPage().html = snap();
  project.current = id; saveProject();
  const p = curPage();
  root.innerHTML = p.html || '';
  sel = []; hoverEl = null;
  if (!hists[id]) resetHistory(); else updateUndo();
  win.scrollTo(0, 0); renderAll();
}
function addPage(name, html = '') {
  const p = { id: uid(), name: name || `Page ${project.pages.length + 1}`, html };
  project.pages.push(p); switchPage(p.id); renderPages(); return p;
}
let pageArm = null;
function renderPages() {
  $('#pageList').innerHTML = project.pages.map((p) => `<div class="page-row${p.id === project.current ? ' on' : ''}" data-page="${p.id}" role="button" tabindex="0"><span class="name">${esc(p.name)}</span>${project.pages.length > 1 ? `<span class="x${pageArm === p.id ? ' armed' : ''}" data-delpage="${p.id}" title="${pageArm === p.id ? 'Click again to delete' : 'Delete page'}">${IC.x}</span>` : ''}</div>`).join('');
}
$('#pageList').addEventListener('click', (e) => {
  const d = e.target.closest('[data-delpage]');
  if (d) {
    const id = d.dataset.delpage;
    if (pageArm !== id) { pageArm = id; renderPages(); setTimeout(() => { if (pageArm === id) { pageArm = null; renderPages(); } }, 3000); return; }
    pageArm = null;
    const idx = project.pages.findIndex((p) => p.id === id); const wasCur = id === project.current;
    project.pages.splice(idx, 1); delete hists[id];
    if (wasCur) { project.current = null; switchPageTo(project.pages[Math.max(0, idx - 1)].id); }
    saveProject(); renderPages(); toast('Page deleted'); return;
  }
  const r = e.target.closest('[data-page]'); if (r) { switchPage(r.dataset.page); renderPages(); }
});
function switchPageTo(id) { project.current = id; const p = curPage(); root.innerHTML = p.html || ''; sel = []; if (!hists[id]) resetHistory(); else updateUndo(); renderAll(); }
$('#pageList').addEventListener('dblclick', (e) => {
  const r = e.target.closest('[data-page]'); if (!r) return;
  const p = project.pages.find((x) => x.id === r.dataset.page), nm = r.querySelector('.name');
  nm.innerHTML = `<input class="inp" value="${esc(p.name)}" style="height:24px">`; const i = nm.firstChild; i.focus(); i.select();
  const done = () => { p.name = i.value.trim() || p.name; saveProject(); renderPages(); updateInfo(); };
  i.addEventListener('blur', done, { once: true }); i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') i.blur(); if (ev.key === 'Escape') { i.value = p.name; i.blur(); } });
});
$('#addPage').onclick = () => { addPage(); toast('New page added'); };

/* ════════════════════════ layers tree ════════════════════════ */
const expanded = new WeakSet();
let treeEls = [];
function expandTo(el) { if (!el) return; for (let n = el.parentElement; n && n !== root; n = n.parentElement) expanded.add(n); }
let treeQ = false;
function renderTree() { if (treeQ) return; treeQ = true; requestAnimationFrame(() => { treeQ = false; drawTree(); }); }
function drawTree() {
  if (!root || $('#layersPane').hidden) return;
  treeEls = []; const rows = [];
  const walk = (el, d) => [...el.children].forEach((c) => {
    if (isOv(c)) return;
    const kids = [...c.children].filter((k) => !isOv(k)), open = expanded.has(c), i = treeEls.push(c) - 1;
    const hid = c.hasAttribute('data-kb-hidden'), lk = c.hasAttribute('data-kb-lock');
    rows.push(`<div class="lrow${sel.includes(c) ? ' on' : ''}${hid ? ' off' : ''}" data-i="${i}" draggable="true" style="padding-left:${4 + d * 14}px">` +
      `<button class="car${open ? ' open' : ''}" data-car="${i}" tabindex="-1" ${kids.length ? '' : 'style="visibility:hidden"'}>${IC.chevRight}</button>` +
      `<span class="ico">${iconOf(c)}</span><span class="nm">${esc(nameOf(c))}</span>` +
      `<button class="tg${lk ? ' act' : ''}" data-lock="${i}" title="${lk ? 'Unlock' : 'Lock'}">${lk ? IC.lock : IC.unlock}</button>` +
      `<button class="tg${hid ? ' act' : ''}" data-hide="${i}" title="${hid ? 'Show' : 'Hide'}">${hid ? IC.eyeOff : IC.eye}</button></div>`);
    if (open) walk(c, d + 1);
  });
  walk(root, 0);
  $('#tree').innerHTML = rows.length ? rows.join('') : '<div class="pal-empty">This page is empty. Drop a component onto the canvas to see its layers here.</div>';
}
const tree = $('#tree');
tree.addEventListener('click', (e) => {
  const car = e.target.closest('[data-car]'), lk = e.target.closest('[data-lock]'), hd = e.target.closest('[data-hide]');
  if (car) { const el = treeEls[+car.dataset.car]; expanded.has(el) ? expanded.delete(el) : expanded.add(el); drawTree(); return; }
  if (lk) { treeEls[+lk.dataset.lock].toggleAttribute('data-kb-lock'); commit(); return; }
  if (hd) { const el = treeEls[+hd.dataset.hide]; el.toggleAttribute('data-kb-hidden'); if (el.hasAttribute('data-kb-hidden')) sel = sel.filter((n) => n !== el); commit(); place(); return; }
  const row = e.target.closest('.lrow'); if (!row) return;
  const el = treeEls[+row.dataset.i];
  if (e.shiftKey || e.metaKey || e.ctrlKey) select(sel.includes(el) ? sel.filter((n) => n !== el) : [...sel, el], { reveal: false });
  else { select([el], { reveal: false }); if (!el.hasAttribute('data-kb-hidden')) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
});
tree.addEventListener('dblclick', (e) => {
  const row = e.target.closest('.lrow'); if (!row || e.target.closest('button')) return;
  const el = treeEls[+row.dataset.i], nm = row.querySelector('.nm');
  nm.innerHTML = `<input value="${esc(nameOf(el))}">`; const i = nm.firstChild; i.focus(); i.select();
  const done = () => { const v = i.value.trim(); if (v) el.dataset.kb = v; commit(); renderInspector(); place(); };
  i.addEventListener('blur', done, { once: true }); i.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') i.blur(); if (ev.key === 'Escape') { i.value = ''; i.blur(); } });
});
tree.addEventListener('mouseover', (e) => { const r = e.target.closest('.lrow'); const el = r && treeEls[+r.dataset.i]; if (el !== hoverEl) { hoverEl = el && !el.hasAttribute('data-kb-hidden') ? el : null; placeSoon(); } });
tree.addEventListener('mouseleave', () => { hoverEl = null; placeSoon(); });
let treeDrag = null;
tree.addEventListener('dragstart', (e) => { const r = e.target.closest('.lrow'); if (!r) return; treeDrag = treeEls[+r.dataset.i]; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'kb-layer'); });
tree.addEventListener('dragover', (e) => {
  const r = e.target.closest('.lrow'); if (!r || !treeDrag) return; e.preventDefault();
  $$('.lrow', tree).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-in'));
  const el = treeEls[+r.dataset.i]; if (el === treeDrag || treeDrag.contains(el)) return;
  const b = r.getBoundingClientRect(), f = (e.clientY - b.top) / b.height;
  r.classList.add(f < 0.3 ? 'drop-before' : f > 0.7 || !el.hasAttribute('data-drop') ? 'drop-after' : 'drop-in');
});
tree.addEventListener('drop', (e) => {
  const r = e.target.closest('.lrow'); if (!r || !treeDrag) return; e.preventDefault();
  const el = treeEls[+r.dataset.i]; const how = r.classList.contains('drop-before') ? 'before' : r.classList.contains('drop-in') ? 'in' : 'after';
  if (el !== treeDrag && !treeDrag.contains(el)) {
    if (how === 'in') { el.appendChild(treeDrag); expanded.add(el); if (el.hasAttribute('data-free') && !isAbs(treeDrag)) makeAbs(treeDrag, el, 16, 16); }
    else el[how](treeDrag);
    if (isAbs(treeDrag) && !treeDrag.parentElement.hasAttribute('data-free') && win.getComputedStyle(treeDrag.parentElement).position === 'static') stripAbs(treeDrag);
    commit(); select([treeDrag]);
  }
  treeDrag = null;
});
tree.addEventListener('dragend', () => { treeDrag = null; $$('.lrow', tree).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-in')); });

$$('[data-ltab]').forEach((t) => (t.onclick = () => {
  $$('[data-ltab]').forEach((x) => x.classList.toggle('on', x === t));
  $('#insertPane').hidden = t.dataset.ltab !== 'insert'; $('#layersPane').hidden = t.dataset.ltab !== 'layers';
  if (t.dataset.ltab === 'layers') { renderPages(); drawTree(); }
}));

/* ════════════════════════ design panel ════════════════════════ */
const COLORS = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const HEX = '\\[#[0-9a-fA-F]{3,8}\\]';
const G = {
  size: /^text-(xs|sm|base|lg|xl|[2-9]xl|\[\d+(\.\d+)?px\])$/,
  weight: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  family: /^font-(sans|serif|mono)$/,
  align: /^text-(left|center|right|justify)$/,
  leading: /^leading-(none|tight|snug|normal|relaxed|loose|\d+|\[.+\])$/,
  tracking: /^tracking-(tighter|tight|normal|wide|wider|widest|\[.+\])$/,
  italic: /^(italic|not-italic)$/, case: /^(uppercase|lowercase|capitalize|normal-case)$/, deco: /^(underline|line-through|no-underline|overline)$/,
  color: new RegExp(`^text-((${COLORS})-\\d{2,3}|white|black|transparent|${HEX})(\\/\\d+)?$`),
  bg: new RegExp(`^bg-((${COLORS})-\\d{2,3}|white|black|transparent|${HEX})(\\/\\d+)?$`),
  bcolor: new RegExp(`^border-((${COLORS})-\\d{2,3}|white|black|transparent|${HEX})(\\/\\d+)?$`),
  p: /^p-(\d+(\.5)?|px|\[.+\])$/, px: /^px-(\d+(\.5)?|px|\[.+\])$/, py: /^py-(\d+(\.5)?|px|\[.+\])$/,
  margin: /^-?m[xytrbl]?-(\d+(\.5)?|px|auto|\[.+\])$/, mx: /^mx-(\d+(\.5)?|px|auto)$/, my: /^my-(\d+(\.5)?|px)$/,
  gap: /^gap-(\d+(\.5)?|px|\[.+\])$/,
  radius: /^rounded(-(none|sm|md|lg|xl|2xl|3xl|full|\[\d+px\]))?$/,
  shadow: /^shadow(-(sm|md|lg|xl|2xl|inner|none))?$/,
  border: /^border(-[0248])?$/,
  display: /^(block|inline-block|inline|flex|inline-flex|grid|hidden)$/,
  dir: /^flex-(row|col)(-reverse)?$/, wrap: /^flex-(wrap|nowrap|wrap-reverse)$/,
  items: /^items-(start|center|end|stretch|baseline)$/,
  justify: /^justify-(start|center|end|between|around|evenly)$/,
  width: /^w-(auto|full|fit|screen|min|max|px|\d+(\.5)?|\d+\/\d+|\[.+\])$/,
  height: /^h-(auto|full|fit|screen|min|max|px|\d+(\.5)?|\d+\/\d+|\[.+\])$/,
  size: /^size-(\d+(\.5)?|px|full|\[.+\])$/,
  maxw: /^max-w-(none|xs|sm|md|lg|xl|[2-7]xl|full|prose|screen-(sm|md|lg|xl|2xl)|\[.+\])$/,
  cols: /^grid-cols-(\d+|none|\[.+\])$/,
  pos: /^(static|relative|absolute|fixed|sticky)$/,
  inset: /^-?(inset(-[xy])?|right|bottom|start|end)-/,
  left: /^-?left-/, top: /^-?top-/,
  translate: /^-?translate-[xy]-/,
  rotate: /^-?rotate-(\d+|\[.+\])$/,
  opacity: /^opacity-(\d+|\[.+\])$/,
  blur: /^blur(-(none|sm|md|lg|xl|2xl|3xl))?$/,
  bblur: /^backdrop-blur(-(none|sm|md|lg|xl|2xl|3xl))?$/,
  overflow: /^overflow-(hidden|auto|visible|scroll|clip)$/,
};
const SP = ['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];
const OPTS = {
  size: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'],
  weight: ['font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  family: ['font-sans', 'font-serif', 'font-mono'],
  leading: ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'],
  tracking: ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
  p: SP.map((s) => 'p-' + s), px: SP.map((s) => 'px-' + s), py: SP.map((s) => 'py-' + s), gap: SP.map((s) => 'gap-' + s),
  radius: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
  shadow: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner'],
  border: ['border-0', 'border', 'border-2', 'border-4', 'border-8'],
  blur: ['blur-none', 'blur-sm', 'blur', 'blur-md', 'blur-lg', 'blur-xl', 'blur-2xl', 'blur-3xl'],
  bblur: ['backdrop-blur-none', 'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl'],
  maxw: ['max-w-none', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-prose', 'max-w-full'],
  cols: ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6', 'grid-cols-12'],
  display: ['block', 'inline-block', 'flex', 'inline-flex', 'grid'],
};
const SWATCH = [['white', '#ffffff'], ['black', '#000000'], ['zinc-900', '#18181b'], ['zinc-500', '#71717a'], ['zinc-200', '#e4e4e7'], ['zinc-50', '#fafafa'], ['red-500', '#ef4444'], ['orange-500', '#f97316'], ['amber-400', '#fbbf24'], ['lime-400', '#a3e635'], ['emerald-500', '#10b981'], ['teal-600', '#0d9488'], ['sky-500', '#0ea5e9'], ['blue-600', '#2563eb'], ['indigo-600', '#4f46e5'], ['violet-600', '#7c3aed'], ['fuchsia-500', '#d946ef'], ['pink-500', '#ec4899'], ['indigo-50', '#eef2ff'], ['amber-50', '#fffbeb']];

const util = (el, g) => [...el.classList].find((c) => G[g].test(c)) || '';
function setCls(el, g, v) {
  [...el.classList].filter((c) => G[g].test(c)).forEach((c) => el.classList.remove(c));
  if (v) v.split(/\s+/).forEach((c) => c && el.classList.add(c));
  if (!el.classList.length) el.removeAttribute('class');
}
function setAll(g, v) { sel.forEach((n) => setCls(n, g, v)); commit(); }
const pxOf = (el, g, prefix) => { const c = util(el, g); const m = c.match(new RegExp(`^${prefix}-\\[(-?\\d+(?:\\.\\d+)?)px\\]$`)); return m ? +m[1] : null; };
const rgbHex = (rgb) => { const m = rgb.match(/\d+(\.\d+)?/g); if (!m || (m[3] !== undefined && +m[3] === 0)) return '#ffffff'; return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); };

function selectField(label, g, id = g) {
  const el = primary(), cur = util(el, g), opts = OPTS[g].includes(cur) || !cur ? OPTS[g] : [cur, ...OPTS[g]];
  return `<div class="field"><label for="u-${id}">${label}</label><select class="sel" id="u-${id}" data-util="${g}"><option value="">—</option>${opts.map((o) => `<option${o === cur ? ' selected' : ''}>${o}</option>`).join('')}</select></div>`;
}
function nfSelect(lbl, g) {
  const el = primary(), cur = util(el, g), opts = OPTS[g].includes(cur) || !cur ? OPTS[g] : [cur, ...OPTS[g]];
  return `<label class="nf" title="${g}"><b>${lbl}</b><select data-util="${g}"><option value="">—</option>${opts.map((o) => `<option value="${o}"${o === cur ? ' selected' : ''}>${o.replace(/^[a-z]+-/, '')}</option>`).join('')}</select></label>`;
}
function swatches(g, prefix, cssProp) {
  const el = primary(), cur = util(el, g);
  const hex = rgbHex(win.getComputedStyle(el)[cssProp]);
  return `<div class="swatches" data-sw="${g}"><button class="sw none${cur ? '' : ' on'}" data-v="" title="None"></button>${SWATCH.map(([n, h]) => `<button class="sw${cur === prefix + n ? ' on' : ''}" data-v="${prefix + n}" title="${prefix + n}" style="background:${h}"></button>`).join('')}<label class="cpick" title="Custom color">${IC.pipette}<input type="color" data-color="${g}" data-prefix="${prefix}" value="${hex}"></label></div>`;
}
const sect = (key, title, body) => `<details class="sect" data-sect="${key}"${closedSects.has(key) ? '' : ' open'}><summary>${title}</summary><div class="sect-b">${body}</div></details>`;
const closedSects = new Set(JSON.parse(store.get('kitbash:closed') || '["html","attrs"]'));
function ancestors(el) { const a = []; for (let n = el; n && n !== root; n = n.parentElement) a.unshift(n); return a; }

function renderInspector() {
  const body = $('#insBody');
  const p = primary();
  if (!p || !root || !root.contains(p)) {
    body.innerHTML = `<div class="ins-empty"><h3>${esc(curPage().name)}</h3><span>Select a layer to edit it. Some ways to work:</span><ul class="tips">
      <li><span class="kbd">Drag</span> components in from the Insert tab</li>
      <li><span class="kbd">F</span> <span class="kbd">R</span> <span class="kbd">O</span> <span class="kbd">T</span> draw a frame, rectangle, ellipse or text</li>
      <li>Inside a <b>Frame</b>, drag layers anywhere and pull the handles to resize</li>
      <li>Click selects a whole component. <span class="kbd">Double-click</span> jumps to the exact element; on text it starts typing</li>
      <li><span class="kbd">⇧${modKey}G</span> ungroups a component into free pieces you can move and resize like Canva</li>
      <li><span class="kbd">Space</span> + drag to pan, <span class="kbd">${modKey}scroll</span> to zoom</li>
      <li><span class="kbd">⌥</span> + hover to measure distances</li>
      <li>Paste HTML, text or images straight onto the canvas</li>
      <li><span class="kbd">?</span> shows every shortcut</li></ul></div>`;
    return;
  }
  const el = p, tag = el.localName, cs = win.getComputedStyle(el);
  const abs = cs.position === 'absolute';
  const isFlex = cs.display.includes('flex'), isGrid = cs.display.includes('grid');
  const textual = isTextual(el) || (el.textContent.trim() && !el.children.length && tag !== 'svg');
  const leaf = !el.children.length && !/^(img|input|textarea|select|svg|hr|br)$/.test(tag);
  const multi = sel.length > 1;
  const freeSel = sel.filter(isAbs);
  const crumbs = ancestors(el).map((a, i) => `<button class="${a === el ? 'cur' : ''}" data-crumb="${i}">${esc(nameOf(a))}</button>`).join('<span>›</span>');
  const wMode = util(el, 'width') === 'w-full' ? 'fill' : /^w-(fit|auto)$/.test(util(el, 'width')) || !util(el, 'width') ? 'hug' : 'fixed';
  const hMode = util(el, 'height') === 'h-full' ? 'fill' : !util(el, 'height') || /^h-(fit|auto)$/.test(util(el, 'height')) ? 'hug' : 'fixed';
  const dir = isFlex ? (cs.flexDirection.startsWith('column') ? 'col' : 'row') : '';
  const ai = { 'flex-start': 0, start: 0, normal: 0, stretch: 0, center: 1, 'flex-end': 2, end: 2 }[cs.alignItems] ?? 0;
  const jc = { 'flex-start': 0, start: 0, normal: 0, center: 1, 'flex-end': 2, end: 2, 'space-between': 3 }[cs.justifyContent] ?? 0;
  const al9 = [0, 1, 2].map((r) => [0, 1, 2].map((c) => { const on = dir === 'col' ? (r === jc && c === ai) : (r === ai && c === jc); return `<button data-al9="${r},${c}" class="${on ? 'on' : ''}" title="Align"></button>`; }).join('')).join('');
  const attrs = [];
  if (tag === 'a') attrs.push(['href', 'Link']);
  if (tag === 'img') attrs.push(['src', 'Source'], ['alt', 'Alt text']);
  if (/^(input|textarea)$/.test(tag)) attrs.push(['placeholder', 'Placeholder']);
  if (tag === 'input') attrs.push(['type', 'Type']);
  attrs.push(['id', 'ID'], ['aria-label', 'Aria label']);
  const opacity = Math.round(parseFloat(cs.opacity) * 100);

  body.innerHTML = `<div class="ins">
    <div class="ins-head">
      <div class="crumbs">${crumbs}</div>
      <div class="name-row"><input class="name-in" id="nameIn" value="${esc(multi ? `${sel.length} layers` : nameOf(el))}" ${multi ? 'disabled' : ''} aria-label="Layer name"><code>&lt;${tag}&gt;</code></div>
      <div class="icons">
        <button data-cmd="alignL" title="Align left" ${freeSel.length ? '' : 'disabled'}>${IC.alL}</button><button data-cmd="alignC" title="Align horizontal centers" ${freeSel.length ? '' : 'disabled'}>${IC.alC}</button><button data-cmd="alignR" title="Align right" ${freeSel.length ? '' : 'disabled'}>${IC.alR}</button>
        <button data-cmd="alignT" title="Align top" ${freeSel.length ? '' : 'disabled'}>${IC.alT}</button><button data-cmd="alignM" title="Align vertical centers" ${freeSel.length ? '' : 'disabled'}>${IC.alM}</button><button data-cmd="alignB" title="Align bottom" ${freeSel.length ? '' : 'disabled'}>${IC.alB}</button>
        <button data-cmd="distH" title="Distribute horizontally" ${freeSel.length > 2 ? '' : 'disabled'}>${IC.distH}</button><button data-cmd="distV" title="Distribute vertically" ${freeSel.length > 2 ? '' : 'disabled'}>${IC.distV}</button>
      </div>
      <div class="icons">
        <button data-cmd="moveUp" title="Move up">${IC.up}</button><button data-cmd="moveDown" title="Move down">${IC.down}</button><button data-cmd="parent" title="Select parent (⇧↵)">${IC.parent}</button>
        <button data-cmd="group" title="Group (${modKey}G)">${IC.group}</button><button data-cmd="component" title="Create component (⌥${modKey}K)">${IC.comp}</button><button data-cmd="dup" title="Duplicate (${modKey}D)">${IC.dup}</button><button data-cmd="del" title="Delete">${IC.trash}</button>
      </div>
    </div>
    ${sect('frame', 'Position &amp; size', `
      <div class="icons"><button data-posmode="auto" class="${abs ? '' : 'on'}">Auto</button><button data-posmode="abs" class="${abs ? 'on' : ''}">Absolute</button></div>
      <div class="grid2">
        <label class="nf"><b>X</b><input type="number" id="f-x" ${abs ? '' : 'disabled'}></label><label class="nf"><b>Y</b><input type="number" id="f-y" ${abs ? '' : 'disabled'}></label>
        <label class="nf"><b>W</b><input type="number" id="f-w" min="0"></label><label class="nf"><b>H</b><input type="number" id="f-h" min="0"></label>
        <label class="nf" title="Width behaviour"><b>↔</b><select id="f-wm"><option value="hug"${wMode === 'hug' ? ' selected' : ''}>Hug</option><option value="fill"${wMode === 'fill' ? ' selected' : ''}>Fill</option><option value="fixed"${wMode === 'fixed' ? ' selected' : ''}>Fixed</option></select></label>
        <label class="nf" title="Height behaviour"><b>↕</b><select id="f-hm"><option value="hug"${hMode === 'hug' ? ' selected' : ''}>Hug</option><option value="fill"${hMode === 'fill' ? ' selected' : ''}>Fill</option><option value="fixed"${hMode === 'fixed' ? ' selected' : ''}>Fixed</option></select></label>
        <label class="nf" title="Rotation"><b>${IC.rotate}</b><input type="number" id="f-rot" value="${(util(el, 'rotate').match(/-?\d+/) || [''])[0] * (util(el, 'rotate').startsWith('-') ? -1 : 1) || ''}" placeholder="0°"></label>
        ${nfSelect('⇥', 'maxw')}
      </div>
      <label class="check"><input type="checkbox" id="f-clip"${util(el, 'overflow') === 'overflow-hidden' ? ' checked' : ''}>Clip content</label>
      <label class="check"><input type="checkbox" id="f-free"${el.hasAttribute('data-free') ? ' checked' : ''}>Freeform frame (children placed anywhere)</label>`)}
    ${isFlex || isGrid ? sect('auto', 'Auto layout', `
      <div class="al-wrap"><div class="al9">${al9}</div><div class="col">
        <div class="icons"><button data-dir="flex-col" class="${dir === 'col' ? 'on' : ''}" title="Vertical">${IC.arrowDown}</button><button data-dir="flex-row" class="${dir === 'row' && util(el, 'wrap') !== 'flex-wrap' ? 'on' : ''}" title="Horizontal">${IC.arrowRight}</button><button data-dir="wrap" class="${util(el, 'wrap') === 'flex-wrap' ? 'on' : ''}" title="Wrap">${IC.wrap}</button></div>
        ${nfSelect('⇿', 'gap')}
      </div></div>
      <div class="grid3">${nfSelect('P', 'p')}${nfSelect('X', 'px')}${nfSelect('Y', 'py')}</div>
      ${isGrid ? selectField('Columns', 'cols') : ''}
      <button class="mini-btn" data-cmd="removeAutolayout">Remove auto layout</button>`)
    : sect('auto', 'Auto layout', `<button class="mini-btn" data-cmd="autolayout">${IC.plus}Add auto layout <span class="kbd">⇧A</span></button><div class="grid3">${nfSelect('P', 'p')}${nfSelect('X', 'px')}${nfSelect('Y', 'py')}</div>`)}
    ${sect('look', 'Appearance', `
      <div class="field"><span>Opacity</span><div class="row"><input type="range" class="range grow" id="f-op" min="0" max="100" step="5" value="${opacity}"><code style="width:34px;text-align:right;font-size:11px">${opacity}%</code></div></div>
      <div class="grid2">${nfSelect('◜', 'radius')}<label class="nf" title="Custom radius (px)"><b>px</b><input type="number" id="f-rad" min="0" value="${pxOf(el, 'radius', 'rounded') ?? ''}" placeholder="radius"></label></div>`)}
    ${sect('fill', 'Fill', swatches('bg', 'bg-', 'backgroundColor'))}
    ${sect('stroke', 'Stroke', `${selectField('Weight', 'border')}${swatches('bcolor', 'border-', 'borderTopColor')}`)}
    ${sect('fx', 'Effects', `${selectField('Shadow', 'shadow')}${selectField('Blur', 'blur')}${selectField('Backdrop', 'bblur')}`)}
    ${textual ? sect('type', 'Text', `
      <div class="grid2">${nfSelect('Aa', 'family')}${nfSelect('B', 'weight')}${nfSelect('T', 'size')}<label class="nf" title="Custom font size (px)"><b>px</b><input type="number" id="f-fs" min="1" value="${pxOf(el, 'size', 'text') ?? Math.round(parseFloat(cs.fontSize))}"></label>${nfSelect('↕', 'leading')}${nfSelect('↔', 'tracking')}</div>
      <div class="icons">${['left', 'center', 'right', 'justify'].map((a) => `<button data-align="text-${a}" class="${util(el, 'align') === 'text-' + a ? 'on' : ''}" title="Align ${a}">${a[0].toUpperCase()}</button>`).join('')}
        <button data-toggle="italic" data-g="italic" class="${util(el, 'italic') === 'italic' ? 'on' : ''}" title="Italic"><i>I</i></button><button data-toggle="underline" data-g="deco" class="${util(el, 'deco') === 'underline' ? 'on' : ''}" title="Underline"><u>U</u></button><button data-toggle="uppercase" data-g="case" class="${util(el, 'case') === 'uppercase' ? 'on' : ''}" title="Uppercase">AA</button></div>
      ${swatches('color', 'text-', 'color')}`) : ''}
    ${leaf && !multi ? sect('content', 'Content', `<textarea class="ta" id="insText" rows="3" style="font-family:var(--font-body);font-size:12.5px">${esc(el.textContent)}</textarea>`) : ''}
    ${!multi ? sect('attrs', 'Attributes', attrs.map(([a, l]) => `<div class="field"><label for="at-${a}">${l}</label><input class="inp" id="at-${a}" data-attr="${a}" value="${esc(a === 'src' && (el.getAttribute(a) || '').startsWith('data:') ? '(embedded image)' : el.getAttribute(a) || '')}"></div>`).join('') +
      (tag === 'img' ? `<label class="mini-btn">${IC.upload}Replace image<input type="file" accept="image/*" id="imgUp" hidden></label>` : '') +
      `<label class="check"><input type="checkbox" id="isDrop"${el.hasAttribute('data-drop') ? ' checked' : ''}>Accepts dropped components</label>`) : ''}
    ${sect('classes', 'Tailwind classes', `<textarea class="ta" id="insCls" rows="4" spellcheck="false">${esc(multi ? '' : el.getAttribute('class') || '')}</textarea><span class="hint">${multi ? 'Classes typed here are added to every selected layer.' : 'Any Tailwind v3 class works, including md: and hover: variants.'}</span>`)}
    ${!multi ? sect('html', 'HTML', `<textarea class="ta" id="insHtml" rows="8" spellcheck="false">${esc(el.outerHTML)}</textarea><button class="mini-btn" id="applyHtml">Apply HTML</button>`) : ''}
  </div>`;
  refreshGeom();
}
function refreshGeom() {
  const p = primary(); if (!p || !$('#f-w')) return;
  const set = (id, v) => { const i = $(id); if (i && document.activeElement !== i) i.value = v; };
  set('#f-x', Math.round(p.offsetLeft)); set('#f-y', Math.round(p.offsetTop));
  const r = p.getBoundingClientRect();
  set('#f-w', Math.round(p.offsetWidth ?? r.width)); set('#f-h', Math.round(p.offsetHeight ?? r.height));
}
const ins = $('#insBody');
let txtT;
ins.addEventListener('toggle', (e) => { const d = e.target.closest('[data-sect]'); if (!d) return; d.open ? closedSects.delete(d.dataset.sect) : closedSects.add(d.dataset.sect); store.set('kitbash:closed', JSON.stringify([...closedSects])); }, true);
ins.addEventListener('input', (e) => {
  const t = e.target, p = primary(); if (!p) return;
  if (t.id === 'insText') { p.textContent = t.value; clearTimeout(txtT); txtT = setTimeout(commit, 400); }
  else if (t.dataset.attr) { if (t.value === '(embedded image)') return; t.value ? p.setAttribute(t.dataset.attr, t.value) : p.removeAttribute(t.dataset.attr); clearTimeout(txtT); txtT = setTimeout(commit, 400); }
  else if (t.id === 'insCls' && sel.length === 1) { p.setAttribute('class', t.value); clearTimeout(txtT); txtT = setTimeout(commit, 500); }
  else if (t.id === 'f-op') { t.nextElementSibling.textContent = t.value + '%'; sel.forEach((n) => setCls(n, 'opacity', +t.value === 100 ? '' : `opacity-${t.value}`)); commitSoon(); }
  else if (t.dataset.color) { sel.forEach((n) => setCls(n, t.dataset.color, `${t.dataset.prefix}[${t.value}]`)); commitSoon(); }
  else if (t.id === 'nameIn') { p.dataset.kb = t.value; clearTimeout(txtT); txtT = setTimeout(() => { commit(); place(); }, 400); }
});
ins.addEventListener('change', (e) => {
  const t = e.target, p = primary(); if (!p) return;
  if (t.dataset.util) { setAll(t.dataset.util, t.value); renderInspector(); return; }
  const num = t.value === '' ? null : Math.round(+t.value);
  switch (t.id) {
    case 'insCls': if (sel.length > 1) { sel.forEach((n) => t.value.split(/\s+/).forEach((c) => c && n.classList.add(c))); commit(); } renderInspector(); break;
    case 'isDrop': p.toggleAttribute('data-drop', t.checked); commit(); break;
    case 'f-free': sel.forEach((n) => { n.toggleAttribute('data-free', t.checked); if (t.checked) { n.setAttribute('data-drop', ''); ensurePositioned(n); if (!util(n, 'height')) setCls(n, 'height', `h-[${Math.max(240, n.offsetHeight)}px]`); } }); commit(); renderInspector(); break;
    case 'f-clip': setAll('overflow', t.checked ? 'overflow-hidden' : ''); break;
    case 'f-x': if (num !== null) { sel.filter(isAbs).forEach((n) => setPos(n, num, n.offsetTop)); commit(); } break;
    case 'f-y': if (num !== null) { sel.filter(isAbs).forEach((n) => setPos(n, n.offsetLeft, num)); commit(); } break;
    case 'f-w': sel.forEach((n) => { setCls(n, 'width', num === null ? '' : `w-[${num}px]`); setCls(n, 'size', ''); if (num !== null) setCls(n, 'maxw', ''); }); commit(); renderInspector(); break;
    case 'f-h': sel.forEach((n) => { setCls(n, 'height', num === null ? '' : `h-[${num}px]`); setCls(n, 'size', ''); }); commit(); renderInspector(); break;
    case 'f-wm': sel.forEach((n) => setCls(n, 'width', t.value === 'fill' ? 'w-full' : t.value === 'hug' ? 'w-fit' : `w-[${Math.round(n.offsetWidth)}px]`)); commit(); renderInspector(); break;
    case 'f-hm': sel.forEach((n) => setCls(n, 'height', t.value === 'fill' ? 'h-full' : t.value === 'hug' ? '' : `h-[${Math.round(n.offsetHeight)}px]`)); commit(); renderInspector(); break;
    case 'f-rot': sel.forEach((n) => setCls(n, 'rotate', !num ? '' : num < 0 ? `-rotate-[${-num}deg]` : `rotate-[${num}deg]`)); commit(); break;
    case 'f-rad': setAll('radius', num === null ? '' : `rounded-[${num}px]`); renderInspector(); break;
    case 'f-fs': setAll('size', num === null ? '' : `text-[${num}px]`); renderInspector(); break;
    case 'f-op': commit(); break;
    case 'imgUp': if (t.files[0]) readImage(t.files[0], (src) => { p.src = src; commit(); renderInspector(); }); break;
    default: if (t.dataset.color) { commit(); renderInspector(); }
  }
});
ins.addEventListener('click', (e) => {
  const b = e.target.closest('button'); const p = primary(); if (!b || !p) return;
  if (b.dataset.cmd) return run(b.dataset.cmd);
  if (b.dataset.crumb) return select([ancestors(p)[+b.dataset.crumb]]);
  if (b.dataset.posmode) { if ((b.dataset.posmode === 'abs') !== isAbs(p)) toggleAbsolute(p); return; }
  if (b.dataset.align) { setAll('align', util(p, 'align') === b.dataset.align ? '' : b.dataset.align); return renderInspector(); }
  if (b.dataset.toggle) { setAll(b.dataset.g, util(p, b.dataset.g) === b.dataset.toggle ? '' : b.dataset.toggle); return renderInspector(); }
  if (b.dataset.dir) {
    if (b.dataset.dir === 'wrap') setAll('wrap', util(p, 'wrap') === 'flex-wrap' ? '' : 'flex-wrap');
    else { sel.forEach((n) => { if (util(n, 'display') === 'grid' || !util(n, 'display')) setCls(n, 'display', 'flex'); setCls(n, 'dir', b.dataset.dir); }); commit(); }
    return renderInspector();
  }
  if (b.dataset.al9) {
    const [r, c] = b.dataset.al9.split(',').map(Number), A = ['items-start', 'items-center', 'items-end'], J = ['justify-start', 'justify-center', 'justify-end'];
    const col = win.getComputedStyle(p).flexDirection.startsWith('column');
    sel.forEach((n) => { setCls(n, 'items', col ? A[c] : A[r]); setCls(n, 'justify', col ? J[r] : J[c]); }); commit(); return renderInspector();
  }
  const sw = b.closest('[data-sw]'); if (sw) { setAll(sw.dataset.sw, b.dataset.v); return renderInspector(); }
  if (b.id === 'applyHtml') {
    const t = doc.createElement('template'); t.innerHTML = $('#insHtml').value.trim();
    const n = t.content.firstElementChild; if (!n) return toast('That HTML has no element in it.');
    if (!n.dataset.kb && p.dataset.kb) n.dataset.kb = p.dataset.kb;
    p.replaceWith(...t.content.childNodes); commit(); select([n]); toast('HTML applied');
  }
});
ins.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.nf input, .name-in')) e.target.blur(); });

/* ════════════════════════ main menu, templates, theme ════════════════════════ */
let clearArmed = false;
function mainMenu() {
  openMenu($('#mainMenuBtn'), [
    ['New page', 'newPage'], ['Open project file…', 'open', modKey + 'O'], [SANDBOXED ? 'Copy project file' : 'Save project file', 'save', modKey + 'S'], '-',
    ['Import HTML…', 'importHtml'], ['Place image…', 'placeImage', '⇧' + modKey + 'K'], ['Export code…', 'code'], '-',
    ['Toggle frame grid', 'grid'], ['Zoom to fit', 'zoomFit', '⇧1'], ['Preview', 'preview', '⌥' + modKey + 'P'], ['Keyboard shortcuts', 'keys', '?'], '-',
    [clearArmed ? 'Click again to clear this page' : 'Clear page…', () => clearPage(), '', false, clearArmed ? 'armed' : '', !clearArmed],
    '-', ['View source on GitHub', () => window.open('https://github.com/Alps-is-Core/kitbash', '_blank', 'noopener')],
  ]);
}
function clearPage() {
  if (!clearArmed) { clearArmed = true; mainMenu(); setTimeout(() => (clearArmed = false), 3000); return; }
  clearArmed = false; hideMenu(); root.innerHTML = ''; sel = []; commit(); renderAll(); toast(`Cleared. ${modKey}Z brings it back.`);
}
$('#mainMenuBtn').onclick = (e) => { e.stopPropagation(); if (!menu.hidden && menuOwner === e.currentTarget) return hideMenu(); mainMenu(); };
$('#tplBtn').onclick = (e) => {
  if (!menu.hidden && menuOwner === e.currentTarget) return hideMenu();
  openMenu(e.currentTarget, LIB.templates.map((t) => [t.name, () => loadTemplate(t), countBlocks(t) + ' blocks']));
};
const countBlocks = (t) => t.items.reduce((a, x) => a + (Array.isArray(x) ? 1 + x[1].length : 1), 0);
function loadTemplate(t) {
  addPage(t.name);
  t.items.forEach((entry) => buildEntry(entry).forEach((n) => root.appendChild(n)));
  commit(); resetHistory(); renderAll(); renderPages(); win.scrollTo(0, 0); setTimeout(place, 300);
  toast(`Opened “${t.name}” as a new page`);
}
const THEMES = ['system', 'light', 'dark'];
let theme = store.get('kitbash:theme') || 'system';
function applyTheme() { if (theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme); $('#themeBtn').title = `Editor theme: ${theme}`; }
$('#themeBtn').onclick = () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; store.set('kitbash:theme', theme); applyTheme(); toast(`Editor theme: ${theme}`); };
applyTheme();
$('#keysBtn').onclick = () => openModal('keysModal');

/* project files */
function saveFile() {
  if (editing) editing.blur();
  curPage().html = snap();
  const json = JSON.stringify({ kitbash: 2, pages: project.pages, mine: project.mine }, null, 2);
  if (SANDBOXED) copyText(json, 'Project copied. Paste it into a .json file to keep it.');
  else { download('project.kitbash.json', json, 'application/json'); toast('Project saved'); }
}
$('#openFile').onchange = (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  f.text().then((txt) => {
    let data; try { data = JSON.parse(txt); } catch { return toast('That file isn’t valid JSON.'); }
    if (!data || !Array.isArray(data.pages) || !data.pages.length) return toast('That file isn’t a Kitbash project.');
    project = { kitbash: 2, pages: data.pages.map((p) => ({ id: p.id || uid(), name: String(p.name || 'Page'), html: String(p.html || '') })), mine: Array.isArray(data.mine) ? data.mine : [], current: null };
    project.current = project.pages[0].id; Object.keys(hists).forEach((k) => delete hists[k]);
    root.innerHTML = curPage().html; resetHistory(); saveProject(); renderChips(); renderPalette(); renderPages(); renderAll();
    toast(`Opened ${f.name}`);
  });
};

/* ════════════════════════ import ════════════════════════ */
function openModal(id) { $('#' + id).hidden = false; }
function closeModal(id) { $('#' + id).hidden = true; }
$$('[data-close]').forEach((b) => (b.onclick = () => closeModal(b.dataset.close)));
$$('.modal-bg').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));
$('#doImport').onclick = () => {
  const v = $('#importTa').value.trim(); if (!v) return toast('Paste some HTML first.');
  const t = doc.createElement('template'); t.innerHTML = v.replace(/<script[\s\S]*?<\/script>/gi, '');
  const nodes = [...t.content.children].map((n) => { if (!n.dataset.kb) n.dataset.kb = 'Imported ' + (TAGNAME[n.localName] || n.localName); return n; });
  if (!nodes.length) return toast('No elements found in that HTML.');
  insertNodes(nodes, true); closeModal('importModal'); $('#importTa').value = ''; toast(`Imported ${nodes.length} element${nodes.length > 1 ? 's' : ''}`);
};

/* ════════════════════════ export ════════════════════════ */
const VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
const INLINE = new Set('a abbr b bdi bdo br cite code data dfn em i kbd mark q s samp small span strong sub sup time u var label'.split(' '));
const JSX_ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', autofocus: 'autoFocus', enctype: 'encType', srcset: 'srcSet', crossorigin: 'crossOrigin', contenteditable: 'contentEditable', spellcheck: 'spellCheck', checked: 'defaultChecked', 'accept-charset': 'acceptCharset', 'http-equiv': 'httpEquiv', 'xlink:href': 'xlinkHref', 'xmlns:xlink': 'xmlnsXlink' };
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const BUILDER_ATTRS = ['data-kb', 'data-drop', 'data-free', 'data-kb-lock', 'contenteditable', 'spellcheck'];
function attrStr(node, jsx) {
  let s = '';
  for (const a of node.attributes) {
    let n = a.name; const v = a.value;
    if (jsx) {
      if (n === 'style') { const obj = v.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); const k = d.slice(0, i).trim(); return `${k.startsWith('--') ? JSON.stringify(k) : camel(k)}: ${JSON.stringify(d.slice(i + 1).trim())}`; }); s += ` style={{ ${obj.join(', ')} }}`; continue; }
      if (n === 'value' && /^(input|textarea|select)$/.test(node.localName)) n = 'defaultValue';
      else if (JSX_ATTR[n]) n = JSX_ATTR[n];
      else if (node.namespaceURI === SVG_NS && n.includes('-') && !n.startsWith('aria-') && !n.startsWith('data-')) n = camel(n);
      if (v === '' && /^(defaultChecked|disabled|open|required|hidden|selected|multiple|readOnly|autoFocus)$/.test(n)) { s += ' ' + n; continue; }
      s += ` ${n}=${/["\\\n]/.test(v) ? `{${JSON.stringify(v)}}` : `"${v}"`}`;
    } else s += v === '' && /^(checked|disabled|open|required|hidden|selected|multiple|readonly|autofocus)$/.test(n) ? ' ' + n : ` ${n}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
  }
  return s;
}
function escText(t, jsx) { t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return jsx ? t.replace(/[{}]/g, (m) => `{'${m}'}`) : t; }
const tpl = (s) => s.replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${');
function inlineStr(node, jsx) {
  const tag = node.localName, open = `<${tag}${attrStr(node, jsx)}`;
  if (VOID.has(tag)) return open + (jsx ? ' />' : '>');
  let inner = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) inner += escText(c.textContent.replace(/\s+/g, ' '), jsx);
    else if (c.nodeType === 1) { if (!(INLINE.has(c.localName) || c.namespaceURI === SVG_NS || VOID.has(c.localName))) return null; const s = inlineStr(c, jsx); if (s === null) return null; inner += s; }
  }
  inner = inner.trim();
  if (!inner && (jsx || node.namespaceURI === SVG_NS)) return open + ' />';
  return `${open}>${inner}</${tag}>`;
}
function ser(node, d, jsx) {
  const ind = '  '.repeat(d);
  if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' ').trim(); return t ? [ind + escText(t, jsx)] : []; }
  if (node.nodeType !== 1) return [];
  const tag = node.localName, open = `<${tag}${attrStr(node, jsx)}`;
  if (tag === 'style') { const css = node.textContent.trim(); return jsx ? [`${ind}<style>{\`${tpl(css)}\`}</style>`] : [`${ind}<style>${css}</style>`]; }
  if (tag === 'pre') return jsx ? [`${ind}${open}>{\`${tpl(node.textContent)}\`}</pre>`] : [ind + node.outerHTML];
  const one = inlineStr(node, jsx);
  if (one !== null && ind.length + one.length <= 110) return [ind + one];
  if (VOID.has(tag)) return [ind + open + (jsx ? ' />' : '>')];
  const kids = [...node.childNodes].flatMap((c) => ser(c, d + 1, jsx));
  if (!kids.length) return [ind + open + (jsx ? ' />' : `></${tag}>`)];
  return [ind + open + '>', ...kids, `${ind}</${tag}>`];
}
function cleanClone(n) {
  const c = n.cloneNode(true);
  c.querySelectorAll('[data-kb-hidden]').forEach((x) => x.remove());
  [c, ...c.querySelectorAll('*')].forEach((x) => { BUILDER_ATTRS.forEach((a) => x.removeAttribute(a)); x.removeAttribute('data-kb-hidden'); if (x.getAttribute('style') === '') x.removeAttribute('style'); });
  return c;
}
function codeFor(nodes, fmt) {
  const cl = nodes.filter((n) => !n.hasAttribute('data-kb-hidden')).map(cleanClone);
  const lines = (d, jsx) => cl.flatMap((n) => ser(n, d, jsx)).join('\n');
  if (fmt === 'html') return lines(0, false);
  if (fmt === 'react-inner') return cl.length > 1 ? `<>\n${lines(1, true)}\n</>` : lines(0, true);
  if (fmt === 'react') return `export default function ${(curPage().name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c || '').toUpperCase()).replace(/^[^A-Za-z]+/, '') || 'Page').replace(/^./, (c) => c.toUpperCase())}() {\n  return (\n    <>\n${lines(3, true)}\n    </>\n  );\n}\n`;
  if (fmt === 'vue') return `<template>\n${lines(1, false)}\n</template>\n\n<script setup>\n// Built with Kitbash. Requires Tailwind CSS v3.\n<\/script>\n`;
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${esc(curPage().name)}</title>\n  <script src="https://cdn.tailwindcss.com"><\/script>\n</head>\n<body>\n${lines(1, false)}\n</body>\n</html>\n`;
}
let codeFmt = 'html';
const exportNodes = () => ($('#selOnly').checked && sel.length ? docOrder(sel) : [...root.children].filter((c) => !isOv(c)));
function genCode() { return codeFor(exportNodes(), codeFmt); }
function hl(code) {
  return esc(code)
    .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="t">$2</span>')
    .replace(/(\s)([\w:@.-]+)=(&quot;[^&]*?&quot;)/g, '$1<span class="a">$2</span>=<span class="s">$3</span>')
    .replace(/(^|\n)(\s*\/\/[^\n]*)/g, '$1<span class="c">$2</span>');
}
function renderCode() {
  const code = genCode();
  $('#codeOut').innerHTML = hl(code);
  const n = exportNodes().length;
  $('#codeStats').textContent = `${code.split('\n').length} lines · ${(code.length / 1024).toFixed(1)} KB · ${n} top-level layer${n === 1 ? '' : 's'}`;
}
function openCode() { if (editing) editing.blur(); $('#selOnly').disabled = !sel.length; $('#selOnly').checked = sel.length > 0 && $('#selOnly').checked; renderCode(); openModal('codeModal'); }
$('#codeBtn').onclick = openCode;
$('#dlBtn').hidden = SANDBOXED;
$('#selOnly').onchange = renderCode;
$('#codeTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; codeFmt = b.dataset.f; $$('#codeTabs .btn').forEach((x) => x.classList.toggle('on', x === b)); renderCode(); });
$('#copyBtn').onclick = () => {
  const code = genCode();
  navigator.clipboard.writeText(code).then(() => toast('Copied to clipboard'), () => {
    const r = document.createRange(); r.selectNodeContents($('#codeOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    let ok = false; try { ok = document.execCommand('copy'); } catch {} toast(ok ? 'Copied' : `Code selected. Press ${modKey}C to copy.`);
  });
};
$('#dlBtn').onclick = () => { const ext = { html: 'html', react: 'jsx', vue: 'vue', page: 'html' }[codeFmt]; download(`${curPage().name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'page'}.${ext}`, genCode()); };

/* ════════════════════════ shortcuts list ════════════════════════ */
const M = modKey;
const KEYS = [
  ['Tools'], ['Move', 'V'], ['Hand / pan', 'H', 'Space'], ['Frame', 'F'], ['Rectangle', 'R'], ['Ellipse', 'O'], ['Text', 'T'], ['Place image', '⇧' + M + 'K'],
  ['Selection'], ['Select layer', 'Click'], ['Add to selection', '⇧Click'], ['Select deepest layer', M + 'Click'], ['Select inside a component / edit text', 'Double-click', '↵'], ['Select parent', '⇧↵'], ['Select all siblings', M + 'A'], ['Marquee select', 'Drag on empty space'], ['Deselect / exit tool', 'Esc'],
  ['Edit'], ['Copy / cut / paste', M + 'C', M + 'X', M + 'V'], ['Duplicate', M + 'D'], ['Delete', '⌫'], ['Undo / redo', M + 'Z', '⇧' + M + 'Z'], ['Group / ungroup into free pieces', M + 'G', '⇧' + M + 'G'], ['Frame selection', '⌥' + M + 'G'], ['Create component', '⌥' + M + 'K'], ['Add auto layout', '⇧A'], ['Hide / lock', '⇧' + M + 'H', '⇧' + M + 'L'],
  ['Arrange'], ['Nudge free layer', '←↑→↓', '⇧ ×10'], ['Reorder in flow', '↑', '↓'], ['Bring forward / send backward', M + ']', M + '['], ['Bring to front / send to back', '⌥' + M + ']', '⌥' + M + '['], ['Resize from center', '⌥ drag handle'], ['Keep proportions', '⇧ drag corner'], ['Move without snapping', M + ' drag'], ['Lock axis while moving', '⇧ drag'], ['Measure distances', '⌥ hover'],
  ['View'], ['Zoom in / out', M + '+', M + '−'], ['Zoom with wheel', M + 'scroll'], ['Zoom to fit / 100%', '⇧1', '⇧0'], ['Preview', '⌥' + M + 'P'], ['Save / open project', M + 'S', M + 'O'], ['This list', '?'],
];
$('#keysList').innerHTML = KEYS.map((k) => (k.length === 1 ? `<h4>${k[0]}</h4>` : `<div><span>${esc(k[0])}</span><span>${k.slice(1).map((x) => `<span class="kbd">${esc(x)}</span>`).join('')}</span></div>`)).join('');

/* ════════════════════════ mobile panels ════════════════════════ */
function setMobile(m) {
  $('#leftPanel').classList.toggle('open', m === 'left'); $('#rightPanel').classList.toggle('open', m === 'right');
  $$('#mtabs button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
}
$('#mtabs').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) setMobile(b.dataset.m); });

/* ════════════════════════ boot ════════════════════════ */
function renderAll() { place(); renderInspector(); renderTree(); updateInfo(); }
renderChips(); renderPalette();
initFrame(() => {
  const p = curPage();
  if (p.html !== null && p.html !== undefined) root.innerHTML = p.html;
  else { LIB.templates[0].items.forEach((e) => buildEntry(e).forEach((n) => root.appendChild(n))); p.name = p.name === 'Page 1' ? 'Landing page' : p.name; p.html = root.innerHTML; saveProject(); }
});

/* test hook for automated checks */
window.__kitbash = { get doc() { return doc; }, get root() { return root; }, get sel() { return sel; }, select, run, codeFor, buildEntry, setTool, setZoom, get zoom() { return zoom; } };
})();
