/* ================= compositor ================= */
function clipAt(track, t) { for (const c of track.clips) if (t >= c.start - 1e-9 && t < c.start + c.dur - 1e-9) return c; return null; }
function prevAdjacent(track, c) { return track.clips.find(a => a !== c && Math.abs(a.start + a.dur - c.start) < 2e-3) || null; }
function transInfo(track, c, t) {
  if (!c.trans || !c.trans.id || c.trans.id === 'none') return null;
  const lt = t - c.start, d = Math.min(c.trans.dur, c.dur);
  if (lt >= d) return null;
  return { A: prevAdjacent(track, c), p: clamp(lt / d, 0, 1) };
}
// every clip that must show a picture at time t (with its local time) — used by the renderer and by video sync
function visibleAt(t) {
  const out = [];
  for (const tr of P.tracks) {
    if (tr.kind !== 'visual' || tr.hidden) continue;
    const c = clipAt(tr, t); if (!c) continue;
    out.push({ c, lt: t - c.start, tr });
    const ti = transInfo(tr, c, t);
    if (ti && ti.A) out.push({ c: ti.A, lt: ti.A.dur - 1 / P.fps, tr, frozen: true });
  }
  return out;
}
function mediaSize(c) {
  const m = MEDIA[c.media]; if (!m) return [16, 9];
  if (m.kind === 'video') { const v = VP.peek(c.id); if (v && v.videoWidth) return [v.videoWidth, v.videoHeight]; }
  return [m.w || 16, m.h || 9];
}
function contentSize(c) {
  if (c.type === 'video' || c.type === 'image') { const [sw, sh] = mediaSize(c); const bs = Math.min(P.w / sw, P.h / sh); return { w: sw * bs, h: sh * bs, x: -sw * bs / 2, y: -sh * bs / 2 }; }
  if (c.type === 'text') { const b = textBox(c.text); return b; }
  if (c.type === 'sticker') { const d = STK_BY[c.sticker.id] || { w: 200, h: 200 }; return { w: d.w, h: d.h, x: -d.w / 2, y: -d.h / 2 }; }
  return { w: P.w, h: P.h, x: -P.w / 2, y: -P.h / 2 };
}
function clipMatrix(c, lt, withAnim) {
  const p = propsAt(c, lt);
  const m = new DOMMatrix();
  let ax = 0, ay = 0, sx = 1, sy = 1, ar = 0;
  if (withAnim) { const s = clipAnimState(c, lt, P.w, P.h); ax = s.x; ay = s.y; sx = s.sx; sy = s.sy; ar = s.rot; }
  m.translateSelf(p.x + ax, p.y + ay); m.rotateSelf(p.rot + ar);
  m.scaleSelf(p.scale * sx * (c.flipH ? -1 : 1), p.scale * sy * (c.flipV ? -1 : 1));
  return m;
}
function sourceFor(c, lt) {
  const m = MEDIA[c.media]; if (!m || !m.ready) return null;
  if (m.kind === 'video') { const v = VP.peek(c.id); if (!v || v.readyState < 2 || !v.videoWidth) return null; return { src: v, sw: v.videoWidth, sh: v.videoHeight }; }
  if (m.animated) return { src: mediaFrame(m, lt * (c.speed || 1)), sw: m.w, sh: m.h };
  if (m.el) return { src: m.el, sw: m.w, sh: m.h };
  return null;
}
// the 2D effects (shake, zoom pulse, flash, strobe, blur, light leak): summed strength + settings of the first one
function fx2D(c, id, lt) {
  let st = null, a = 0;
  for (const e of c.effects || []) { if (e.id !== id || e.off) continue; const s = fxState(c, e, lt); a += s.amt; if (!st) st = s; }
  if (!st || Math.abs(a) < 1e-4) return null;
  st.amt = a; return st;
}
function shakeOffset(st, k) { const t = st.t, d = st.amt * 14 * st.p.dist / 100 * k; return { dx: (Math.sin(t * 71) + Math.sin(t * 37.3)) * d, dy: (Math.cos(t * 63) + Math.sin(t * 29.7)) * d, rot: (Math.sin(t * 53) + Math.sin(t * 23.1)) * st.p.twist / 100 * 4 * st.amt, sc: 1 + st.amt * 0.04 * st.p.dist / 100 + Math.sin(t * 41) * st.p.zoom / 100 * .05 * st.amt }; }
function zoomPulse(st) { return 1 + Math.pow(Math.abs(Math.sin(st.t * Math.PI)), st.p.punch) * st.p.size / 100 * st.amt; }
function flashLevel(st) { const n = 2 + (100 - st.p.len) / 100 * 30; return Math.pow(Math.max(0, Math.sin(st.t * Math.PI * 2)), n) * st.amt; }
function strobeOn(st) { return (st.t * 12) % 2 < 2 * st.p.on / 100; }

