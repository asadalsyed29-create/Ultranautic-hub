/* ================= Photo editor: a second workspace on the same layered picture as Draw =================
   Layers can be pixels, text or adjustments, each with an optional mask, styles and clipping.
   Draw and Photo share one document, so work moves between them (and to Animate) without copying. */

const dirty = L => { if (!L) return; const o = L.owner || L; o.ver = (o.ver || 0) + 1; };
function dwTarget() {
  const L = DW.layers[DW.cur];
  if (DW.editMask && L.mask) { const p = L._mp || (L._mp = { isMask: true, owner: L, vis: true, op: 100, blend: 'source-over', lock: false }); p.cv = L.mask; p.name = L.name + ' mask'; return p; }
  return L;
}
function ctxReset(x) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = x.shadowOffsetY = 0; x.imageSmoothingEnabled = true; return x; }
// scratch canvases, reused by name
function tmpCv(k, w = DW.w, hh = DW.h) {
  const T_ = DW._t || (DW._t = {}); let c = T_[k];
  if (!c) c = T_[k] = newLayerCanvas(w, hh);
  if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
  const x = ctxReset(c.getContext('2d')); x.clearRect(0, 0, w, hh); return c;
}
function copyCv(c) { const n = newLayerCanvas(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; }
function phClipSel(c) {
  if (!DW.sel) return c;
  const t = tmpCv('selclip'), x = t.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(DW.sel, 0, 0); x.globalCompositeOperation = 'source-over'; return t;
}
// orig outside the selection, changed inside it (exact, premultiplied add)
function phMix(orig, changed, sel, into) {
  sel = sel === undefined ? DW.sel : sel;
  const out = into || newLayerCanvas(orig.width, orig.height), x = ctxReset(out.getContext('2d'));
  if (!sel) { x.clearRect(0, 0, out.width, out.height); x.drawImage(changed, 0, 0, out.width, out.height); return out; }
  const a = tmpCv('mixA', out.width, out.height), ax = a.getContext('2d'); ax.drawImage(changed, 0, 0, out.width, out.height); ax.globalCompositeOperation = 'destination-in'; ax.drawImage(sel, 0, 0);
  x.clearRect(0, 0, out.width, out.height); x.drawImage(orig, 0, 0); x.globalCompositeOperation = 'destination-out'; x.drawImage(sel, 0, 0);
  x.globalCompositeOperation = 'lighter'; x.drawImage(a, 0, 0); x.globalCompositeOperation = 'source-over';
  return out;
}

/* ---------- layer styles ---------- */
const FX_DEF = {
  shadow: { on: false, color: '#000000ff', op: 60, angle: 120, dist: 12, blur: 16 },
  glow: { on: false, color: '#ffe680ff', op: 80, size: 24 },
  stroke: { on: false, color: '#000000ff', size: 6 },
  inner: { on: false, color: '#000000ff', op: 60, angle: 120, dist: 6, blur: 10 },
  bevel: { on: false, depth: 6, angle: 120, soft: 4, op: 70 },
  color: { on: false, color: '#ff3b30ff', op: 100 },
  grad: { on: false, c1: '#000000ff', c2: '#ffffffff', angle: 90, op: 100 }
};
const fxOn = L => !!(L.fx && Object.keys(L.fx).some(k => L.fx[k] && L.fx[k].on));
function shadowOnly(x, src, color, ox, oy, blur) { // draws just the shadow of src
  const far = (DW.w + DW.h) * 3; x.save(); x.shadowColor = color; x.shadowBlur = blur; x.shadowOffsetX = ox + far; x.shadowOffsetY = oy; x.drawImage(src, -far, 0); x.restore();
}
function ringOf(src, size, color, key) {
  const t = tmpCv(key), x = t.getContext('2d'), n = Math.max(12, Math.min(48, Math.round(size * 3)));
  for (let r = size; r > 0; r -= Math.max(2, size / 3)) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; x.drawImage(src, Math.cos(a) * r, Math.sin(a) * r); }
  x.globalCompositeOperation = 'source-in'; x.fillStyle = css(color); x.fillRect(0, 0, t.width, t.height); return t;
}
function applyFx(src, f, key) {
  const W = DW.w, H = DW.h, o = tmpCv(key + 'fx'), x = o.getContext('2d'), rad = a => a * Math.PI / 180;
  if (f.shadow && f.shadow.on) { const s = f.shadow; shadowOnly(x, src, css(s.color, s.op / 100), -Math.cos(rad(s.angle)) * s.dist, Math.sin(rad(s.angle)) * s.dist, s.blur); }
  if (f.glow && f.glow.on) { const s = f.glow; shadowOnly(x, src, css(s.color, s.op / 100), 0, 0, s.size); shadowOnly(x, src, css(s.color, s.op / 200), 0, 0, s.size / 3); }
  if (f.stroke && f.stroke.on) x.drawImage(ringOf(src, f.stroke.size, f.stroke.color, key + 'ring'), 0, 0);
  const body = tmpCv(key + 'body'), bx = body.getContext('2d'); bx.drawImage(src, 0, 0); bx.globalCompositeOperation = 'source-atop';
  if (f.color && f.color.on) { bx.globalAlpha = f.color.op / 100; bx.fillStyle = css(f.color.color); bx.fillRect(0, 0, W, H); bx.globalAlpha = 1; }
  if (f.grad && f.grad.on) { const s = f.grad, a = rad(s.angle), r = Math.hypot(W, H) / 2, g = bx.createLinearGradient(W / 2 - Math.cos(a) * r, H / 2 + Math.sin(a) * r, W / 2 + Math.cos(a) * r, H / 2 - Math.sin(a) * r); g.addColorStop(0, css(s.c1)); g.addColorStop(1, css(s.c2)); bx.globalAlpha = s.op / 100; bx.fillStyle = g; bx.fillRect(0, 0, W, H); bx.globalAlpha = 1; }
  if ((f.inner && f.inner.on) || (f.bevel && f.bevel.on)) {
    const inv = tmpCv(key + 'inv'), ix = inv.getContext('2d'); ix.fillStyle = '#000'; ix.fillRect(0, 0, W, H); ix.globalCompositeOperation = 'destination-out'; ix.drawImage(src, 0, 0);
    if (f.inner && f.inner.on) { const s = f.inner; shadowOnly(bx, inv, css(s.color, s.op / 100), -Math.cos(rad(s.angle)) * s.dist, Math.sin(rad(s.angle)) * s.dist, s.blur); }
    if (f.bevel && f.bevel.on) { const s = f.bevel, dx = Math.cos(rad(s.angle)) * s.depth, dy = -Math.sin(rad(s.angle)) * s.depth; shadowOnly(bx, inv, `rgba(255,255,255,${s.op / 100})`, dx, dy, s.soft); shadowOnly(bx, inv, `rgba(0,0,0,${s.op / 100})`, -dx, -dy, s.soft); }
  }
  bx.globalCompositeOperation = 'source-over';
  x.drawImage(body, 0, 0); return o;
}

