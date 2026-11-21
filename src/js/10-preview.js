/* ================= on-canvas selection, move, scale, unwrapped rotate ================= */
const GUIDE = { x: null, y: null, rotTxt: null };
function selVisible() {
  const c = selClip(); if (!c || !VISUAL[c.type] || ['effect', 'filter', 'adjust'].includes(c.type)) return null;
  if (T < c.start - 1e-6 || T > c.start + c.dur + 1e-6) return null;
  const tr = trackOf(c); if (tr.hidden) return null;
  return c;
}
function clipCorners(c, k) {
  const lt = clamp(T - c.start, 0, c.dur), m = clipMatrix(c, lt, false), b = contentSize(c);
  const pre = new DOMMatrix().scaleSelf(k, k).multiplySelf(m);
  const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([x, y]) => { const p = pre.transformPoint({ x, y }); return [p.x, p.y]; });
  const ctr = pre.transformPoint({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  return { pts, ctr: [ctr.x, ctr.y], m: pre };
}
function drawOverlay() {
  const ov = VIEW.ov; if (!ov) return; const x = VIEW.ox;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ov.width, ov.height);
  const k = ov.width / P.w, d = ov.width / VIEW.cssW;
  if (GUIDE.x != null) { x.strokeStyle = '#ff4fb0'; x.lineWidth = d; x.setLineDash([6 * d, 4 * d]); x.beginPath(); x.moveTo(GUIDE.x * k, 0); x.lineTo(GUIDE.x * k, ov.height); x.stroke(); x.setLineDash([]); }
  if (GUIDE.y != null) { x.strokeStyle = '#ff4fb0'; x.lineWidth = d; x.setLineDash([6 * d, 4 * d]); x.beginPath(); x.moveTo(0, GUIDE.y * k); x.lineTo(ov.width, GUIDE.y * k); x.stroke(); x.setLineDash([]); }
  updStools();
  if (PLAY.on) return;
  const c = selVisible(); if (!c) return;
  const { pts, ctr } = clipCorners(c, k);
  x.strokeStyle = '#ffffff'; x.lineWidth = 1.5 * d;
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = .8 * d; x.stroke();
  if (TOOL === 'move' && WARPM !== 'free' && warpOverlay(x, c, k, d)) { }
  else if (TOOL === 'move') for (const hd of moveHandles(pts, d)) drawMoveHandle(x, hd, d);
  else if (TOOL === 'size') for (const p of sizeHandles(pts, d)) drawCube(x, p[0], p[1], (isTouch ? 9 : 7) * d, d);
  else if (TOOL === 'rot') {
    const ring = rotRing(c, pts, ctr, d), a = (evalProp(c, 'rot', clamp(T - c.start, 0, c.dur)) - 90) * Math.PI / 180;
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 5 * d; x.beginPath(); x.arc(ctr[0], ctr[1], ring, 0, 7); x.stroke();
    x.strokeStyle = '#3fd6c0'; x.lineWidth = 2.5 * d; x.beginPath(); x.arc(ctr[0], ctr[1], ring, 0, 7); x.stroke();
    // tick marks every 45 degrees so the turn is easy to read
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.2 * d;
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; x.beginPath(); x.moveTo(ctr[0] + Math.cos(t) * (ring - 5 * d), ctr[1] + Math.sin(t) * (ring - 5 * d)); x.lineTo(ctr[0] + Math.cos(t) * (ring + 5 * d), ctr[1] + Math.sin(t) * (ring + 5 * d)); x.stroke(); }
    const kx = ctr[0] + Math.cos(a) * ring, ky = ctr[1] + Math.sin(a) * ring, kr = (isTouch ? 12 : 9) * d;
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = d; x.beginPath(); x.moveTo(ctr[0], ctr[1]); x.lineTo(kx, ky); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(kx, ky, kr, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = d; x.stroke();
    x.strokeStyle = '#0b5c52'; x.lineWidth = 1.8 * d; x.beginPath(); x.arc(kx, ky, kr * .5, -2.6, 1.4); x.stroke();
    x.fillStyle = '#0b5c52'; x.beginPath(); const ex = kx + Math.cos(1.4) * kr * .5, ey = ky + Math.sin(1.4) * kr * .5; x.moveTo(ex - 3.2 * d, ey); x.lineTo(ex + 1.6 * d, ey - 2.4 * d); x.lineTo(ex + 1.4 * d, ey + 3 * d); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ctr[0], ctr[1], 2.5 * d, 0, 7); x.fill();
  }
  if (GUIDE.rotTxt) {
    x.font = `${12 * d}px system-ui`; const tw = x.measureText(GUIDE.rotTxt).width;
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(ctr[0] - tw / 2 - 6 * d, ctr[1] - 11 * d, tw + 12 * d, 22 * d);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(GUIDE.rotTxt, ctr[0], ctr[1]);
  }
}
let TOOL = 'move';
function setTool(t) { TOOL = t; for (const b of $$('#stools button')) b.classList.toggle('on', b.dataset.t === t); drawOverlay(); updWarpBar(); }
function updStools() { const s = $('#stools'); if (s) s.classList.toggle('off', !selVisible() || PLAY.on); updWarpBar(); }
function moveHandles(pts, d) {
  // one handle outside the middle of each side
  const ctr = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2], out = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let vx = mx - ctr[0], vy = my - ctr[1]; const L = Math.hypot(vx, vy) || 1; vx /= L; vy /= L;
    const off = (isTouch ? 24 : 18) * d; out.push({ ...inView(mx + vx * off, my + vy * off, 14 * d), vx, vy });
  }
  return out;
}
function inView(x, y, m) { return { x: clamp(x, m, VIEW.ov.width - m), y: clamp(y, m, VIEW.ov.height - m) }; }
function sizeHandles(pts, d) { return pts.map(p => { const q = inView(p[0], p[1], 12 * d); return [q.x, q.y]; }); }
function drawMoveHandle(x, hd, d) {
  const r = (isTouch ? 12 : 9) * d;
  x.fillStyle = '#fff'; x.beginPath(); x.arc(hd.x, hd.y, r, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = d; x.stroke();
  // four little arrows: this handle drags the whole clip
  x.save(); x.translate(hd.x, hd.y); x.strokeStyle = '#1b1d22'; x.fillStyle = '#1b1d22'; x.lineWidth = 1.4 * d; const a = r * .62, w = r * .26;
  x.beginPath(); x.moveTo(-a, 0); x.lineTo(a, 0); x.moveTo(0, -a); x.lineTo(0, a); x.stroke();
  for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(a + w * .2, 0); x.lineTo(a - w, -w); x.lineTo(a - w, w); x.fill(); }
  x.restore();
}
function drawCube(x, cx, cy, s, d) {
  // a small solid cube: front face plus top and side faces
  const o = s * .55;
  x.lineWidth = d; x.strokeStyle = '#000'; x.lineJoin = 'round';
  x.fillStyle = '#d9dde3'; x.beginPath(); x.moveTo(cx - s, cy - s); x.lineTo(cx - s + o, cy - s - o); x.lineTo(cx + s + o, cy - s - o); x.lineTo(cx + s, cy - s); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#9aa1ab'; x.beginPath(); x.moveTo(cx + s, cy - s); x.lineTo(cx + s + o, cy - s - o); x.lineTo(cx + s + o, cy + s - o); x.lineTo(cx + s, cy + s); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#ffffff'; x.fillRect(cx - s, cy - s, s * 2, s * 2); x.strokeRect(cx - s, cy - s, s * 2, s * 2);
}
function rotRing(c, pts, ctr, d) {
  const half = Math.min(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[3][0] - pts[0][0], pts[3][1] - pts[0][1])) / 2;
  const maxR = Math.min(VIEW.ov.width, VIEW.ov.height) * .42;
  return clamp(half * .9, 34 * d, Math.max(34 * d, maxR));
}
function rotHandle(pts, d) {
  // below the bottom edge middle, in the clip's own "down" direction
  const bx = (pts[2][0] + pts[3][0]) / 2, by = (pts[2][1] + pts[3][1]) / 2;
  const tx = (pts[0][0] + pts[1][0]) / 2, ty = (pts[0][1] + pts[1][1]) / 2;
  let vx = bx - tx, vy = by - ty; const L = Math.hypot(vx, vy) || 1; vx /= L; vy /= L;
  return { bx, by, x: bx + vx * 30 * d, y: by + vy * 30 * d };
}
function rotText(deg) {
  const turns = Math.trunc(deg / 360), rest = round(deg - turns * 360, 1);
  return `${round(deg, 1).toLocaleString()}°` + (turns ? `  (${turns.toLocaleString()} turn${Math.abs(turns) === 1 ? '' : 's'} ${rest >= 0 ? '+' : '-'} ${Math.abs(rest)}°)` : '');
}
function stagePt(e) { const r = VIEW.ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * P.w, y: (e.clientY - r.top) / r.height * P.h, px: (e.clientX - r.left) * VIEW.ov.width / r.width, py: (e.clientY - r.top) * VIEW.ov.height / r.height }; }
function hitClip(pt) {
  const list = [];
  for (const tr of visualTracks()) { if (tr.hidden || tr.locked) continue; const c = clipAt(tr, T); if (c && !['effect', 'filter', 'adjust'].includes(c.type)) list.push(c); }
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i], lt = T - c.start, m = clipMatrix(c, lt, true).inverse(), b = contentSize(c);
    const q = m.transformPoint({ x: pt.x, y: pt.y });
    const pad = 6 / VIEW.k;
    if (q.x >= b.x - pad && q.x <= b.x + b.w + pad && q.y >= b.y - pad && q.y <= b.y + b.h + pad) return c;
  }
  return null;
}
function initStageEvents() {
  const st = $('#stage');
  for (const b of $$('#stools button')) { b.addEventListener('pointerdown', e => e.stopPropagation()); b.onclick = e => { e.stopPropagation(); setTool(b.dataset.t); }; }
  setTool('move');
  const pointers = new Map(); let drag = null, gesture = null;
  st.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    st.setPointerCapture(e.pointerId);
    if (PLAY.on) pause();
    const pt = stagePt(e);
    if (pointers.size === 2 && drag && drag.c) {
      // pinch: scale + unwrapped rotation together
      const c = drag.c, [a, b] = [...pointers.values()], lt = clamp(T - c.start, 0, c.dur);
      gesture = { c, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, s0: evalProp(c, 'scale', lt), r: evalProp(c, 'rot', lt), last: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
      drag = null; return;
    }
    const k = VIEW.ov.width / P.w, d = VIEW.ov.width / VIEW.cssW;
    const sc = selVisible();
    if (sc) {
      const { pts, ctr } = clipCorners(sc, k), lt = clamp(T - sc.start, 0, sc.dur);
      const near = (x, y, r) => Math.hypot(pt.px - x, pt.py - y) < r * d;
      if (TOOL === 'rot') {
        const ring = rotRing(sc, pts, ctr, d);
        if (Math.abs(Math.hypot(pt.px - ctr[0], pt.py - ctr[1]) - ring) < (isTouch ? 22 : 12) * d) {
          const a = Math.atan2(pt.py - ctr[1], pt.px - ctr[0]) * 180 / Math.PI;
          drag = { mode: 'rot', c: sc, ctr, last: a, r: evalProp(sc, 'rot', lt) }; return;
        }
      }
      if (TOOL === 'size') for (const q of sizeHandles(pts, d)) if (near(q[0], q[1], isTouch ? 24 : 13)) {
        drag = { mode: 'scale', c: sc, ctr, d0: Math.hypot(pt.px - ctr[0], pt.py - ctr[1]), s0: evalProp(sc, 'scale', lt) }; return;
      }
      if (TOOL === 'move' && WARPM !== 'free') { const w = warpHit(sc, pt, k, d); if (w) { drag = w; return; } }
      if (TOOL === 'move') for (const hd of moveHandles(pts, d)) if (near(hd.x, hd.y, isTouch ? 24 : 14)) {
        drag = { mode: 'move', c: sc, p0: pt, x0: evalProp(sc, 'x', lt), y0: evalProp(sc, 'y', lt), moved: false }; return;
      }
    }
    const hit = hitClip(pt);
    if (hit) {
      if (SEL !== hit.id) selectClip(hit.id);
      const lt = clamp(T - hit.start, 0, hit.dur);
      drag = { mode: 'move', c: hit, p0: pt, x0: evalProp(hit, 'x', lt), y0: evalProp(hit, 'y', lt), moved: false };
    } else {
      drag = null;
      if (SEL) { SEL = null; SELKF = null; renderTimeline(); renderInspector(); drawOverlay(); updToolState(); }
    }
  });
  st.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture && pointers.size === 2) {
      const [a, b] = [...pointers.values()], g = gesture;
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; let dA = ang - g.last; dA = ((dA + 540) % 360) - 180; g.last = ang; g.r += dA;
      setProp(g.c, 'scale', clamp(g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, g.d0), 0.01, 100));
      setProp(g.c, 'rot', round(g.r, 2)); GUIDE.rotTxt = rotText(evalProp(g.c, 'rot', clamp(T - g.c.start, 0, g.c.dur)));
      requestRender(); return;
    }
    if (!drag) return;
    const pt = stagePt(e), c = drag.c;
    if (drag.mode === 'move') {
      const dx = pt.x - drag.p0.x, dy = pt.y - drag.p0.y;
      if (!drag.moved && Math.hypot(dx, dy) * VIEW.k < 3) return; drag.moved = true;
      let nx = drag.x0 + dx, ny = drag.y0 + dy; const thr = 8 / VIEW.k;
      GUIDE.x = GUIDE.y = null;
      if (Math.abs(nx - P.w / 2) < thr) { nx = P.w / 2; GUIDE.x = P.w / 2; }
      if (Math.abs(ny - P.h / 2) < thr) { ny = P.h / 2; GUIDE.y = P.h / 2; }
      setProp(c, 'x', round(nx, 2)); setProp(c, 'y', round(ny, 2));
    } else if (drag.mode === 'warp') { warpDrag(drag, pt);
    } else if (drag.mode === 'scale') {
      const dd = Math.hypot(pt.px - drag.ctr[0], pt.py - drag.ctr[1]);
      setProp(c, 'scale', clamp(round(drag.s0 * dd / Math.max(1, drag.d0), 4), 0.01, 100));
    } else if (drag.mode === 'rot') {
      // unwrapped: add up the small angle steps, never fold back into 0..360
      const a = Math.atan2(pt.py - drag.ctr[1], pt.px - drag.ctr[0]) * 180 / Math.PI;
      let dA = a - drag.last; dA = ((dA + 540) % 360) - 180; drag.last = a; drag.r += dA;
      let r = drag.r; if (e.shiftKey) r = Math.round(r / 15) * 15;
      setProp(c, 'rot', clamp(round(r, 2), -MAX_ROT, MAX_ROT));
      GUIDE.rotTxt = rotText(evalProp(c, 'rot', clamp(T - c.start, 0, c.dur)));
    }
    requestRender(); refreshInspectorValues();
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (gesture) { if (pointers.size < 2) { gesture = null; GUIDE.rotTxt = null; commit(); refreshAll(); } return; }
    if (drag && (drag.moved || drag.mode !== 'move')) { commit(); scheduleTL(); refreshInspectorValues(); }
    drag = null; GUIDE.x = GUIDE.y = null; GUIDE.rotTxt = null; requestRender();
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('dblclick', e => { const c = selClip(); if (c && c.type === 'text') { showRight('clip'); const ta = $('#rbody textarea'); if (ta) { ta.focus(); ta.select(); } } });
  st.addEventListener('wheel', e => {
    const c = selVisible(); if (!c) return; e.preventDefault();
    const lt = clamp(T - c.start, 0, c.dur);
    if (e.altKey) setProp(c, 'rot', evalProp(c, 'rot', lt) - e.deltaY * 0.2);
    else setProp(c, 'scale', clamp(evalProp(c, 'scale', lt) * Math.exp(-e.deltaY * 0.0015), 0.01, 100));
    requestRender(); refreshInspectorValues(); clearTimeout(st._wt); st._wt = setTimeout(commit, 400);
  }, { passive: false });
}
