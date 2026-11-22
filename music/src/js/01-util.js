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
    else if (k === 'style' && typeof v === 'object') { for (const sk in v) sk.startsWith('--') ? e.style.setProperty(sk, v[sk]) : (e.style[sk] = v[sk]); }
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
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }


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
// one property row
function row(label, ...ctl) { return h('div', { class: 'row' }, h('label', { title: label }, label), h('div', { class: 'ctl' }, ...ctl)); }
function rangeRow(label, o) {
  const s = slider({ ...o, onInput: (v, f) => { n.set(v); o.onInput(v, f); } });
  const n = numField({ value: o.value, min: o.min, max: o.max, step: o.step, dec: o.dec != null ? o.dec : (o.step < 1 ? 2 : 0), suf: o.suf, onInput: (v, f) => { s.set(v); o.onInput(v, f); } });
  const r = row(label, s, n);
  r.set = v => { s.set(v); n.set(v); };
  return r;
}
