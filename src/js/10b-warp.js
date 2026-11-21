/* ================= Move modes in Animate: Regular, Mesh (bend with a grid of points) and Perspective =================
   c.warp = { mode: 'mesh'|'persp', c: columns, r: rows, p: [dx0, dy0, dx1, dy1, ...] }
   p holds how far each grid point moved from its resting place, as a share of the picture's width / height,
   so every number can be keyframed like anything else ('o:warp.p.N'). */
let WARPM = 'free';
function warpActive(cr) { return !!(cr && cr.warp && cr.warp.p && cr.warp.p.some(v => Math.abs(v) > 1e-6)); }
// grid points in the clip's own units (before position / scale / rotation)
function warpPts(cr, b) {
  const w = cr.warp, out = [];
  for (let j = 0; j <= w.r; j++) for (let i = 0; i <= w.c; i++) { const k = j * (w.c + 1) + i; out.push([b.x + i / w.c * b.w + (w.p[2 * k] || 0) * b.w, b.y + j / w.r * b.h + (w.p[2 * k + 1] || 0) * b.h]); }
  return out;
}
function warpMapOf(cr, b) {
  const w = cr.warp, P = warpPts(cr, b);
  if (w.mode === 'persp') return homog([P[0], P[1], P[3], P[2]]);
  return meshMap({ c: w.c, r: w.r, p: P });
}
// draws a clip's picture bent by its warp; x is already in the clip's own units
function drawWarped(x, c, lt, kd, drawFn) {
  const b = contentSize(c), f = clamp(Math.abs(kd), .05, 4096 / Math.max(1, b.w, b.h));
  const W = Math.max(2, Math.ceil(b.w * f)), H = Math.max(2, Math.ceil(b.h * f));
  const S = scratch('warp-' + c.id, W, H), sx = S.getContext('2d');
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'; sx.filter = 'none'; sx.clearRect(0, 0, W, H);
  sx.setTransform(W / b.w, 0, 0, H / b.h, -b.x * W / b.w, -b.y * H / b.h); drawFn(sx);
  const w = c.warp, N = w.mode === 'persp' ? 16 : clamp(Math.max(w.c, w.r) * 3, 12, 40);
  drawWarp(x, S, warpMapOf(c, b), N);
}
function warpPaths(c) { const n = c.warp ? (c.warp.c + 1) * (c.warp.r + 1) * 2 : 0, o = []; for (let i = 0; i < n; i++) o.push('o:warp.p.' + i); return o; }
function warpKeyed(c) { return !!(c.kf && Object.keys(c.kf).some(p => p.startsWith('o:warp.p.') && c.kf[p].length)); }
// change the mode or the number of points; keeps the current shape (and the shape at every keyframe), with the points evenly spread
function warpRebuild(c, mode, nc, nr) {
  const b = contentSize(c), times = new Set();
  if (c.kf) for (const p in c.kf) if (p.startsWith('o:warp.p.')) for (const k of c.kf[p]) times.add(k.t);
  const shapeAt = lt => {
    const cr = resolveAt(c, lt); if (!cr.warp) return new Array((nc + 1) * (nr + 1) * 2).fill(0);
    const M = warpMapOf(cr, b), out = [];
    for (let j = 0; j <= nr; j++) for (let i = 0; i <= nc; i++) { const q = M(i / nc, j / nr); out.push((q[0] - (b.x + i / nc * b.w)) / b.w, (q[1] - (b.y + j / nr * b.h)) / b.h); }
    return out.map(v => round(v, 5));
  };
  const keyed = [...times].sort((a, b) => a - b).map(t => { const pk = Object.keys(c.kf).find(p => p.startsWith('o:warp.p.') && c.kf[p].some(k => Math.abs(k.t - t) < 1e-6)); const src = pk ? c.kf[pk].find(k => Math.abs(k.t - t) < 1e-6) : null; return { t, v: shapeAt(t), src }; });
  const base = shapeAt(clamp(T - c.start, 0, c.dur));
  if (c.kf) for (const p of Object.keys(c.kf)) if (p.startsWith('o:warp.p.')) delete c.kf[p];
  c.warp = { mode, c: nc, r: nr, p: base };
  if (keyed.length) for (let i = 0; i < base.length; i++) c.kf['o:warp.p.' + i] = keyed.map(K => { const nk = newKey(K.t, K.v[i]); if (K.src) copySeg(nk, K.src); return nk; });
}
function warpSetMode(m) {
  WARPM = m; const c = selClip();
  if (c && VISUAL[c.type] && m !== 'free') {
    const want = m === 'persp' ? [1, 1] : [c.warp && c.warp.mode === 'mesh' ? c.warp.c : (PREFS_WARP.c || 3), c.warp && c.warp.mode === 'mesh' ? c.warp.r : (PREFS_WARP.r || 3)];
    if (!c.warp || c.warp.mode !== m) { warpRebuild(c, m, want[0], want[1]); commit(); }
  }
  updWarpBar(); drawOverlay(); requestRender(); if (typeof renderInspector === 'function') renderInspector();
}
const PREFS_WARP = (() => { try { return JSON.parse(localStorage.getItem('fw-warp') || '{}'); } catch (e) { return {}; } })();
function warpSetCount(c, nc, nr) {
  nc = clamp(Math.round(nc), 1, 49); nr = clamp(Math.round(nr), 1, 49);
  if (!c.warp || c.warp.mode !== 'mesh') return;
  if (nc === c.warp.c && nr === c.warp.r) return;
  // always spread from the shape you last made, so changing the count back and forth does not wear the shape down
  warpRebuild(c, 'mesh', nc, nr); PREFS_WARP.c = nc; PREFS_WARP.r = nr; try { localStorage.setItem('fw-warp', JSON.stringify(PREFS_WARP)); } catch (e) { }
  requestRender(); drawOverlay();
}
// the little row under Move / Rotate / Size
function updWarpBar() {
  let bar = $('#wbar'); const st = $('#stage'); if (!st) return;
  if (!bar) {
    bar = h('div', { id: 'wbar' });
    for (const [v, l] of [['free', 'Regular'], ['mesh', 'Mesh'], ['persp', 'Perspective']]) { const b = h('button', { 'data-w': v, onclick: e => { e.stopPropagation(); warpSetMode(v); } }, l); b.addEventListener('pointerdown', e => e.stopPropagation()); bar.append(b); }
    const pts = h('span', { class: 'wpts' });
    const mk = (l, f) => { const b = h('button', { class: 'wstep', onclick: e => { e.stopPropagation(); const c = selClip(); if (c && c.warp) { f(c); commit(); updWarpBar(); renderInspector(); } } }, l); b.addEventListener('pointerdown', e => e.stopPropagation()); return b; };
    pts.append(h('span', { class: 'wlab' }, ''), mk('−', c => warpSetCount(c, c.warp.c - 1, c.warp.r - 1)), mk('+', c => warpSetCount(c, c.warp.c + 1, c.warp.r + 1)));
    bar.append(pts); st.append(bar);
  }
  const c = selVisible();
  bar.classList.toggle('off', TOOL !== 'move' || !c || PLAY.on);
  for (const b of bar.querySelectorAll('[data-w]')) b.classList.toggle('on', b.dataset.w === WARPM);
  const p = bar.querySelector('.wpts'); p.style.display = WARPM === 'mesh' && c && c.warp && c.warp.mode === 'mesh' ? '' : 'none';
  if (c && c.warp) p.querySelector('.wlab').textContent = 'Points ' + (c.warp.c + 1) + ' × ' + (c.warp.r + 1);
}
function warpOverlay(x, c, k, d) {
  const lt = clamp(T - c.start, 0, c.dur), cr = resolveAt(c, lt); if (!cr.warp || cr.warp.mode !== WARPM) return false;
  const { m } = clipCorners(c, k), b = contentSize(c), M = warpMapOf(cr, b), S = (u, v) => { const q = M(u, v), p = m.transformPoint({ x: q[0], y: q[1] }); return [p.x, p.y]; };
  const w = cr.warp, P = warpPts(cr, b).map(q => { const p = m.transformPoint({ x: q[0], y: q[1] }); return [p.x, p.y]; });
  const pin = q => { const v = inView(q[0], q[1], 12 * d); return [v.x, v.y]; };
  x.strokeStyle = '#3fd6c0'; x.lineWidth = 1.5 * d;
  const line = f => { x.beginPath(); for (let s = 0; s <= 32; s++) { const q = f(s / 32); s ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); } x.stroke(); };
  for (let i = 0; i <= w.c; i++) line(s => S(i / w.c, s)); for (let j = 0; j <= w.r; j++) line(s => S(s, j / w.r));
  const sp = Math.min(Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), Math.hypot(P[w.c + 1][0] - P[0][0], P[w.c + 1][1] - P[0][1])), r = clamp(sp * .3, 3 * d, (isTouch ? 9 : 7) * d);
  const dot = (X, Y, rr, sq) => { x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = d; x.beginPath(); if (sq) x.rect(X - rr, Y - rr, rr * 2, rr * 2); else x.arc(X, Y, rr, 0, 7); x.fill(); x.stroke(); };
  if (w.mode === 'persp') { for (const q of P.map(pin)) dot(q[0], q[1], r, true); for (const [u, v] of [[.5, 0], [1, .5], [.5, 1], [0, .5]]) { const q = pin(S(u, v)); dot(q[0], q[1], r * .8); } }
  else for (const q of P.map(pin)) dot(q[0], q[1], r);
  return true;
}
// a touch on a warp handle starts a bend drag
function warpHit(c, pt, k, d) {
  const lt = clamp(T - c.start, 0, c.dur), cr = resolveAt(c, lt); if (!cr.warp || cr.warp.mode !== WARPM) return null;
  const { m } = clipCorners(c, k), inv = m.inverse(), b = contentSize(c), w = cr.warp, pin = (X, Y) => { const v = inView(X, Y, 12 * d); return [v.x, v.y]; }, P = warpPts(cr, b).map(q => { const p = m.transformPoint({ x: q[0], y: q[1] }); return pin(p.x, p.y); });
  const tol = (isTouch ? 26 : 14) * d; let best = tol, ks = null;
  P.forEach((q, i) => { const dd = Math.hypot(q[0] - pt.px, q[1] - pt.py); if (dd < best) { best = dd; ks = [i]; } });
  if (!ks && w.mode === 'persp') { const M = warpMapOf(cr, b); for (const [u, v, a, bb] of [[.5, 0, 0, 1], [1, .5, 1, 3], [.5, 1, 2, 3], [0, .5, 0, 2]]) { const q = M(u, v), p0 = m.transformPoint({ x: q[0], y: q[1] }), p = { x: pin(p0.x, p0.y)[0], y: pin(p0.x, p0.y)[1] }; if (Math.hypot(p.x - pt.px, p.y - pt.py) < tol) { ks = [a, bb]; break; } } }
  if (!ks) return null;
  const l0 = inv.transformPoint({ x: pt.px, y: pt.py });
  warpAutoKey(c, lt);
  return { mode: 'warp', c, ks, inv, b, l0, o0: ks.map(i => [w.p[2 * i] || 0, w.p[2 * i + 1] || 0]), moved: true };
}
// when the clip is animated, a bend belongs to the keyframe it was made on: the whole shape gets keys,
// and the first time it also gets keys at the clip's other keyframes with the shape it had before, so they stay as they were
function warpAutoKey(c, lt) {
  const times = clipKeyTimes(c); if (!times.length) return;
  const keyed = warpKeyed(c), want = keyed ? [lt] : [...new Set([...times, round(lt, 4)])];
  const segAt = t => { for (const q of kfProps(c)) { if (q.startsWith('o:warp.')) continue; const i = keyAt(c, q, t); if (i >= 0) return c.kf[q][i]; } return null; };
  for (const p of warpPaths(c)) {
    const vals = want.map(t => evalProp(c, p, t));
    c.kf[p] = c.kf[p] || [];
    want.forEach((t, n) => { if (keyAt(c, p, t) >= 0) return; const nk = newKey(t, vals[n]), src = segAt(t); if (src) copySeg(nk, src); c.kf[p].push(nk); });
    c.kf[p].sort((a, b) => a.t - b.t);
  }
}
function warpDrag(dr, pt) {
  const l = dr.inv.transformPoint({ x: pt.px, y: pt.py }), dx = (l.x - dr.l0.x) / dr.b.w, dy = (l.y - dr.l0.y) / dr.b.h;
  dr.ks.forEach((i, n) => { setProp(dr.c, 'o:warp.p.' + (2 * i), round(dr.o0[n][0] + dx, 5)); setProp(dr.c, 'o:warp.p.' + (2 * i + 1), round(dr.o0[n][1] + dy, 5)); });
}
// inspector group for the selected clip
function insWarp(b, c) {
  if (!VISUAL[c.type] || ['effect', 'filter', 'adjust'].includes(c.type)) return;
  const g = [];
  g.push(row('Move mode', segBox({ options: [{ v: 'free', l: 'Regular' }, { v: 'mesh', l: 'Mesh' }, { v: 'persp', l: 'Perspective' }], value: WARPM, onChange: v => { setTool('move'); warpSetMode(v); } })));
  if (c.warp && c.warp.mode === 'mesh') {
    g.push(rangeRow('Points across', { min: 2, max: 50, step: 1, value: c.warp.c + 1, onInput: (v, f) => { warpSetCount(c, v - 1, c.warp.r); updWarpBar(); if (f) commit(); } }));
    g.push(rangeRow('Points down', { min: 2, max: 50, step: 1, value: c.warp.r + 1, onInput: (v, f) => { warpSetCount(c, c.warp.c, v - 1); updWarpBar(); if (f) commit(); } }));
  }
  if (c.warp) {
    const keyed = warpKeyed(c);
    g.push(h('div', { class: 'brow' },
      h('button', { class: 'btn sm' + (keyed ? ' pri' : ''), html: icon('key') + (keyed ? ' Bend keyframe here' : ' Keyframe the bend'), onclick: () => { if (T < c.start || T > c.start + c.dur) { toast('Put the playhead over the clip'); return; } const lt = clamp(T - c.start, 0, c.dur); for (const p of warpPaths(c)) { c.kf[p] = c.kf[p] || []; if (keyAt(c, p, lt) < 0) { const nk = newKey(lt, evalProp(c, p, lt)); c.kf[p].push(nk); c.kf[p].sort((a, b) => a.t - b.t); } } SELKF = { t: lt }; commit(); refreshAll(); toast('The bend is keyframed here'); } }),
      h('button', { class: 'btn sm', onclick: () => { for (const p of Object.keys(c.kf)) if (p.startsWith('o:warp.p.')) delete c.kf[p]; delete c.warp; WARPM = 'free'; commit(); refreshAll(); updWarpBar(); } }, 'Remove bend')));
  }
  g.push(h('div', { class: 'hint' }, WARPM === 'mesh' ? 'Drag the points on the picture to bend it, including the points on the sides and top. Points stay evenly spread.' : WARPM === 'persp' ? 'Drag a corner for perspective. The round handles in the middle of each side and the top move that whole edge.' : 'Pick Mesh or Perspective to bend the picture. Regular moves it as a whole.'));
  b.append(grp('Move mode', g));
}
