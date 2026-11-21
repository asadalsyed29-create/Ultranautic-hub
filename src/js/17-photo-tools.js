/* ================= Photo editor tools ================= */
Object.assign(ICONS, {
  ptf: 'M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
  pmarq: 'M4 4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4M4 7V4',
  plasso: 'M12 4c5 0 8.5 2.3 8.5 5.2S17 14.5 12 14.5 3.5 12.2 3.5 9.2 7 4 12 4zM7 13.5c-1 1.5-.5 3 1 3.5s1.5 2 0 3.5',
  pwand: 'M4 20l11-11M13.5 7.5l3 3M18 3v3M16.5 4.5h3M20 9v2M19 10h2M10 4v2M9 5h2',
  pqsel: 'M9.5 14.5l8-8 2 2-8 8zM9.5 14.5c-2 0-3 1.2-3 3s-1 2.5-3 3c3 .5 6-.5 6-3.5M3.5 4.5h2M3.5 8.5h2M7.5 3.5v2',
  pcrop: 'M7 3v14h14M3 7h14v14',
  pheal: 'M4.5 14.5l10-10a3 3 0 014.2 4.2l-10 10a3 3 0 01-4.2-4.2zM9.5 9.5l5 5M11 11h.01M13 13h.01',
  phealb: 'M12 5v14M5 12h14M8.5 3.5h7v4.5h4.5v7h-4.5v4.5h-7V15H4V8h4.5z',
  pclone: 'M9 3.5h6v4l-1 3h5v4H5v-4h5l-1-3zM5 18h14v2.5H5z',
  predeye: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  pgrad: 'M3.5 4.5h17v15h-17zM7 4.5v15M10 4.5v15M12.5 4.5v15M14.5 4.5v15M16 4.5v15',
  pdodge: 'M12 13v8M12 3.5a4.75 4.75 0 110 9.5 4.75 4.75 0 010-9.5z',
  pburn: 'M8 21v-6c-2-1-3-3-2.5-5L7 7.5c.3-1 1.7-1 2 0V12V4.5c0-1.3 2-1.3 2 0V11V3.5c0-1.3 2-1.3 2 0V11V5c0-1.3 2-1.3 2 0v7c0 3-1 4.5-2 5v4',
  psponge: 'M4 9.5C4 7.5 6 6 8 6h8c2 0 4 1.5 4 3.5v6c0 2-2 3.5-4 3.5H8c-2 0-4-1.5-4-3.5zM8 10h.01M12 12h.01M16 10h.01M10 15h.01M15 15h.01',
  pblur: 'M12 3.5s6 6.5 6 10.5a6 6 0 01-12 0c0-4 6-10.5 6-10.5z',
  psharp: 'M12 3.5l8.5 16h-17z',
  psmudge: 'M10 21v-9.5a1.5 1.5 0 013 0V8.5a1.5 1.5 0 013 0v7.5c0 3-2 5-4 5zM4 6c3-1 6-1 8 1',
  pliq: 'M12 11a1 1 0 110 2 1 1 0 010-2zM12 12c3 0 4-2.5 3-4.5S11 4 8 6s-4 6-1 10 10 5 13 0',
  ptext: 'M5 5.5h14M12 5.5v13M9 18.5h6'
});
const PH_TOOLS = [['tf', 'Move', 'ptf'], ['marquee', 'Select box', 'pmarq'], ['lasso', 'Lasso', 'plasso'], ['wand', 'Magic wand', 'pwand'], ['qsel', 'Quick select', 'pqsel'], ['crop', 'Crop', 'pcrop'],
  ['brush', 'Brush', 'dbrush'], ['eraser', 'Eraser', 'deraser'], ['spot', 'Spot heal', 'pheal'], ['healb', 'Healing', 'phealb'], ['clone', 'Clone', 'pclone'], ['redeye', 'Red eye', 'predeye'],
  ['gradient', 'Gradient', 'pgrad'], ['fill', 'Bucket', 'dfill'], ['pick', 'Eyedropper', 'dpick'], ['text', 'Text', 'ptext'], ['shape', 'Shapes', 'dshape'], ['line', 'Line', 'dline'],
  ['dodge', 'Dodge', 'pdodge'], ['burn', 'Burn', 'pburn'], ['sponge', 'Sponge', 'psponge'], ['blurb', 'Blur', 'pblur'], ['sharpb', 'Sharpen', 'psharp'], ['smudge', 'Smudge', 'psmudge'], ['liquify', 'Liquify', 'pliq']];
Object.assign(DW_PREF, Object.assign({ selMode: 'new', feather: 0, marq: 'rect', lasso: 'free', wtol: 32, wcont: true, wall: true, qadd: true, qsmart: true, cropR: 'free', psize: 60, phard: 50, pstr: 50, csample: 'layer', caligned: true, gtype: 'linear', gcols: 'fb', grev: false, bg: '#ffffffff', drange: 'mid', sponge: 'desat', liq: 'push', tfKeep: true }, DW_PREF));
// re-apply any saved preferences over the defaults above
try { Object.assign(DW_PREF, JSON.parse(localStorage.getItem('fw-draw') || '{}')); } catch (e) { }
const PH_H = {};

/* ---------- shared option rows ---------- */
function selModeRow(o) {
  o.append(h('div', { class: 'dwo' }, h('label', null, 'Mode'), segBox({ options: [{ v: 'new', l: 'New' }, { v: 'add', l: 'Add' }, { v: 'sub', l: 'Take away' }, { v: 'int', l: 'Overlap' }], value: DW_PREF.selMode, onChange: v => { DW_PREF.selMode = v; savePref(); } })));
  o.append(rangeRow('Soft edge', { min: 0, max: 200, step: 1, value: DW_PREF.feather, suf: 'px', onInput: v => { DW_PREF.feather = v; savePref(); } }));
}
function selQuick(o) {
  o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn sm', onclick: () => { phSetSel(phSelInvert(null), 'new'); } }, 'All'), h('button', { class: 'btn sm', onclick: phDeselect }, 'None'), h('button', { class: 'btn sm', onclick: () => { if (DW.sel) { DW.sel = phSelInvert(DW.sel); phSelChanged(); } } }, 'Invert')));
}
function brushRows(o, str, strLabel) {
  o.append(rangeRow('Size', { min: 1, max: 800, step: 1, value: DW_PREF.psize, suf: 'px', onInput: v => { DW_PREF.psize = v; savePref(); } }));
  o.append(rangeRow('Hardness', { min: 0, max: 100, step: 1, value: DW_PREF.phard, suf: '%', onInput: v => { DW_PREF.phard = v; savePref(); } }));
  if (str) o.append(rangeRow(strLabel || 'Strength', { min: 1, max: 100, step: 1, value: DW_PREF.pstr, suf: '%', onInput: v => { DW_PREF.pstr = v; savePref(); } }));
}
function needPixels(L) {
  L = L || dwTarget();
  if (!L.isMask && L.kind === 'adj') { toast('This is an adjustment layer. Pick a picture layer first.'); return false; }
  if (!L.isMask && L.kind === 'text') { toast('This is a text layer. Use Layer > Text to pixels first.'); return false; }
  if (!L.isMask && !L.vis) { toast('This layer is hidden'); return false; }
  return true;
}
const softTip = () => tintedTip({ tip: 'round', hard: DW_PREF.phard / 100, ratio: 1 }, '#ffffffff');
// walks a stroke and calls dab(x, y, dx, dy) every few pixels
function stepper(p, dab, spacing) {
  let last = { x: p.x, y: p.y }, dist = 0; dab(p.x, p.y, 0, 0);
  return q => {
    const dx = q.x - last.x, dy = q.y - last.y, L = Math.hypot(dx, dy), step = spacing(); if (L < 1e-6) return;
    let t = step - dist, px = last.x, py = last.y;
    while (t <= L) { const nx = last.x + dx * t / L, ny = last.y + dy * t / L; dab(nx, ny, nx - px, ny - py); px = nx; py = ny; t += step; }
    dist = L - (t - step); last = { x: q.x, y: q.y };
  };
}
function boxOf(x, y, r) { const x0 = Math.max(0, Math.floor(x - r)), y0 = Math.max(0, Math.floor(y - r)), x1 = Math.min(DW.w, Math.ceil(x + r)), y1 = Math.min(DW.h, Math.ceil(y + r)); return x1 > x0 && y1 > y0 ? { x0, y0, w: x1 - x0, h: y1 - y0 } : null; }
const falloff = (d, r) => { if (d >= r) return 0; const hard = DW_PREF.phard / 100, t = d / r; return t <= hard ? 1 : 1 - Math.pow((t - hard) / (1 - hard + 1e-6), 2) * (3 - 2 * (t - hard) / (1 - hard + 1e-6)); };
const selAt = (() => { let cache = null, src = null; return (x, y) => { if (!DW.sel) return 1; if (src !== DW.sel || DW.selVer !== cache.v) { src = DW.sel; cache = { v: DW.selVer, d: DW.sel.getContext('2d').getImageData(0, 0, DW.w, DW.h).data }; } return cache.d[(y * DW.w + x) * 4 + 3] / 255; }; })();

