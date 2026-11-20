/* ================= left panel (library) ================= */
const LTABS = [
  { id: 'media', n: 'Media', i: 'media' }, { id: 'audio', n: 'Audio', i: 'audio' }, { id: 'text', n: 'Text', i: 'text' }, { id: 'stickers', n: 'Stickers', i: 'sticker' },
  { id: 'effects', n: 'Effects', i: 'effect' }, { id: 'trans', n: 'Transitions', i: 'transition' }, { id: 'filters', n: 'Filters', i: 'filter' }, { id: 'adjust', n: 'Adjust', i: 'adjust' }
];
let LTAB = 'media', APPLY_TO = 'layer';
function renderLeftTabs() {
  const n = $('#ltabs'); n.innerHTML = '';
  for (const t of LTABS) n.append(h('button', { class: t.id === LTAB ? 'on' : '', html: icon(t.i), onclick: () => { LTAB = t.id; renderLeftTabs(); renderLeft(); } }, t.n));
}
function renderLeft() {
  const b = $('#lbody'); b.innerHTML = '';
  ({ media: panelMedia, audio: panelAudio, text: panelText, stickers: panelStickers, effects: panelEffects, trans: panelTrans, filters: panelFilters, adjust: panelAdjust })[LTAB](b);
}
function importBtn(label, accept) {
  const d = h('div', { class: 'drop' }, h('div', { html: icon('upload') }), h('div', null, label), h('button', { class: 'btn sm', onclick: () => { const f = $('#fileIn'); f.accept = accept; f.click(); } }, 'Choose files'));
  d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); });
  d.addEventListener('dragleave', () => d.classList.remove('over'));
  d.addEventListener('drop', async e => { e.preventDefault(); d.classList.remove('over'); await importFiles([...e.dataTransfer.files]); });
  return d;
}
function mediaTile(m, onAdd, extra) {
  const t = h('div', { class: 'tile media', title: m.name, draggable: !isTouch ? 'true' : null });
  const img = h('img', { src: m.thumbs[0] || '', alt: '' });
  t.append(img, h('div', { class: 'nm' }, m.name));
  if (m.kind === 'video' || m.kind === 'audio') t.append(h('div', { class: 'dur' }, fmtDur(m.dur)));
  else if (m.animated) t.append(h('div', { class: 'dur' }, 'Animated'));
  const add = h('button', { class: 'add', title: 'Add to timeline', html: icon('plus'), onclick: e => { e.stopPropagation(); onAdd(); } });
  add.style.display = 'flex';
  t.append(add);
  if (extra) t.append(extra);
  const del = h('button', { class: 'add', title: 'Remove from project', html: icon('trash'), style: { left: '3px', right: 'auto', top: 'auto', bottom: '22px', background: 'rgba(0,0,0,.6)', color: '#fff', display: 'flex' }, onclick: e => { e.stopPropagation(); removeMedia(m.id); } });
  t.append(del);
  t.addEventListener('click', onAdd);
  t.addEventListener('dragstart', e => { e.dataTransfer.setData('text/fw-media', m.id); });
  return t;
}
function panelMedia(b) {
  b.append(importBtn('Videos and pictures: MP4, WebM, MOV, PNG, JPG, SVG, GIF', 'video/*,image/*,.svg,.gif,.webp,.apng'));
  const list = Object.values(MEDIA).filter(m => m.kind !== 'audio');
  if (!list.length) { b.append(h('div', { class: 'note' }, 'Nothing imported yet. Files stay on this device; nothing is uploaded.')); return; }
  b.append(h('div', { class: 'sect' }, 'In this project'));
  const g = h('div', { class: 'grid' });
  for (const m of list) {
    const ov = h('button', { class: 'add', title: 'Add as overlay (on top, at the playhead)', html: icon('layers'), style: { top: '28px', display: 'flex', background: 'var(--p4)', color: 'var(--tx)' }, onclick: e => { e.stopPropagation(); addMediaClip(m, true); } });
    g.append(mediaTile(m, () => addMediaClip(m, false), ov));
  }
  b.append(g);
  b.append(h('div', { class: 'note', style: { marginTop: '10px' } }, 'Tap a file to add it to the main track. The layers button puts it on top of the video at the playhead.'));
}
function panelAudio(b) {
  b.append(importBtn('Music and sound: MP3, WAV, M4A, OGG, FLAC', 'audio/*'));
  b.append(h('button', { class: 'btn wide', style: { marginBottom: '10px' }, onclick: opRecord, html: icon('mic') + ' Record voiceover' }));
  const list = Object.values(MEDIA).filter(m => m.kind === 'audio');
  if (list.length) {
    b.append(h('div', { class: 'sect' }, 'In this project'));
    const g = h('div', { class: 'grid' });
    for (const m of list) { if (!m.thumbs.length) m.thumbs = [waveThumb(m)]; g.append(mediaTile(m, () => addAudioClip(m))); }
    b.append(g);
  }
  const vids = Object.values(MEDIA).filter(m => m.kind === 'video' && m.hasAudio);
  if (vids.length) {
    b.append(h('div', { class: 'sect' }, 'Sound from your videos'));
    const g = h('div', { class: 'grid' });
    for (const m of vids) g.append(mediaTile(m, () => addAudioClip(m)));
    b.append(g);
  }
}
function waveThumb(m) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 100; const x = c.getContext('2d');
  x.fillStyle = '#1c3a2a'; x.fillRect(0, 0, 160, 100); x.fillStyle = '#7fe0a8';
  if (m.peaks) for (let i = 0; i < 160; i++) { const v = m.peaks[Math.floor(i / 160 * m.peaks.length)] || 0; x.fillRect(i, 50 - v * 40, 1, v * 80 + 1); }
  return c.toDataURL();
}
/* ---- text ---- */
function panelText(b) {
  b.append(h('button', { class: 'btn pri wide', onclick: () => addTextClip(defText()), html: icon('plus') + ' Add text' }));
  b.append(h('div', { class: 'sect' }, 'Title cards'));
  const g = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(2,1fr)' } });
  for (const tc of TITLES) {
    const cv = h('canvas'); cv.width = 320; cv.height = 180;
    const t = h('div', { class: 'tile wide', title: tc.n }, cv, h('div', { class: 'nm' }, tc.n));
    t.addEventListener('click', () => addTextClip(defText(deep(tc.t)), tc.pos));
    g.append(t);
    requestAnimationFrame(() => drawTitlePreview(cv, tc));
  }
  b.append(g);
  b.append(h('div', { class: 'sect' }, 'Fonts'));
  b.append(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
    h('button', { class: 'btn sm', onclick: () => $('#fontIn').click(), html: icon('font') + ' Import font file' }),
    window.queryLocalFonts ? h('button', { class: 'btn sm', onclick: async () => { await useLocalFonts(); renderInspector(); } }, 'Use this computer’s fonts') : null));
  b.append(h('div', { class: 'note', style: { marginTop: '8px' } }, 'TTF, OTF and WOFF fonts are saved with your projects on this device.'));
}
function drawTitlePreview(cv, tc) {
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 320, 180); g.addColorStop(0, '#24313a'); g.addColorStop(1, '#3b2f3a'); x.fillStyle = g; x.fillRect(0, 0, 320, 180);
  const tx = defText(deep(tc.t)); const L = textLayout(tx); const s = Math.min(280 / Math.max(1, L.bb.w + 40), 140 / Math.max(1, L.bb.h + 40), 0.6);
  x.save(); x.translate(160, 90); x.scale(s, s); drawText(x, tx, 10, 20); x.restore();
}
/* ---- stickers ---- */
function panelStickers(b) {
  b.append(importBtn('Your own stickers: PNG, SVG, GIF, WebP (animated ones too)', 'image/*,.svg,.gif,.webp,.apng'));
  const mine = Object.values(MEDIA).filter(m => m.kind === 'image');
  if (mine.length) {
    b.append(h('div', { class: 'sect' }, 'Your stickers'));
    const g = h('div', { class: 'grid' });
    for (const m of mine) g.append(mediaTile(m, () => addMediaClip(m, true, 0.4)));
    b.append(g);
  }
  const cats = [...new Set(STK.map(s => s.cat))];
  for (const cat of cats) {
    b.append(h('div', { class: 'sect' }, cat));
    const g = h('div', { class: 'grid' });
    for (const d of STK.filter(s => s.cat === cat)) {
      const cv = h('canvas'); cv.width = 160; cv.height = 140;
      const t = h('div', { class: 'tile', title: d.n }, cv, h('div', { class: 'nm' }, d.n));
      t.addEventListener('click', () => addStickerClip(d));
      g.append(t);
      const st = stickerDefaults(d); st.drawOn = 0;
      const draw = (tt) => { const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#26282d'; x.fillRect(0, 0, 160, 140); const s = Math.min(130 / d.w, 110 / d.h); x.translate(80, 70); x.scale(s, s); drawSticker(x, st, tt); };
      requestAnimationFrame(() => draw(0.45));
      if (d.anim && !isTouch) { let raf = 0; t.addEventListener('pointerenter', () => { const t0 = performance.now(); const loop = () => { draw((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); }; loop(); }); t.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); draw(0.45); }); }
    }
    b.append(g);
  }
}
/* ---- effects / filters ---- */
function applyToBar(b, what) {
  const c = selClip(), ok = c && (c.type === 'video' || c.type === 'image' || (what === 'effects' && (c.type === 'text' || c.type === 'sticker')));
  if (!ok && APPLY_TO === 'clip') APPLY_TO = 'layer';
  b.append(row('Add to', segBox({ options: [{ v: 'layer', l: 'Timeline layer' }, { v: 'clip', l: 'Selected clip' }], value: APPLY_TO, onChange: v => { if (v === 'clip' && !ok) { toast('Select a video, picture' + (what === 'effects' ? ', text or sticker' : '') + ' clip first'); renderLeft(); return; } APPLY_TO = v; } })));
  b.append(h('div', { class: 'hint' }, APPLY_TO === 'layer' ? 'A layer changes everything under it on the timeline.' : 'Only the selected clip changes.'));
}
function panelEffects(b) {
  applyToBar(b, 'effects');
  const g = h('div', { class: 'grid' });
  for (const id in EFFECTS) {
    const cv = h('canvas'); cv.width = 160; cv.height = 110;
    const t = h('div', { class: 'tile', title: EFFECTS[id].n }, cv, h('div', { class: 'nm' }, EFFECTS[id].n));
    t.addEventListener('click', () => addEffect(id));
    g.append(t);
    requestAnimationFrame(() => previewFx(cv, { effects: [{ id, amt: id === 'pixel' ? 35 : 70 }] }));
  }
  b.append(g);
}
function panelFilters(b) {
  applyToBar(b, 'filters');
  const g = h('div', { class: 'grid' });
  for (const id in FILTERS) {
    const cv = h('canvas'); cv.width = 160; cv.height = 110;
    const c = selClip();
    const t = h('div', { class: 'tile' + (c && c.filter && c.filter.id === id && APPLY_TO === 'clip' ? ' sel' : ''), title: FILTERS[id].n }, cv, h('div', { class: 'nm' }, FILTERS[id].n));
    t.addEventListener('click', () => addFilter(id));
    g.append(t);
    requestAnimationFrame(() => previewFx(cv, { filter: { id, amount: 100 } }));
  }
  b.append(g);
}
let SAMPLE = null;
function sampleImage() {
  if (SAMPLE) return SAMPLE;
  const c = document.createElement('canvas'); c.width = 320; c.height = 220; const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, '#3a78c2'); sky.addColorStop(.7, '#f0b27a'); sky.addColorStop(1, '#f7d9a8'); x.fillStyle = sky; x.fillRect(0, 0, 320, 220);
  x.fillStyle = '#fff2c4'; x.beginPath(); x.arc(220, 112, 26, 0, 7); x.fill();
  const r = rng(5);
  const hill = (y0, amp, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 220); for (let i = 0; i <= 320; i += 4) x.lineTo(i, y0 + Math.sin(i * .021 + amp) * 14 + Math.sin(i * .07 + amp * 2) * 5 + (r() - .5) * 2); x.lineTo(320, 220); x.fill(); };
  hill(130, 1, '#6a7f8c'); hill(150, 3, '#3f6b4c'); hill(175, 5, '#2b4a2f');
  x.fillStyle = '#c84a3a'; x.fillRect(60, 160, 26, 18); x.fillStyle = '#7a2a22'; x.beginPath(); x.moveTo(56, 162); x.lineTo(73, 148); x.lineTo(90, 162); x.fill();
  return SAMPLE = c;
}
function previewFx(cv, opts) {
  const x = cv.getContext('2d'), src = sampleImage();
  const fake = Object.assign({ grade: defGrade(), filter: { id: 'none', amount: 100 }, effects: [], chroma: { on: false } }, opts);
  const q = gradeParams(fake, 0.4);
  let out = src;
  if (!gradeIsIdentity(q)) { const o = glProcess(src, src.width, src.height, cv.width, cv.height, q, 0.4); if (o) out = o; }
  x.clearRect(0, 0, cv.width, cv.height); x.drawImage(out, 0, 0, cv.width, cv.height);
  const id = opts.effects && opts.effects[0] && opts.effects[0].id;
  if (id === 'flash' || id === 'strobe') { x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(0, 0, cv.width, cv.height); }
  if (id === 'blur') { x.filter = 'blur(4px)'; x.drawImage(cv, 0, 0); x.filter = 'none'; }
  if (id === 'leak') { const g = x.createRadialGradient(40, 30, 0, 40, 30, 150); g.addColorStop(0, 'rgba(255,190,100,.85)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over'; }
  if (id === 'shake' || id === 'zoom') { x.globalAlpha = .4; x.drawImage(cv, id === 'shake' ? 6 : -8, id === 'shake' ? 3 : -6, cv.width + (id === 'zoom' ? 16 : 0), cv.height + (id === 'zoom' ? 12 : 0)); x.globalAlpha = 1; }
}
/* ---- transitions ---- */
function panelTrans(b) {
  const c = selClip();
  b.append(h('div', { class: 'hint' }, c && VISUAL[c.type] ? 'Tap a transition to put it at the start of the selected clip.' : 'Select the clip that comes second, then tap a transition. Without a selection it goes on the main-track cut nearest the playhead.'));
  if (c && c.trans) b.append(h('button', { class: 'btn sm', style: { marginBottom: '8px' }, onclick: () => { c.trans = null; commit(); refreshAll(); } }, 'Remove transition'));
  const g = h('div', { class: 'grid' });
  for (const id in TRANS) {
    const cv = h('canvas'); cv.width = 160; cv.height = 100;
    const t = h('div', { class: 'tile' + (c && c.trans && c.trans.id === id ? ' sel' : ''), title: TRANS[id].n }, cv, h('div', { class: 'nm' }, TRANS[id].n));
    t.addEventListener('click', () => addTransition(id));
    g.append(t);
    const draw = p => { const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 160, 100); TRANS[id].f(x, transFrame('A'), transFrame('B'), p, 160, 100); };
    requestAnimationFrame(() => draw(0.45));
    if (!isTouch) { let raf = 0; t.addEventListener('pointerenter', () => { const t0 = performance.now(); const loop = () => { const p = ((performance.now() - t0) / 1400) % 1.3; draw(Math.min(1, p)); raf = requestAnimationFrame(loop); }; loop(); }); t.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); draw(0.45); }); }
  }
  b.append(g);
}
const TF = {};
function transFrame(k) {
  if (TF[k]) return TF[k];
  const c = document.createElement('canvas'); c.width = 160; c.height = 100; const x = c.getContext('2d');
  if (k === 'A') { x.drawImage(sampleImage(), 0, 0, 160, 100); }
  else { const g = x.createLinearGradient(0, 0, 160, 100); g.addColorStop(0, '#1d2b4a'); g.addColorStop(1, '#6a2f5c'); x.fillStyle = g; x.fillRect(0, 0, 160, 100); x.fillStyle = '#ffd36b'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; x.lineTo(80 + Math.cos(a) * r, 52 + Math.sin(a) * r); } x.fill(); }
  return TF[k] = c;
}
function panelAdjust(b) {
  b.append(h('button', { class: 'btn pri wide', onclick: () => addLayerClip('adjust'), html: icon('plus') + ' Add adjustment layer' }));
  b.append(h('div', { class: 'note', style: { margin: '10px 0' } }, 'An adjustment layer colors everything below it for as long as it lasts. To change one clip only, select it and use the Adjust tab on the right.'));
  const c = selClip();
  if (c && (c.type === 'video' || c.type === 'image' || c.type === 'adjust')) b.append(h('button', { class: 'btn wide', onclick: () => showRight('adjust') }, 'Adjust the selected clip'));
}

