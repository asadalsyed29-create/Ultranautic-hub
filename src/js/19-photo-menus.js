/* ================= Photo editor: menus, file handling, PSD, the editor switch ================= */
const PH_MENUS = [['file', 'File'], ['edit', 'Edit'], ['image', 'Image'], ['layer', 'Layer'], ['select', 'Select'], ['adjust', 'Adjust'], ['filter', 'Filter'], ['view', 'View']];
function curPixels() { const L = DW.layers[DW.cur]; return needPixels(L) ? L : null; }
function phDialog(title, rows, onOk, okLabel = 'OK') { const body = h('div'); rows.forEach(r => body.append(r)); return modal(title, body, [{ l: 'Cancel' }, { l: okLabel, pri: 1, onClick: onOk }], { width: 420 }); }
function numRow(label, value, o = {}) { let v = value; const f = numField({ value, min: o.min ?? 1, max: o.max ?? 30000, step: 1, dec: o.dec || 0, suf: o.suf || 'px', onInput: x => { v = x; o.onInput && o.onInput(x); } }); const r = row(label, f); r.get = () => v; r.set = x => { v = x; f.set(x); }; return r; }

function phMenuItems(id) {
  const L = DW.layers[DW.cur], S = DW.sel, it = (l, f, dis) => ({ l, f, dis }), sep = { sep: 1 };
  if (id === 'file') return [it('Open a photo (replaces this one)', () => phPickFile(f => phOpenFile(f, true))), it('Place a photo as a new layer', () => phPickFile(f => phOpenFile(f, false))), sep,
    it('Save picture to device (PNG, JPG, WebP)', phSavePicture), it('Save Photoshop file (.psd)', phSavePSD), it('Open Photoshop file (.psd)', () => phPickFile(f => phOpenFile(f, true), '.psd')), sep,
    it('New blank picture', () => editorNewBlank('photo')), it('Send to Animate (put it on the video)', () => closeDraw(true))];
  if (id === 'edit') return [it('Undo', dwUndo, !DW.undo.length), it('Redo', dwRedo, !DW.redo.length), sep,
    it('Cut', () => phCopy(true)), it('Copy', () => phCopy(false)), it('Copy everything you see', () => phCopy(false, true)), it('Paste as a new layer', phPaste, !DW.clipb), sep,
    it('Fill…', phFillDialog), it('Outline the selection…', phStrokeDialog, !S), it('Delete what is selected', phClearSel, !S), it('Fill in from around it (remove object)', phContentFill, !S), sep,
    it('Free transform', () => { DW_PREF.tool = 'tf'; dwToolUI(); })];
  if (id === 'image') return [it('Picture size…', phImageSize), it('Canvas size…', phCanvasSize), sep,
    it('Turn 90° right', () => phRotateDoc(90)), it('Turn 90° left', () => phRotateDoc(-90)), it('Turn 180°', () => phRotateDoc(180)), it('Turn by any angle…', phRotateAny), it('Mirror the whole picture', () => phFlipDoc(true)), it('Flip the whole picture upside down', () => phFlipDoc(false)), sep,
    it('Crop to the selection', () => { const b = DW.selBox; phCropTo(b.x, b.y, b.w, b.h); }, !S), it('Trim see-through edges', phTrim), sep,
    it('Auto tone', () => phOpenAdj('autotone')), it('Auto contrast', () => phOpenAdj('autocon')), it('Auto color', () => phOpenAdj('autocol'))];
  if (id === 'layer') return [it('New layer', () => { phSnapDoc(); DW.layers.splice(DW.cur + 1, 0, dwLayer('Layer ' + (DW.layers.length + 1))); DW.cur++; DW.editMask = false; dwToolUI(); }), it('New adjustment layer…', phAdjLayerMenu), it('New fill layer (solid color)', () => { phSnapDoc(); const n = dwLayer('Color fill'), x = n.cv.getContext('2d'); x.fillStyle = css(DW_PREF.color); x.fillRect(0, 0, DW.w, DW.h); DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; if (DW.sel) { n.mask = copyCv(DW.sel); } dwToolUI(); }), sep,
    it('Duplicate layer', () => { phSnapDoc(); phDupLayer(); dwToolUI(); }), it('Delete layer', () => { if (DW.layers.length < 2) return toast('A picture needs at least one layer'); phSnapDoc(); DW.layers.splice(DW.cur, 1); DW.cur = Math.max(0, DW.cur - 1); DW.editMask = false; dwToolUI(); }), it('Copy selection to a new layer', () => phViaCopy(false), !S), it('Cut selection to a new layer', () => phViaCopy(true), !S), sep,
    it('Merge down', () => { phSnapDoc(); phMergeDown(); dwToolUI(); }, DW.cur < 1), it('Merge all visible', phMergeVisible), it('Flatten picture', phFlatten), sep,
    it(L.mask ? 'Delete mask' : 'Add mask (shows all)', () => { phSnapDoc(); if (L.mask) { L.mask = null; DW.editMask = false; } else phAddMask('reveal'); dwToolUI(); }), it('Add mask from selection', () => { phSnapDoc(); phAddMask('sel'); dwToolUI(); }, !S), it('Add mask (hides all)', () => { phSnapDoc(); phAddMask('hide'); dwToolUI(); }),
    it(DW.editMask ? 'Paint the layer, not the mask' : 'Paint on the mask', () => { DW.editMask = !DW.editMask; dwToolUI(); }, !L.mask), it('Flip the mask (invert)', () => { const x = ctxReset(L.mask.getContext('2d')); dwSnap(dwTarget()); const inv = phSelInvert(L.mask); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(inv, 0, 0); dirty(L); }, !L.mask), it('Apply mask', () => { phSnapDoc(); phApplyMask(); }, !L.mask || L.kind === 'adj'), sep,
    it(L.clip ? 'Stop clipping to the layer below' : 'Clip to the layer below', () => { L.clip = !L.clip; dirty(L); }, DW.cur < 1 || L.kind === 'adj'), it('Layer styles (shadow, glow, outline…)', phStylesPanel, L.kind === 'adj'), it('Text to pixels', () => { phSnapDoc(); L.kind = undefined; delete L.text; dwToolUI(); }, L.kind !== 'text'), it('Edit adjustment', () => phOpenAdj(L.adj.op, { layer: L }), L.kind !== 'adj'), sep, it('Layers panel…', phLayersSheet)];
  if (id === 'select') return [it('Everything', () => phSetSel(phSelInvert(null), 'new')), it('Nothing', phDeselect, !S), it('Bring back the last selection', () => { if (DW.lastSel) { DW.sel = DW.lastSel; phSelChanged(); } }, !DW.lastSel || DW.lastSel.width !== DW.w), it('Flip the selection (inverse)', () => { DW.sel = phSelInvert(S); phSelChanged(); }, !S), sep,
    it('The main subject', phSelectSubject), it('A color everywhere…', phColorRange), it('This layer’s pixels', () => { const c = selCv(), x = c.getContext('2d'); x.drawImage(L.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, DW.w, DW.h); phSetSel(c); }), sep,
    it('Grow…', () => phSelAmount('Grow the selection', r => phSelGrow(S, r)), !S), it('Shrink…', () => phSelAmount('Shrink the selection', r => phSelInvert(phSelGrow(phSelInvert(S), r))), !S), it('Soften the edge…', () => phSelAmount('Soften the edge', r => blurCv(S, r)), !S), it('Border only…', () => phSelAmount('Border width', r => { const g = phSelGrow(S, r / 2), x = g.getContext('2d'); x.globalCompositeOperation = 'destination-out'; x.drawImage(phSelInvert(phSelGrow(phSelInvert(S), r / 2)), 0, 0); return g; }), !S), it('Smooth the corners…', () => phSelAmount('Smooth the corners', r => phSelThreshold(blurCv(S, r))), !S), sep,
    it('Remove the background', phRemoveBg)];
  if (id === 'adjust') return Object.keys(ADJ).filter(k => !['autotone', 'autocon', 'autocol'].includes(k)).map(k => it(ADJ[k].n + (ADJ[k].instant ? '' : '…'), () => phOpenAdj(k)));
  if (id === 'filter') { const out = []; let g = null; for (const k of Object.keys(FILT)) { if (FILT[k].g !== g) { g = FILT[k].g; out.push({ head: g }); } out.push(it(FILT[k].n + (FILT[k].ps.length ? '…' : ''), () => FILT[k].ps.length || FILT[k].usesColors ? phOpenOp('filter', k) : (() => { const L2 = curPixels(); if (L2) phApplyOp(FILT[k], L2, {}); })())); } return out; }
  if (id === 'view') return [it('Fit on screen', () => { DW.view.fit = true; dwFit(); dwRender(); }), it('Real size (100%)', () => { const r = DW.stageEl.getBoundingClientRect(); DW.view = { z: 1 / (DW.dpr || 1), x: (r.width - DW.w / (DW.dpr || 1)) / 2, y: (r.height - DW.h / (DW.dpr || 1)) / 2, fit: false }; dwRender(); }), it('Zoom in', () => phZoom(1.5)), it('Zoom out', () => phZoom(1 / 1.5))];
  return [];
}
function phZoom(f) { const r = DW.stageEl.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2, z0 = DW.view.z, z = clamp(z0 * f, .05, 40); DW.view = { z, x: mx - (mx - DW.view.x) * z / z0, y: my - (my - DW.view.y) * z / z0, fit: false }; dwRender(); }
function phOpenMenu(id, anchor) {
  if (curPop && curPop.anchor === anchor) { closePop(); return; }
  const list = h('div', { class: 'phmenu' });
  for (const m of phMenuItems(id)) {
    if (m.sep) { list.append(h('div', { class: 'msep' })); continue; }
    if (m.head) { list.append(h('div', { class: 'gh' }, m.head)); continue; }
    list.append(h('div', { class: 'opt' + (m.dis ? ' dis' : ''), onclick: () => { if (m.dis) return; closePop(); if (DW.tf && id !== 'view') phTfApply(); m.f(); dwRender(); } }, m.l));
  }
  openPop(anchor, list);
}
function phAdjLayerMenu() {
  const g = h('div', { class: 'grid2' });
  const m = modal('New adjustment layer', g, [{ l: 'Close' }], { width: 460 });
  for (const k of Object.keys(ADJ)) { if (ADJ[k].instant) continue; g.append(h('button', { class: 'btn', onclick: () => { m.close(); const L = phAddAdjLayer(k); phOpenAdj(k, { layer: L }); } }, ADJ[k].n)); }
}