/* ---------- Move: Regular move, Mesh move, Perspective move ---------- */
function phTfBegin() {
  const L = DW.layers[DW.cur]; DW.tf = null;
  if (L.kind === 'adj') { toast('Adjustment layers have nothing to move'); return; }
  if (L.kind === 'text') { DW.tf = { L, text: true }; return; }
  const W = DW.w, H = DW.h, src = L.cv;
  let sel = DW.sel, box;
  const a = src.getContext('2d').getImageData(0, 0, W, H).data, sa = sel ? sel.getContext('2d').getImageData(0, 0, W, H).data : null;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4 + 3; if (a[i] && (!sa || sa[i] > 8)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) { DW.tf = { L, empty: true }; return; }
  box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  const fl = newLayerCanvas(box.w, box.h), fx = fl.getContext('2d'); fx.drawImage(src, -box.x, -box.y);
  if (sel) { fx.globalCompositeOperation = 'destination-in'; fx.drawImage(sel, -box.x, -box.y); }
  const base = copyCv(src), bx = base.getContext('2d'); if (sel) { bx.globalCompositeOperation = 'destination-out'; bx.drawImage(sel, 0, 0); } else bx.clearRect(0, 0, W, H);
  DW.tf = { L, fl, base, w: box.w, h: box.h, cx: box.x + box.w / 2, cy: box.y + box.h / 2, sx: 1, sy: 1, rot: 0, q: null, m: null, hadSel: !!sel, mode: 'free' };
  const want = DW_PREF.tfMode || 'free'; if (want !== 'free') tfSetMode(DW.tf, want);
  DW.live = LL => LL === L ? phTfImage() : LL.cv;
}
function tfCorners(t) { const c = Math.cos(t.rot), s = Math.sin(t.rot); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const lx = a * t.w / 2 * t.sx, ly = b * t.h / 2 * t.sy; return [t.cx + lx * c - ly * s, t.cy + lx * s + ly * c]; }); }
// a true perspective map of the unit square onto 4 corners (top-left, top-right, bottom-right, bottom-left)
function homog(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, c = x0, d, e, f = y0, g = 0, hh = 0;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) { a = x1 - x0; b = x3 - x0; d = y1 - y0; e = y3 - y0; }
  else { const det = dx1 * dy2 - dx2 * dy1 || 1e-9; g = (dx3 * dy2 - dx2 * dy3) / det; hh = (dx1 * dy3 - dx3 * dy1) / det; a = x1 - x0 + g * x1; b = x3 - x0 + hh * x3; d = y1 - y0 + g * y1; e = y3 - y0 + hh * y3; }
  return (u, v) => { const w = g * u + hh * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}
