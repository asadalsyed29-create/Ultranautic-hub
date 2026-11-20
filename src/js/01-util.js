'use strict';
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const deep = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isTouch = matchMedia('(pointer:coarse)').matches;
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function fmtTime(t, fps = 30) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * fps + 1e-6);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0');
}
function fmtDur(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); }
function round(v, d = 3) { const p = Math.pow(10, d); return Math.round(v * p) / p; }

/* colors: stored as #rrggbbaa */
function hexToRgba(hx) {
  hx = (hx || '#000000ff').replace('#', '');
  if (hx.length === 3) hx = hx.split('').map(c => c + c).join('');
  if (hx.length === 6) hx += 'ff';
  const n = parseInt(hx, 16);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, (n & 255) / 255];
}
function rgbaToHex(r, g, b, a = 1) {
  const x = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + x(r) + x(g) + x(b) + x(a * 255);
}
function css(hx, mulA = 1) { const [r, g, b, a] = hexToRgba(hx); return `rgba(${r},${g},${b},${round(a * mulA, 4)})`; }
function hsv2rgb(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  return [hh, mx ? d / mx : 0, mx];
}

/* seeded random for hand-drawn wobble and grain */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

/* ================= icons (own set) ================= */
const ICONS = {
  undo: 'M9 7L4.5 11.5 9 16M5 11.5h9.5a5 5 0 010 10H11',
  redo: 'M15 7l4.5 4.5L15 16M19 11.5H9.5a5 5 0 000 10H13',
  ratio: 'M3.5 6.5h17v11h-17zM7 10v4M17 10v4',
  folder: 'M3.5 6.5h6l2 2h9v10h-17z',
  close: 'M6 6l12 12M18 6L6 18',
  start: 'M6.5 6v12M18 6.5l-8 5.5 8 5.5z',
  end: 'M17.5 6v12M6 6.5l8 5.5-8 5.5z',
  prevf: 'M15 6.5L9 12l6 5.5',
  nextf: 'M9 6.5l6 5.5-6 5.5',
  play: 'M8 5.5l11 6.5-11 6.5z',
  pause: 'M8 5.5v13M16 5.5v13',
  camera: 'M3.5 8h4l1.5-2.5h6L16.5 8h4v11h-17zM12 10.5a3.2 3.2 0 110 6.4 3.2 3.2 0 010-6.4z',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  split: 'M12 3v18M7 7.5L4 12l3 4.5M17 7.5l3 4.5-3 4.5',
  trash: 'M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5M10.5 10v7M13.5 10v7',
  dup: 'M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4',
  freeze: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5',
  detach: 'M4 15h3l4 4V5L7 9H4zM15 9.5c1.5 1.4 1.5 3.6 0 5M18 7c2.8 2.8 2.8 7.2 0 10',
  front: 'M8.5 8.5h11v11h-11zM4.5 15.5v-11h11',
  fwd: 'M12 19V6M7 10.5L12 5.5l5 5',
  back: 'M12 5v13M7 13.5l5 5 5-5',
  bottom: 'M4.5 4.5h11v11h-11zM8.5 19.5h11v-11',
  key: 'M12 3.5l8.5 8.5-8.5 8.5L3.5 12z',
  magnet: 'M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4',
  mic: 'M9 4.5a3 3 0 016 0v6a3 3 0 01-6 0zM5.5 10.5a6.5 6.5 0 0013 0M12 17v3.5M8.5 20.5h7',
  zout: 'M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L20 20M7.5 10.5h6',
  zin: 'M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L20 20M7.5 10.5h6M10.5 7.5v6',
  fit: 'M3.5 12h17M7 8.5L3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5',
  media: 'M3.5 5.5h17v13h-17zM3.5 15l5-5 4.5 4.5 3-3 4.5 4.5',
  audio: 'M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19 15.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
  text: 'M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6',
  sticker: 'M4.5 4.5h15v9l-6 6h-9zM13.5 19.5v-6h6',
  effect: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  transition: 'M3.5 5.5h7.5v13H3.5zM13 5.5h7.5v13H13M13 5.5l7.5 13',
  filter: 'M9 4.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM15 8.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11z',
  adjust: 'M5 4v16M12 4v16M19 4v16M3 15h4M10 8h4M17 13h4',
  plus: 'M12 5v14M5 12h14',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  eyeoff: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM4 20L20 4',
  lock: 'M6.5 10.5h11v9h-11zM8.5 10.5V7.5a3.5 3.5 0 017 0v3',
  unlock: 'M6.5 10.5h11v9h-11zM8.5 10.5V7.5a3.5 3.5 0 016.8-1.2',
  vol: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11',
  mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9.5l5 5M20.5 9.5l-5 5',
  edit: 'M4.5 19.5l1-4.5L15.5 5l3.5 3.5-10 10zM13 7.5l3.5 3.5',
  image: 'M3.5 5.5h17v13h-17zM8 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM20.5 15l-5-5-8 8.5',
  video: 'M3.5 6.5h12v11h-12zM15.5 10.5l5-3v9l-5-3z',
  upload: 'M12 16V4.5M7.5 9L12 4.5 16.5 9M4.5 15v4.5h15V15',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14',
  reset: 'M4.5 12a7.5 7.5 0 102.2-5.3M4.5 4.5v4h4',
  flipH: 'M12 3.5v17M9 6.5L3.5 17H9zM15 6.5l5.5 10.5H15z',
  flipV: 'M3.5 12h17M6.5 9L17 3.5V9zM6.5 15L17 20.5V15z',
  font: 'M4 19.5L10 4.5h1l6 15M6.5 13.5h8M17 12.5a2.5 2.5 0 015 0v7M22 16h-3a2 2 0 000 4h3',
  chevl: 'M14.5 6l-6 6 6 6',
  chevr: 'M9.5 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  layers: 'M12 4l8.5 4.5L12 13 3.5 8.5zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  speed: 'M4 15.5a8 8 0 1116 0M12 15.5l4-5.5',
  crop: 'M7 3.5v13.5h13.5M3.5 7H17v13.5',
  tmove: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  trot: 'M19 12a7 7 0 11-2.05-4.95M17 3.5v4h-4',
  tsize: 'M4 4h5v5H4zM15 15h5v5h-5zM9 9l6 6',
  curve: 'M3 18c5 0 6-12 18-12'
};
function icon(n, cls = 'i') { return `<svg class="${cls}" viewBox="0 0 24 24"><path d="${ICONS[n] || ''}"/></svg>`; }
function iconEl(n) { const d = document.createElement('span'); d.innerHTML = icon(n); return d.firstChild; }
function fillIcons(root = document) { for (const e of $$('[data-i]', root)) { if (e.dataset.iDone) continue; e.dataset.iDone = 1; e.insertAdjacentHTML('afterbegin', icon(e.dataset.i)); } }

