/* ================= timeline ================= */
const TL = { pps: 60, snap: true, hw: 104 };
const thumbImgs = {};
function tImgs(m) { if (!thumbImgs[m.id] || thumbImgs[m.id].length !== m.thumbs.length) thumbImgs[m.id] = m.thumbs.map(u => { const i = new Image(); i.src = u; i.onload = () => scheduleTL(); return i; }); return thumbImgs[m.id]; }
function trackOrder() { return [...visualTracks()].reverse().concat(audioTracks()); }
function trackH(tr) { if (tr.kind === 'audio') return 44; if (tr.main) return 60; return tr.clips.length && tr.clips.every(c => c.type === 'text' || c.type === 'sticker' || c.type === 'effect' || c.type === 'filter' || c.type === 'adjust') ? 38 : 50; }
let tlTimer = 0;
function scheduleTL() { if (tlTimer) return; tlTimer = requestAnimationFrame(() => { tlTimer = 0; renderTimeline(); }); }
function hw() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hw')) || 104; }
function tlWidth() { const v = $('#tl').clientWidth; return Math.max(v, hw() + (projDur() + 30) * TL.pps); }
function renderTimeline() {
  if (!P) return;
  TL.hw = hw();
  const box = $('#tracks'), tlEl = $('#tl'), keepY = tlEl.scrollTop, keepX = tlEl.scrollLeft;
  box.style.minHeight = box.offsetHeight + 'px'; box.innerHTML = ''; // keep the height so the scroll does not jump back up
  $('#tlin').style.width = tlWidth() + 'px';
  let vi = visualTracks().length, ai = 0;
  for (const tr of trackOrder()) {
    const isA = tr.kind === 'audio';
    const lab = isA ? 'A' + (++ai) : (tr.main ? 'Main' : 'V' + (vi));
    if (!isA) vi--;
    const el = h('div', { class: 'trk' + (tr.main ? ' main' : ''), style: { height: trackH(tr) + 'px' } });
    el.dataset.tid = tr.id;
    const th = h('div', { class: 'th' });
    const b1 = h('button', { title: isA ? 'Mute track' : 'Hide track', class: (isA ? tr.muted : tr.hidden) ? 'off' : '', onclick: () => { if (isA) tr.muted = !tr.muted; else tr.hidden = !tr.hidden; commit(); renderTimeline(); requestRender(); } });
    b1.innerHTML = icon(isA ? (tr.muted ? 'mute' : 'vol') : (tr.hidden ? 'eyeoff' : 'eye'));
    const b2 = h('button', { title: 'Lock track', class: tr.locked ? 'off' : '', onclick: () => { tr.locked = !tr.locked; commit(); renderTimeline(); } });
    b2.innerHTML = icon(tr.locked ? 'lock' : 'unlock');
    th.append(h('span', null, lab), b1, b2);
    if (!isA && !tr.main) { const b3 = h('button', { title: 'Mute this track’s video sound', class: tr.muted ? 'off' : '', onclick: () => { tr.muted = !tr.muted; commit(); renderTimeline(); } }); b3.innerHTML = icon(tr.muted ? 'mute' : 'vol'); if (tr.clips.some(c => c.type === 'video')) th.append(b3); }
    if (tr.main) { const b3 = h('button', { title: 'Mute main track sound', class: tr.muted ? 'off' : '', onclick: () => { tr.muted = !tr.muted; commit(); renderTimeline(); } }); b3.innerHTML = icon(tr.muted ? 'mute' : 'vol'); th.append(b3); }
    const lane = h('div', { class: 'lane' });
    for (const c of tr.clips) lane.append(clipEl(c, tr));
    el.append(th, lane);
    box.append(el);
  }
  box.style.minHeight = ''; tlEl.scrollTop = keepY; tlEl.scrollLeft = keepX;
  drawRuler(); updPlayhead();
}
function clipLabel(c) {
  if (c.type === 'text') return (c.text.txt || '').split('\n')[0] || 'Text';
  if (c.type === 'sticker') return (STK_BY[c.sticker.id] || {}).n || 'Sticker';
  if (c.type === 'effect') return (c.effects[0] ? EFFECTS[c.effects[0].id].n : 'Effect');
  if (c.type === 'filter') return FILTERS[c.filter.id] ? FILTERS[c.filter.id].n : 'Filter';
  if (c.type === 'adjust') return 'Adjustment';
  return c.name || (MEDIA[c.media] || {}).name || c.type;
}
const TYPE_ICON = { video: 'video', image: 'image', text: 'text', sticker: 'sticker', audio: 'audio', effect: 'effect', filter: 'filter', adjust: 'adjust' };
function clipEl(c, tr) {
  const pps = TL.pps, w = Math.max(2, c.dur * pps);
  const el = h('div', { class: `clip c-${c.type}` + (c.id === SEL ? ' sel' : '') + (MSEL.has(c.id) ? ' msel' : ''), style: { left: c.start * pps + 'px', width: w + 'px' } });
  el.dataset.cid = c.id;
  const m = MEDIA[c.media];
  const H = trackH(tr) - 6;
  if (m && (c.type === 'video' || c.type === 'image') && m.thumbs.length) {
    const cw = Math.min(Math.ceil(w), 4096), cv = h('canvas', { class: 'thumbs' }); cv.width = cw; cv.height = H; cv.style.width = w + 'px';
    const x = cv.getContext('2d'), imgs = tImgs(m), tw = Math.max(8, (m.w / m.h) * H) * cw / w;
    for (let px = 0, i = 0; px < cw; px += tw, i++) {
      let img = imgs[0];
      if (c.type === 'video' && imgs.length > 1) { const st = c.in + (px / cw) * c.dur * (c.speed || 1); img = imgs[clamp(Math.floor(st / m.dur * imgs.length), 0, imgs.length - 1)]; }
      if (img && img.complete && img.naturalWidth) x.drawImage(img, px, 0, tw, H);
    }
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, cw, H);
    el.append(cv);
  }
  if (m && m.peaks && (c.type === 'audio' || (c.type === 'video' && m.hasAudio))) {
    const wh = c.type === 'audio' ? H - 16 : 14;
    const cw = Math.min(Math.ceil(w), 4096), cv = h('canvas', { class: 'wave' }); cv.width = cw; cv.height = wh; cv.style.width = w + 'px'; cv.style.height = wh + 'px';
    const x = cv.getContext('2d'); x.fillStyle = c.muted || tr.muted ? 'rgba(255,255,255,.25)' : (c.type === 'audio' ? 'rgba(190,255,215,.85)' : 'rgba(170,240,255,.75)');
    const vol = Math.min(2, (c.vol == null ? 100 : c.vol) / 100);
    for (let px = 0; px < cw; px++) {
      const st = c.in + (px / cw) * c.dur * (c.speed || 1), i = Math.floor(st * m.pps);
      let v = m.peaks[i] || 0; const lt = px / cw * c.dur; v *= Math.min(1, vol) * audioFade(c, lt);
      const hh = Math.max(1, v * wh * (c.type === 'audio' ? 0.95 : 1));
      if (c.type === 'audio') x.fillRect(px, (wh - hh) / 2, 1, hh); else x.fillRect(px, wh - hh, 1, hh);
    }
    el.append(cv);
  }
  const lbl = h('div', { class: 'lbl', html: icon(TYPE_ICON[c.type] || 'media') }); lbl.append(clipLabel(c) + (c.type === 'video' || c.type === 'audio' ? '  ' + fmtDur(c.dur) : ''));
  el.append(lbl);
  if ((c.speed || 1) !== 1) el.append(h('div', { class: 'spd' }, round(c.speed, 3) + 'x'));
  if (c.trans && c.trans.id !== 'none') { const tb = h('div', { class: 'trn', title: TRANS[c.trans.id] ? TRANS[c.trans.id].n : '', html: icon('transition') }); el.append(tb); }
  if (c.id === SEL && VISUAL[c.type]) {
    const kts = clipKeyTimes(c);
    // a button in each gap between two keyframes opens the motion settings for that gap
    for (let i = 0; i + 1 < kts.length; i++) {
      const a = kts[i], b = kts[i + 1]; if ((b - a) * pps < 26) continue;
      const g = h('button', { class: 'kfg' + (SELKF && Math.abs(SELKF.t - a) < 1e-4 ? ' sel' : ''), title: 'Motion between these keyframes', html: icon('curve'), style: { left: (a + b) / 2 * pps + 'px' } });
      g.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); });
      g.addEventListener('click', e => { e.stopPropagation(); if (PLAY.on) pause(); SELKF = { t: a }; seek(c.start + a); selectClip(c.id, true); openKeyPanel(true); });
      el.append(g);
    }
    for (const kt of kts) {
      const d = h('div', { class: 'kfd' + (SELKF && Math.abs(SELKF.t - kt) < 1e-4 ? ' sel' : ''), style: { left: kt * pps + 'px' } });
      d.dataset.kt = kt; d.addEventListener('pointerdown', e => kfDrag(e, c, kt, d));
      el.append(d);
    }
  }
  el.append(h('div', { class: 'hl' }, h('i')), h('div', { class: 'hr' }, h('i')));
  el.addEventListener('pointerdown', e => clipPointer(e, c, el));
  return el;
}
function audioFade(c, lt) { let g = 1; if (c.fadeIn > 0 && lt < c.fadeIn) g *= lt / c.fadeIn; if (c.fadeOut > 0 && c.dur - lt < c.fadeOut) g *= (c.dur - lt) / c.fadeOut; return g; }
function drawRuler() {
  const cv = $('#rulerc'), W = tlWidth(), dpr = Math.min(2, devicePixelRatio || 1);
  const off = TL.hw;
  cv.width = Math.min(16000, Math.round((W - off) * dpr)); cv.height = 24 * dpr; cv.style.width = (W - off) + 'px'; cv.style.height = '24px'; cv.style.left = off + 'px';
  const x = cv.getContext('2d'); x.scale(cv.width / (W - off), dpr);
  x.fillStyle = '#7d818a'; x.strokeStyle = '#3a3c42'; x.font = '10px system-ui'; x.textBaseline = 'top';
  const pps = TL.pps; const steps = [1 / P.fps, 2 / P.fps, 5 / P.fps, 10 / P.fps, .5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  let major = steps.find(s => s * pps >= 70) || 600;
  const minor = major / (major >= 1 ? (major === 15 ? 3 : 5) : 2);
  x.beginPath();
  for (let t = 0; t * pps < W; t += minor) { const px = Math.round(t * pps) + .5; x.moveTo(px, 17); x.lineTo(px, 24); }
  x.stroke(); x.strokeStyle = '#5a5d64'; x.beginPath();
  for (let t = 0; t * pps < W; t += major) {
    const px = Math.round(t * pps) + .5; x.moveTo(px, 11); x.lineTo(px, 24);
    const lab = major < 1 ? (Math.floor(t) + ':' + String(Math.round((t % 1) * P.fps)).padStart(2, '0') + 'f') : fmtDur(t);
    x.fillText(lab, px + 4, 3);
  }
  x.stroke();
}
function updPlayhead(follow) {
  const ph = $('#playhead'); ph.style.left = (TL.hw + T * TL.pps) + 'px';
  if (follow) { const tl = $('#tl'), px = TL.hw + T * TL.pps; if (px > tl.scrollLeft + tl.clientWidth - 40 || px < tl.scrollLeft + TL.hw) tl.scrollLeft = px - TL.hw - 40; }
  updTime();
}
function setZoom(pps, anchorT) {
  const tl = $('#tl'); anchorT = anchorT == null ? T : anchorT;
  const sx = TL.hw + anchorT * TL.pps - tl.scrollLeft;
  TL.pps = clamp(pps, 2, 1200);
  renderTimeline();
  tl.scrollLeft = TL.hw + anchorT * TL.pps - sx;
  zoomSlider && zoomSlider.set(Math.log(TL.pps));
}
function fitZoom() { const w = $('#tl').clientWidth - TL.hw - 30; setZoom(w / Math.max(5, projDur()), 0); $('#tl').scrollLeft = 0; }
// snapping candidates
function snapTimes(except) {
  const s = [0, T];
  for (const c of allClips()) { if (c === except) continue; s.push(c.start, c.start + c.dur); }
  if (except && except.id === SEL) for (const k of clipKeyTimes(except)) s.push(except.start + k);
  return s;
}
function snapT(t, except, extra) {
  if (!TL.snap) return { t, s: null };
  const thr = 8 / TL.pps; let best = null, bd = thr;
  for (const s of snapTimes(except)) { for (const o of extra || [0]) { const d = Math.abs(t + o - s); if (d < bd) { bd = d; best = s - o; } } }
  return best == null ? { t, s: null } : { t: best, s: best };
}
function showSnap(t) { const s = $('#snapline'); if (t == null) { s.style.display = 'none'; return; } s.style.display = 'block'; s.style.left = (TL.hw + t * TL.pps) + 'px'; }
function laneTrackAt(clientY, kind) {
  for (const el of $$('#tracks .trk')) { const r = el.getBoundingClientRect(); if (clientY >= r.top && clientY < r.bottom) { const tr = P.tracks.find(t => t.id === el.dataset.tid); if (tr && tr.kind === kind) return tr; return null; } }
  const first = $('#tracks .trk'); if (first && clientY < first.getBoundingClientRect().top + 4 && kind === 'visual') return 'new-top';
  return null;
}
function clipPointer(e, c, el) {
  const tr = trackOf(c);
  if (tr.locked) { selectClip(c.id); return; }
  if (e.button > 0) return;
  const wasSel = SEL === c.id;
  const isTouch = e.pointerType === 'touch';
  const hit = e.target.closest('.hl,.hr'), part = hit ? (hit.classList.contains('hl') ? 'l' : 'r') : 'body';
  // picking several clips: the Select button, or Ctrl / Shift + click
  if (part === 'body' && (TL.multi || e.ctrlKey || e.metaKey || e.shiftKey)) {
    e.preventDefault(); e.stopPropagation();
    if (SEL && !MSEL.size) MSEL.add(SEL);
    let moved = false; const x0 = e.clientX, y0 = e.clientY;
    if (MSEL.has(c.id) && MSEL.size > 1) { el.setPointerCapture(e.pointerId); groupDrag(e, c, el, 'body'); return; }
    const upT = ev => { el.removeEventListener('pointerup', upT); if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) return; if (MSEL.has(c.id)) { MSEL.delete(c.id); if (SEL === c.id) SEL = [...MSEL].pop() || null; } else { MSEL.add(c.id); SEL = c.id; } SELKF = null; refreshAll(); };
    el.addEventListener('pointerup', upT); return;
  }
  if (MSEL.size > 1 && MSEL.has(c.id) && (part !== 'body' || wasSel || !isTouch)) { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); groupDrag(e, c, el, part); return; }
  if (MSEL.size && !MSEL.has(c.id)) MSEL.clear();
  if (!wasSel) { selectClip(c.id, true); if (isTouch && part === 'body') return; }
  if (isTouch && part === 'body' && !wasSel) return;
  e.preventDefault(); e.stopPropagation();
  el.setPointerCapture(e.pointerId);
  const x0 = e.clientX, y0 = e.clientY, s0 = c.start, d0 = c.dur, in0 = c.in, keys0 = deep(c.kf);
  let moved = false, target = tr;
  const mdur = mediaDur(c);
  const mv = ev => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; el.classList.add('dragging');
    const dt = dx / TL.pps;
    if (part === 'body') {
      let ns = Math.max(0, s0 + dt);
      const sn = snapT(ns, c, [0, c.dur]); ns = Math.max(0, sn.t); showSnap(sn.s);
      c.start = ns;
      const tt = laneTrackAt(ev.clientY, tr.kind); target = tt || target;
      el.style.left = ns * TL.pps + 'px';
      el.style.transform = target !== tr ? `translateY(${dy}px)` : '';
    } else if (part === 'l') {
      let ns = s0 + dt; const sn = snapT(ns, c); ns = sn.t; showSnap(sn.s);
      const maxShift = d0 - 1 / P.fps;
      let shift = clamp(ns - s0, -s0, maxShift);
      if (c.type === 'video' || c.type === 'audio') shift = Math.max(shift, -in0 / (c.speed || 1));
      c.start = s0 + shift; c.dur = d0 - shift; c.in = in0 + shift * (c.speed || 1);
      for (const p of Object.keys(keys0)) c.kf[p] = keys0[p].map(k => ({ ...k, t: k.t - shift })).filter(k => k.t >= -1e-6 || true);
      el.style.left = c.start * TL.pps + 'px'; el.style.width = c.dur * TL.pps + 'px';
    } else {
      let ne = s0 + d0 + dt; const sn = snapT(ne, c); ne = sn.t; showSnap(sn.s);
      let nd = Math.max(1 / P.fps, ne - s0);
      if (c.type === 'video' || c.type === 'audio') nd = Math.min(nd, (mdur - c.in) / (c.speed || 1));
      c.dur = nd; el.style.width = nd * TL.pps + 'px';
    }
    requestRender();
  };
  const up = () => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    showSnap(null);
    if (!moved) { if (wasSel && part === 'body') { SEL = null; SELKF = null; MSEL.clear(); } refreshAll(); return; } // tap a picked clip again to drop it
    if (part === 'body') placeClip(c, tr, target);
    else if (tr.main && TL.magnet) packMain();
    commit(); refreshAll();
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
// several clips at once: move them together, or stretch / trim every one by the same amount
function groupClips() { return [...MSEL].map(id => findClip(id)).filter(Boolean); }
function groupDrag(e, c, el, part) {
  const list = groupClips().filter(x => !trackOf(x).locked);
  const o = new Map(list.map(x => [x, { s: x.start, d: x.dur, in: x.in, kf: deep(x.kf) }]));
  const x0 = e.clientX; let moved = false;
  const minS = Math.min(...list.map(x => x.start));
  const mv = ev => {
    const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 4) return; moved = true;
    let dt = dx / TL.pps;
    for (const x of list) {
      const v = o.get(x), mdur = mediaDur(x), sp = x.speed || 1;
      if (part === 'body') { if (trackOf(x).main && TL.magnet) continue; x.start = Math.max(0, v.s + Math.max(dt, -minS)); }
      else if (part === 'r') { let nd = Math.max(1 / P.fps, v.d + dt); if (x.type === 'video' || x.type === 'audio') nd = Math.min(nd, (mdur - x.in) / sp); x.dur = nd; }
      else { let shift = clamp(dt, -v.s, v.d - 1 / P.fps); if (x.type === 'video' || x.type === 'audio') shift = Math.max(shift, -v.in / sp); x.start = v.s + shift; x.dur = v.d - shift; x.in = v.in + shift * sp; for (const p of Object.keys(v.kf)) x.kf[p] = v.kf[p].map(k => ({ ...k, t: k.t - shift })); }
    }
    for (const cel of $$('#tracks .clip')) { const x = findClip(cel.dataset.cid); if (x && o.has(x)) { cel.style.left = x.start * TL.pps + 'px'; cel.style.width = x.dur * TL.pps + 'px'; } }
    requestRender();
  };
  const up = () => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    if (!moved) { selectClip(c.id, true); return; }
    for (const tr of P.tracks) { sortTrack(tr); if (tr.main && TL.magnet) packMain(); }
    commit(); refreshAll();
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
function placeClip(c, from, target) {
  if (target === 'new-top') { const nt = { id: uid(), kind: 'visual', clips: [] }; P.tracks.splice(P.tracks.indexOf(visualTracks().slice(-1)[0]) + 1, 0, nt); target = nt; }
  if (target.main && TL.magnet) {
    // main track keeps clips packed: insert by position
    from.clips.splice(from.clips.indexOf(c), 1);
    const others = target.clips.slice().sort((a, b) => a.start - b.start);
    let idx = others.findIndex(o => c.start < o.start + o.dur / 2); if (idx < 0) idx = others.length;
    others.splice(idx, 0, c); target.clips = others; packMain(); cleanTracks(); return;
  }
  if (!fits(target, c.start, c.dur, c)) {
    // no room: put it on a fresh track right above (visual) / below (audio)
    const nt = { id: uid(), kind: target.kind, clips: [] };
    P.tracks.splice(P.tracks.indexOf(target) + 1, 0, nt);
    target = nt;
  }
  if (target !== from) { from.clips.splice(from.clips.indexOf(c), 1); target.clips.push(c); }
  sortTrack(target);
  if (from.main && TL.magnet) packMain();
  cleanTracks();
}
TL.magnet = true;
function packMain() { const m = P.tracks.find(t => t.main); if (!m) return; sortTrack(m); let t = 0; for (const c of m.clips) { c.start = t; t += c.dur; } }
function cleanTracks() {
  P.tracks = P.tracks.filter(t => t.main || t.clips.length || (t.kind === 'audio' && audioTracks().length === 1 && audioTracks()[0] === t));
  if (!audioTracks().length) P.tracks.push({ id: uid(), kind: 'audio', clips: [] });
}
function kfDrag(e, c, kt, d) {
  e.stopPropagation(); e.preventDefault();
  SELKF = { t: kt };
  seek(c.start + kt);
  d.setPointerCapture(e.pointerId);
  const x0 = e.clientX; let moved = false; const keys = kfProps(c).map(p => (c.kf[p] || []).filter(k => Math.abs(k.t - kt) < 1e-4));
  const mv = ev => {
    const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 3) return; moved = true;
    let nt = clamp(kt + dx / TL.pps, 0, c.dur); nt = Math.round(nt * P.fps) / P.fps;
    for (const ks of keys) for (const k of ks) k.t = nt;
    for (const p of kfProps(c)) c.kf[p].sort((a, b) => a.t - b.t);
    d.style.left = nt * TL.pps + 'px'; SELKF = { t: nt }; T = c.start + nt; requestRender(); updPlayhead();
  };
  const up = () => { d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); if (moved) commit(); selectClip(c.id, true); openKeyPanel(!moved); };
  d.addEventListener('pointermove', mv); d.addEventListener('pointerup', up);
}
function selectClip(id, keepKf) {
  if (SEL !== id) SELKF = null;
  SEL = id;
  for (const el of $$('#tracks .clip')) el.classList.toggle('sel', el.dataset.cid === id);
  scheduleTL(); renderInspector(); drawOverlay(); updToolState();
}