// a smooth surface through the mesh points
function meshMap(m) {
  const C = m.c, R = m.r, P = m.p, G = (i, j) => { if (i < 0) { const a = G(0, j), b = G(1, j); return [2 * a[0] - b[0], 2 * a[1] - b[1]]; } if (i > C) { const a = G(C, j), b = G(C - 1, j); return [2 * a[0] - b[0], 2 * a[1] - b[1]]; } if (j < 0) { const a = G(i, 0), b = G(i, 1); return [2 * a[0] - b[0], 2 * a[1] - b[1]]; } if (j > R) { const a = G(i, R), b = G(i, R - 1); return [2 * a[0] - b[0], 2 * a[1] - b[1]]; } return P[j * (C + 1) + i]; };
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); };
  return (u, v) => {
    const gx = clamp(u, 0, 1) * C, gy = clamp(v, 0, 1) * R, i = Math.min(C - 1, Math.floor(gx)), j = Math.min(R - 1, Math.floor(gy)), fx = gx - i, fy = gy - j;
    const rows = [-1, 0, 1, 2].map(dj => cr(G(i - 1, j + dj), G(i, j + dj), G(i + 1, j + dj), G(i + 2, j + dj), fx));
    return cr(rows[0], rows[1], rows[2], rows[3], fy);
  };
}
function tfMap(t) {
  if (t.mode === 'persp' && t.q) return homog(t.q);
  if (t.mode === 'mesh' && t.m) return meshMap(t.m);
  const c = Math.cos(t.rot), s = Math.sin(t.rot);
  return (u, v) => { const lx = (u - .5) * t.w * t.sx, ly = (v - .5) * t.h * t.sy; return [t.cx + lx * c - ly * s, t.cy + lx * s + ly * c]; };
}
function tfSetMode(t, mode) {
  if (mode === t.mode) return;
  const P = tfMap(t);
  if (mode === 'free') { tfBake(t); }
  else if (mode === 'persp') { t.q = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]; t.m = null; }
  else { const n = DW_PREF.meshN || 3; t.m = { c: n, r: n, p: [] }; for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) t.m.p.push(P(i / n, j / n)); t.q = null; }
  t.mode = mode; DW_PREF.tfMode = mode; savePref();
}
// turns a bent shape back into a plain box so Regular move can carry on from it
function tfBake(t) {
  if (t.mode === 'free') return;
  const P = tfMap(t); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let j = 0; j <= 24; j++) for (let i = 0; i <= 24; i++) { const [X, Y] = P(i / 24, j / 24); x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y); }
  x0 = Math.floor(x0); y0 = Math.floor(y0); const w = Math.max(1, Math.ceil(x1) - x0), hh = Math.max(1, Math.ceil(y1) - y0);
  const o = newLayerCanvas(w, hh), x = o.getContext('2d'); x.translate(-x0, -y0); phTfDraw(x, t);
  Object.assign(t, { fl: o, w, h: hh, cx: x0 + w / 2, cy: y0 + hh / 2, sx: 1, sy: 1, rot: 0, q: null, m: null, mode: 'free', moved: true });
}
function drawWarp(x, img, P, N) {
  const W = img.width, H = img.height, grid = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) grid.push(P(i / N, j / N));
  const at = (i, j) => grid[j * (N + 1) + i];
  const tri = (s0, s1, s2, d0, d1, d2) => {
    x.save(); const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = p => [p[0] + (p[0] - cx) * .02, p[1] + (p[1] - cy) * .02];
    const e0 = g(d0), e1 = g(d1), e2 = g(d2); x.beginPath(); x.moveTo(e0[0], e0[1]); x.lineTo(e1[0], e1[1]); x.lineTo(e2[0], e2[1]); x.closePath(); x.clip();
    const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]); if (Math.abs(den) < 1e-9) { x.restore(); return; }
    const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den, b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
    const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den, d = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
    const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den, f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    x.transform(a, b, c, d, e, f); x.drawImage(img, 0, 0); x.restore();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const s00 = [i / N * W, j / N * H], s10 = [(i + 1) / N * W, j / N * H], s11 = [(i + 1) / N * W, (j + 1) / N * H], s01 = [i / N * W, (j + 1) / N * H];
    tri(s00, s10, s11, at(i, j), at(i + 1, j), at(i + 1, j + 1)); tri(s00, s11, s01, at(i, j), at(i + 1, j + 1), at(i, j + 1));
  }
}
function phTfDraw(x, t) {
  if (t.mode === 'persp' && t.q) drawWarp(x, t.fl, homog(t.q), 18);
  else if (t.mode === 'mesh' && t.m) drawWarp(x, t.fl, meshMap(t.m), clamp(Math.max(t.m.c, t.m.r) * 6, 18, 36));
  else { x.save(); x.translate(t.cx, t.cy); x.rotate(t.rot); x.scale(t.sx, t.sy); x.drawImage(t.fl, -t.w / 2, -t.h / 2); x.restore(); }
}
function phTfImage(t = DW.tf) { const o = tmpCv('tfo'), x = o.getContext('2d'); x.drawImage(t.base, 0, 0); phTfDraw(x, t); return o; }
function phTfApply(cancel) {
  const t = DW.tf; DW.tf = null; if (!t) return;
  if (t.text || t.empty || cancel) { DW.live = null; dwRender(); return; }
  const changed = t.mode !== 'free' || t.sx !== 1 || t.sy !== 1 || t.rot || t.moved;
  if (!changed) { DW.live = null; return; }
  dwSnap(t.L); const r = phTfImage(t), x = ctxReset(t.L.cv.getContext('2d')); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(r, 0, 0); dirty(t.L);
  if (t.hadSel) { const m = newLayerCanvas(DW.w, DW.h), mx = m.getContext('2d'); const fm = newLayerCanvas(t.fl.width, t.fl.height), fmx = fm.getContext('2d'); fmx.drawImage(t.fl, 0, 0); fmx.globalCompositeOperation = 'source-in'; fmx.fillStyle = '#fff'; fmx.fillRect(0, 0, fm.width, fm.height); phTfDraw(mx, { ...t, fl: fm }); DW.sel = m; phSelChanged(); }
  DW.live = null; dwRender();
}
// the outline of the moved part, for "tap inside to drag it all"
function tfOutline(t) { const P = tfMap(t), o = [], n = t.mode === 'mesh' ? 12 : 1; for (let i = 0; i < n; i++) o.push(P(i / n, 0)); for (let i = 0; i < n; i++) o.push(P(1, i / n)); for (let i = n; i > 0; i--) o.push(P(i / n, 1)); for (let i = n; i > 0; i--) o.push(P(0, i / n)); return o; }
function tfResample(t, c, r) { const P = meshMap(t.m), p = []; for (let j = 0; j <= r; j++) for (let i = 0; i <= c; i++) p.push(P(i / c, j / r)); t.m = { c, r, p }; }
PH_H.tf = {
  ui(o) {
    if (!DW.tf || DW.tf.L !== DW.layers[DW.cur]) phTfBegin();
    const t = DW.tf; if (!t) return;
    if (t.empty) { o.append(h('div', { class: 'hint' }, 'This layer is empty here. Pick another layer in Layers.')); return; }
    if (t.text) { o.append(h('div', { class: 'hint' }, 'Drag to move the text. Use the Text tool to change it.')); return; }
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Mode'), segBox({ options: [{ v: 'free', l: 'Regular' }, { v: 'mesh', l: 'Mesh' }, { v: 'persp', l: 'Perspective' }], value: t.mode, onChange: v => { tfSetMode(t, v); dwToolUI(); dwRender(); } })));
    const b = (l, f) => h('button', { class: 'btn sm', onclick: () => { f(); dwRender(); } }, l);
    const flipQ = (q, k) => k === 'm' ? [q[1], q[0], q[3], q[2]] : k === 'f' ? [q[3], q[2], q[1], q[0]] : [q[3], q[0], q[1], q[2]];
    const flipM = k => { const { c, r, p } = t.m, n = []; for (let j = 0; j <= r; j++) for (let i = 0; i <= c; i++) n.push(p[(k === 'f' ? r - j : j) * (c + 1) + (k === 'm' ? c - i : i)]); t.m.p = n; };
    if (t.mode === 'free') {
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Keep proportions', DW_PREF.tfKeep, v => { DW_PREF.tfKeep = v; savePref(); })));
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), b('Mirror', () => { t.sx *= -1; }), b('Flip', () => { t.sy *= -1; }), b('Turn 90°', () => { t.rot += Math.PI / 2; })));
    } else if (t.mode === 'persp') {
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), b('Mirror', () => { t.q = flipQ(t.q, 'm'); }), b('Flip', () => { t.q = flipQ(t.q, 'f'); }), b('Turn 90°', () => { t.q = flipQ(t.q, 't'); })));
    } else {
      const cnt = h('span', { class: 'hint' }, (t.m.c + 1) * (t.m.r + 1) + ' points');
      const set = (c, r) => { c = clamp(c, 1, 12); r = clamp(r, 1, 12); if (c === t.m.c && r === t.m.r) return; tfResample(t, c, r); DW_PREF.meshN = Math.max(c, r); savePref(); cnt.textContent = (c + 1) * (r + 1) + ' points'; dwRender(); };
      o.append(h('div', { class: 'dwo' }, h('label', null, 'Points'), b('More', () => set(t.m.c + 1, t.m.r + 1)), b('Fewer', () => set(t.m.c - 1, t.m.r - 1)), cnt));
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), b('More across', () => set(t.m.c + 1, t.m.r)), b('More down', () => set(t.m.c, t.m.r + 1))));
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), b('Mirror', () => flipM('m')), b('Flip', () => flipM('f')), b('Straighten', () => { const n = t.m.c, r = t.m.r, P = tfMap({ ...t, mode: 'persp', q: [t.m.p[0], t.m.p[n], t.m.p[(r + 1) * (n + 1) - 1], t.m.p[r * (n + 1)]] }), p = []; for (let j = 0; j <= r; j++) for (let i = 0; i <= n; i++) p.push(P(i / n, j / r)); t.m.p = p; })));
    }
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn pri sm', onclick: () => { phTfApply(); phTfBegin(); dwToolUI(); } }, 'Apply'), h('button', { class: 'btn sm', onclick: () => { phTfApply(true); phTfBegin(); dwToolUI(); } }, 'Cancel')));
    const what = DW.sel ? 'Moving the selected part. ' : 'Moving the whole layer. ';
    o.append(h('div', { class: 'hint' }, what + (t.mode === 'mesh' ? 'Drag any point to bend the picture, including the points along the sides and top. Tap a line between points to add a row or column there. Drag inside to move it all.' : t.mode === 'persp' ? 'Drag a corner for perspective. Drag the middle of a side or the top to move that whole edge. Drag inside to move it all.' : 'Drag inside to move, corners or side handles to resize, the round handle (or outside the box) to turn.')));
  },
  down(p, e) {
    const t = DW.tf; if (!t || t.empty) return;
    if (t.text) { const L = t.L, x0 = L.text.x, y0 = L.text.y; phSnapDoc(); return { move: q => { L.text.x = x0 + q.x - p.x; L.text.y = y0 + q.y - p.y; phRenderText(L); } }; }
    const z = DW.view.z, hr = 22 / z, near = (a, b) => Math.hypot(a[0] - b.x, a[1] - b.y) < hr;
    if (t.mode === 'persp') {
      const q0 = t.q.map(v => v.slice()), k = t.q.findIndex(c => near(c, p));
      if (k >= 0) return { move: q => { t.q[k] = [q.x, q.y]; } };
      const P = homog(t.q), sides = [[.5, 0, 0, 1], [1, .5, 1, 2], [.5, 1, 2, 3], [0, .5, 3, 0]];
      for (const [u, v, a, b] of sides) if (near(P(u, v), p)) return { move: q => { const dx = q.x - p.x, dy = q.y - p.y; t.q[a] = [q0[a][0] + dx, q0[a][1] + dy]; t.q[b] = [q0[b][0] + dx, q0[b][1] + dy]; } };
      if (inPoly(p, t.q)) return { move: q => { t.q = q0.map(([a, b]) => [a + q.x - p.x, b + q.y - p.y]); } };
      return;
    }
    if (t.mode === 'mesh') {
      const m = t.m; let k = -1, best = hr; m.p.forEach((c, i) => { const d = Math.hypot(c[0] - p.x, c[1] - p.y); if (d < best) { best = d; k = i; } });
      if (k >= 0) return { move: q => { m.p[k] = [q.x, q.y]; } };
      // tap on a line between points: add a row or a column of points right there
      const P = meshMap(m), S = 40; let hit = null, hb = hr * .7;
      for (let i = 0; i <= m.c; i++) for (let s = 0; s <= S; s++) { const c = P(i / m.c, s / S), d = Math.hypot(c[0] - p.x, c[1] - p.y); if (d < hb) { hb = d; hit = { dir: 'row', v: s / S }; } }
      for (let j = 0; j <= m.r; j++) for (let s = 0; s <= S; s++) { const c = P(s / S, j / m.r), d = Math.hypot(c[0] - p.x, c[1] - p.y); if (d < hb) { hb = d; hit = { dir: 'col', u: s / S }; } }
      if (hit && ((hit.dir === 'row' && m.r < 12) || (hit.dir === 'col' && m.c < 12))) {
        const us = [], vs = []; for (let i = 0; i <= m.c; i++) us.push(i / m.c); for (let j = 0; j <= m.r; j++) vs.push(j / m.r);
        if (hit.dir === 'row') { if (vs.some(v => Math.abs(v - hit.v) < .03)) hit = null; else { vs.push(hit.v); vs.sort((a, b) => a - b); } }
        else { if (us.some(u => Math.abs(u - hit.u) < .03)) hit = null; else { us.push(hit.u); us.sort((a, b) => a - b); } }
        if (hit) { const np = []; for (const v of vs) for (const u of us) np.push(P(u, v)); t.m = { c: us.length - 1, r: vs.length - 1, p: np }; dwToolUI(); return; }
      }
      const out = tfOutline(t); if (inPoly(p, out)) { const p0 = m.p.map(v => v.slice()); return { move: q => { m.p = p0.map(([a, b]) => [a + q.x - p.x, b + q.y - p.y]); } }; }
      return;
    }
    const C = tfCorners(t);
    const s0 = { cx: t.cx, cy: t.cy, sx: t.sx, sy: t.sy, rot: t.rot };
    const top = [(C[0][0] + C[1][0]) / 2, (C[0][1] + C[1][1]) / 2], ang = t.rot - Math.PI / 2, knob = [top[0] + Math.cos(ang) * 34 / z * Math.sign(t.sy || 1), top[1] + Math.sin(ang) * 34 / z * Math.sign(t.sy || 1)];
    const rotate = () => { const a0 = Math.atan2(p.y - t.cy, p.x - t.cx); return { move: q => { let r = s0.rot + Math.atan2(q.y - t.cy, q.x - t.cx) - a0; const deg = r * 180 / Math.PI, sn = Math.round(deg / 45) * 45; if (Math.abs(deg - sn) < 3) r = sn * Math.PI / 180; t.rot = r; } }; };
    if (near(knob, p)) return rotate();
    const signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const cs = Math.cos(t.rot), sn = Math.sin(t.rot), toW = (lx, ly) => [lx * cs - ly * sn, lx * sn + ly * cs], toL = (dx, dy) => [dx * cs + dy * sn, -dx * sn + dy * cs];
    for (let k = 0; k < 4; k++) if (near(C[k], p)) {
      const [ax, ay] = signs[k], A = C[(k + 2) % 4];
      return { move: q => { const [dx, dy] = toL(q.x - A[0], q.y - A[1]); let sx = dx / (ax * t.w), sy = dy / (ay * t.h); if (DW_PREF.tfKeep) { const kk = (sx / s0.sx + sy / s0.sy) / 2; sx = s0.sx * kk; sy = s0.sy * kk; } t.sx = sx; t.sy = sy; const [ox, oy] = toW(ax * t.w / 2 * sx, ay * t.h / 2 * sy); t.cx = A[0] + ox; t.cy = A[1] + oy; } };
    }
    const mids = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [mx, my] of mids) {
      const [ox, oy] = toW(mx * t.w / 2 * t.sx, my * t.h / 2 * t.sy), M = [t.cx + ox, t.cy + oy];
      if (near(M, p)) { const A = [t.cx - ox, t.cy - oy]; return { move: q => { const [dx, dy] = toL(q.x - A[0], q.y - A[1]); if (mx) t.sx = dx / (mx * t.w); else t.sy = dy / (my * t.h); const [px_, py_] = toW(mx * t.w / 2 * t.sx, my * t.h / 2 * t.sy); t.cx = A[0] + px_; t.cy = A[1] + py_; } }; }
    }
    if (inPoly(p, C)) return { move: q => { t.cx = s0.cx + q.x - p.x; t.cy = s0.cy + q.y - p.y; t.moved = true; } };
    return rotate();
  },
  overlay(x, d, v, S) {
    const t = DW.tf; if (!t || t.empty) return;
    if (t.text) { if (t.L.text.box) { x.strokeStyle = '#3fd6c0'; x.lineWidth = 1.5; x.beginPath(); t.L.text.box.forEach((c, i) => { const [X, Y] = S(c[0], c[1]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke(); } return; }
    x.strokeStyle = '#3fd6c0'; x.lineWidth = 1.5;
    if (t.mode === 'mesh') {
      const m = t.m, P = meshMap(m), N = 32, line = f => { x.beginPath(); for (let s = 0; s <= N; s++) { const [X, Y] = S(...f(s / N)); s ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); };
      for (let i = 0; i <= m.c; i++) line(s => P(i / m.c, s)); for (let j = 0; j <= m.r; j++) line(s => P(s, j / m.r));
      m.p.forEach(c => { const [X, Y] = S(c[0], c[1]); handleDot(x, X, Y, 6 * d / 1.5, true); });
      return;
    }
    if (t.mode === 'persp') {
      const C = t.q.map(c => S(c[0], c[1])), P = homog(t.q);
      x.beginPath(); C.forEach(([X, Y], i) => i ? x.lineTo(X, Y) : x.moveTo(X, Y)); x.closePath(); x.stroke();
      x.globalAlpha = .45; x.lineWidth = 1; for (let k = 1; k < 4; k++) { let a = S(...P(k / 4, 0)), b = S(...P(k / 4, 1)); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); a = S(...P(0, k / 4)); b = S(...P(1, k / 4)); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); } x.globalAlpha = 1;
      for (const [X, Y] of C) handleDot(x, X, Y, 7 * d / 1.5);
      for (const [u, w] of [[.5, 0], [1, .5], [.5, 1], [0, .5]]) { const [X, Y] = S(...P(u, w)); handleDot(x, X, Y, 6 * d / 1.5, true); }
      return;
    }
    const C = tfCorners(t).map(c => S(c[0], c[1]));
    x.beginPath(); C.forEach(([X, Y], i) => i ? x.lineTo(X, Y) : x.moveTo(X, Y)); x.closePath(); x.stroke();
    for (const [X, Y] of C) handleDot(x, X, Y, 7 * d / 1.5);
    for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; handleDot(x, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 5 * d / 1.5); }
    const top = [(C[0][0] + C[1][0]) / 2, (C[0][1] + C[1][1]) / 2], ang = t.rot - Math.PI / 2, s = Math.sign(t.sy || 1), k = [top[0] + Math.cos(ang) * 34 * d * s, top[1] + Math.sin(ang) * 34 * d * s];
    x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(k[0], k[1]); x.stroke(); handleDot(x, k[0], k[1], 7 * d / 1.5, true);
  }
};