/* ================= toast / modal ================= */
let toastT;
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', ms); }
function modal(title, body, buttons = [], opts = {}) {
  const bg = h('div', { class: 'modal-bg' });
  const box = h('div', { class: 'modal', style: opts.width ? { width: opts.width + 'px' } : null });
  const close = () => { bg.remove(); opts.onClose && opts.onClose(); };
  const x = h('button', { class: 'tb', onclick: close }); x.innerHTML = icon('close');
  box.append(h('h3', null, title, opts.noX ? null : x), h('div', { class: 'mb' }, body));
  if (buttons.length) box.append(h('div', { class: 'mf' }, buttons.map(b => h('button', { class: 'btn' + (b.pri ? ' pri' : ''), onclick: () => { if (b.onClick && b.onClick() === false) return; close(); } }, b.l))));
  bg.append(box);
  if (!opts.noX) bg.addEventListener('pointerdown', e => { if (e.target === bg) close(); });
  document.body.append(bg);
  return { close, box, bg };
}
function confirmBox(msg, yes = 'OK', no = 'Cancel') {
  return new Promise(res => { let v = false; modal('Please confirm', h('div', { class: 'note', style: { color: 'var(--tx)', fontSize: '13px' } }, msg), [{ l: no }, { l: yes, pri: 1, onClick: () => { v = true; } }], { onClose: () => res(v) }); });
}
function promptBox(title, value = '') {
  return new Promise(res => {
    let v = null; const inp = h('input', { class: 'txt', value });
    const m = modal(title, inp, [{ l: 'Cancel' }, { l: 'OK', pri: 1, onClick: () => { v = inp.value; } }], { onClose: () => res(v) });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { v = inp.value; m.close(); } });
    setTimeout(() => inp.focus(), 30);
  });
}

/* ================= popover ================= */
let curPop = null;
function closePop() { if (curPop) { const p = curPop; curPop = null; p.el.remove(); p.onClose && p.onClose(); } }
function openPop(anchor, el, onClose) {
  closePop();
  const pop = h('div', { class: 'pop' }, el);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const pw = Math.max(pop.offsetWidth, Math.min(r.width, 360)); pop.style.minWidth = Math.min(r.width, 360) + 'px';
  const ph = pop.offsetHeight;
  let x = Math.min(r.left, W - pw - 4), y = r.bottom + 2;
  if (y + ph > H - 4) y = Math.max(4, r.top - ph - 2 > 4 ? r.top - ph - 2 : H - ph - 4);
  pop.style.left = Math.max(4, x) + 'px'; pop.style.top = y + 'px';
  curPop = { el: pop, onClose, anchor };
  return pop;
}
document.addEventListener('pointerdown', e => { if (curPop && !curPop.el.contains(e.target) && !curPop.anchor.contains(e.target)) closePop(); }, true);