/* ruler + empty lane: scrub */
function initTimelineEvents() {
  const tl = $('#tl');
  const scrub = (e) => {
    const r = $('#tlin').getBoundingClientRect();
    const t = Math.max(0, (e.clientX - r.left - TL.hw) / TL.pps);
    const sn = TL.snap ? snapT(t, null) : { t };
    seek(Math.round(sn.t * P.fps) / P.fps, true);
  };
  $('#ruler').addEventListener('pointerdown', e => {
    e.preventDefault(); if (PLAY.on) pause();
    $('#ruler').setPointerCapture(e.pointerId); scrub(e);
    const mv = ev => scrub(ev), up = () => { $('#ruler').removeEventListener('pointermove', mv); $('#ruler').removeEventListener('pointerup', up); refreshInspectorValues(); };
    $('#ruler').addEventListener('pointermove', mv); $('#ruler').addEventListener('pointerup', up);
  });
  // drag the playhead itself (knob or line); a tap on the line still selects the clip under it
  for (const part of $$('#playhead .phline, #playhead .phknob')) part.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation(); if (PLAY.on) pause();
    const ph = $('#playhead'); part.setPointerCapture(e.pointerId);
    const x0 = e.clientX, y0 = e.clientY; let moved = false, raf = 0, lastE = e;
    const edge = () => { // scroll the timeline when dragging near its edges
      const r = tl.getBoundingClientRect(), x = lastE.clientX; let v = 0;
      if (x < r.left + TL.hw + 24) v = -Math.min(18, (r.left + TL.hw + 24 - x) / 2); else if (x > r.right - 24) v = Math.min(18, (x - r.right + 24) / 2);
      if (v) { tl.scrollLeft += v; scrub(lastE); } raf = requestAnimationFrame(edge);
    };
    const mv = ev => { lastE = ev; if (!moved && Math.abs(ev.clientX - x0) < 4) return; if (!moved) { moved = true; ph.classList.add('drag'); raf = requestAnimationFrame(edge); } scrub(ev); };
    const up = ev => {
      part.removeEventListener('pointermove', mv); part.removeEventListener('pointerup', up); part.removeEventListener('pointercancel', up);
      cancelAnimationFrame(raf); ph.classList.remove('drag');
      if (moved) { refreshInspectorValues(); return; }
      if (part.classList.contains('phline')) {
        ph.style.visibility = 'hidden'; const under = document.elementFromPoint(x0, y0); ph.style.visibility = '';
        const kb = under && under.closest('.kfd,.kfg');
        if (kb) { if (kb.classList.contains('kfd')) { const c = findClip(kb.closest('.clip').dataset.cid), t = +kb.dataset.kt; SELKF = { t }; seek(c.start + t); selectClip(c.id, true); openKeyPanel(true); } else kb.click(); return; }
        const ce = under && under.closest('.clip'); if (ce) { const c = findClip(ce.dataset.cid); if (c && TL.multi) { if (SEL && !MSEL.size) MSEL.add(SEL); if (MSEL.has(c.id)) MSEL.delete(c.id); else { MSEL.add(c.id); SEL = c.id; } refreshAll(); } else if (c) selectClip(c.id); }
      }
    };
    part.addEventListener('pointermove', mv); part.addEventListener('pointerup', up); part.addEventListener('pointercancel', up);
  });
  // tap on empty lane: move playhead, clear selection
  let downAt = null;
  tl.addEventListener('pointerdown', e => { if (e.target.classList.contains('lane') || e.target.id === 'tracks' || e.target.id === 'tlin') downAt = { x: e.clientX, y: e.clientY, sl: tl.scrollLeft }; else downAt = null; });
  tl.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6 || Math.abs(tl.scrollLeft - downAt.sl) > 4) return;
    if (PLAY.on) pause();
    scrub(e); if (SEL || MSEL.size) { TL.multi = false; SEL = null; SELKF = null; MSEL.clear(); renderTimeline(); renderInspector(); drawOverlay(); updToolState(); }
  });
  // zoom: ctrl + wheel, pinch on touch
  tl.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const r = $('#tlin').getBoundingClientRect(); const at = (e.clientX - r.left - TL.hw) / TL.pps; setZoom(TL.pps * Math.exp(-e.deltaY * 0.004), at); }
  }, { passive: false });
  const pts = new Map(); let pinch = null;
  tl.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, e.clientX); if (pts.size === 2) { const [a, b] = [...pts.values()]; const r = $('#tlin').getBoundingClientRect(); pinch = { d: Math.abs(a - b), pps: TL.pps, at: ((a + b) / 2 - r.left - TL.hw) / TL.pps }; } });
  tl.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e.clientX); if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.abs(a - b); if (pinch.d > 10) setZoom(pinch.pps * d / pinch.d, pinch.at); } });
  const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  tl.addEventListener('pointerup', end); tl.addEventListener('pointercancel', end);
  // resize the timeline panel
  $('#tlgrip').addEventListener('pointerdown', e => {
    e.preventDefault(); const g = $('#tlgrip'); g.setPointerCapture(e.pointerId);
    const y0 = e.clientY, h0 = $('#tlw').getBoundingClientRect().height;
    const mv = ev => { const nh = clamp(h0 - (ev.clientY - y0), 120, innerHeight - 200); document.documentElement.style.setProperty('--tlh', nh + 'px'); layoutView(); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
  });
}