/* ---------- selections ---------- */
PH_H.marquee = {
  ui(o) {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Shape'), segBox({ options: [{ v: 'rect', l: 'Box' }, { v: 'ellipse', l: 'Circle' }], value: DW_PREF.marq, onChange: v => { DW_PREF.marq = v; savePref(); } })));
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Keep even', !!DW_PREF.marqEven, v => { DW_PREF.marqEven = v; savePref(); })));
    selModeRow(o); selQuick(o);
    o.append(h('div', { class: 'hint' }, 'Drag over the part you want. Tap outside it to drop the selection.'));
  },
  down(p) {
    DW.selDraft = null;
    return {
      move: q => { let bx = q.x, by = q.y; if (DW_PREF.marqEven) { const m = Math.max(Math.abs(bx - p.x), Math.abs(by - p.y)); bx = p.x + Math.sign(bx - p.x || 1) * m; by = p.y + Math.sign(by - p.y || 1) * m; } DW.selDraft = { a: p, b: { x: bx, y: by } }; },
      up: () => {
        const dr = DW.selDraft; DW.selDraft = null;
        if (!dr || Math.hypot(dr.b.x - dr.a.x, dr.b.y - dr.a.y) * DW.view.z < 6) { if (DW_PREF.selMode === 'new') phDeselect(); return; }
        const c = selCv(), x = c.getContext('2d'), l = Math.min(dr.a.x, dr.b.x), t = Math.min(dr.a.y, dr.b.y), w = Math.abs(dr.b.x - dr.a.x), hh = Math.abs(dr.b.y - dr.a.y);
        x.fillStyle = '#fff'; x.beginPath(); if (DW_PREF.marq === 'ellipse') x.ellipse(l + w / 2, t + hh / 2, w / 2, hh / 2, 0, 0, 7); else x.rect(Math.round(l), Math.round(t), Math.round(w), Math.round(hh)); x.fill();
        phSetSel(c);
      }
    };
  },
  overlay(x, d, v, S) { const dr = DW.selDraft; if (!dr) return; const [ax, ay] = S(dr.a.x, dr.a.y), [bx, by] = S(dr.b.x, dr.b.y); x.setLineDash([5, 4]); x.strokeStyle = '#fff'; x.lineWidth = 1.2 * d; x.beginPath(); if (DW_PREF.marq === 'ellipse') x.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2, Math.abs(by - ay) / 2, 0, 0, 7); else x.rect(ax, ay, bx - ax, by - ay); x.stroke(); x.setLineDash([]); }
};
function lassoFinish() {
  const pts = DW.lassoPts; DW.lassoPts = null; if (!pts || pts.length < 3) { dwToolUI(); dwRender(); return; }
  const c = selCv(), x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)); x.closePath(); x.fill(); phSetSel(c); dwToolUI();
}
PH_H.lasso = {
  ui(o) {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Draw'), segBox({ options: [{ v: 'free', l: 'Freehand' }, { v: 'poly', l: 'Straight edges' }], value: DW_PREF.lasso, onChange: v => { DW_PREF.lasso = v; DW.lassoPts = null; savePref(); dwToolUI(); dwRender(); } })));
    selModeRow(o);
    if (DW_PREF.lasso === 'poly') o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn pri sm', onclick: lassoFinish }, 'Close shape'), h('button', { class: 'btn sm', onclick: () => { DW.lassoPts = null; dwRender(); } }, 'Start over')));
    selQuick(o);
    o.append(h('div', { class: 'hint' }, DW_PREF.lasso === 'poly' ? 'Tap corner after corner. Tap the first corner again (or Close shape) to finish.' : 'Draw around the part you want. Letting go closes the shape.'));
  },
  down(p) {
    if (DW_PREF.lasso === 'poly') {
      const pts = DW.lassoPts || (DW.lassoPts = []);
      if (pts.length > 2 && Math.hypot(pts[0].x - p.x, pts[0].y - p.y) * DW.view.z < 18) { lassoFinish(); return; }
      pts.push({ x: p.x, y: p.y }); DW.lassoHover = null; return { move: q => { pts[pts.length - 1] = { x: q.x, y: q.y }; } };
    }
    DW.lassoPts = [{ x: p.x, y: p.y }];
    return { move: q => { const l = DW.lassoPts[DW.lassoPts.length - 1]; if (Math.hypot(q.x - l.x, q.y - l.y) * DW.view.z > 2) DW.lassoPts.push({ x: q.x, y: q.y }); }, up: lassoFinish, cancel: () => { DW.lassoPts = null; } };
  },
  overlay(x, d, v, S) { const pts = DW.lassoPts; if (!pts || !pts.length) return; x.strokeStyle = '#fff'; x.lineWidth = 1.2 * d; x.setLineDash([5, 4]); x.beginPath(); pts.forEach((q, i) => { const [X, Y] = S(q.x, q.y); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); x.setLineDash([]); if (DW_PREF.lasso === 'poly') for (const q of pts) { const [X, Y] = S(q.x, q.y); handleDot(x, X, Y, 4 * d); } }
};
PH_H.wand = {
  ui(o) {
    o.append(rangeRow('Tolerance', { min: 0, max: 255, step: 1, value: DW_PREF.wtol, onInput: v => { DW_PREF.wtol = v; savePref(); } }));
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Touching only', DW_PREF.wcont, v => { DW_PREF.wcont = v; savePref(); }), checkBox('All layers', DW_PREF.wall, v => { DW_PREF.wall = v; savePref(); })));
    selModeRow(o); selQuick(o);
    o.append(h('div', { class: 'hint' }, 'Tap a color to select the area around it. Touching only off picks that color everywhere.'));
  },
  down(p) {
    const X = Math.floor(p.x), Y = Math.floor(p.y); if (X < 0 || Y < 0 || X >= DW.w || Y >= DW.h) return;
    const src = DW_PREF.wall ? docFlat() : DW.layers[DW.cur].cv, sd = src.getContext('2d').getImageData(0, 0, DW.w, DW.h).data;
    phSetSel(maskToCanvas(floodMask(sd, DW.w, DW.h, X, Y, DW_PREF.wtol, DW_PREF.wcont), DW.w, DW.h));
  }
};
PH_H.qsel = {
  brush: true,
  ui(o) {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Brush'), segBox({ options: [{ v: true, l: 'Add' }, { v: false, l: 'Take away' }], value: DW_PREF.qadd, onChange: v => { DW_PREF.qadd = v; savePref(); } })));
    o.append(rangeRow('Size', { min: 2, max: 600, step: 1, value: DW_PREF.psize, suf: 'px', onInput: v => { DW_PREF.psize = v; savePref(); } }));
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Find edges', DW_PREF.qsmart, v => { DW_PREF.qsmart = v; savePref(); })));
    if (DW_PREF.qsmart) o.append(rangeRow('Tolerance', { min: 2, max: 120, step: 1, value: DW_PREF.wtol, onInput: v => { DW_PREF.wtol = v; savePref(); } }));
    selQuick(o);
    o.append(h('div', { class: 'hint' }, 'Paint over the thing you want. With Find edges on, the selection stops at color edges.'));
  },
  down(p) {
    const W = DW.w, H = DW.h, m = newLayerCanvas(W, H), mx = m.getContext('2d'); DW.qsMask = m;
    const sd = DW_PREF.qsmart ? docFlat().getContext('2d').getImageData(0, 0, W, H).data : null;
    const dab = (x, y) => {
      const r = DW_PREF.psize / 2;
      if (!sd) { mx.fillStyle = '#fff'; mx.beginPath(); mx.arc(x, y, r, 0, 7); mx.fill(); return; }
      const R = r * 1.6, b = boxOf(x, y, R); if (!b) return; const X = Math.floor(x), Y = Math.floor(y); if (X < 0 || Y < 0 || X >= W || Y >= H) return;
      const i0 = (Y * W + X) * 4, tol = DW_PREF.wtol, seen = new Uint8Array(b.w * b.h), out = mx.createImageData(b.w, b.h), od = out.data, st = [X - b.x0, Y - b.y0];
      while (st.length) { const yy = st.pop(), xx = st.pop(); if (xx < 0 || yy < 0 || xx >= b.w || yy >= b.h) continue; const k = yy * b.w + xx; if (seen[k]) continue; seen[k] = 1; const gx = xx + b.x0, gy = yy + b.y0; if (Math.hypot(gx - x, gy - y) > R) continue; const j = (gy * W + gx) * 4; if (Math.abs(sd[j] - sd[i0]) > tol || Math.abs(sd[j + 1] - sd[i0 + 1]) > tol || Math.abs(sd[j + 2] - sd[i0 + 2]) > tol) continue; od[k * 4] = od[k * 4 + 1] = od[k * 4 + 2] = od[k * 4 + 3] = 255; st.push(xx + 1, yy, xx - 1, yy, xx, yy + 1, xx, yy - 1); }
      const t = tmpCv('qs', b.w, b.h); t.getContext('2d').putImageData(out, 0, 0); mx.drawImage(t, b.x0, b.y0);
    };
    const go = stepper(p, dab, () => Math.max(2, DW_PREF.psize * .25));
    return { move: q => go(q), up: () => { DW.qsMask = null; phSetSel(m, DW_PREF.qadd ? (DW.sel ? 'add' : 'new') : 'sub'); }, cancel: () => { DW.qsMask = null; } };
  },
  overlay(x, d, v, S) { if (!DW.qsMask) return; const t = tmpCv('qsv'), tx = t.getContext('2d'); tx.drawImage(DW.qsMask, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = DW_PREF.qadd ? 'rgba(63,214,192,.45)' : 'rgba(255,80,80,.45)'; tx.fillRect(0, 0, t.width, t.height); x.setTransform(d * v.z, 0, 0, d * v.z, d * v.x, d * v.y); x.drawImage(t, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0); }
};

/* ---------- crop ---------- */
const CROP_R = [['free', 'Free'], ['orig', 'Original'], ['1', '1:1'], ['4:5', '4:5'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9'], ['9:16', '9:16']];
function cropRatio() { const r = DW_PREF.cropR; if (r === 'free') return 0; if (r === 'orig') return DW.w / DW.h; if (r === '1') return 1; const [a, b] = r.split(':').map(Number); return a / b; }
function cropFit() { const R_ = cropRatio(); let w = DW.w, hh = DW.h; if (R_) { if (w / hh > R_) w = hh * R_; else hh = w / R_; } DW.crop = { x: (DW.w - w) / 2, y: (DW.h - hh) / 2, w, h: hh }; }
PH_H.crop = {
  ui(o) {
    if (!DW.crop) cropFit();
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Shape'), selectBox({ options: CROP_R.map(([v, l]) => ({ v, l })), value: DW_PREF.cropR, onChange: v => { DW_PREF.cropR = v; savePref(); cropFit(); dwRender(); } })));
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn pri sm', onclick: () => { const c = DW.crop; phCropTo(Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h)); cropFit(); dwToolUI(); } }, 'Crop'), h('button', { class: 'btn sm', onclick: () => { cropFit(); dwRender(); } }, 'Reset')));
    o.append(h('div', { class: 'hint' }, 'Drag the corners or edges, or drag inside to move the frame. Everything outside it is cut off.'));
    dwRender();
  },
  down(p) {
    const c = DW.crop; if (!c) return; const z = DW.view.z, hr = 24 / z, c0 = { ...c }, R_ = cropRatio();
    const ex = [p.x - c.x < hr ? -1 : c.x + c.w - p.x < hr ? 1 : 0, p.y - c.y < hr ? -1 : c.y + c.h - p.y < hr ? 1 : 0];
    const inside = p.x > c.x - hr && p.x < c.x + c.w + hr && p.y > c.y - hr && p.y < c.y + c.h + hr;
    if (!inside) return;
    if (!ex[0] && !ex[1]) return { move: q => { c.x = clamp(c0.x + q.x - p.x, 0, DW.w - c.w); c.y = clamp(c0.y + q.y - p.y, 0, DW.h - c.h); } };
    return {
      move: q => {
        let x0 = c0.x, y0 = c0.y, x1 = c0.x + c0.w, y1 = c0.y + c0.h;
        if (ex[0] < 0) x0 = clamp(q.x, 0, x1 - 4); if (ex[0] > 0) x1 = clamp(q.x, x0 + 4, DW.w);
        if (ex[1] < 0) y0 = clamp(q.y, 0, y1 - 4); if (ex[1] > 0) y1 = clamp(q.y, y0 + 4, DW.h);
        if (R_) { let w = x1 - x0, hh = y1 - y0; if (ex[0] && (!ex[1] || w / hh > R_)) hh = w / R_; else w = hh * R_; if (ex[0] < 0) x0 = x1 - w; else x1 = x0 + w; if (ex[1] < 0) y0 = y1 - hh; else y1 = y0 + hh; if (x0 < 0 || y0 < 0 || x1 > DW.w || y1 > DW.h) return; }
        Object.assign(c, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      }
    };
  },
  overlay(x, d, v, S) {
    const c = DW.crop; if (!c) return; const [ax, ay] = S(c.x, c.y), [bx, by] = S(c.x + c.w, c.y + c.h), [ox, oy] = S(0, 0), [px, py] = S(DW.w, DW.h);
    x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.rect(ox, oy, px - ox, py - oy); x.rect(ax, ay, bx - ax, by - ay); x.fill('evenodd');
    x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(ax, ay, bx - ax, by - ay);
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1; x.beginPath(); for (const f of [1 / 3, 2 / 3]) { x.moveTo(ax + (bx - ax) * f, ay); x.lineTo(ax + (bx - ax) * f, by); x.moveTo(ax, ay + (by - ay) * f); x.lineTo(bx, ay + (by - ay) * f); } x.stroke();
    x.fillStyle = '#fff'; const L_ = 16 * d, T_ = 4 * d;
    for (const [X, Y, sx, sy] of [[ax, ay, 1, 1], [bx, ay, -1, 1], [bx, by, -1, -1], [ax, by, 1, -1]]) { x.fillRect(X - (sx < 0 ? T_ : 0), Y - (sy < 0 ? T_ : 0), T_, sy * L_); x.fillRect(X - (sx < 0 ? L_ : 0), Y - (sy < 0 ? T_ : 0), L_, T_); }
  }
};
// change the size of the whole picture; draw(ctx, oldCanvas) places the old content
function phResizeDoc(W2, H2, draw, opts = {}) {
  phSnapDoc();
  for (const L of DW.layers) {
    const n = newLayerCanvas(W2, H2), x = n.getContext('2d'); if (L.kind !== 'adj') draw(x, L.cv); L.cv = n;
    if (L.mask) { const m = newLayerCanvas(W2, H2), mx = m.getContext('2d'); mx.fillStyle = '#fff'; mx.fillRect(0, 0, W2, H2); if (opts.rect) mx.clearRect(opts.rect.x, opts.rect.y, opts.rect.w, opts.rect.h); else mx.clearRect(0, 0, W2, H2); draw(mx, L.mask); L.mask = m; }
    if (L.kind === 'text' && opts.text) { opts.text(L.text); }
    dirty(L);
  }
  DW.w = W2; DW.h = H2; DW.stroke = newLayerCanvas(W2, H2); DW.ref = null; DW.sel = null; DW.tf = null; DW.adjCache = {};
  for (const L of DW.layers) if (L.kind === 'text') phRenderText(L);
  phSelChanged(); DW.view.fit = true; dwFit(); dwRender();
}
function phCropTo(x, y, w, hh) { if (w < 1 || hh < 1) return; phResizeDoc(w, hh, (c, src) => c.drawImage(src, -x, -y), { rect: { x: -x, y: -y, w: DW.w, h: DW.h }, text: t => { t.x -= x; t.y -= y; } }); toast('Cropped to ' + w + ' × ' + hh); }

/* ---------- clone stamp and healing brush ---------- */
function cloneStroke(p, e, heal) {
  const L = dwTarget(); if (!needPixels(L)) return;
  if (DW.cloneSetMode || !DW.cloneSrc) { DW.cloneSrc = { x: p.x, y: p.y }; DW.cloneOff = null; DW.cloneSetMode = false; toast('Source spot set. Now paint where it should go.'); dwToolUI(); return; }
  const src = DW_PREF.csample === 'all' ? docFlat() : copyCv(L.cv);
  if (!DW_PREF.caligned || !DW.cloneOff) DW.cloneOff = { x: DW.cloneSrc.x - p.x, y: DW.cloneSrc.y - p.y };
  const off = DW.cloneOff, st = { t: 'clone', L };
  dwSnap(L); const sx = ctxReset(DW.stroke.getContext('2d')); sx.clearRect(0, 0, DW.w, DW.h);
  const bb = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  const dab = (x, y) => {
    const s = Math.max(2, Math.ceil(DW_PREF.psize)), t = tmpCv('cdab', s, s), tx = t.getContext('2d');
    tx.drawImage(src, x + off.x - s / 2, y + off.y - s / 2, s, s, 0, 0, s, s); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(softTip(), 0, 0, s, s);
    sx.drawImage(t, x - s / 2, y - s / 2); DW.cloneLive = { x: x + off.x, y: y + off.y };
    bb.x0 = Math.min(bb.x0, x - s / 2); bb.y0 = Math.min(bb.y0, y - s / 2); bb.x1 = Math.max(bb.x1, x + s / 2); bb.y1 = Math.max(bb.y1, y + s / 2);
  };
  DW.live = dwLiveFor(st);
  const go = stepper(p, dab, () => Math.max(1, DW_PREF.psize * .12));
  return {
    move: q => go(q),
    up: () => { DW.cloneLive = null; if (heal) healStroke(L, src, off, bb); dwEndStroke(st); },
    cancel: () => { DW.cloneLive = null; dwCancelStroke(st); }
  };
}
// healing: keep the texture from the source, take the light and color from around the target
function healStroke(L, src, off, bb) {
  const r = Math.max(2, DW_PREF.psize * .35), pad = Math.ceil(r * 2);
  const x0 = Math.max(0, Math.floor(bb.x0) - pad), y0 = Math.max(0, Math.floor(bb.y0) - pad), x1 = Math.min(DW.w, Math.ceil(bb.x1) + pad), y1 = Math.min(DW.h, Math.ceil(bb.y1) + pad), w = x1 - x0, hh = y1 - y0; if (w < 2 || hh < 2) return;
  const S_ = newLayerCanvas(w, hh); S_.getContext('2d').drawImage(src, x0 + off.x, y0 + off.y, w, hh, 0, 0, w, hh);
  const T_ = newLayerCanvas(w, hh); T_.getContext('2d').drawImage(L.cv, x0, y0, w, hh, 0, 0, w, hh);
  const sd = S_.getContext('2d').getImageData(0, 0, w, hh).data, bs = blurData(S_, r), bt = blurData(T_, r);
  const kx = DW.stroke.getContext('2d'), img = kx.getImageData(x0, y0, w, hh), d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; for (let c = 0; c < 3; c++) d[i + c] = sd[i + c] + bt[i + c] - bs[i + c]; }
  kx.putImageData(img, x0, y0);
}
// a blurred copy of a canvas's pixels with the edges repeated (no dark rim)
function blurData(cv, r) {
  const w = cv.width, hh = cv.height, p = Math.ceil(r * 2.5), t = newLayerCanvas(w + p * 2, hh + p * 2), x = t.getContext('2d');
  x.drawImage(cv, p, p); x.drawImage(cv, 0, 0, 1, hh, 0, p, p, hh); x.drawImage(cv, w - 1, 0, 1, hh, p + w, p, p, hh); x.drawImage(t, 0, p, w + p * 2, 1, 0, 0, w + p * 2, p); x.drawImage(t, 0, p + hh - 1, w + p * 2, 1, 0, p + hh, w + p * 2, p);
  const o = newLayerCanvas(w, hh), ox = o.getContext('2d'); ox.filter = `blur(${r}px)`; ox.drawImage(t, -p, -p); return ox.getImageData(0, 0, w, hh).data;
}
function cloneUI(o, heal) {
  brushRows(o);
  o.append(h('div', { class: 'dwo' }, h('label', null, 'Take from'), segBox({ options: [{ v: 'layer', l: 'This layer' }, { v: 'all', l: 'All layers' }], value: DW_PREF.csample, onChange: v => { DW_PREF.csample = v; savePref(); } })));
  o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Aligned', DW_PREF.caligned, v => { DW_PREF.caligned = v; savePref(); }), h('button', { class: 'btn sm' + (DW.cloneSetMode ? ' pri' : ''), onclick: () => { DW.cloneSetMode = !DW.cloneSetMode; dwToolUI(); } }, DW.cloneSetMode ? 'Tap the source spot…' : 'Set source spot')));
  if (!heal) o.append(rangeRow('Opacity', { min: 1, max: 100, step: 1, value: DW_PREF.op, suf: '%', onInput: v => { DW_PREF.op = v; savePref(); } }));
  o.append(h('div', { class: 'hint' }, (DW.cloneSrc ? '' : 'First tap the spot to copy from. ') + (heal ? 'Healing copies the texture and blends it into the light and color around it.' : 'Painting copies from the source spot.')));
}
function cloneOverlay(x, d, v, S) { const c = DW.cloneLive || DW.cloneSrc; if (!c) return; const [X, Y] = S(c.x, c.y), r = Math.max(6, DW_PREF.psize / 2 * v.z * d); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.arc(X, Y, r, 0, 7); x.moveTo(X - 6, Y); x.lineTo(X + 6, Y); x.moveTo(X, Y - 6); x.lineTo(X, Y + 6); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(X, Y, r + 1.5, 0, 7); x.stroke(); }
PH_H.clone = { brush: true, ui: o => cloneUI(o, false), down: (p, e) => cloneStroke(p, e, false), overlay: cloneOverlay };
PH_H.healb = { brush: true, ui: o => cloneUI(o, true), down: (p, e) => cloneStroke(p, e, true), overlay: cloneOverlay };

/* ---------- spot healing / content-aware fill: fill a hole from what is around it ---------- */
function inpaint(cv, mask, x0, y0, w, hh) {
  const x = cv.getContext('2d'), img = x.getImageData(x0, y0, w, hh), d = img.data;
  // pyramid: push known colors down, pull them back up into the hole
  let lv = [{ w, h: hh, c: new Float32Array(w * hh * 4), k: new Float32Array(w * hh) }];
  for (let i = 0; i < w * hh; i++) { const kk = 1 - mask[i]; lv[0].k[i] = kk; for (let c = 0; c < 4; c++) lv[0].c[i * 4 + c] = d[i * 4 + c] * kk; }
  while (lv[lv.length - 1].w > 1 || lv[lv.length - 1].h > 1) {
    const a = lv[lv.length - 1], W2 = Math.max(1, Math.ceil(a.w / 2)), H2 = Math.max(1, Math.ceil(a.h / 2)), b = { w: W2, h: H2, c: new Float32Array(W2 * H2 * 4), k: new Float32Array(W2 * H2) };
    for (let y = 0; y < a.h; y++) for (let xx = 0; xx < a.w; xx++) { const i = y * a.w + xx, j = (y >> 1) * W2 + (xx >> 1); b.k[j] += a.k[i]; for (let c = 0; c < 4; c++) b.c[j * 4 + c] += a.c[i * 4 + c]; }
    for (let j = 0; j < W2 * H2; j++) { const kk = b.k[j]; if (kk > 1) { for (let c = 0; c < 4; c++) b.c[j * 4 + c] /= kk; b.k[j] = 1; } }
    lv.push(b);
  }
  for (let l = lv.length - 2; l >= 0; l--) {
    const a = lv[l], b = lv[l + 1];
    for (let y = 0; y < a.h; y++) for (let xx = 0; xx < a.w; xx++) {
      const i = y * a.w + xx, kk = a.k[i]; if (kk >= 1) continue;
      const fx = Math.min(b.w - 1, Math.max(0, (xx - .5) / 2)), fy = Math.min(b.h - 1, Math.max(0, (y - .5) / 2)), ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, ix2 = Math.min(b.w - 1, ix + 1), iy2 = Math.min(b.h - 1, iy + 1);
      for (let c = 0; c < 4; c++) { const v00 = b.c[(iy * b.w + ix) * 4 + c], v10 = b.c[(iy * b.w + ix2) * 4 + c], v01 = b.c[(iy2 * b.w + ix) * 4 + c], v11 = b.c[(iy2 * b.w + ix2) * 4 + c]; const up = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty; a.c[i * 4 + c] = a.c[i * 4 + c] + up * (1 - kk); }
      a.k[i] = 1;
    }
  }
  // add back fine texture from a nearby untouched area of the same size
  let mx0 = w, mx1 = 0; for (let y = 0; y < hh; y++) for (let xx = 0; xx < w; xx++) if (mask[y * w + xx] > .5) { if (xx < mx0) mx0 = xx; if (xx > mx1) mx1 = xx; }
  const shift = Math.max(4, mx1 - mx0 + 4), sm = blurPlain(d, w, hh, 2);
  for (let y = 0; y < hh; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx, m = mask[i]; if (m <= 0) continue;
    let sxp = xx + shift < w && mask[y * w + xx + shift] < .5 ? xx + shift : xx - shift >= 0 && mask[y * w + xx - shift] < .5 ? xx - shift : -1;
    for (let c = 0; c < 4; c++) { let v = lv[0].c[i * 4 + c]; if (sxp >= 0 && c < 3) { const j = (y * w + sxp) * 4 + c; v += (d[j] - sm[j]) * .9; } d[i * 4 + c] = d[i * 4 + c] * (1 - m) + v * m; }
  }
  x.putImageData(img, x0, y0);
}
function blurPlain(d, w, hh, r) { const o = new Float32Array(d.length), tmp = new Float32Array(d.length); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= w) continue; s += d[(y * w + xx) * 4 + c]; n++; } tmp[(y * w + x) * 4 + c] = s / n; } for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= hh) continue; s += tmp[(yy * w + x) * 4 + c]; n++; } o[(y * w + x) * 4 + c] = s / n; } return o; }
function fillHole(L, maskCv, bb) {
  const pad = Math.ceil(Math.max(bb.w, bb.h) * .6 + 8), x0 = Math.max(0, Math.floor(bb.x - pad)), y0 = Math.max(0, Math.floor(bb.y - pad)), x1 = Math.min(DW.w, Math.ceil(bb.x + bb.w + pad)), y1 = Math.min(DW.h, Math.ceil(bb.y + bb.h + pad)), w = x1 - x0, hh = y1 - y0;
  if (w < 2 || hh < 2) return;
  const md = maskCv.getContext('2d').getImageData(x0, y0, w, hh).data, m = new Float32Array(w * hh); for (let i = 0; i < w * hh; i++) m[i] = md[i * 4 + 3] / 255;
  inpaint(L.cv, m, x0, y0, w, hh); dirty(L);
}
PH_H.spot = {
  brush: true,
  ui(o) { brushRows(o); o.append(h('div', { class: 'hint' }, 'Paint over a spot, scratch or small thing you want gone. When you let go it is filled in from around it.')); },
  down(p) {
    const L = dwTarget(); if (!needPixels(L)) return;
    const sx = ctxReset(DW.stroke.getContext('2d')); sx.clearRect(0, 0, DW.w, DW.h); DW.spotOn = true;
    const bb = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    const dab = (x, y) => { const s = DW_PREF.psize; sx.drawImage(tintedTip({ tip: 'round', hard: Math.max(.6, DW_PREF.phard / 100), ratio: 1 }, '#ffffffff'), x - s / 2, y - s / 2, s, s); bb.x0 = Math.min(bb.x0, x - s / 2); bb.y0 = Math.min(bb.y0, y - s / 2); bb.x1 = Math.max(bb.x1, x + s / 2); bb.y1 = Math.max(bb.y1, y + s / 2); };
    const go = stepper(p, dab, () => Math.max(1, DW_PREF.psize * .15));
    return {
      move: q => go(q),
      up: () => { DW.spotOn = false; dwSnap(L); const m = phClipSel(DW.stroke); fillHole(L, m, { x: bb.x0, y: bb.y0, w: bb.x1 - bb.x0, h: bb.y1 - bb.y0 }); sx.clearRect(0, 0, DW.w, DW.h); dwRender(); },
      cancel: () => { DW.spotOn = false; sx.clearRect(0, 0, DW.w, DW.h); }
    };
  },
  overlay(x, d, v) { if (!DW.spotOn) return; const t = tmpCv('spv'), tx = t.getContext('2d'); tx.drawImage(DW.stroke, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgba(255,60,80,.45)'; tx.fillRect(0, 0, t.width, t.height); x.setTransform(d * v.z, 0, 0, d * v.z, d * v.x, d * v.y); x.drawImage(t, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0); }
};
PH_H.redeye = {
  ui(o) { o.append(rangeRow('Size', { min: 4, max: 400, step: 1, value: DW_PREF.psize, suf: 'px', onInput: v => { DW_PREF.psize = v; savePref(); } })); o.append(rangeRow('Darken', { min: 0, max: 100, step: 1, value: DW_PREF.pstr, suf: '%', onInput: v => { DW_PREF.pstr = v; savePref(); } })); o.append(h('div', { class: 'hint' }, 'Tap the middle of each red eye.')); },
  down(p) {
    const L = dwTarget(); if (!needPixels(L)) return; const r = DW_PREF.psize / 2, b = boxOf(p.x, p.y, r); if (!b) return;
    dwSnap(L); const x = L.cv.getContext('2d'), img = x.getImageData(b.x0, b.y0, b.w, b.h), d = img.data, dk = 1 - DW_PREF.pstr / 200;
    for (let y = 0; y < b.h; y++) for (let xx = 0; xx < b.w; xx++) {
      const f = falloff(Math.hypot(xx + b.x0 - p.x, y + b.y0 - p.y), r); if (!f) continue; const i = (y * b.w + xx) * 4, R_ = d[i], G = d[i + 1], B_ = d[i + 2];
      const red = R_ / Math.max(1, (G + B_) / 2); if (red < 1.4 || R_ < 50) continue; const k = Math.min(1, (red - 1.4) / .6) * f, m = (G + B_) / 2 * dk;
      d[i] = R_ + (m - R_) * k; d[i + 1] = G + (G * dk - G) * k; d[i + 2] = B_ + (B_ * dk - B_) * k;
    }
    x.putImageData(img, b.x0, b.y0); dirty(L); dwRender();
  }
};

/* ---------- gradient ---------- */
function gradStops() {
  const fg = DW_PREF.color, bg = DW_PREF.bg, cl = c => { const [r, g, b] = hexToRgba(c); return rgbaToHex(r, g, b, 0); };
  let s = { fb: [[0, fg], [1, bg]], fc: [[0, fg], [1, cl(fg)]], bw: [[0, '#000000ff'], [1, '#ffffffff']], rainbow: [[0, '#ff3b30ff'], [.17, '#ff9500ff'], [.33, '#ffd60aff'], [.5, '#34c759ff'], [.67, '#0a84ffff'], [.83, '#5e5ce6ff'], [1, '#bf5af2ff']], sunset: [[0, '#2b1055ff'], [.5, '#d53369ff'], [1, '#ffcc70ff']], chrome: [[0, '#2c2f36ff'], [.45, '#f2f4f7ff'], [.55, '#8c939eff'], [1, '#e9edf2ff']] }[DW_PREF.gcols] || [[0, fg], [1, bg]];
  if (DW_PREF.grev) s = s.map(([t, c]) => [1 - t, c]).reverse();
  return s;
}
function paintGradient(x, a, b) {
  const W = DW.w, H = DW.h, ty = DW_PREF.gtype, len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)); let g;
  const stops = gradStops();
  if (ty === 'radial') g = x.createRadialGradient(a.x, a.y, 0, a.x, a.y, len);
  else if (ty === 'angle') g = x.createConicGradient(Math.atan2(b.y - a.y, b.x - a.x), a.x, a.y);
  else if (ty === 'reflected') { g = x.createLinearGradient(a.x - (b.x - a.x), a.y - (b.y - a.y), b.x, b.y); for (const [t, c] of stops) { g.addColorStop(.5 + t / 2, css(c)); g.addColorStop(.5 - t / 2, css(c)); } x.fillStyle = g; x.fillRect(0, 0, W, H); return; }
  else g = x.createLinearGradient(a.x, a.y, b.x, b.y);
  for (const [t, c] of stops) g.addColorStop(t, css(c));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}