// draw one visual clip into ctx (ctx is in project units, k = output pixels per project unit)
function drawClip(x, c, lt, k) {
  const p = propsAt(c, lt), s = clipAnimState(c, lt, P.w, P.h);
  let alpha = clamp(p.opacity / 100, 0, 1) * clamp(s.a, 0, 1);
  if (alpha <= 0.001) return;
  x.save();
  x.globalAlpha = alpha;
  x.globalCompositeOperation = c.blend || 'source-over';
  let tx = p.x + s.x, ty = p.y + s.y, sc = 1;
  // 2D effects on the clip
  let fxRot = 0;
  const sh = fx2D(c, 'shake', lt); if (sh) { const o = shakeOffset(sh, 1); tx += o.dx; ty += o.dy; fxRot = o.rot; sc *= o.sc; }
  const zm = fx2D(c, 'zoom', lt); if (zm) sc *= zoomPulse(zm);
  const filt = [];
  const blS = fx2D(c, 'blur', lt), bl = s.blur + (blS ? blS.amt * blS.p.rad : 0); if (bl > 0.2) filt.push(`blur(${bl * k}px)`);
  const fl = fx2D(c, 'flash', lt); if (fl) filt.push(`brightness(${1 + flashLevel(fl) * 2.5})`);
  const sb = fx2D(c, 'strobe', lt); if (sb && strobeOn(sb)) filt.push(`brightness(${1 + sb.amt * 1.6})`);
  if (filt.length) x.filter = filt.join(' ');
  x.translate(tx, ty); x.rotate((p.rot + s.rot + fxRot) * Math.PI / 180);
  x.scale(p.scale * s.sx * sc * (c.flipH ? -1 : 1), p.scale * s.sy * sc * (c.flipV ? -1 : 1));
  if (c.type === 'video' || c.type === 'image') drawMediaContent(x, c, lt, k * p.scale * Math.max(s.sx, s.sy) * sc);
  else if (c.type === 'text') drawText(x, c.text, lt, c.dur);
  else if (c.type === 'sticker') drawSticker(x, c.sticker, lt);
  x.restore();
}
function drawMediaContent(x, c, lt, kd) {
  const S = sourceFor(c, lt); if (!S) return;
  let { src, sw, sh } = S;
  const bs = Math.min(P.w / sw, P.h / sh), w = sw * bs, hh = sh * bs;
  const cr = c.crop || { l: 0, t: 0, r: 0, b: 0 };
  // GPU grade / filter / chroma / shader effects
  const q = gradeParams(c, lt);
  let pw = sw, ph = sh;
  if (!gradeIsIdentity(q)) {
    const ow = Math.min(sw, Math.ceil(w * Math.abs(kd)) + 2), oh = Math.min(sh, Math.ceil(hh * Math.abs(kd)) + 2);
    const out = glProcess(src, sw, sh, Math.max(2, ow), Math.max(2, oh), q, lt);
    if (out) { src = out; pw = out.width; ph = out.height; }
  }
  const sx = pw * cr.l / 100, sy = ph * cr.t / 100, sW = pw * (1 - (cr.l + cr.r) / 100), sH = ph * (1 - (cr.t + cr.b) / 100);
  if (sW <= 0 || sH <= 0) return;
  const dx = -w / 2 + w * cr.l / 100, dy = -hh / 2 + hh * cr.t / 100, dW = w * sW / pw, dH = hh * sH / ph;
  const mk = c.mask;
  if (!mk || mk.type === 'none') { x.drawImage(src, sx, sy, sW, sH, dx, dy, dW, dH); return; }
  // masked: draw into a scratch layer, cut with a (feathered) mask, put it back
  const lw = Math.max(2, Math.min(4096, Math.ceil(w * Math.abs(kd)))), lh = Math.max(2, Math.min(4096, Math.ceil(hh * Math.abs(kd))));
  const L = scratch('mk-a', lw, lh), lx = L.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.filter = 'none'; lx.clearRect(0, 0, lw, lh);
  const f = lw / w;
  lx.drawImage(src, sx, sy, sW, sH, (dx + w / 2) * f, (dy + hh / 2) * f, dW * f, dH * f);
  const M = scratch('mk-b', lw, lh), mx = M.getContext('2d');
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, lw, lh);
  const fe = (mk.feather || 0) / 100 * Math.min(lw, lh) * 0.25;
  mx.filter = fe > 0.5 ? `blur(${fe}px)` : 'none';
  mx.fillStyle = '#fff';
  if (mk.invert) { mx.fillRect(-lw, -lh, lw * 3, lh * 3); mx.globalCompositeOperation = 'destination-out'; }
  mx.translate(lw / 2 + mk.x * lw / 2, lh / 2 + mk.y * lh / 2); mx.rotate((mk.rot || 0) * Math.PI / 180);
  maskPath(mx, mk, mk.w * lw, mk.h * lh, Math.max(lw, lh));
  mx.fill();
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.filter = 'none'; mx.globalCompositeOperation = 'source-over';
  lx.globalCompositeOperation = 'destination-in'; lx.drawImage(M, 0, 0); lx.globalCompositeOperation = 'source-over';
  x.drawImage(L, -w / 2, -hh / 2, w, hh);
}
const MASKS = { none: 'None', rect: 'Rectangle', circle: 'Circle', linear: 'Linear', band: 'Mirror band', heart: 'Heart', star: 'Star' };
function maskPath(x, mk, W, H, big) {
  x.beginPath();
  switch (mk.type) {
    case 'rect': { const r = (mk.round || 0) / 100 * Math.min(W, H) / 2; if (x.roundRect) x.roundRect(-W / 2, -H / 2, W, H, r); else x.rect(-W / 2, -H / 2, W, H); break; }
    case 'circle': x.ellipse(0, 0, Math.max(0.1, W / 2), Math.max(0.1, H / 2), 0, 0, Math.PI * 2); break;
    case 'linear': x.rect(-big * 2, 0, big * 4, big * 2); break;
    case 'band': x.rect(-big * 2, -H / 2, big * 4, H); break;
    case 'heart': { const s = Math.min(W, H) / 34; for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 2; const px = 16 * Math.pow(Math.sin(t), 3) * s * W / Math.min(W, H), py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s * H / Math.min(W, H); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); break; }
    case 'star': { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1; x.lineTo(Math.cos(a) * W / 2 * r, Math.sin(a) * H / 2 * r); } x.closePath(); break; }
  }
}
// filters / adjustments / effects as their own timeline clips: they change everything below them
function applyLayerFx(x, c, lt, W, H, k) {
  const p = propsAt(c, lt); const alpha = clamp(p.opacity / 100, 0, 1);
  if (alpha <= 0.001) return;
  const q = gradeParams(c, lt);
  if (!gradeIsIdentity(q)) {
    const out = glProcess(x.canvas, W, H, W, H, q, lt);
    if (out) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = alpha; if (alpha >= 1) x.globalCompositeOperation = 'copy'; x.drawImage(out, 0, 0, W, H); x.restore(); }
  }
  const sh = fx2D(c, 'shake', lt), zm = fx2D(c, 'zoom', lt), blS = fx2D(c, 'blur', lt), bl = blS ? blS.amt * blS.p.rad / 30 : 0;
  if (sh || zm || bl) {
    const S = scratch('fxc', W, H), s = S.getContext('2d'); s.globalCompositeOperation = 'copy'; s.drawImage(x.canvas, 0, 0);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    let dx = 0, dy = 0, sc = 1, rr = 0;
    if (sh) { const o = shakeOffset(sh, k); dx = o.dx; dy = o.dy; sc *= o.sc; rr = o.rot; }
    if (zm) sc *= zoomPulse(zm);
    x.globalCompositeOperation = 'copy'; if (bl) x.filter = `blur(${bl * 30 * k}px)`;
    x.translate(W / 2 + dx, H / 2 + dy); x.rotate(rr * Math.PI / 180); x.scale(sc, sc); x.drawImage(S, -W / 2, -H / 2);
    x.restore();
  }
  const fl = fx2D(c, 'flash', lt), sb = fx2D(c, 'strobe', lt), lk = fx2D(c, 'leak', lt);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  const rgb = col => { const [r, g, b] = hexToRgba(col); return `${r},${g},${b}`; };
  if (fl) { x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(${rgb(fl.p.col)},${clamp(flashLevel(fl), 0, 1)})`; x.fillRect(0, 0, W, H); }
  if (sb && strobeOn(sb)) { x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(${rgb(sb.p.col)},${clamp(sb.amt * .6, 0, 1)})`; x.fillRect(0, 0, W, H); }
  if (lk) {
    const t = lk.t * .25 * lk.p.drift / 100, a = clamp(lk.amt, 0, 1), [r, g, b] = hexToRgba(lk.p.col);
    const cx = W * (.5 + Math.sin(t * 2.1) * .45), cy = H * (.4 + Math.cos(t * 1.3) * .3), R0 = Math.max(W, H) * lk.p.size / 100;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, R0);
    gr.addColorStop(0, `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},${.75 * a})`); gr.addColorStop(.35, `rgba(${r},${Math.round(g * .6)},${Math.round(b * .6)},${.4 * a})`); gr.addColorStop(1, `rgba(${r},${Math.round(g * .25)},0,0)`);
    x.globalCompositeOperation = 'screen'; x.fillStyle = gr; x.fillRect(0, 0, W, H);
  }
  x.restore();
}
function layerCanvas(key, W, H) { const c = scratch(key, W, H); const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, W, H); return x; }
function drawBackground(x, t, W, H, k) {
  const bg = P.bg || { type: 'color', color: '#000000ff' };
  x.fillStyle = bg.type === 'color' || bg.type === 'blur' ? css(bg.type === 'blur' ? '#000000ff' : bg.color) : '#000';
  x.fillRect(0, 0, W, H);
  if (bg.type === 'blur') {
    for (const tr of visualTracks()) {
      if (tr.hidden) continue; const c = clipAt(tr, t);
      if (c && (c.type === 'video' || c.type === 'image')) {
        const S = sourceFor(c, t - c.start); if (!S) break;
        const s = Math.max(W / S.sw, H / S.sh) * 1.08;
        x.save(); x.filter = `blur(${(bg.blur || 40) * k}px) brightness(0.85)`; x.drawImage(S.src, (W - S.sw * s) / 2, (H - S.sh * s) / 2, S.sw * s, S.sh * s); x.restore();
        break;
      }
    }
  }
}
// render the whole frame at time t into ctx sized W x H
function renderFrame(x, t, W, H) {
  const k = W / P.w;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  drawBackground(x, t, W, H, k);
  for (const tr of P.tracks) {
    if (tr.kind !== 'visual' || tr.hidden) continue;
    const c = clipAt(tr, t); if (!c) continue;
    const lt = t - c.start;
    if (c.type === 'effect' || c.type === 'filter' || c.type === 'adjust') { applyLayerFx(x, c, lt, W, H, k); continue; }
    const ti = transInfo(tr, c, t);
    if (ti && TRANS[c.trans.id]) {
      let A = null;
      if (ti.A && ti.A.type !== 'effect' && ti.A.type !== 'filter' && ti.A.type !== 'adjust') { const ax = layerCanvas('LA', W, H); ax.setTransform(k, 0, 0, k, 0, 0); drawClip(ax, ti.A, ti.A.dur - 1 / P.fps, k); A = ax.canvas; }
      const bx = layerCanvas('LB', W, H); bx.setTransform(k, 0, 0, k, 0, 0); drawClip(bx, c, lt, k);
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
      TRANS[c.trans.id].f(x, A, bx.canvas, ti.p, W, H);
      x.restore();
      continue;
    }
    x.save(); x.setTransform(k, 0, 0, k, 0, 0); drawClip(x, c, lt, k); x.restore();
  }
}