/* ================= controls ================= */
// Numeric text field with drag-to-scrub. opts: {value,min,max,step,dec,suf,onInput(v,final),width}
function numField(o) {
  const w = h('div', { class: 'numw' });
  const inp = h('input', { class: 'num', inputmode: 'decimal', spellcheck: 'false', autocomplete: 'off' });
  if (o.suf) w.classList.add('hs');
  const fmt = v => { const d = o.dec != null ? o.dec : 2; return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString(); };
  let val = o.value;
  const set = v => { val = v; if (document.activeElement !== inp) inp.value = fmt(v); };
  set(val);
  const parse = s => {
    s = String(s).trim().replace(/x$/i, '').replace(/,/g, '');
    if (s === '') return null;
    let v; try { v = /^[-+*/().\d\se]+$/i.test(s) ? Function('return (' + s + ')')() : parseFloat(s); } catch (e) { v = parseFloat(s); }
    if (!isFinite(v)) return null;
    if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v);
    return v;
  };
  const commit = () => { const v = parse(inp.value); if (v == null) { inp.value = fmt(val); return; } val = v; inp.value = fmt(v); o.onInput && o.onInput(v, true); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { inp.blur(); } if (e.key === 'Escape') { inp.value = fmt(val); inp.blur(); } e.stopPropagation(); });
  inp.addEventListener('blur', commit);
  inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0));
  // drag scrub (mouse only; on touch, tapping edits)
  inp.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || document.activeElement === inp) return;
    e.preventDefault();
    const x0 = e.clientX, v0 = val; let moved = false;
    const step = o.step || 1;
    const mv = ev => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 3) return; moved = true;
      let v = v0 + Math.round(dx / 2) * step * (ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1);
      if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v);
      val = v; inp.value = fmt(v); o.onInput && o.onInput(v, false);
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (!moved) { inp.focus(); } else o.onInput && o.onInput(val, true); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  w.append(inp);
  if (o.suf) w.append(h('span', { class: 'suf' }, o.suf));
  w.set = set; w.inp = inp;
  return w;
}
// Range slider (own drawing). returns element with .set(v)
function slider(o) {
  const el = h('div', { class: 'rng' }), f = h('div', { class: 'f' }), k = h('div', { class: 'k' });
  el.append(f, k);
  let val = o.value;
  const pos = v => (clamp(v, o.min, o.max) - o.min) / (o.max - o.min);
  const zero = o.center != null ? pos(o.center) : 0;
  const draw = () => { const p = pos(val); k.style.left = p * 100 + '%'; f.style.left = Math.min(p, zero) * 100 + '%'; f.style.width = Math.abs(p - zero) * 100 + '%'; };
  el.set = v => { val = v; draw(); };
  draw();
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const at = ev => { let v = o.min + clamp((ev.clientX - r.left) / r.width, 0, 1) * (o.max - o.min); const s = o.step || 0.01; v = Math.round(v / s) * s; v = round(v, 4); val = v; draw(); o.onInput(v, false); };
    at(e);
    const mv = ev => at(ev), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); o.onInput(val, true); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', () => { if (o.def != null) { val = o.def; draw(); o.onInput(val, true); } });
  return el;
}
// Custom dropdown. options: [{v,l,g(group),small,font}]
function selectBox(o) {
  const b = h('button', { class: 'fsel', type: 'button' }), sp = h('span'), ch = h('i');
  b.append(sp, ch);
  let val = o.value;
  const lab = () => { const x = o.options.find(z => z.v === val); sp.textContent = x ? x.l : (o.placeholder || String(val)); if (x && x.font) sp.style.fontFamily = x.font; };
  lab();
  b.set = v => { val = v; lab(); };
  b.addEventListener('click', () => {
    if (curPop && curPop.anchor === b) { closePop(); return; }
    const list = h('div');
    let lastG = null, onEl = null;
    for (const x of o.options) {
      if (x.g && x.g !== lastG) { list.append(h('div', { class: 'gh' }, x.g)); lastG = x.g; }
      const it = h('div', { class: 'opt' + (x.v === val ? ' on' : ''), style: x.font ? { fontFamily: x.font, fontSize: '14px' } : null, onclick: () => { val = x.v; lab(); closePop(); o.onChange(x.v); } }, x.l, x.small ? h('small', null, x.small) : null);
      if (x.v === val) onEl = it;
      list.append(it);
    }
    b.classList.add('open');
    const pop = openPop(b, list, () => b.classList.remove('open'));
    if (onEl) pop.scrollTop = onEl.offsetTop - 60;
  });
  return b;
}
function segBox(o) {
  const el = h('div', { class: 'seg' });
  const btns = o.options.map(x => { const bt = h('button', { type: 'button', title: x.t || x.l, onclick: () => { set(x.v); o.onChange(x.v); } }); if (x.i) bt.innerHTML = icon(x.i); if (x.l) bt.append(x.l); bt.v = x.v; return bt; });
  const set = v => btns.forEach(bt => bt.classList.toggle('on', bt.v === v));
  set(o.value); el.append(...btns); el.set = set;
  return el;
}
function checkBox(label, value, onChange) {
  const el = h('div', { class: 'chk' + (value ? ' on' : '') }, h('i'), label || '');
  el.addEventListener('click', e => { e.stopPropagation(); value = !value; el.classList.toggle('on', value); onChange(value); });
  el.set = v => { value = v; el.classList.toggle('on', !!v); };
  return el;
}
// Color swatch + own picker
const SWATCHES = ['#ffffff', '#d9d9d9', '#8c8c8c', '#3a3a3a', '#000000', '#ff3b30', '#ff8a1f', '#ffd60a', '#3fd6c0', '#34c759', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff2d78', '#a2845e', '#f5d0a9', '#1b3a5c', '#7a1f1f'];
function colorBtn(o) {
  const b = h('div', { class: 'sw' }), i = h('i');
  b.append(i);
  let val = o.value || '#ffffffff';
  const paint = () => i.style.background = css(val);
  paint();
  b.set = v => { val = v; paint(); };
  b.addEventListener('click', () => {
    if (curPop && curPop.anchor === b) { closePop(); return; }
    let [r, g, bb, a] = hexToRgba(val); let [hh, s, v] = rgb2hsv(r, g, bb);
    const sv = h('div', { class: 'sv' }), w = h('div', { class: 'w' }), bl = h('div', { class: 'b' }), dot = h('div', { class: 'dot' });
    sv.append(w, bl, dot);
    const hue = h('div', { class: 'bar hue' }), hk = h('b'); hue.append(hk);
    const alp = h('div', { class: 'bar alp' }), ai = h('i'), ak = h('b'); alp.append(ai, ak);
    const hex = h('input', { class: 'txt', spellcheck: 'false' });
    const sws = h('div', { class: 'sws' });
    const upd = (fromHex) => {
      sv.style.background = `hsl(${hh},100%,50%)`;
      dot.style.left = s * 100 + '%'; dot.style.top = (1 - v) * 100 + '%';
      hk.style.left = hh / 360 * 100 + '%'; ak.style.left = a * 100 + '%';
      const [R, G, B] = hsv2rgb(hh, s, v);
      ai.style.background = `linear-gradient(90deg,rgba(${R|0},${G|0},${B|0},0),rgb(${R|0},${G|0},${B|0}))`;
      val = rgbaToHex(R, G, B, a); paint();
      if (!fromHex) hex.value = val.slice(0, 7) + (a < 1 ? val.slice(7) : '');
    };
    const drag = (el, fn) => el.addEventListener('pointerdown', e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      const at = ev => { const r = el.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); upd(); o.onInput(val, false); };
      at(e);
      const mv = ev => at(ev), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); o.onInput(val, true); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
    });
    drag(sv, (x, y) => { s = x; v = 1 - y; });
    drag(hue, x => { hh = x * 360; });
    if (o.alpha !== false) drag(alp, x => { a = round(x, 3); });
    hex.addEventListener('input', () => { const t = hex.value.trim(); if (/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.test(t)) { [r, g, bb, a] = hexToRgba(t.startsWith('#') ? t : '#' + t); [hh, s, v] = rgb2hsv(r, g, bb); upd(true); o.onInput(val, true); } });
    hex.addEventListener('keydown', e => e.stopPropagation());
    for (const c of SWATCHES) sws.append(h('i', { style: { background: c }, onclick: () => { [r, g, bb] = hexToRgba(c); [hh, s, v] = rgb2hsv(r, g, bb); upd(); o.onInput(val, true); } }));
    const box = h('div', { class: 'cp' }, sv, hue, o.alpha === false ? null : alp, h('div', { class: 'hexr' }, h('span', { class: 'note' }, 'Hex'), hex), sws);
    upd();
    openPop(b, box);
  });
  return b;
}
// one property row
function row(label, ...ctl) { return h('div', { class: 'row' }, h('label', { title: label }, label), h('div', { class: 'ctl' }, ...ctl)); }
function rangeRow(label, o) {
  const s = slider({ ...o, onInput: (v, f) => { n.set(v); o.onInput(v, f); } });
  const n = numField({ value: o.value, min: o.min, max: o.max, step: o.step, dec: o.dec != null ? o.dec : (o.step < 1 ? 2 : 0), suf: o.suf, onInput: (v, f) => { s.set(v); o.onInput(v, f); } });
  const r = row(label, s, n);
  r.set = v => { s.set(v); n.set(v); };
  return r;
}