/* ---------- compositing: masks, styles, clipping, adjustment layers (cached) ---------- */
function layerKey(L) { return L.id + ':' + (L.ver || 0) + ':' + (L.vis ? 1 : 0) + ':' + L.op + ':' + L.blend + ':' + (L.clip ? 1 : 0) + ':' + (L.maskOff ? 1 : 0) + ':' + (L.mask ? 1 : 0) + ':' + (L.fx ? JSON.stringify(L.fx) : '') + ':' + (L.adj ? JSON.stringify(L.adj) : ''); }
function layerImg(L, i, live, key) {
  let src = L.cv, msk = L.mask && !L.maskOff ? L.mask : null;
  if (live && i === DW.cur && DW.live) { if (DW.editMask && L.mask) msk = DW.live(dwTarget()); else src = DW.live(L); }
  if (!msk && !fxOn(L)) return src;
  const t = tmpCv('li' + key), x = t.getContext('2d'); x.drawImage(src, 0, 0);
  if (msk) { x.globalCompositeOperation = 'destination-in'; x.drawImage(msk, 0, 0); x.globalCompositeOperation = 'source-over'; }
  return fxOn(L) ? applyFx(t, L.fx, key) : t;
}
function applyAdjLayer(out, L, i, live) {
  const W = DW.w, H = DW.h, ox = out.getContext('2d');
  const img = ox.getImageData(0, 0, W, H); phAdjust(L.adj.op, L.adj.p, img, W, H, 1);
  const r = tmpCv('adjr'), rx = r.getContext('2d'); rx.putImageData(img, 0, 0);
  let msk = L.mask && !L.maskOff ? L.mask : null;
  if (live && i === DW.cur && DW.live && DW.editMask && L.mask) msk = DW.live(dwTarget());
  if (!msk && L.op >= 100) { ox.globalCompositeOperation = 'copy'; ox.drawImage(r, 0, 0); ox.globalCompositeOperation = 'source-over'; return; }
  const m = tmpCv('adjm'), mx = m.getContext('2d'); mx.globalAlpha = L.op / 100; if (msk) mx.drawImage(msk, 0, 0); else { mx.fillStyle = '#fff'; mx.fillRect(0, 0, W, H); }
  rx.globalCompositeOperation = 'destination-in'; rx.drawImage(m, 0, 0);
  ox.globalCompositeOperation = 'destination-out'; ox.drawImage(m, 0, 0); ox.globalCompositeOperation = 'lighter'; ox.drawImage(r, 0, 0); ox.globalCompositeOperation = 'source-over';
}
function docRender(live) {
  const W = DW.w, H = DW.h;
  if (!DW.comp || DW.comp.width !== W || DW.comp.height !== H) DW.comp = newLayerCanvas(W, H);
  const out = DW.comp, x = ctxReset(out.getContext('2d')); x.clearRect(0, 0, W, H);
  const Ls = DW.layers, cache = DW.adjCache || (DW.adjCache = {}), keys = []; let key = '';
  for (let i = 0; i < Ls.length; i++) { key += '|' + layerKey(Ls[i]) + (live && DW.live && i === DW.cur ? '~' + Math.random() : ''); keys.push(key); }
  let start = 0;
  for (let i = Ls.length - 1; i >= 0; i--) { const L = Ls[i]; if (L.kind === 'adj' && L.vis && cache[L.id] && cache[L.id].key === keys[i] && cache[L.id].cv.width === W && cache[L.id].cv.height === H) { x.drawImage(cache[L.id].cv, 0, 0); start = i + 1; break; } }
  const used = new Set();
  for (let i = start; i < Ls.length; i++) {
    const L = Ls[i]; if (!L.vis) continue;
    if (L.kind === 'adj') {
      applyAdjLayer(out, L, i, live);
      const c = cache[L.id] || (cache[L.id] = { cv: newLayerCanvas(W, H) }); if (c.cv.width !== W || c.cv.height !== H) { c.cv.width = W; c.cv.height = H; }
      const cx = ctxReset(c.cv.getContext('2d')); cx.clearRect(0, 0, W, H); cx.drawImage(out, 0, 0); c.key = keys[i]; continue;
    }
    if (L.clip && used.has(i)) continue;
    let img = layerImg(L, i, live, 'b');
    const clipped = []; for (let j = i + 1; j < Ls.length && Ls[j].clip && Ls[j].kind !== 'adj'; j++) { used.add(j); if (Ls[j].vis) clipped.push(j); }
    if (clipped.length) {
      const g = tmpCv('grp'), gx = g.getContext('2d'); gx.drawImage(img, 0, 0);
      for (const k of clipped) {
        const C = Ls[k], ci = layerImg(C, k, live, 'c'), t = tmpCv('clp'), tx = t.getContext('2d');
        tx.drawImage(ci, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(img, 0, 0);
        gx.globalAlpha = C.op / 100; gx.globalCompositeOperation = C.blend; gx.drawImage(t, 0, 0); gx.globalAlpha = 1; gx.globalCompositeOperation = 'source-over';
      }
      img = g;
    }
    x.globalAlpha = L.op / 100; x.globalCompositeOperation = L.blend; x.drawImage(img, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  return out;
}
function docFlat() { return copyCv(docRender(false)); }

/* ---------- whole-document undo steps (layer list, size, masks...) ---------- */
function phDocState() {
  return { w: DW.w, h: DW.h, cur: DW.cur, sel: DW.sel ? copyCv(DW.sel) : null, layers: DW.layers.map(L => { const n = { ...L, cv: copyCv(L.cv), mask: L.mask ? copyCv(L.mask) : null }; delete n._mp; for (const k of ['adj', 'text', 'fx']) if (L[k]) n[k] = deep(L[k]); return n; }) };
}
function phDocRestore(s) {
  const resized = s.w !== DW.w || s.h !== DW.h;
  DW.w = s.w; DW.h = s.h; DW.layers = s.layers; DW.cur = clamp(s.cur, 0, DW.layers.length - 1);
  for (const L of DW.layers) dirty(L);
  if (resized) { DW.stroke = newLayerCanvas(DW.w, DW.h); DW.ref = null; DW.view.fit = true; dwFit(); }
  DW.sel = s.sel; DW.tf = null; DW.crop = null; DW.editMask = DW.editMask && !!DW.layers[DW.cur].mask; phSelChanged(); dwToolUI();
}
function phSnapDoc() { DW.undo.push({ doc: phDocState() }); DW.redo = []; phUndoTrim(); dwUndoUI(); }
function phUndoTrim() {
  const size = e => e.doc ? e.doc.layers.reduce((a, L) => a + L.cv.width * L.cv.height * (L.mask ? 8 : 4), 0) : e.c.width * e.c.height * 4;
  let tot = DW.undo.reduce((a, e) => a + size(e), 0);
  while (DW.undo.length > 1 && (DW.undo.length > 40 || tot > 420e6)) tot -= size(DW.undo.shift());
}

/* ---------- selection: an alpha mask the size of the picture ---------- */
function selCv() { return newLayerCanvas(DW.w, DW.h); }
function phSetSel(c, mode) {
  mode = mode || DW_PREF.selMode || 'new';
  const f = DW_PREF.feather || 0;
  if (f > 0) { const t = newLayerCanvas(DW.w, DW.h), x = t.getContext('2d'); x.filter = `blur(${f}px)`; x.drawImage(c, 0, 0); c = t; }
  if (mode === 'new' || !DW.sel) { if (mode === 'sub' || mode === 'int') { if (!DW.sel) return phSelChanged(); } DW.sel = c; }
  else { const x = ctxReset(DW.sel.getContext('2d')); x.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'sub' ? 'destination-out' : 'destination-in'; x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-over'; }
  phSelChanged();
}
function phDeselect() { if (DW.sel) DW.lastSel = DW.sel; DW.sel = null; phSelChanged(); }
// outline for the marching ants, from a smaller copy of the mask
function phSelChanged() {
  DW.ants = null; DW.selBox = null;
  if (!DW.sel) { dwRender(); return; }
  const W = DW.w, H = DW.h, s = Math.max(1, Math.ceil(Math.max(W, H) / 900)), w = Math.ceil(W / s), hh = Math.ceil(H / s);
  const sm = newLayerCanvas(w, hh), sx = sm.getContext('2d'); sx.drawImage(DW.sel, 0, 0, w, hh);
  const a = sx.getImageData(0, 0, w, hh).data, inn = (x, y) => x >= 0 && y >= 0 && x < w && y < hh && a[(y * w + x) * 4 + 3] >= 128;
  const seg = []; let any = false, x0 = w, y0 = hh, x1 = 0, y1 = 0;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    if (!inn(x, y)) continue; any = true; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    if (!inn(x - 1, y)) seg.push(x, y, x, y + 1); if (!inn(x + 1, y)) seg.push(x + 1, y, x + 1, y + 1);
    if (!inn(x, y - 1)) seg.push(x, y, x + 1, y); if (!inn(x, y + 1)) seg.push(x, y + 1, x + 1, y + 1);
  }
  if (!any) { DW.sel = null; dwRender(); return; }
  DW.ants = { seg: new Float32Array(seg.map(v => v * s)) }; DW.selBox = { x: x0 * s, y: y0 * s, w: (x1 - x0 + 1) * s, h: (y1 - y0 + 1) * s };
  dwRender();
}
function phAntsTimer() { clearInterval(DW.antT); DW.antT = setInterval(() => { if (!DW.on) { clearInterval(DW.antT); return; } if (DW.ants) { DW.antPh = (DW.antPh || 0) + 1; dwRender(); } }, 320); }
function drawAnts(x, d, v) {
  const S = DW.ants.seg, ph = DW.antPh || 0, pa = new Path2D(), pb = new Path2D(), k = d * v.z;
  for (let i = 0; i < S.length; i += 4) { const X = d * v.x + S[i] * k, Y = d * v.y + S[i + 1] * k, X2 = d * v.x + S[i + 2] * k, Y2 = d * v.y + S[i + 3] * k; const pth = ((Math.floor((X + Y) / 7) + ph) & 1) ? pa : pb; pth.moveTo(X, Y); pth.lineTo(X2, Y2); }
  x.lineWidth = Math.max(1, d); x.strokeStyle = '#000'; x.stroke(pa); x.strokeStyle = '#fff'; x.stroke(pb);
}
function maskToCanvas(mask, W, H) { const c = newLayerCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data; for (let i = 0; i < W * H; i++) if (mask[i]) { const j = i * 4; d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = mask[i] === 1 ? 255 : mask[i]; } x.putImageData(img, 0, 0); return c; }
function floodMask(sd, W, H, X, Y, tol, contiguous) {
  const i0 = (Y * W + X) * 4, r0 = sd[i0], g0 = sd[i0 + 1], b0 = sd[i0 + 2], a0 = sd[i0 + 3], mask = new Uint8Array(W * H);
  const same = i => { const j = i * 4; return Math.abs(sd[j] - r0) <= tol && Math.abs(sd[j + 1] - g0) <= tol && Math.abs(sd[j + 2] - b0) <= tol && Math.abs(sd[j + 3] - a0) <= tol; };
  if (!contiguous) { for (let i = 0; i < W * H; i++) if (same(i)) mask[i] = 1; return mask; }
  const stack = [X, Y];
  while (stack.length) {
    const y = stack.pop(); let x = stack.pop(), i = y * W + x;
    while (x >= 0 && !mask[i] && same(i)) { x--; i--; }
    x++; i++; let up = false, dn = false;
    while (x < W && !mask[i] && same(i)) {
      mask[i] = 1;
      if (y > 0) { const k = i - W; if (!mask[k] && same(k)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false; }
      if (y < H - 1) { const k = i + W; if (!mask[k] && same(k)) { if (!dn) { stack.push(x, y + 1); dn = true; } } else dn = false; }
      x++; i++;
    }
  }
  return mask;
}
function phSelGrow(c, r) { // spread the mask outward by r pixels
  const t = newLayerCanvas(c.width, c.height), x = t.getContext('2d'), n = Math.max(16, Math.min(64, Math.round(r * 2)));
  x.drawImage(c, 0, 0); for (let rr = r; rr > 0; rr -= Math.max(1, r / 4)) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; x.drawImage(c, Math.cos(a) * rr, Math.sin(a) * rr); }
  return t;
}
function phSelInvert(c) { const t = newLayerCanvas(DW.w, DW.h), x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, DW.w, DW.h); if (c) { x.globalCompositeOperation = 'destination-out'; x.drawImage(c, 0, 0); } return t; }
function phSelThreshold(c, lim = 128) { const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), d = img.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= lim ? 255 : 0; x.putImageData(img, 0, 0); return c; }

/* ---------- text layers: kept as words, drawn into pixels when they change ---------- */
function phTextFont(t) { return `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${t.size}px ${t.font}`; }
function phRenderText(L) {
  const t = L.text, x = ctxReset(L.cv.getContext('2d')); x.clearRect(0, 0, L.cv.width, L.cv.height);
  x.font = phTextFont(t); try { x.letterSpacing = (t.ls || 0) + 'px'; } catch (e) { }
  x.textBaseline = 'top'; x.textAlign = t.align || 'left'; x.lineJoin = 'round';
  const lines = String(t.s || '').split('\n'), lh = t.size * (t.lh || 1.2);
  let mw = 0; for (const ln of lines) mw = Math.max(mw, x.measureText(ln).width);
  const hh = lines.length * lh, ax = t.align === 'center' ? -mw / 2 : t.align === 'right' ? -mw : 0;
  x.translate(t.x, t.y); if (t.rot) x.rotate(t.rot * Math.PI / 180);
  lines.forEach((ln, i) => { if (t.sw > 0) { x.strokeStyle = css(t.sc || '#000000ff'); x.lineWidth = t.sw * 2; x.strokeText(ln, 0, i * lh); } x.fillStyle = css(t.color); x.fillText(ln, 0, i * lh); });
  const c = Math.cos((t.rot || 0) * Math.PI / 180), s = Math.sin((t.rot || 0) * Math.PI / 180), pts = [[ax, 0], [ax + mw, 0], [ax + mw, hh], [ax, hh]].map(([px, py]) => [t.x + px * c - py * s, t.y + px * s + py * c]);
  t.box = pts; dirty(L);
}
function phNewText(p) {
  phSnapDoc();
  const L = dwLayer('Text'); L.kind = 'text';
  L.text = { s: 'Your text', font: DW_PREF.tfont || 'system-ui, sans-serif', size: DW_PREF.tsize || Math.round(Math.max(24, Math.min(DW.w, DW.h) / 10)), color: DW_PREF.color, bold: !!DW_PREF.tbold, italic: false, align: 'left', lh: 1.2, ls: 0, sw: 0, sc: '#000000ff', rot: 0, x: p.x, y: p.y };
  DW.layers.splice(DW.cur + 1, 0, L); DW.cur++; phRenderText(L); return L;
}
function inPoly(p, q) { let ins = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) { const [xi, yi] = q[i], [xj, yj] = q[j]; if ((yi > p.y) !== (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }

/* ---------- editor switch: Animate / Draw / Photo ---------- */
function phToolFor(mode) {
  const list = mode === 'photo' ? PH_TOOLS : DW_TOOLS, key = mode === 'photo' ? 'ptool' : 'dtool';
  if (DW_PREF[key] && list.some(t => t[0] === DW_PREF[key])) DW_PREF.tool = DW_PREF[key];
  if (!list.some(t => t[0] === DW_PREF.tool)) DW_PREF.tool = mode === 'photo' ? 'tf' : 'brush';
}
function phSetMode(m) {
  if (m === DW.mode) return;
  if (m === 'animate') { closeDraw(true); return; }
  if (DW.tf) phTfApply(); DW.crop = null; DW.panel = null; DW.live = null;
  DW_PREF[DW.mode === 'photo' ? 'ptool' : 'dtool'] = DW_PREF.tool;
  DW.mode = m; phToolFor(m); savePref();
  buildDrawUI(); dwFit(); dwRender();
  toast(m === 'photo' ? 'Now in Photo. Your layers came along.' : 'Now in Draw. Your layers came along.');
}
function phModeRow() {
  const row_ = h('div', { class: 'dwmodes' });
  row_.append(segBox({ options: [{ v: 'animate', l: 'Animate', i: 'video' }, { v: 'draw', l: 'Draw', i: 'dbrush' }, { v: 'photo', l: 'Photo', i: 'image' }], value: DW.mode, onChange: phSetMode }));
  if (DW.mode === 'photo') { const mb = h('div', { class: 'phmenus' }); for (const [id, n] of PH_MENUS) mb.append(h('button', { class: 'phm', onclick: e => phOpenMenu(id, e.currentTarget) }, n)); row_.append(mb); }
  return row_;
}

/* ---------- overlay on top of the picture (selection, tools) ---------- */
function phOverlay(x, d, v) {
  const S = (px, py) => [d * (v.x + px * v.z), d * (v.y + py * v.z)];
  x.save();
  if (DW.ants) drawAnts(x, d, v);
  const t = PH_H[DW_PREF.tool]; if (t && t.overlay) t.overlay(x, d, v, S);
  if (DW.panel && DW.panel.overlay) DW.panel.overlay(x, d, v, S);
  x.restore();
}
function handleDot(x, X, Y, r, round) { x.fillStyle = '#fff'; x.strokeStyle = '#1b1d22'; x.lineWidth = 1.5; x.beginPath(); if (round) x.arc(X, Y, r, 0, 7); else x.rect(X - r, Y - r, r * 2, r * 2); x.fill(); x.stroke(); }

/* ---------- layers panel (both editors) ---------- */
function phLayersSheet() {
  const body = h('div', { class: 'lsheet' });
  let m_;
  const draw = () => {
    body.innerHTML = '';
    for (let i = DW.layers.length - 1; i >= 0; i--) {
      const L = DW.layers[i];
      const th = h('canvas', { class: 'lthumb' }); th.width = 64; th.height = Math.max(8, Math.round(64 * DW.h / DW.w));
      const tx = th.getContext('2d');
      if (L.kind === 'adj') { tx.fillStyle = '#2a2c31'; tx.fillRect(0, 0, 64, th.height); tx.fillStyle = '#e4e5e8'; tx.font = '600 11px system-ui'; tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.fillText((ADJ[L.adj.op] || { n: '' }).n.slice(0, 10), 32, th.height / 2); }
      else tx.drawImage(L.cv, 0, 0, th.width, th.height);
      let mt = '';
      if (L.mask) { mt = h('canvas', { class: 'lthumb lmask' + (DW.editMask && i === DW.cur ? ' on' : '') }); mt.width = 64; mt.height = th.height; const mx = mt.getContext('2d'); mx.fillStyle = '#000'; mx.fillRect(0, 0, 64, mt.height); mx.drawImage(L.mask, 0, 0, 64, mt.height); mt.title = 'Mask'; mt.onclick = e => { e.stopPropagation(); DW.cur = i; DW.editMask = !(DW.editMask && i === DW.cur); dwToolUI(); draw(); dwRender(); }; }
      const kindTxt = L.kind === 'text' ? 'Text' : L.kind === 'adj' ? 'Adjustment' : '';
      const info = [kindTxt, `${L.op}%`, L.blend !== 'source-over' ? (DW_BLENDS.find(b => b[0] === L.blend) || [0, ''])[1] : '', L.clip ? 'clipped' : '', fxOn(L) ? 'styles' : '', L.lock ? 'see-through locked' : ''].filter(Boolean).join(' · ');
      const rowEl = h('div', { class: 'lrow' + (i === DW.cur ? ' on' : '') + (L.clip ? ' lclip' : ''), onclick: () => { DW.cur = i; if (!L.mask) DW.editMask = false; dwToolUI(); draw(); dwRender(); } },
        h('button', { class: 'tb', title: L.vis ? 'Hide' : 'Show', html: icon(L.vis ? 'eye' : 'eyeoff'), onclick: e => { e.stopPropagation(); L.vis = !L.vis; draw(); dwRender(); } }),
        th, mt, h('div', { class: 'lname' }, L.name, h('small', null, info)));
      body.append(rowEl);
    }
    const L = DW.layers[DW.cur];
    const ctl = h('div', { class: 'lctl' });
    ctl.append(rangeRow('Opacity', { min: 0, max: 100, step: 1, value: L.op, suf: '%', onInput: v => { L.op = v; dwRender(); } }));
    if (L.kind !== 'adj') ctl.append(row('Blend', selectBox({ options: DW_BLENDS.map(([v, l]) => ({ v, l })), value: L.blend, onChange: v => { L.blend = v; dwRender(); draw(); } })));
    ctl.append(row('', checkBox('Lock see-through parts', L.lock, v => { L.lock = v; draw(); }), DW.cur > 0 && L.kind !== 'adj' ? checkBox('Clip to layer below', !!L.clip, v => { L.clip = v; draw(); dwRender(); }) : ''));
    const btn = (l, f, snap = true) => h('button', { class: 'btn sm', onclick: async () => { if (snap) phSnapDoc(); await f(); draw(); dwRender(); } }, l);
    ctl.append(h('div', { class: 'lbtns' },
      btn('New layer', () => { DW.layers.splice(DW.cur + 1, 0, dwLayer('Layer ' + (DW.layers.length + 1))); DW.cur++; DW.editMask = false; }),
      btn('Duplicate', () => phDupLayer()),
      btn('Move up', () => { if (DW.cur < DW.layers.length - 1) { DW.layers.splice(DW.cur + 1, 0, DW.layers.splice(DW.cur, 1)[0]); DW.cur++; } }),
      btn('Move down', () => { if (DW.cur > 0) { DW.layers.splice(DW.cur - 1, 0, DW.layers.splice(DW.cur, 1)[0]); DW.cur--; } }),
      btn('Merge down', () => phMergeDown()),
      btn('Rename', async () => { const n = await promptBox('Layer name', L.name); if (n) L.name = n; }, false),
      btn('Delete', () => { if (DW.layers.length > 1) { DW.layers.splice(DW.cur, 1); DW.cur = Math.max(0, DW.cur - 1); DW.editMask = false; } else toast('A picture needs at least one layer'); })));
    ctl.append(h('div', { class: 'lbtns' },
      L.mask ? btn(DW.editMask ? 'Paint the layer' : 'Paint the mask', () => { DW.editMask = !DW.editMask; dwToolUI(); }, false) : btn('Add mask', () => phAddMask(DW.sel ? 'sel' : 'reveal')),
      L.mask ? btn(L.maskOff ? 'Turn mask on' : 'Turn mask off', () => { L.maskOff = !L.maskOff; }) : '',
      L.mask && L.kind !== 'adj' ? btn('Apply mask', () => phApplyMask()) : '',
      L.mask ? btn('Delete mask', () => { L.mask = null; DW.editMask = false; }) : '',
      L.kind !== 'adj' ? btn('Styles', () => { m_.close(); phStylesPanel(); }, false) : btn('Edit adjustment', () => { m_.close(); phOpenAdj(L.adj.op, { layer: L }); }, false),
      L.kind === 'text' ? btn('Text to pixels', () => { L.kind = undefined; delete L.text; }) : ''));
    body.append(ctl);
  };
  draw();
  m_ = modal('Layers', body, [{ l: 'Close' }], { width: 480 });
}
function phDupLayer() {
  const L = DW.layers[DW.cur], n = dwLayer(L.name + ' copy');
  Object.assign(n, { op: L.op, blend: L.blend, kind: L.kind, clip: L.clip, adj: L.adj && deep(L.adj), text: L.text && deep(L.text), fx: L.fx && deep(L.fx), maskOff: L.maskOff });
  n.cv.getContext('2d').drawImage(L.cv, 0, 0); if (L.mask) n.mask = copyCv(L.mask);
  DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; return n;
}
function phMergeDown() {
  if (DW.cur < 1) return toast('Nothing below to merge into');
  const top = DW.layers[DW.cur], B_ = DW.layers[DW.cur - 1];
  if (B_.kind === 'adj') return toast('The layer below is an adjustment layer');
  if (top.kind === 'adj') { const keep = DW.layers; DW.layers = [B_, top]; const f = docFlat(); DW.layers = keep; const x = ctxReset(B_.cv.getContext('2d')); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(f, 0, 0); }
  else { const img = layerImg(top, -1, false, 'm'), x = ctxReset(B_.cv.getContext('2d')); x.globalAlpha = top.op / 100; x.globalCompositeOperation = top.blend; x.drawImage(img, 0, 0); ctxReset(x); }
  if (B_.kind === 'text') { B_.kind = undefined; delete B_.text; }
  DW.layers.splice(DW.cur, 1); DW.cur--; dirty(B_); DW.editMask = false;
}
function phAddMask(how) {
  const L = DW.layers[DW.cur], m = newLayerCanvas(DW.w, DW.h), x = m.getContext('2d');
  if (how === 'sel' && DW.sel) x.drawImage(DW.sel, 0, 0); else if (how !== 'hide') { x.fillStyle = '#fff'; x.fillRect(0, 0, DW.w, DW.h); }
  L.mask = m; L.maskOff = false; dirty(L);
}
function phApplyMask() { const L = DW.layers[DW.cur]; if (!L.mask) return; const x = ctxReset(L.cv.getContext('2d')); x.globalCompositeOperation = 'destination-in'; x.drawImage(L.mask, 0, 0); ctxReset(x); L.mask = null; DW.editMask = false; dirty(L); }

/* ---------- layer styles panel ---------- */
function phStylesPanel() {
  const L = DW.layers[DW.cur]; if (L.kind === 'adj') return;
  phSnapDoc();
  if (!L.fx) L.fx = {};
  const names = { shadow: 'Drop shadow', glow: 'Outer glow', stroke: 'Stroke', inner: 'Inner shadow', bevel: 'Bevel', color: 'Color overlay', grad: 'Gradient overlay' };
  const fields = { color: ['Color', 'c'], c1: ['From', 'c'], c2: ['To', 'c'], op: ['Opacity', 0, 100, '%'], angle: ['Angle', 0, 360, '°'], dist: ['Distance', 0, 200, 'px'], blur: ['Blur', 0, 200, 'px'], size: ['Size', 1, 200, 'px'], depth: ['Depth', 1, 60, 'px'], soft: ['Softness', 0, 60, 'px'] };
  DW.panel = {
    title: 'Layer styles: ' + L.name,
    build(o) {
      for (const k of Object.keys(names)) {
        const f = L.fx[k] || (L.fx[k] = deep(FX_DEF[k]));
        o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox(names[k], f.on, v => { f.on = v; dwRender(); dwToolUI(); })));
        if (!f.on) continue;
        for (const fk of Object.keys(f)) {
          if (fk === 'on' || !fields[fk]) continue; const fd = fields[fk];
          if (fd[1] === 'c') o.append(h('div', { class: 'dwo' }, h('label', null, fd[0]), colorBtn({ value: f[fk], onInput: v => { f[fk] = v; dwRender(); } })));
          else o.append(rangeRow(fd[0], { min: fd[1], max: fd[2], step: 1, value: f[fk], suf: fd[3], onInput: v => { f[fk] = v; dwRender(); } }));
        }
      }
      o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn pri sm', onclick: () => { DW.panel = null; dwToolUI(); } }, 'Done'), h('button', { class: 'btn sm', onclick: () => { dwUndo(); DW.redo = []; dwUndoUI(); DW.panel = null; dwToolUI(); dwRender(); } }, 'Cancel')));
    }
  };
  dwToolUI(); dwRender();
}