function fgbgRow(o) {
  o.append(h('div', { class: 'dwo' }, h('label', null, 'Colors'), colorBtn({ value: DW_PREF.color, onInput: v => { DW_PREF.color = v; savePref(); } }), colorBtn({ value: DW_PREF.bg, onInput: v => { DW_PREF.bg = v; savePref(); } }), h('button', { class: 'btn sm', onclick: () => { [DW_PREF.color, DW_PREF.bg] = [DW_PREF.bg, DW_PREF.color]; savePref(); dwToolUI(); } }, 'Swap')));
}
PH_H.gradient = {
  ui(o) {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Type'), selectBox({ options: [{ v: 'linear', l: 'Straight' }, { v: 'radial', l: 'Round' }, { v: 'angle', l: 'Around' }, { v: 'reflected', l: 'Mirrored' }], value: DW_PREF.gtype, onChange: v => { DW_PREF.gtype = v; savePref(); } })));
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Colors from'), selectBox({ options: [{ v: 'fb', l: 'Front to back color' }, { v: 'fc', l: 'Front color to see-through' }, { v: 'bw', l: 'Black to white' }, { v: 'rainbow', l: 'Rainbow' }, { v: 'sunset', l: 'Sunset' }, { v: 'chrome', l: 'Chrome' }], value: DW_PREF.gcols, onChange: v => { DW_PREF.gcols = v; savePref(); } })));
    fgbgRow(o);
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Reverse', DW_PREF.grev, v => { DW_PREF.grev = v; savePref(); })));
    o.append(rangeRow('Opacity', { min: 1, max: 100, step: 1, value: DW_PREF.op, suf: '%', onInput: v => { DW_PREF.op = v; savePref(); } }));
    o.append(h('div', { class: 'hint' }, 'Drag across the picture. It fills the selection, or the whole layer.'));
  },
  down(p) {
    const L = dwTarget(); if (!needPixels(L)) return; const st = { t: 'gradient', L };
    dwSnap(L); const sx = ctxReset(DW.stroke.getContext('2d')); sx.clearRect(0, 0, DW.w, DW.h); DW.gline = { a: p, b: p };
    DW.live = dwLiveFor(st);
    return { move: q => { DW.gline.b = q; sx.clearRect(0, 0, DW.w, DW.h); paintGradient(sx, p, q); }, up: () => { if (Math.hypot(DW.gline.b.x - p.x, DW.gline.b.y - p.y) < 1) paintGradient(sx, p, { x: p.x + 1, y: p.y }); DW.gline = null; dwEndStroke(st); }, cancel: () => { DW.gline = null; dwCancelStroke(st); } };
  },
  overlay(x, d, v, S) { const g = DW.gline; if (!g) return; const [ax, ay] = S(g.a.x, g.a.y), [bx, by] = S(g.b.x, g.b.y); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); handleDot(x, ax, ay, 5, true); handleDot(x, bx, by, 5, true); }
};