/* ================= adding things to the timeline ================= */
function placeOverlay(c) {
  const vt = visualTracks();
  const mi = vt.findIndex(t => t.main);
  let tr = vt.find((t, i) => i > mi && !t.locked && fits(t, c.start, c.dur));
  if (!tr) { tr = { id: uid(), kind: 'visual', clips: [] }; P.tracks.splice(P.tracks.indexOf(vt[vt.length - 1]) + 1, 0, tr); }
  tr.clips.push(c); sortTrack(tr);
}
function finishAdd(c) { SEL = c.id; SELKF = null; commit(); refreshAll(); if (innerWidth < 1000 || innerHeight < 560) closeSheets(); toast('Added'); }
function addMediaClip(m, overlay, scale) {
  if (!m.ready) { toast('Still loading this file'); return; }
  const isV = m.kind === 'video';
  const c = baseClip(isV ? 'video' : 'image', { media: m.id, dur: isV ? m.dur : (m.animated ? Math.max(3, m.loop) : 5), name: m.name });
  if (scale) c.tf.scale = scale;
  const main = P.tracks.find(t => t.main);
  if (!overlay && main && !main.locked) {
    sortTrack(main);
    let idx = main.clips.length;
    for (let i = 0; i < main.clips.length; i++) { const x = main.clips[i]; if (T < x.start + x.dur / 2) { idx = i; break; } }
    c.start = idx < main.clips.length ? main.clips[idx].start : (main.clips.length ? main.clips[main.clips.length - 1].start + main.clips[main.clips.length - 1].dur : 0);
    for (let i = idx; i < main.clips.length; i++) main.clips[i].start += c.dur;
    main.clips.splice(idx, 0, c);
    if (TL.magnet) packMain();
    T = c.start + c.dur; // next file lands after this one
  } else { c.start = T; if (overlay && !scale) c.tf.scale = 0.5; placeOverlay(c); }
  finishAdd(c);
}
function addAudioClip(m) {
  const c = baseClip('audio', { media: m.id, start: T, dur: m.dur, name: m.name });
  let tr = audioTracks().find(t => !t.locked && fits(t, c.start, c.dur));
  if (!tr) { tr = { id: uid(), kind: 'audio', clips: [] }; P.tracks.push(tr); }
  tr.clips.push(c); sortTrack(tr); finishAdd(c);
}
function addTextClip(tx, pos) {
  const c = baseClip('text', { start: T, dur: 3, text: tx });
  if (pos) { c.tf.x = P.w * pos[0]; c.tf.y = P.h * pos[1]; }
  const fitW = P.w * 0.9 / Math.max(1, textLayout(tx).bb.w); if (fitW < 1) c.tf.scale = round(fitW, 3);
  placeOverlay(c); finishAdd(c);
}
function addStickerClip(d) {
  const c = baseClip('sticker', { start: T, dur: 3, sticker: stickerDefaults(d) });
  c.tf.scale = round(Math.min(P.w, P.h) * 0.4 / Math.max(d.w, d.h), 3);
  placeOverlay(c); finishAdd(c);
}
function addLayerClip(type, extra) {
  const c = baseClip(type, Object.assign({ start: T, dur: 3 }, extra || {}));
  placeOverlay(c); finishAdd(c); return c;
}
function addEffect(id) {
  const c = selClip();
  if (APPLY_TO === 'clip' && c) { c.effects.push({ id, amt: 60, speed: 1 }); commit(); refreshAll(); showRight('effects'); toast(EFFECTS[id].n + ' added to the clip'); return; }
  addLayerClip('effect', { effects: [{ id, amt: 60, speed: 1 }] });
}
function addFilter(id) {
  const c = selClip();
  if (APPLY_TO === 'clip' && c) { c.filter = { id, amount: c.filter && c.filter.amount != null ? c.filter.amount : 100 }; commit(); refreshAll(); renderLeft(); return; }
  if (id === 'none') return;
  addLayerClip('filter', { filter: { id, amount: 100 } });
}
function addTransition(id) {
  let c = selClip();
  if (!c || !VISUAL[c.type]) {
    const main = P.tracks.find(t => t.main); if (!main || main.clips.length < 2) { toast('Put two clips next to each other first'); return; }
    let best = null, bd = 1e9; for (const x of main.clips) { if (x.start <= 1e-6) continue; const d = Math.abs(x.start - T); if (d < bd) { bd = d; best = x; } }
    c = best; if (!c) { toast('No cut found'); return; }
  }
  c.trans = { id, dur: c.trans ? c.trans.dur : Math.min(0.8, c.dur / 2) };
  SEL = c.id; commit(); refreshAll(); seek(Math.max(0, c.start - 0.3));
  if (!prevAdjacent(trackOf(c), c)) toast('No clip right before this one, so it transitions in from what is underneath');
}