/* ================= edit operations ================= */
function splitKeys(c, at) {
  const A = {}, B = {};
  for (const p of kfProps(c)) {
    const ks = c.kf[p] || [];
    if (!ks.length) { A[p] = []; B[p] = []; continue; }
    const v = evalProp(c, p, at);
    A[p] = ks.filter(k => k.t < at - 1e-6).map(k => ({ ...k })); B[p] = ks.filter(k => k.t > at + 1e-6).map(k => ({ ...k, t: k.t - at }));
    const prev = [...ks].reverse().find(k => k.t <= at);
    const nk = newKey(0, v); if (prev) { copySeg(nk, prev); }
    A[p].push({ ...nk, t: at }); B[p].unshift({ ...nk, t: 0 });
  }
  return [A, B];
}
function splitClip(c, t) {
  if (t <= c.start + 1e-3 || t >= c.start + c.dur - 1e-3) return null;
  const tr = trackOf(c), at = t - c.start;
  const b = deep(c); b.id = uid();
  const [ka, kb] = splitKeys(c, at);
  b.start = t; b.dur = c.dur - at; b.in = c.in + at * (c.speed || 1); b.kf = kb; b.trans = null;
  b.anim.in = { id: 'none', dur: c.anim.in.dur }; b.fadeIn = 0;
  if (b.type === 'text') b.text.ain = { id: 'none', dur: c.text.ain.dur };
  c.dur = at; c.kf = ka; c.anim.out = { id: 'none', dur: c.anim.out.dur }; c.fadeOut = 0;
  if (c.type === 'text') c.text.aout = { id: 'none', dur: c.text.aout.dur };
  tr.clips.push(b); sortTrack(tr);
  return b;
}
function opSplit() {
  const c = selClip();
  let list = c ? [c] : P.tracks.filter(t => !t.locked).map(t => clipAt(t, T)).filter(Boolean);
  let n = 0; for (const x of list) if (splitClip(x, T)) n++;
  if (!n) { toast('Move the playhead over a clip to split it'); return; }
  commit(); refreshAll();
}
function opDelete() {
  if (MSEL.size > 1) { for (const x of groupClips()) { const tr = trackOf(x); if (tr.locked) continue; tr.clips.splice(tr.clips.indexOf(x), 1); VP.drop(x.id); } MSEL.clear(); SEL = null; SELKF = null; packMain(); cleanTracks(); commit(); refreshAll(); return; }
  const c = selClip(); if (!c) return;
  const tr = trackOf(c); tr.clips.splice(tr.clips.indexOf(c), 1); VP.drop(c.id);
  SEL = null; SELKF = null;
  if (tr.main && TL.magnet) packMain();
  cleanTracks(); commit(); refreshAll();
}
function opDuplicate() {
  const c = selClip(); if (!c) return;
  const tr = trackOf(c), b = deep(c); b.id = uid(); b.start = c.start + c.dur; b.trans = null;
  if (tr.main && TL.magnet) { tr.clips.splice(tr.clips.indexOf(c) + 1, 0, b); for (const x of tr.clips) if (x !== b && x.start >= b.start - 1e-6 && x !== c) x.start += b.dur; packMain(); }
  else if (fits(tr, b.start, b.dur)) tr.clips.push(b);
  else { const nt = { id: uid(), kind: tr.kind, clips: [b] }; b.start = c.start; P.tracks.splice(P.tracks.indexOf(tr) + 1, 0, nt); }
  sortTrack(tr); SEL = b.id; commit(); refreshAll();
}
async function opFreeze() {
  const c = selClip() || (P.tracks.find(t => t.main) && clipAt(P.tracks.find(t => t.main), T));
  if (!c || c.type !== 'video') { toast('Select a video clip and put the playhead on it'); return; }
  if (T < c.start || T >= c.start + c.dur) { toast('Put the playhead over the clip'); return; }
  const lt = T - c.start, el = VP.ensure(c).el;
  await seekEl(el, c.in + lt * (c.speed || 1));
  const cv = document.createElement('canvas'); cv.width = el.videoWidth; cv.height = el.videoHeight; cv.getContext('2d').drawImage(el, 0, 0);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const m = await addMedia(blob, 'Freeze ' + fmtTime(T, P.fps) + '.png');
  const tr = trackOf(c), fd = 3;
  const b = splitClip(c, T);
  for (const x of tr.clips) if (x.start >= T - 1e-6) x.start += fd;
  const f = deep(c); f.id = uid(); f.type = 'image'; f.media = m.id; f.start = T; f.dur = fd; f.in = 0; f.speed = 1; f.trans = null; f.name = 'Freeze frame';
  for (const p of KF_PROPS) { f.tf[p] = evalProp(c, p, lt); f.kf[p] = []; }
  f.anim = { in: { id: 'none', dur: .5 }, out: { id: 'none', dur: .5 }, loop: { id: 'none', speed: 1 } };
  tr.clips.push(f); sortTrack(tr);
  SEL = f.id; commit(); renderLeft(); refreshAll();
}
function opDetach() {
  const c = selClip(); const m = c && MEDIA[c.media];
  if (!c || c.type !== 'video' || !m || !m.hasAudio) { toast('Select a video clip that has sound'); return; }
  const a = baseClip('audio', { media: c.media, start: c.start, dur: c.dur, in: c.in, speed: c.speed, vol: c.vol, name: (m.name || '') + ' (audio)', fadeIn: c.fadeIn, fadeOut: c.fadeOut });
  let tr = audioTracks().find(t => fits(t, a.start, a.dur));
  if (!tr) { tr = { id: uid(), kind: 'audio', clips: [] }; P.tracks.push(tr); }
  tr.clips.push(a); sortTrack(tr); c.muted = true;
  commit(); refreshAll(); toast('Sound moved to its own audio track');
}
function moveLayer(dir) {
  const c = selClip(); if (!c || !VISUAL[c.type]) return;
  const vt = visualTracks(), from = trackOf(c), i = vt.indexOf(from);
  let mi = vt.findIndex(t => t.main); if (mi < 0) mi = -1;
  const insertAt = idx => { const nt = { id: uid(), kind: 'visual', clips: [] }; const at = idx >= vt.length ? P.tracks.indexOf(vt[vt.length - 1]) + 1 : P.tracks.indexOf(vt[idx]); P.tracks.splice(at, 0, nt); return nt; };
  const alone = from.clips.length === 1;
  let target;
  if (i === mi) {
    if (dir === 'bottom' || dir === -1) { toast('The main track is already the bottom layer'); return; }
    target = dir === 'front' ? insertAt(vt.length) : (vt[mi + 1] && fits(vt[mi + 1], c.start, c.dur) ? vt[mi + 1] : insertAt(mi + 1));
  } else if (dir === 'front') { if (i === vt.length - 1 && alone) return; target = insertAt(vt.length); }
  else if (dir === 'bottom') { if (i === mi + 1 && alone) return; target = vt[mi + 1] !== from && fits(vt[mi + 1], c.start, c.dur) ? vt[mi + 1] : insertAt(mi + 1); }
  else {
    const j = i + dir;
    if (j <= mi) { if (i === mi + 1 && alone) return; target = insertAt(mi + 1); }
    else if (j >= vt.length) { if (alone) return; target = insertAt(vt.length); }
    else if (fits(vt[j], c.start, c.dur, c)) target = vt[j];
    else target = insertAt(dir > 0 ? j + 1 : j);
  }
  if (target === from) return;
  from.clips.splice(from.clips.indexOf(c), 1); target.clips.push(c); sortTrack(target);
  if (from.main && TL.magnet) packMain();
  cleanTracks(); commit(); refreshAll();
}
function opKey() {
  const c = selClip(); if (!c || !VISUAL[c.type] || c.type === 'effect' || c.type === 'filter' || c.type === 'adjust') { toast('Select a picture, video, text or sticker clip'); return; }
  if (T < c.start || T > c.start + c.dur) { toast('Put the playhead over the clip'); return; }
  const lt = T - c.start; const any = kfProps(c).some(p => keyAt(c, p, lt) >= 0);
  for (const p of any ? kfProps(c) : KF_PROPS) { const i = keyAt(c, p, lt); if (any) { if (i >= 0) toggleKey(c, p); } else if (i < 0) toggleKey(c, p); }
  SELKF = any ? null : { t: lt };
  commit(); refreshAll();
}
function updToolState() {
  const c = selClip();
  $('#tDel').disabled = !c; $('#tDup').disabled = !c;
  for (const id of ['#tFront', '#tFwd', '#tBack', '#tBottom']) $(id).disabled = !c || !VISUAL[c.type];
  $('#tKey').disabled = !c || !VISUAL[c.type] || ['effect', 'filter', 'adjust'].includes(c.type);
  $('#tDetach').disabled = !c || c.type !== 'video';
  $('#tFreeze').disabled = !(c ? c.type === 'video' : true);
  $('#tMagnet').classList.toggle('on', TL.snap);
  if (MSEL.size > 1) $('#tDel').disabled = false;
  const ms = $('#tMulti'); if (ms) { ms.classList.toggle('on', !!TL.multi); const n = ms.querySelector('span'); if (n) n.textContent = MSEL.size > 1 ? MSEL.size + ' picked' : 'Select'; }
}

/* voiceover (microphone, recorded locally) */
let REC = null;
async function opRecord() {
  if (REC) { REC.mr.stop(); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch (e) { toast('Microphone not available'); return; }
  const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined); const chunks = [];
  const start = T;
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); $('#tRec').classList.remove('on'); REC = null; if (PLAY.on) pause();
    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    const m = await addMedia(blob, 'Voiceover ' + fmtTime(start, P.fps) + (blob.type.includes('mp4') ? '.m4a' : '.webm'));
    if (!m) return;
    const a = baseClip('audio', { media: m.id, start, dur: m.dur, name: m.name });
    let tr = audioTracks().find(t => fits(t, a.start, a.dur)); if (!tr) { tr = { id: uid(), kind: 'audio', clips: [] }; P.tracks.push(tr); }
    tr.clips.push(a); sortTrack(tr); SEL = a.id; commit(); renderLeft(); refreshAll();
  };
  mr.start(250); REC = { mr }; $('#tRec').classList.add('on'); toast('Recording. Tap the mic again to stop.');
  play();
}