/* ---------- toning and retouch brushes that change pixels in place ---------- */
function pixelBrush(p, fn) {
  const L = dwTarget(); if (!needPixels(L)) return; dwSnap(L);
  const x = L.cv.getContext('2d'); DW.selVer = (DW.selVer || 0) + 1;
  const dab = (cx, cy, dx, dy) => {
    const r = DW_PREF.psize / 2, b = boxOf(cx, cy, r + 2); if (!b) return;
    const img = x.getImageData(b.x0, b.y0, b.w, b.h), d = img.data, k = DW_PREF.pstr / 100;
    fn(d, b, cx, cy, r, k, dx, dy);
    if (DW.sel) { const orig = x.getImageData(b.x0, b.y0, b.w, b.h).data; for (let y = 0; y < b.h; y++) for (let xx = 0; xx < b.w; xx++) { const s = selAt(xx + b.x0, y + b.y0); if (s >= 1) continue; const i = (y * b.w + xx) * 4; for (let c = 0; c < 4; c++) d[i + c] = orig[i + c] + (d[i + c] - orig[i + c]) * s; } }
    x.putImageData(img, b.x0, b.y0); dirty(L);
  };
  const go = stepper(p, dab, () => Math.max(1, DW_PREF.psize * .2));
  return { move: q => go(q) };
}
const lumOf = (r, g, b) => (r * .299 + g * .587 + b * .114) / 255;
function rangeW(l) { const r = DW_PREF.drange; return r === 'sh' ? Math.pow(1 - l, 2) : r === 'hi' ? l * l : 1 - Math.pow(2 * l - 1, 2); }
const rangeRowUI = o => o.append(h('div', { class: 'dwo' }, h('label', null, 'Range'), segBox({ options: [{ v: 'sh', l: 'Shadows' }, { v: 'mid', l: 'Middle' }, { v: 'hi', l: 'Highlights' }], value: DW_PREF.drange, onChange: v => { DW_PREF.drange = v; savePref(); } })));
function each(d, b, cx, cy, r, f) { for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const w = falloff(Math.hypot(x + b.x0 - cx, y + b.y0 - cy), r); if (w > 0) f((y * b.w + x) * 4, w); } }
PH_H.dodge = { brush: true, ui(o) { brushRows(o, true, 'Exposure'); rangeRowUI(o); o.append(h('div', { class: 'hint' }, 'Paint to lighten.')); }, down: p => pixelBrush(p, (d, b, cx, cy, r, k) => each(d, b, cx, cy, r, (i, w) => { const a = k * w * .12 * rangeW(lumOf(d[i], d[i + 1], d[i + 2])); for (let c = 0; c < 3; c++) d[i + c] += (255 - d[i + c]) * a; })) };
PH_H.burn = { brush: true, ui(o) { brushRows(o, true, 'Exposure'); rangeRowUI(o); o.append(h('div', { class: 'hint' }, 'Paint to darken.')); }, down: p => pixelBrush(p, (d, b, cx, cy, r, k) => each(d, b, cx, cy, r, (i, w) => { const a = k * w * .12 * rangeW(lumOf(d[i], d[i + 1], d[i + 2])); for (let c = 0; c < 3; c++) d[i + c] *= 1 - a; })) };
PH_H.sponge = {
  brush: true,
  ui(o) { brushRows(o, true, 'Flow'); o.append(h('div', { class: 'dwo' }, h('label', null, 'Mode'), segBox({ options: [{ v: 'desat', l: 'Less color' }, { v: 'sat', l: 'More color' }], value: DW_PREF.sponge, onChange: v => { DW_PREF.sponge = v; savePref(); } }))); },
  down: p => pixelBrush(p, (d, b, cx, cy, r, k) => each(d, b, cx, cy, r, (i, w) => { const g = (d[i] + d[i + 1] + d[i + 2]) / 3, a = k * w * .1 * (DW_PREF.sponge === 'sat' ? 1 : -1); for (let c = 0; c < 3; c++) d[i + c] = g + (d[i + c] - g) * (1 + a); }))
};
PH_H.sharpb = {
  brush: true, ui(o) { brushRows(o, true); o.append(h('div', { class: 'hint' }, 'Paint to make edges crisper.')); },
  down: p => pixelBrush(p, (d, b, cx, cy, r, k) => { const s = d.slice(), W = b.w; each(d, b, cx, cy, r, (i, w) => { const x = (i / 4) % W, y = Math.floor(i / 4 / W); if (x < 1 || y < 1 || x >= W - 1 || y >= b.h - 1) return; for (let c = 0; c < 3; c++) { const lap = 4 * s[i + c] - s[i + c - 4] - s[i + c + 4] - s[i + c - W * 4] - s[i + c + W * 4]; d[i + c] = s[i + c] + lap * k * w * .25; } }); })
};
function bundledBrush(mode) { const i = BRUSHES.findIndex(b => b.mode === mode); return i >= 0 ? BRUSHES[i] : null; }
function modeBrush(p, e, mode) {
  const L = dwTarget(); if (!needPixels(L)) return; const b0 = bundledBrush(mode); if (!b0) return;
  const b = { ...b0, hard: DW_PREF.phard / 100, str: Math.max(.05, DW_PREF.pstr / 100) };
  dwSnap(L); const st = { t: 'brush', L, b, size: DW_PREF.psize, color: DW_PREF.color, last: null, dist: 0, n: 0, rnd: tipRand(1), pen: false };
  const x = L.cv.getContext('2d'); dabTo(null, st, p.x, p.y, .5, x);
  return { move: q => { dabTo(null, st, q.x, q.y, .5, x); dirty(L); }, up: () => dirty(L) };
}
PH_H.blurb = { brush: true, ui(o) { brushRows(o, true); o.append(h('div', { class: 'hint' }, 'Paint to soften.')); }, down: (p, e) => modeBrush(p, e, 'blur') };
PH_H.smudge = { brush: true, ui(o) { brushRows(o, true); o.append(h('div', { class: 'hint' }, 'Drag to push paint around.')); }, down: (p, e) => modeBrush(p, e, 'smudge') };