/* ---------- edit ---------- */
function phCopy(cut, merged) {
  const L = DW.layers[DW.cur]; if (!merged && !needPixels(L)) return;
  const src = merged ? docFlat() : L.cv, c = copyCv(src);
  if (DW.sel) { const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(DW.sel, 0, 0); }
  DW.clipb = c;
  try { if (navigator.clipboard && window.ClipboardItem) c.toBlob(b => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).catch(() => { })); } catch (e) { }
  if (cut && !merged) phClearSel(true);
  toast(cut ? 'Cut' : 'Copied');
}
function phPaste() {
  if (!DW.clipb) return; phSnapDoc();
  const n = dwLayer('Pasted'); const c = DW.clipb; n.cv.getContext('2d').drawImage(c, c.width === DW.w && c.height === DW.h ? 0 : (DW.w - c.width) / 2, c.width === DW.w && c.height === DW.h ? 0 : (DW.h - c.height) / 2);
  DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; DW.editMask = false; dwToolUI(); toast('Pasted as a new layer');
}
function phClearSel(quiet) {
  const L = dwTarget(); if (!DW.sel || !needPixels(L)) return; dwSnap(L);
  const x = ctxReset(L.cv.getContext('2d')); x.globalCompositeOperation = 'destination-out'; x.drawImage(DW.sel, 0, 0); ctxReset(x); dirty(L); dwRender(); if (!quiet) toast('Deleted');
}
function phViaCopy(cut) {
  const L = DW.layers[DW.cur]; if (!needPixels(L) || !DW.sel) return; phSnapDoc();
  const n = dwLayer(L.name + (cut ? ' cut' : ' copy')), x = n.cv.getContext('2d'); x.drawImage(L.cv, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(DW.sel, 0, 0);
  if (cut) { const lx = ctxReset(L.cv.getContext('2d')); lx.globalCompositeOperation = 'destination-out'; lx.drawImage(DW.sel, 0, 0); ctxReset(lx); dirty(L); }
  DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; dwToolUI();
}
function phFillDialog() {
  const L = dwTarget(); if (!needPixels(L)) return;
  let what = 'front', op = 100;
  const rows = [row('Use', selectBox({ options: [{ v: 'front', l: 'Front color' }, { v: 'back', l: 'Back color' }, { v: 'black', l: 'Black' }, { v: 'white', l: 'White' }, { v: 'gray', l: 'Middle gray' }, { v: 'aware', l: 'Fill in from around it' }], value: what, onChange: v => what = v })), rangeRow('Opacity', { min: 1, max: 100, step: 1, value: op, suf: '%', onInput: v => op = v })];
  phDialog('Fill', rows, () => {
    if (what === 'aware') { phContentFill(); return; }
    dwSnap(L); const t = tmpCv('fill'), tx = t.getContext('2d'); tx.fillStyle = css({ front: DW_PREF.color, back: DW_PREF.bg, black: '#000000ff', white: '#ffffffff', gray: '#808080ff' }[what]); tx.fillRect(0, 0, DW.w, DW.h);
    const x = ctxReset(L.cv.getContext('2d')); x.globalAlpha = op / 100; if (L.lock) x.globalCompositeOperation = 'source-atop'; x.drawImage(phClipSel(t), 0, 0); ctxReset(x); dirty(L); dwRender();
  });
}
function phStrokeDialog() {
  const L = dwTarget(); if (!needPixels(L) || !DW.sel) return;
  let w = 4, col = DW_PREF.color, pos = 'center';
  phDialog('Outline the selection', [row('Width', numField({ value: w, min: 1, max: 500, step: 1, suf: 'px', onInput: v => w = v })), row('Color', colorBtn({ value: col, onInput: v => col = v })), row('Where', segBox({ options: [{ v: 'in', l: 'Inside' }, { v: 'center', l: 'Middle' }, { v: 'out', l: 'Outside' }], value: pos, onChange: v => pos = v }))], () => {
    dwSnap(L); const S = DW.sel, outer = pos === 'in' ? S : phSelGrow(S, pos === 'out' ? w : w / 2), inner = pos === 'out' ? S : phSelInvert(phSelGrow(phSelInvert(S), pos === 'in' ? w : w / 2));
    const ring = copyCv(outer), rx = ring.getContext('2d'); rx.globalCompositeOperation = 'destination-out'; rx.drawImage(inner, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = css(col); rx.fillRect(0, 0, DW.w, DW.h);
    L.cv.getContext('2d').drawImage(ring, 0, 0); dirty(L); dwRender();
  });
}
function phContentFill() {
  const L = dwTarget(); if (!needPixels(L) || !DW.sel) return; toast('Filling in…', 20000);
  setTimeout(() => { dwSnap(L); fillHole(L, phSelThreshold(phSelGrow(DW.sel, 3), 40), DW.selBox); phDeselect(); toast('Filled in from around it'); dwRender(); }, 30);
}

/* ---------- image ---------- */
function phImageSize() {
  const r0 = DW.w / DW.h; let keep = true;
  const wR = numRow('Width', DW.w, { onInput: v => { if (keep) hR.set(Math.max(1, Math.round(v / r0))); } }), hR = numRow('Height', DW.h, { onInput: v => { if (keep) wR.set(Math.max(1, Math.round(v * r0))); } });
  const pct = h('div', { class: 'presets', style: { margin: 0 } }, ...[25, 50, 75, 150, 200].map(p => h('button', { onclick: () => { wR.set(Math.round(DW.w * p / 100)); hR.set(Math.round(DW.h * p / 100)); } }, p + '%')));
  phDialog('Picture size', [wR, hR, row('', checkBox('Keep proportions', keep, v => keep = v)), row('Quick', pct), h('div', { class: 'hint' }, 'Changes the number of pixels. Everything is scaled to fit.')], () => {
    const W2 = clamp(Math.round(wR.get()), 1, 12000), H2 = clamp(Math.round(hR.get()), 1, 12000), kx = W2 / DW.w, ky = H2 / DW.h;
    phResizeDoc(W2, H2, (c, src) => { c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, W2, H2); }, { text: t => { t.x *= kx; t.y *= ky; t.size *= (kx + ky) / 2; } });
  });
}
function phCanvasSize() {
  let ax = 1, ay = 1; const wR = numRow('Width', DW.w), hR = numRow('Height', DW.h);
  const grid = h('div', { class: 'anchor' }); const draw = () => { grid.innerHTML = ''; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) grid.append(h('button', { class: i === ax && j === ay ? 'on' : '', onclick: () => { ax = i; ay = j; draw(); } })); }; draw();
  let fillBg = false;
  phDialog('Canvas size', [wR, hR, row('Keep picture at', grid), row('', checkBox('Fill new space with the back color', fillBg, v => fillBg = v))], () => {
    const W2 = clamp(Math.round(wR.get()), 1, 12000), H2 = clamp(Math.round(hR.get()), 1, 12000), ox = Math.round((W2 - DW.w) * ax / 2), oy = Math.round((H2 - DW.h) * ay / 2);
    const bottom = DW.layers[0];
    phResizeDoc(W2, H2, (c, src) => { if (fillBg && src === bottom.cv) { c.fillStyle = css(DW_PREF.bg); c.fillRect(0, 0, W2, H2); } c.drawImage(src, ox, oy); }, { rect: { x: ox, y: oy, w: DW.w, h: DW.h }, text: t => { t.x += ox; t.y += oy; } });
  });
}
function phRotateDoc(deg) {
  const W = DW.w, H = DW.h, sw = deg % 180 !== 0, W2 = sw ? H : W, H2 = sw ? W : H, a = deg * Math.PI / 180;
  phResizeDoc(W2, H2, (c, src) => { c.translate(W2 / 2, H2 / 2); c.rotate(a); c.drawImage(src, -W / 2, -H / 2); c.setTransform(1, 0, 0, 1, 0, 0); }, { text: t => { const dx = t.x - W / 2, dy = t.y - H / 2; t.x = W2 / 2 + dx * Math.cos(a) - dy * Math.sin(a); t.y = H2 / 2 + dx * Math.sin(a) + dy * Math.cos(a); t.rot = (t.rot || 0) + deg; } });
}
function phRotateAny() {
  let ang = 5, grow = true;
  phDialog('Turn the picture', [rangeRow('Angle', { min: -180, max: 180, step: .1, value: ang, suf: '°', onInput: v => ang = v }), row('', checkBox('Make the canvas bigger so nothing is cut off', grow, v => grow = v))], () => {
    const a = ang * Math.PI / 180, W = DW.w, H = DW.h, W2 = grow ? Math.ceil(Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a))) : W, H2 = grow ? Math.ceil(Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a))) : H;
    phResizeDoc(W2, H2, (c, src) => { c.translate(W2 / 2, H2 / 2); c.rotate(a); c.drawImage(src, -W / 2, -H / 2); c.setTransform(1, 0, 0, 1, 0, 0); }, { text: t => { const dx = t.x - W / 2, dy = t.y - H / 2; t.x = W2 / 2 + dx * Math.cos(a) - dy * Math.sin(a); t.y = H2 / 2 + dx * Math.sin(a) + dy * Math.cos(a); t.rot = (t.rot || 0) + ang; } });
  });
}
function phFlipDoc(hor) { const W = DW.w, H = DW.h; phResizeDoc(W, H, (c, src) => { c.translate(hor ? W : 0, hor ? 0 : H); c.scale(hor ? -1 : 1, hor ? 1 : -1); c.drawImage(src, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0); }, { text: t => { if (hor) t.x = W - t.x; else t.y = H - t.y; } }); }
function phTrim() {
  const f = docFlat(), d = f.getContext('2d').getImageData(0, 0, DW.w, DW.h).data; let x0 = DW.w, y0 = DW.h, x1 = -1, y1 = -1;
  for (let y = 0; y < DW.h; y++) for (let x = 0; x < DW.w; x++) if (d[(y * DW.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return toast('The picture is empty'); if (x0 === 0 && y0 === 0 && x1 === DW.w - 1 && y1 === DW.h - 1) return toast('No see-through edges to trim');
  phCropTo(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function phMergeVisible() {
  phSnapDoc(); const f = docFlat(), n = dwLayer('Merged'); n.cv.getContext('2d').drawImage(f, 0, 0);
  const hidden = DW.layers.filter(L => !L.vis); DW.layers = [...hidden, n]; DW.cur = DW.layers.length - 1; DW.editMask = false; dwToolUI();
}
function phFlatten() { phSnapDoc(); const f = docFlat(), n = dwLayer('Background'), x = n.cv.getContext('2d'); x.fillStyle = css(DW_PREF.bg); x.fillRect(0, 0, DW.w, DW.h); x.drawImage(f, 0, 0); DW.layers = [n]; DW.cur = 0; DW.editMask = false; dwToolUI(); }

/* ---------- select ---------- */
function phSelAmount(title, fn) {
  let r = 8; phDialog(title, [rangeRow('Pixels', { min: 1, max: 300, step: 1, value: r, suf: 'px', onInput: v => r = v })], () => { const c = fn(r); DW.sel = c; phSelChanged(); });
}
function phColorRange() {
  let tol = 40; const sw = colorBtn({ value: DW_PREF.color, onInput: v => { DW_PREF.color = v; savePref(); } });
  phDialog('Select a color everywhere', [row('Color', sw), h('div', { class: 'hint' }, 'Use the Eyedropper first to take a color from the picture.'), rangeRow('Closeness', { min: 1, max: 255, step: 1, value: tol, onInput: v => tol = v })], () => {
    const f = docFlat(), d = f.getContext('2d').getImageData(0, 0, DW.w, DW.h).data, [r, g, b] = hexToRgba(DW_PREF.color), m = new Uint8Array(DW.w * DW.h);
    for (let i = 0; i < m.length; i++) { const j = i * 4, dist = Math.max(Math.abs(d[j] - r), Math.abs(d[j + 1] - g), Math.abs(d[j + 2] - b)); if (d[j + 3] && dist <= tol) m[i] = dist > tol * .7 ? Math.round(255 * (tol - dist) / (tol * .3)) || 1 : 1; }
    phSetSel(maskToCanvas(m, DW.w, DW.h));
  });
}
// background = what can be reached from the picture's border without crossing a strong edge
function subjectMask() {
  const W = DW.w, H = DW.h, s = Math.max(1, Math.ceil(Math.max(W, H) / 700)), w = Math.ceil(W / s), hh = Math.ceil(H / s);
  const t = newLayerCanvas(w, hh), tx = t.getContext('2d'); tx.filter = 'blur(1px)'; tx.drawImage(docFlat(), 0, 0, w, hh);
  const d = tx.getImageData(0, 0, w, hh).data, bg = new Uint8Array(w * hh), q = [];
  let sr = 0, sg = 0, sb = 0, n = 0; const border = []; for (let x = 0; x < w; x++) border.push(x, (hh - 1) * w + x); for (let y = 0; y < hh; y++) border.push(y * w, y * w + w - 1);
  for (const i of border) { sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; n++; }
  const dif = (a, b) => Math.abs(d[a * 4] - d[b * 4]) + Math.abs(d[a * 4 + 1] - d[b * 4 + 1]) + Math.abs(d[a * 4 + 2] - d[b * 4 + 2]);
  for (const i of border) { if (!bg[i] && d[i * 4 + 3] < 10 || !bg[i]) { bg[i] = 1; q.push(i); } }
  while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; for (const k of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < hh - 1 ? i + w : -1]) { if (k < 0 || bg[k]) continue; if (d[k * 4 + 3] < 10 || dif(i, k) < 26) { bg[k] = 1; q.push(k); } } }
  const m = new Uint8Array(w * hh); for (let i = 0; i < m.length; i++) m[i] = bg[i] ? 0 : 1;
  const small = maskToCanvas(m, w, hh), out = selCv(), ox = out.getContext('2d'); ox.filter = `blur(${Math.max(1, s)}px)`; ox.drawImage(small, 0, 0, W, H);
  return phSelThreshold(out, 120);
}
function phSelectSubject() { toast('Finding the subject…'); setTimeout(() => { const m = subjectMask(); phSetSel(m, 'new'); toast(DW.sel ? 'Subject selected. Use Quick select to fix any edges.' : 'Could not find a subject'); }, 30); }
function phRemoveBg() {
  const L = DW.layers[DW.cur]; if (!needPixels(L)) return; toast('Removing the background…');
  setTimeout(() => { phSnapDoc(); const m = subjectMask(); L.mask = blurCv(m, 1); L.maskOff = false; dirty(L); dwToolUI(); dwRender(); toast('Background hidden with a mask. Paint the mask to fix edges.'); }, 30);
}

/* ---------- files ---------- */
function phPickFile(cb, accept) { const inp = h('input', { type: 'file', accept: accept || 'image/*,.psd' }); inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); }; inp.click(); }
async function loadImageFile(file) {
  const url = URL.createObjectURL(file); try { const im = new Image(); im.src = url; await im.decode(); const s = Math.min(1, 6000 / Math.max(im.naturalWidth, im.naturalHeight)), c = newLayerCanvas(Math.round(im.naturalWidth * s), Math.round(im.naturalHeight * s)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c; } finally { URL.revokeObjectURL(url); }
}
async function phOpenFile(file, replace) {
  try {
    toast('Opening…', 8000);
    if (/\.psd$/i.test(file.name)) { const doc = await psdRead(await file.arrayBuffer()); if (replace || !DW.on) openDraw(null, { mode: 'photo', src: doc.flat, w: doc.w, h: doc.h, layers: doc.layers, name: file.name.replace(/\.psd$/i, '') }); else { phSnapDoc(); for (const L of doc.layers) { const n = dwLayer(L.name); n.cv.getContext('2d').drawImage(L.cv, 0, 0, DW.w, DW.h); Object.assign(n, { op: L.op, blend: L.blend, vis: L.vis }); DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; } dwToolUI(); } toast('Opened ' + file.name); return; }
    const c = await loadImageFile(file);
    if (replace || !DW.on) { if (DW.on && DW.undo.length && !(await confirmBox('Open a new photo? The one you are editing is not saved.', 'Open', 'Keep this one'))) return; if (DW.on) { DW.on = false; DW.root.remove(); } openDraw(null, { mode: 'photo', src: c, name: file.name.replace(/\.[^.]+$/, '') }); }
    else { phSnapDoc(); const n = dwLayer(file.name.replace(/\.[^.]+$/, '')), s = Math.min(1, DW.w / c.width, DW.h / c.height); n.cv.getContext('2d').drawImage(c, (DW.w - c.width * s) / 2, (DW.h - c.height * s) / 2, c.width * s, c.height * s); DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; DW_PREF.tool = 'tf'; dwToolUI(); dwRender(); }
    toast('Opened ' + file.name);
  } catch (e) { console.error(e); toast('Could not open that file'); }
}
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob), a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
function phSavePicture() {
  let fmt = 'png', q = 92, name = DW.name || 'picture';
  const nameIn = h('input', { class: 'txt', value: name, spellcheck: 'false' }); nameIn.addEventListener('keydown', e => e.stopPropagation());
  phDialog('Save picture', [row('File name', nameIn), row('Type', segBox({ options: [{ v: 'png', l: 'PNG' }, { v: 'jpeg', l: 'JPG' }, { v: 'webp', l: 'WebP' }], value: fmt, onChange: v => fmt = v })), rangeRow('Quality (JPG, WebP)', { min: 10, max: 100, step: 1, value: q, suf: '%', onInput: v => q = v }), h('div', { class: 'hint' }, `${DW.w} × ${DW.h}. PNG and WebP keep see-through parts. JPG gets the back color behind them.`)], () => {
    let c = docFlat(); if (fmt === 'jpeg') { const b = newLayerCanvas(DW.w, DW.h), x = b.getContext('2d'); x.fillStyle = css(DW_PREF.bg); x.fillRect(0, 0, DW.w, DW.h); x.drawImage(c, 0, 0); c = b; }
    c.toBlob(b => { if (!b) return toast('Could not save'); downloadBlob(b, (nameIn.value || 'picture') + '.' + (fmt === 'jpeg' ? 'jpg' : fmt)); toast('Saved'); }, 'image/' + fmt, q / 100);
  }, 'Save');
}

/* ---------- Photoshop files ---------- */
const PSD_BLEND = { 'source-over': 'norm', multiply: 'mul ', screen: 'scrn', overlay: 'over', darken: 'dark', lighten: 'lite', 'color-dodge': 'div ', 'color-burn': 'idiv', 'hard-light': 'hLit', 'soft-light': 'sLit', difference: 'diff', exclusion: 'smud', hue: 'hue ', saturation: 'sat ', color: 'colr', luminosity: 'lum ', lighter: 'lddg' };
function phSavePSD() {
  toast('Making the .psd…', 20000);
  setTimeout(() => {
    try {
      const W = DW.w, H = DW.h, layers = DW.layers.filter(L => L.kind !== 'adj'), parts = [];
      let skipped = DW.layers.length - layers.length;
      const B = { buf: [], u8(v) { this.buf.push(v & 255); }, u16(v) { this.u8(v >> 8); this.u8(v); }, u32(v) { this.u16(v >>> 16); this.u16(v & 65535); }, s(str) { for (const c of str) this.u8(c.charCodeAt(0)); } };
      const bytesOf = fn => { const b = Object.create(B); b.buf = []; fn(b); return Uint8Array.from(b.buf); };
      const chans = layers.map((L, i) => { const img = layerImg(L, i, false, 'psd'), d = img.getContext('2d').getImageData(0, 0, W, H).data, n = W * H, ch = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)]; for (let k = 0; k < n; k++) { ch[0][k] = d[k * 4 + 3]; ch[1][k] = d[k * 4]; ch[2][k] = d[k * 4 + 1]; ch[3][k] = d[k * 4 + 2]; } return ch; });
      const recs = bytesOf(b => {
        b.u16(layers.length);
        layers.forEach((L, i) => {
          b.u32(0); b.u32(0); b.u32(H); b.u32(W); b.u16(4);
          for (const id of [-1, 0, 1, 2]) { b.u16(id & 65535); b.u32(2 + W * H); }
          b.s('8BIM'); b.s(PSD_BLEND[L.blend] || 'norm'); b.u8(Math.round(L.op / 100 * 255)); b.u8(L.clip ? 1 : 0); b.u8(L.vis ? 0 : 2); b.u8(0);
          const name = (L.name || 'Layer').replace(/[^\x20-\x7e]/g, '_').slice(0, 250), nl = 1 + name.length, pad = (4 - nl % 4) % 4;
          b.u32(4 + 4 + nl + pad); b.u32(0); b.u32(0); b.u8(name.length); b.s(name); for (let k = 0; k < pad; k++) b.u8(0);
        });
      });
      let infoLen = recs.length + layers.length * 4 * (2 + W * H); const infoPad = infoLen % 2; infoLen += infoPad;
      parts.push(bytesOf(b => { b.s('8BPS'); b.u16(1); for (let k = 0; k < 6; k++) b.u8(0); b.u16(3); b.u32(H); b.u32(W); b.u16(8); b.u16(3); b.u32(0); b.u32(0); b.u32(4 + infoLen + 4); b.u32(infoLen); }));
      parts.push(recs);
      for (const ch of chans) for (const c of ch) { parts.push(new Uint8Array([0, 0])); parts.push(c); }
      if (infoPad) parts.push(new Uint8Array(1));
      parts.push(new Uint8Array(4));
      const flat = newLayerCanvas(W, H), fx = flat.getContext('2d'); fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H); fx.drawImage(docFlat(), 0, 0); const fd = fx.getImageData(0, 0, W, H).data;
      parts.push(new Uint8Array([0, 0])); for (let c = 0; c < 3; c++) { const pl = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) pl[k] = fd[k * 4 + c]; parts.push(pl); }
      downloadBlob(new Blob(parts, { type: 'image/vnd.adobe.photoshop' }), (DW.name || 'picture') + '.psd');
      toast(skipped ? 'Saved .psd (adjustment layers are not included, the rest is)' : 'Saved .psd with ' + layers.length + ' layers');
    } catch (e) { console.error(e); toast('Could not make the .psd'); }
  }, 30);
}
async function psdRead(ab) {
  const v = new DataView(ab), u8 = new Uint8Array(ab); let o = 0;
  const r8 = () => u8[o++], r16 = () => { const x = v.getUint16(o); o += 2; return x; }, s16 = () => { const x = v.getInt16(o); o += 2; return x; }, r32 = () => { const x = v.getUint32(o); o += 4; return x; }, s32 = () => { const x = v.getInt32(o); o += 4; return x; }, str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[o + i]); o += n; return s; };
  const skip = () => { const n = r32(); o += n; };
  if (str(4) !== '8BPS') throw new Error('Not a Photoshop file');
  const ver = r16(); o += 6; const nch = r16(), H = r32(), W = r32(), depth = r16(), mode = r16();
  if (ver !== 1 || depth !== 8 || mode !== 3) throw new Error('Only 8-bit RGB .psd files can be opened');
  skip(); skip(); // color mode data, image resources
  const lmLen = r32(), lmEnd = o + lmLen, layers = [];
  const unpack = (dst, len, comp, w, hh) => {
    if (comp === 0) { dst.set(u8.subarray(o, o + w * hh)); o += w * hh; return; }
    if (comp !== 1) throw new Error('This .psd uses a compression that is not supported');
    const counts = []; for (let y = 0; y < hh; y++) counts.push(r16());
    let k = 0; for (let y = 0; y < hh; y++) { const end = o + counts[y]; let x = 0; while (o < end) { const n = v.getInt8(o++); if (n >= 0) { for (let i = 0; i <= n; i++) { if (x < w) dst[y * w + x] = u8[o]; o++; x++; } } else if (n !== -128) { const b = u8[o++]; for (let i = 0; i < 1 - n; i++) { if (x < w) dst[y * w + x] = b; x++; } } } k++; }
  };
  if (lmLen) {
    const liLen = r32(), liEnd = o + liLen;
    if (liLen) {
      let n = Math.abs(s16()); const recs = [];
      for (let i = 0; i < n; i++) {
        const top = s32(), left = s32(), bottom = s32(), right = s32(), cn = r16(), ch = []; for (let c = 0; c < cn; c++) ch.push({ id: s16(), len: r32() });
        str(4); const blend = str(4), op = r8(), clip = r8(), flags = r8(); r8();
        const extra = r32(), exEnd = o + extra; skip(); skip(); const nl = r8(); let name = str(nl); o = exEnd;
        recs.push({ top, left, bottom, right, ch, blend, op, clip, flags, name });
      }
      for (const R of recs) {
        const w = R.right - R.left, hh = R.bottom - R.top, planes = {};
        for (const c of R.ch) { const st = o, comp = r16(); if (c.id < -1 || w <= 0 || hh <= 0) { o = st + c.len; continue; } const pl = new Uint8Array(w * hh); try { unpack(pl, c.len, comp, w, hh); } catch (e) { throw e; } planes[c.id] = pl; o = st + c.len; }
        if (w <= 0 || hh <= 0 || /<\/Layer group>|<\/Layer set>/i.test(R.name)) continue;
        const cv = newLayerCanvas(W, H), part = newLayerCanvas(w, hh), px = part.getContext('2d'), img = px.createImageData(w, hh), d = img.data;
        for (let k = 0; k < w * hh; k++) { d[k * 4] = planes[0] ? planes[0][k] : 0; d[k * 4 + 1] = planes[1] ? planes[1][k] : 0; d[k * 4 + 2] = planes[2] ? planes[2][k] : 0; d[k * 4 + 3] = planes[-1] ? planes[-1][k] : 255; }
        px.putImageData(img, 0, 0); cv.getContext('2d').drawImage(part, R.left, R.top);
        const bl = Object.keys(PSD_BLEND).find(k => PSD_BLEND[k] === R.blend) || 'source-over';
        layers.push({ id: uid(), name: R.name || 'Layer', vis: !(R.flags & 2), op: Math.round(R.op / 255 * 100), blend: bl, lock: false, clip: !!R.clip, cv });
      }
    }
    o = lmEnd;
  }
  // merged picture (used when there are no layers)
  let flat = null;
  try { const comp = r16(), planes = []; if (comp === 1) { const counts = []; for (let c = 0; c < nch; c++) for (let y = 0; y < H; y++) counts.push(r16()); for (let c = 0; c < Math.min(nch, 4); c++) { const pl = new Uint8Array(W * H); let y0 = 0; for (let y = 0; y < H; y++) { const end = o + counts[c * H + y]; let x = 0; while (o < end) { const n = v.getInt8(o++); if (n >= 0) { for (let i = 0; i <= n; i++) { if (x < W) pl[y * W + x] = u8[o]; o++; x++; } } else if (n !== -128) { const b = u8[o++]; for (let i = 0; i < 1 - n; i++) { if (x < W) pl[y * W + x] = b; x++; } } } } planes.push(pl); } } else { for (let c = 0; c < Math.min(nch, 4); c++) { planes.push(u8.subarray(o, o + W * H)); o += W * H; } }
    flat = newLayerCanvas(W, H); const fx = flat.getContext('2d'), img = fx.createImageData(W, H); for (let k = 0; k < W * H; k++) { img.data[k * 4] = planes[0][k]; img.data[k * 4 + 1] = planes[1][k]; img.data[k * 4 + 2] = planes[2][k]; img.data[k * 4 + 3] = planes[3] && nch > 3 && !layers.length ? planes[3][k] : 255; } fx.putImageData(img, 0, 0);
  } catch (e) { }
  if (!layers.length) { if (!flat) throw new Error('Nothing readable in this .psd'); layers.push({ id: uid(), name: 'Background', vis: true, op: 100, blend: 'source-over', lock: false, cv: flat }); }
  return { w: W, h: H, layers, flat: flat || layers[0].cv };
}