/* ---------- liquify ---------- */
PH_H.liquify = {
  brush: true,
  ui(o) {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Mode'), selectBox({ options: [{ v: 'push', l: 'Push' }, { v: 'bloat', l: 'Bigger (bloat)' }, { v: 'pinch', l: 'Smaller (pinch)' }, { v: 'twcw', l: 'Twirl right' }, { v: 'twccw', l: 'Twirl left' }, { v: 'restore', l: 'Put back' }], value: DW_PREF.liq, onChange: v => { DW_PREF.liq = v; savePref(); } })));
    brushRows(o, true, 'Pressure');
    o.append(h('div', { class: 'hint' }, 'Push, grow, shrink or twirl parts of the picture. Put back paints the picture back the way it was when you picked this tool.'));
    DW.liqOrig = null;
  },
  down(p) {
    const L = dwTarget(); if (!needPixels(L)) return;
    if (!DW.liqOrig || DW.liqOrig.L !== L || DW.liqOrig.c.width !== DW.w) DW.liqOrig = { L, c: copyCv(L.cv) };
    const orig = DW_PREF.liq === 'restore' ? DW.liqOrig.c.getContext('2d') : null;
    return pixelBrush(p, (d, b, cx, cy, r, k, dx, dy) => {
      const s = d.slice(), W = b.w, H = b.h, mode = DW_PREF.liq, od = orig ? orig.getImageData(b.x0, b.y0, W, H).data : null;
      const samp = (fx, fy, i) => { fx = clamp(fx, 0, W - 1.001); fy = clamp(fy, 0, H - 1.001); const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, a = (iy * W + ix) * 4, bq = a + 4, c = a + W * 4, dq = c + 4; for (let ch = 0; ch < 4; ch++) d[i + ch] = (s[a + ch] * (1 - tx) + s[bq + ch] * tx) * (1 - ty) + (s[c + ch] * (1 - tx) + s[dq + ch] * tx) * ty; };
      each(d, b, cx, cy, r, (i, w) => {
        const x = (i / 4) % W, y = Math.floor(i / 4 / W), px = x + b.x0 - cx, py = y + b.y0 - cy, f = w * k;
        if (mode === 'push') samp(x - dx * f, y - dy * f, i);
        else if (mode === 'bloat') samp(cx - b.x0 + px * (1 - .08 * f), cy - b.y0 + py * (1 - .08 * f), i);
        else if (mode === 'pinch') samp(cx - b.x0 + px * (1 + .08 * f), cy - b.y0 + py * (1 + .08 * f), i);
        else if (mode === 'restore') { for (let ch = 0; ch < 4; ch++) d[i + ch] = s[i + ch] + (od[i + ch] - s[i + ch]) * Math.min(1, f * .5); }
        else { const a = (mode === 'twcw' ? -1 : 1) * .12 * f, c = Math.cos(a), sn = Math.sin(a); samp(cx - b.x0 + px * c - py * sn, cy - b.y0 + px * sn + py * c, i); }
      });
    });
  }
};

/* ---------- text ---------- */
PH_H.text = {
  ui(o) {
    const L = DW.layers[DW.cur];
    if (!L || L.kind !== 'text') { o.append(h('div', { class: 'hint' }, 'Tap the picture to add text there. Tap existing text to change it. Drag text to move it.')); return; }
    const t = L.text, upd = () => { phRenderText(L); dwRender(); };
    let snapped = false; const once = () => { if (!snapped) { phSnapDoc(); snapped = true; } };
    const ta = h('textarea', { class: 'txt phta', rows: 3, spellcheck: 'false' }); ta.value = t.s;
    ta.addEventListener('input', () => { once(); t.s = ta.value; upd(); }); ta.addEventListener('keydown', e => e.stopPropagation());
    o.append(ta);
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Font'), selectBox({ options: fontOptions(), value: t.font, onChange: v => { once(); t.font = v; DW_PREF.tfont = v; savePref(); upd(); } })));
    o.append(rangeRow('Size', { min: 4, max: 1200, step: 1, value: t.size, suf: 'px', onInput: v => { once(); t.size = v; DW_PREF.tsize = v; upd(); } }));
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Color'), colorBtn({ value: t.color, onInput: v => { once(); t.color = v; upd(); } })));
    o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Bold', t.bold, v => { once(); t.bold = v; upd(); }), checkBox('Italic', t.italic, v => { once(); t.italic = v; upd(); })));
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Align'), segBox({ options: [{ v: 'left', l: 'Left' }, { v: 'center', l: 'Middle' }, { v: 'right', l: 'Right' }], value: t.align, onChange: v => { once(); t.align = v; upd(); } })));
    o.append(rangeRow('Line height', { min: .6, max: 3, step: .05, value: t.lh, onInput: v => { once(); t.lh = v; upd(); } }));
    o.append(rangeRow('Letter gap', { min: -20, max: 200, step: 1, value: t.ls, suf: 'px', onInput: v => { once(); t.ls = v; upd(); } }));
    o.append(rangeRow('Outline', { min: 0, max: 60, step: 1, value: t.sw, suf: 'px', onInput: v => { once(); t.sw = v; upd(); } }));
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Outline color'), colorBtn({ value: t.sc, onInput: v => { once(); t.sc = v; upd(); } })));
    o.append(rangeRow('Turn', { min: -180, max: 180, step: 1, value: t.rot, suf: '°', onInput: v => { once(); t.rot = v; upd(); } }));
    o.append(h('div', { class: 'hint' }, 'Shadows, glow and outlines with more choice are in Layers > Styles.'));
  },
  down(p) {
    for (let i = DW.layers.length - 1; i >= 0; i--) {
      const L = DW.layers[i]; if (L.kind !== 'text' || !L.vis || !L.text.box || !inPoly(p, L.text.box)) continue;
      const was = DW.cur === i; DW.cur = i; DW.editMask = false; if (!was) dwToolUI();
      const x0 = L.text.x, y0 = L.text.y; let snapped = false;
      return { move: q => { if (!snapped && Math.hypot(q.x - p.x, q.y - p.y) * DW.view.z > 4) { phSnapDoc(); snapped = true; } if (snapped) { L.text.x = x0 + q.x - p.x; L.text.y = y0 + q.y - p.y; phRenderText(L); } } };
    }
    phNewText(p); dwToolUI();
    setTimeout(() => { const ta = $('.phta', DW.root); if (ta) { ta.focus(); ta.select(); } }, 50);
  },
  overlay(x, d, v, S) { const L = DW.layers[DW.cur]; if (!L || L.kind !== 'text' || !L.text.box) return; x.strokeStyle = 'rgba(63,214,192,.9)'; x.lineWidth = 1.2; x.setLineDash([4, 3]); x.beginPath(); L.text.box.forEach((c, i) => { const [X, Y] = S(c[0], c[1]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke(); x.setLineDash([]); }
};