/* ---------- starting the editors from the main screen ---------- */
async function editorNewBlank(mode) {
  const sizes = [['video', `Video size (${P.w} × ${P.h})`, P.w, P.h], ['sq', 'Square (2048 × 2048)', 2048, 2048], ['story', 'Phone story (1080 × 1920)', 1080, 1920], ['hd', 'Wide HD (1920 × 1080)', 1920, 1080], ['a4', 'A4 paper (2480 × 3508)', 2480, 3508], ['icon', 'App icon (1024 × 1024)', 1024, 1024]];
  let pick = 'video', bg = 'white';
  const wR = numRow('Width', P.w), hR = numRow('Height', P.h);
  phDialog('New blank picture', [row('Size', selectBox({ options: sizes.map(([v, l]) => ({ v, l })), value: pick, onChange: v => { const s = sizes.find(z => z[0] === v); wR.set(s[2]); hR.set(s[3]); } })), wR, hR, row('Background', segBox({ options: [{ v: 'white', l: 'White' }, { v: 'clear', l: 'See-through' }, { v: 'back', l: 'Back color' }], value: bg, onChange: v => bg = v }))], () => {
    const W = clamp(Math.round(wR.get()), 1, 8000), H = clamp(Math.round(hR.get()), 1, 8000);
    if (DW.on) { DW.on = false; DW.root.remove(); }
    openDraw(null, { mode, blank: true, w: W, h: H, fill: bg === 'white' ? '#ffffffff' : bg === 'back' ? DW_PREF.bg : null, name: 'Untitled' });
  }, 'Make');
}
function editorFrame(mode) { const c = newLayerCanvas(P.w, P.h); try { renderFrame(c.getContext('2d'), T, P.w, P.h); } catch (e) { } openDraw(null, { mode, src: c, name: 'Frame at ' + fmtDur(T) }); }
function editorStart(mode) {
  const body = h('div', { class: 'estart' }), sc = selClip(), works = allClips().filter(c => c.draw);
  let m_;
  const go = f => () => { m_.close(); closeSheets(); f(); };
  const big = (ic, l, sub, f) => h('button', { class: 'ebig', onclick: go(f) }, h('span', { html: icon(ic) }), h('b', null, l), h('small', null, sub));
  body.append(h('div', { class: 'ebigs' },
    big('plus', 'New blank picture', 'Pick a size', () => editorNewBlank(mode)),
    big('folder', mode === 'photo' ? 'Open a photo' : 'Draw on a photo', 'From your device (also .psd)', () => phPickFile(f => phOpenFile(f, true).then(() => { if (DW.on && DW.mode !== mode) phSetMode(mode); }))),
    sc && sc.type === 'image' ? big('image', sc.draw ? 'Keep working on the picked clip' : 'Use the picked picture', clipLabel(sc), () => openDraw(sc, { mode })) : '',
    big('camera', 'Use this video frame', 'The picture at ' + fmtDur(T), () => editorFrame(mode))));
  if (works.length) {
    body.append(h('div', { class: 'sect' }, 'Your drawings and photos in this project'));
    const g = h('div', { class: 'grid' });
    for (const c of works) { const m = MEDIA[c.media]; if (!m) continue; g.append(h('div', { class: 'tile media', onclick: go(() => openDraw(c, { mode })) }, h('img', { src: m.url, alt: '' }), h('div', { class: 'nm' }, (c.name || 'Drawing') + ' · ' + (c.draw.mode === 'photo' ? 'Photo' : 'Draw')))); }
    body.append(g);
  }
  body.append(h('div', { class: 'hint', style: { marginTop: '10px' } }, 'Draw, Photo and Animate share your work: switch at the top of the editor any time, and your layers come along. Done sends the picture to the video.'));
  m_ = modal(mode === 'photo' ? 'Photo editor' : 'Draw', body, [{ l: 'Close' }], { width: 560 });
}
// Animate / Draw / Photo switch in the main header
(function addEditorSwitch() {
  const go = () => {
    const brand = $('#top .brand'); if (!brand || $('#edsw')) return;
    const sw = h('div', { id: 'edsw', class: 'seg edsw' },
      h('button', { class: 'on', type: 'button' }, 'Animate'),
      h('button', { type: 'button', onclick: () => editorStart('draw') }, 'Draw'),
      h('button', { type: 'button', onclick: () => editorStart('photo') }, 'Photo'));
    brand.after(sw);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
