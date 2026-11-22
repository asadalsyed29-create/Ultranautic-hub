/* ================= arrangement: tracks and clips on the timeline ================= */
const RUL = 24;
const TH = () => matchMedia('(max-height:500px)').matches ? 48 : 56;
let tl, tg, tlW = 0, tlH = 0, DPR = 1;
function buildArr() {
  tl = $('#tl'); tg = tl.getContext('2d');
  const tools = $('#arrTools');
  tools.append(
    tbtn('plus', 'Add a track', e => addTrackMenu(e.currentTarget), 'Track'),
    tbtn('music', 'New clip at the playhead', () => newClip(), 'Clip'),
    tbtn('cut', 'Split at the playhead', splitClip, 'Split'),
    tbtn('dup', 'Duplicate clip', dupClip, 'Duplicate'),
    tbtn('trash', 'Delete clip', delClip, 'Delete'),
    h('span', { class: 'sep' }), h('span', { class: 'lab' }, 'Snap'),
    selectBox({ value: Ed.arrSnap, options: [{ v: -1, l: 'Bar' }, { v: 1, l: 'Beat' }, { v: 0.5, l: '1/8' }, { v: 0.25, l: '1/16' }, { v: 0, l: 'Off' }], onChange: v => Ed.arrSnap = v }),
    h('span', { class: 'sep' }),
    tbtn('zout', 'Zoom out', () => zoomTl(1 / 1.4)), tbtn('zin', 'Zoom in', () => zoomTl(1.4))
  );
  Ed.arrSnap = -1;
  tools.querySelector('.fsel').set(-1);
  new ResizeObserver(() => { sizeTimeline(); drawTimeline(); }).observe($('#tlWrap'));
  tlInput();
}
function sizeTimeline() {
  if (!tl) return; DPR = Math.min(2, devicePixelRatio || 1);
  const r = $('#tlWrap').getBoundingClientRect(); tlW = r.width; tlH = r.height;
  tl.width = Math.max(1, tlW * DPR); tl.height = Math.max(1, tlH * DPR);
}
const bx = b => b * Ed.zoom - Ed.sx;
const xb = x => (x + Ed.sx) / Ed.zoom;
const snapB = (b, s = Ed.arrSnap) => { const q = s === -1 ? song.sig : s; return q ? Math.round(b / q) * q : b; };
function zoomTl(f, cx) { cx = cx == null ? tlW / 2 : cx; const b = xb(cx); Ed.zoom = clamp(Ed.zoom * f, 4, 400); Ed.sx = Math.max(0, b * Ed.zoom - cx); drawTimeline(); }
function followPlayhead(b) { const x = bx(b); if (x > tlW - 30 || x < 0) { Ed.sx = Math.max(0, b * Ed.zoom - 40); } }

/* ---------- track headers ---------- */
function renderHeads() {
  const hi = $('#headsIn'); if (!hi || !song) return; hi.innerHTML = '';
  const th = TH();
  song.tracks.forEach(tr => {
    const pr = tr.kind === 'audio' ? null : getPreset(tr.preset);
    const m = h('button', { class: 'm' + (tr.mute ? ' on' : ''), title: 'Mute', onclick: e => { e.stopPropagation(); tr.mute = !tr.mute; commit(); refreshMix(); renderHeads(); } }, 'M');
    const s = h('button', { class: 's' + (tr.solo ? ' on' : ''), title: 'Solo', onclick: e => { e.stopPropagation(); tr.solo = !tr.solo; commit(); refreshMix(); renderHeads(); } }, 'S');
    const more = h('button', { title: 'Track options', onclick: e => { e.stopPropagation(); trackMenu(e.currentTarget, tr); } }, '⋯');
    const el = h('div', { class: 'th' + (tr.id === Sel.track ? ' sel' : ''), style: { '--c': tr.color, height: th + 'px' }, onclick: () => { selectTrack(tr.id); } },
      h('div', { class: 'nm' }, tr.name), h('div', { class: 'sub' }, tr.kind === 'audio' ? 'Audio' : pr.name === tr.name ? (FAMILIES.find(f => f.id === pr.fam) || { name: 'Your sound' }).name : pr.name), h('div', { class: 'msr' }, m, s, more));
    hi.append(el);
  });
  const add = h('div', { class: 'th addt', onclick: e => addTrackMenu(e.currentTarget) }); add.innerHTML = icon('plus') + '<span>Add track</span>';
  hi.append(add);
  hi.style.transform = `translateY(${-Ed.sy}px)`;
}
function selectTrack(id) {
  Sel.track = id; const c = selClip(); if (c && c.tr !== id) Sel.clip = null;
  renderHeads(); drawTimeline(); renderPanel();
}
function addTrackMenu(a) {
  menu(a, [
    { l: 'Instrument track', f: () => addTrack('inst') },
    { l: 'Drum track', f: () => addTrack('drum') },
    { l: 'Audio track (sounds and recording)', f: () => addTrack('audio') }
  ]);
}
function addTrack(kind, preset) {
  const tr = newTrack(kind, preset || (kind === 'drum' ? 'drums.0' : kind === 'inst' ? 'piano.0' : null));
  song.tracks.push(tr); Sel.track = tr.id; Sel.clip = null;
  if (AC) strip(AC, tr);
  preload(getPreset(tr.preset), [48, 60, 72]);
  commit(); drawAll(); setTab(kind === 'audio' ? 'sounds' : 'inst');
  return tr;
}
function trackMenu(a, tr) {
  const i = song.tracks.indexOf(tr);
  menu(a, [
    { l: 'Rename…', f: async () => { const v = await promptBox('Track name', tr.name); if (v) { tr.name = v.trim(); commit(); drawAll(); } } },
    { l: 'Color…', f: () => { const b = h('div', { class: 'btnrow' }); TRACK_COLORS.forEach(c => b.append(h('button', { style: { width: '36px', height: '36px', background: c, border: c === tr.color ? '2px solid #fff' : '1px solid #0006' }, onclick: () => { tr.color = c; commit(); drawAll(); mm.close(); } }))); const mm = modal('Track color', b); } },
    { l: 'Duplicate track', f: () => { const t2 = JSON.parse(JSON.stringify(tr)); t2.id = uid(); t2.name = tr.name + ' 2'; song.tracks.splice(i + 1, 0, t2); for (const c of song.clips.filter(c => c.tr === tr.id)) { const c2 = JSON.parse(JSON.stringify(c)); c2.id = uid(); c2.tr = t2.id; song.clips.push(c2); } if (AC) strip(AC, t2); commit(); drawAll(); } },
    { l: 'Move up', dis: i === 0, f: () => { song.tracks.splice(i, 1); song.tracks.splice(i - 1, 0, tr); commit(); drawAll(); } },
    { l: 'Move down', dis: i === song.tracks.length - 1, f: () => { song.tracks.splice(i, 1); song.tracks.splice(i + 1, 0, tr); commit(); drawAll(); } },
    '-',
    { l: 'Delete track', f: async () => { if (!(await confirmBox('Delete the track "' + tr.name + '" and its clips?', 'Delete'))) return; song.tracks.splice(i, 1); song.clips = song.clips.filter(c => c.tr !== tr.id); if (AC) { const s = BUS.get(AC).strips.get(tr.id); if (s) { s.mute.disconnect(); BUS.get(AC).strips.delete(tr.id); } } if (Sel.track === tr.id) { Sel.track = song.tracks[0] && song.tracks[0].id; Sel.clip = null; } commit(); drawAll(); renderPanel(); } }
  ]);
}

/* ---------- clip actions ---------- */
function newClip(at) {
  const tr = selTrack(); if (!tr) { toast('Add a track first'); return; }
  if (tr.kind === 'audio') { setTab('sounds'); toast('Add a sound from the Sounds tab'); return; }
  const b = at != null ? at : Math.floor(beatNow() / song.sig) * song.sig;
  const c = { id: uid(), tr: tr.id, start: b, len: song.sig * (tr.kind === 'drum' ? 1 : 2), notes: [] };
  song.clips.push(c); Sel.clip = c.id; commit(); Ed.tab = 'edit'; renderPanel(); drawAll();
  return c;
}
function splitClip() {
  const b = beatNow(); const tr = selTrack();
  let cs = song.clips.filter(c => c.start < b - 1e-6 && c.start + clipLen(c) > b + 1e-6 && (c.id === Sel.clip || (!Sel.clip && tr && c.tr === tr.id)));
  if (!cs.length) cs = song.clips.filter(c => c.start < b && c.start + clipLen(c) > b && tr && c.tr === tr.id);
  if (!cs.length) { toast('Put the playhead over a clip to split it'); return; }
  for (const c of cs) {
    const k = b - c.start, c2 = JSON.parse(JSON.stringify(c)); c2.id = uid(); c2.start = b;
    if (c.sid) { const sec = k * 60 / song.bpm * Math.pow(2, (c.pitch || 0) / 12); c2.off = c.off + sec; c2.dur = c.dur - sec; c.dur = sec; c.fout = 0; c2.fin = 0; }
    else { c2.notes = c.notes.filter(n => n.t >= k).map(n => ({ ...n, t: n.t - k })); c.notes = c.notes.filter(n => n.t < k); c.notes.forEach(n => n.d = Math.min(n.d, k - n.t)); c2.len = c.len - k; c.len = k; }
    song.clips.push(c2);
  }
  commit(); drawAll(); renderPanel();
}
function dupClip() { const c = selClip(); if (!c) { toast('Pick a clip first'); return; } const c2 = JSON.parse(JSON.stringify(c)); c2.id = uid(); c2.start = c.start + clipLen(c); song.clips.push(c2); Sel.clip = c2.id; commit(); drawAll(); renderPanel(); }
function delClip() { const c = selClip(); if (!c) { toast('Pick a clip first'); return; } song.clips = song.clips.filter(x => x !== c); Sel.clip = null; commit(); drawAll(); renderPanel(); }

/* ---------- drawing ---------- */
function drawTimeline() {
  if (!tg || !tlW || !song) return;
  const g = tg, W = tlW, H = tlH, th = TH();
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  const sig = song.sig, b0 = Math.max(0, Math.floor(xb(0))), b1 = Math.ceil(xb(W));
  // lanes
  song.tracks.forEach((tr, i) => { const y = RUL + i * th - Ed.sy; if (y > H || y + th < RUL) return; g.fillStyle = tr.id === Sel.track ? '#17191c' : (i % 2 ? '#111214' : '#0f1012'); g.fillRect(0, y, W, th); g.fillStyle = '#1d1f23'; g.fillRect(0, y + th - 1, W, 1); });
  // loop region
  if (song.loop.on) { const x1 = bx(song.loop.a), x2 = bx(song.loop.b); g.fillStyle = 'rgba(63,214,192,0.06)'; g.fillRect(x1, RUL, x2 - x1, H); }
  // grid
  const beatPx = Ed.zoom;
  for (let b = b0; b <= b1; b++) {
    const x = Math.round(bx(b)) + 0.5, bar = b % sig === 0;
    if (!bar && beatPx < 12) continue;
    g.fillStyle = bar ? '#2a2d33' : '#1b1d21'; g.fillRect(x, RUL, 1, H);
  }
  // clips
  song.clips.forEach(c => {
    const ti = song.tracks.findIndex(t => t.id === c.tr); if (ti < 0) return;
    const tr = song.tracks[ti], y = RUL + ti * th - Ed.sy + 2, hh = th - 5;
    const x1 = bx(c.start), x2 = bx(c.start + clipLen(c)); if (x2 < 0 || x1 > W || y > H || y + hh < RUL) return;
    const sel = c.id === Sel.clip;
    g.fillStyle = tr.color + (sel ? '55' : '33'); g.fillRect(x1, y, x2 - x1, hh);
    g.fillStyle = tr.color + (sel ? 'ee' : 'aa'); g.fillRect(x1, y, x2 - x1, 13);
    g.save(); g.beginPath(); g.rect(x1, y, x2 - x1, hh); g.clip();
    g.fillStyle = '#0b0c0e'; g.font = '600 10.5px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText(c.name || (c.sid ? (Sounds.get(c.sid) || { name: 'Missing sound' }).name : tr.name), x1 + 4, y + 7);
    const cy = y + 15, ch = hh - 17;
    if (c.sid) drawWaveIn(g, c, x1, cy, x2 - x1, ch, tr.color);
    else if (c.notes.length) {
      let lo = 127, hi = 0; for (const n of c.notes) { lo = Math.min(lo, n.m); hi = Math.max(hi, n.m); }
      if (tr.kind === 'drum') { lo = 0; hi = DRUM_NOTES.length - 1; }
      const span = Math.max(6, hi - lo + 1), nh = Math.max(1.5, Math.min(4, ch / span));
      g.fillStyle = '#eef2f5';
      for (const n of c.notes) { if (n.t >= c.len) continue; const k = tr.kind === 'drum' ? DRUM_NOTES.indexOf(n.m) : n.m - lo; const ny = tr.kind === 'drum' ? cy + (k / span) * ch : cy + ch - ((k + 1) / span) * ch; g.fillRect(x1 + n.t * Ed.zoom, ny, Math.max(1.5, Math.min(n.d, c.len - n.t) * Ed.zoom - 1), nh); }
    }
    g.restore();
    g.strokeStyle = sel ? '#ffffff' : tr.color; g.lineWidth = sel ? 1.5 : 1; g.strokeRect(x1 + 0.5, y + 0.5, x2 - x1 - 1, hh - 1);
    if (sel) { g.fillStyle = '#fff'; g.fillRect(x2 - 5, y + hh / 2 - 8, 3, 16); g.fillRect(x1 + 2, y + hh / 2 - 8, 3, 16); }
  });
  // ruler
  g.fillStyle = '#16171a'; g.fillRect(0, 0, W, RUL); g.fillStyle = '#2a2c31'; g.fillRect(0, RUL - 1, W, 1);
  if (song.loop.on) { const x1 = bx(song.loop.a), x2 = bx(song.loop.b); g.fillStyle = 'rgba(63,214,192,0.35)'; g.fillRect(x1, 0, x2 - x1, 7); g.fillStyle = '#3fd6c0'; g.fillRect(x1, 0, 3, RUL); g.fillRect(x2 - 3, 0, 3, RUL); }
  g.font = '11px system-ui,sans-serif'; g.textBaseline = 'middle';
  const every = Ed.zoom * sig < 34 ? (Ed.zoom * sig < 12 ? 8 : 4) : 1;
  for (let b = Math.floor(b0 / sig) * sig; b <= b1; b += sig) { const bar = b / sig; if (bar % every) continue; const x = bx(b); g.fillStyle = '#62666e'; g.fillRect(Math.round(x) + 0.5, 12, 1, 12); g.fillStyle = '#a5a9b1'; g.fillText(String(bar + 1), x + 4, 15); }
  // playhead
  const px = Math.round(bx(AC ? beatNow() : T.pos)) + 0.5;
  g.fillStyle = '#ff5a4d'; g.fillRect(px - 0.5, 0, 1.5, H); g.beginPath(); g.moveTo(px - 6, 0); g.lineTo(px + 6, 0); g.lineTo(px, 8); g.fill();
}
function drawWaveIn(g, c, x, y, w, hh, col) {
  const s = Sounds.get(c.sid); if (!s) return;
  const pk = s.peaks, rate = Math.pow(2, (c.pitch || 0) / 12), sr = s.buf.sampleRate;
  const secPerPx = 60 / song.bpm / Ed.zoom * rate, mid = y + hh / 2, gain = c.gain != null ? c.gain : 1;
  g.fillStyle = '#eef2f5cc';
  const xs = Math.max(0, -x), xe = Math.min(w, tlW - x);
  for (let i = xs; i < xe; i++) {
    let t0 = c.off + i * secPerPx, t1 = t0 + secPerPx; if (c.rev) { const a = s.dur - (c.off + c.dur); t0 = s.dur - (a + i * secPerPx) - secPerPx; t1 = t0 + secPerPx; }
    const k0 = Math.floor(t0 * sr / pk.per), k1 = Math.max(k0 + 1, Math.ceil(t1 * sr / pk.per));
    let mx = 0, mn = 0; for (let k = Math.max(0, k0); k < Math.min(pk.mx.length, k1); k++) { if (pk.mx[k] > mx) mx = pk.mx[k]; if (pk.mn[k] < mn) mn = pk.mn[k]; }
    const a = Math.min(1, mx * gain), b = Math.max(-1, mn * gain);
    g.fillRect(x + i, mid - a * hh / 2, 1, Math.max(1, (a - b) * hh / 2));
  }
}

/* ---------- touch / mouse ---------- */
function tlInput() {
  const ptrs = new Map(); let act = null, lastTap = { t: 0, x: 0, y: 0 };
  const hit = (x, y) => {
    const th = TH(), ti = Math.floor((y - RUL + Ed.sy) / th), tr = song.tracks[ti];
    if (!tr || y < RUL) return { tr: null, ti };
    const b = xb(x);
    for (let i = song.clips.length - 1; i >= 0; i--) { const c = song.clips[i]; if (c.tr !== tr.id) continue; if (b >= c.start && b <= c.start + clipLen(c)) { const x1 = bx(c.start), x2 = bx(c.start + clipLen(c)); const edge = Math.min(14, (x2 - x1) / 3); const zone = x > x2 - edge ? 'right' : x < x1 + edge ? 'left' : 'move'; return { tr, ti, c, zone }; } }
    return { tr, ti };
  };
  tl.addEventListener('pointerdown', e => {
    tl.setPointerCapture(e.pointerId);
    const r = tl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ptrs.set(e.pointerId, { x, y });
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; act = { kind: 'pinch', d0: Math.abs(p1.x - p2.x) || 1, z0: Ed.zoom, c: (p1.x + p2.x) / 2, b: xb((p1.x + p2.x) / 2), sy0: Ed.sy, y0: (p1.y + p2.y) / 2 }; return; }
    if (y < RUL) {
      if (song.loop.on && Math.abs(x - bx(song.loop.a)) < 12) act = { kind: 'loopA' };
      else if (song.loop.on && Math.abs(x - bx(song.loop.b)) < 12) act = { kind: 'loopB' };
      else { act = { kind: 'seek' }; T.pos = Math.max(0, snapB(xb(x), Ed.arrSnap === -1 ? 1 : Ed.arrSnap)); if (T.playing) seek(T.pos); drawTimeline(); }
      return;
    }
    const ht = hit(x, y);
    act = { kind: 'press', x0: x, y0: y, sx0: Ed.sx, sy0: Ed.sy, ht, moved: false };
    if (ht.c) { act.c0 = JSON.parse(JSON.stringify(ht.c)); if (Sel.clip !== ht.c.id || Sel.track !== ht.tr.id) { Sel.clip = ht.c.id; Sel.track = ht.tr.id; renderHeads(); renderPanel(); } drawTimeline(); }
  });
  tl.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !act) return;
    const r = tl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ptrs.set(e.pointerId, { x, y });
    if (act.kind === 'pinch') { if (ptrs.size < 2) return; const [p1, p2] = [...ptrs.values()]; const d = Math.abs(p1.x - p2.x) || 1, cx = (p1.x + p2.x) / 2; Ed.zoom = clamp(act.z0 * d / act.d0, 4, 400); Ed.sx = Math.max(0, act.b * Ed.zoom - cx); Ed.sy = clamp(act.sy0 - ((p1.y + p2.y) / 2 - act.y0), 0, maxSy()); renderHeads(); drawTimeline(); return; }
    if (act.kind === 'seek') { T.pos = Math.max(0, snapB(xb(x), Ed.arrSnap === -1 ? 1 : Ed.arrSnap)); drawTimeline(); return; }
    if (act.kind === 'loopA') { song.loop.a = clamp(snapB(xb(x), Ed.arrSnap === -1 ? 1 : Ed.arrSnap), 0, song.loop.b - 0.25); drawTimeline(); return; }
    if (act.kind === 'loopB') { song.loop.b = Math.max(song.loop.a + 0.25, snapB(xb(x), Ed.arrSnap === -1 ? 1 : Ed.arrSnap)); drawTimeline(); return; }
    const dx = x - act.x0, dy = y - act.y0;
    if (!act.moved && Math.hypot(dx, dy) < 6) return;
    act.moved = true;
    const c = act.ht.c;
    if (!c) { Ed.sx = Math.max(0, act.sx0 - dx); Ed.sy = clamp(act.sy0 - dy, 0, maxSy()); renderHeads(); drawTimeline(); return; }
    const db = dx / Ed.zoom, c0 = act.c0, sn = s => snapB(s);
    if (act.ht.zone === 'move') {
      c.start = Math.max(0, sn(c0.start + db));
      const ti = clamp(Math.floor((y - RUL + Ed.sy) / TH()), 0, song.tracks.length - 1), tr = song.tracks[ti];
      if (tr && (tr.kind === 'audio') === !!c.sid) { c.tr = tr.id; Sel.track = tr.id; }
    } else if (act.ht.zone === 'right') {
      if (c.sid) { const s = Sounds.get(c.sid), rate = Math.pow(2, (c.pitch || 0) / 12); const maxDur = c.rev ? (c0.off + c0.dur) : s.dur - c.off; const end = sn(c0.start + clipLen(c0) + db); c.dur = clamp((end - c.start) * 60 / song.bpm * rate, 0.02, maxDur); }
      else c.len = Math.max(Ed.arrSnap > 0 ? Ed.arrSnap : 0.25, sn(c0.start + c0.len + db) - c.start);
    } else {
      const ns = Math.min(sn(c0.start + db), c0.start + clipLen(c0) - 0.25), d = ns - c0.start;
      if (c.sid) { const rate = Math.pow(2, (c.pitch || 0) / 12), sec = d * 60 / song.bpm * rate; if (c0.off + sec < 0) return; c.start = ns; c.off = c0.off + sec; c.dur = c0.dur - sec; }
      else { if (ns < 0) return; c.start = ns; c.len = c0.len - d; c.notes = c0.notes.map(n => ({ ...n, t: n.t - d })).filter(n => n.t >= 0); }
    }
    drawTimeline();
  });
  const end = e => {
    ptrs.delete(e.pointerId);
    if (!act) return;
    if (act.kind === 'pinch') { if (!ptrs.size) act = null; return; }
    if (act.kind === 'seek') { if (T.playing) seek(T.pos); act = null; drawAll(); return; }
    if (act.kind === 'loopA' || act.kind === 'loopB') { commit(); act = null; return; }
    if (act.kind === 'press') {
      if (act.moved && act.ht.c) { commit(); redrawEditor && redrawEditor(); renderHeads(); }
      else if (!act.moved) {
        const now = performance.now(), dbl = now - lastTap.t < 350 && Math.hypot(act.x0 - lastTap.x, act.y0 - lastTap.y) < 20;
        lastTap = { t: now, x: act.x0, y: act.y0 };
        if (act.ht.c) { if (dbl) { Ed.tab = 'edit'; renderPanel(); } }
        else if (act.ht.tr) {
          Sel.track = act.ht.tr.id; Sel.clip = null;
          if (dbl && act.ht.tr.kind !== 'audio') { newClip(Math.floor(xb(act.x0) / song.sig) * song.sig); }
          else { T.pos = Math.max(0, snapB(xb(act.x0), Ed.arrSnap === -1 ? 1 : Ed.arrSnap)); if (T.playing) seek(T.pos); }
          renderHeads(); renderPanel(); drawTimeline();
        }
      }
    }
    act = null;
  };
  tl.addEventListener('pointerup', end); tl.addEventListener('pointercancel', end);
  tl.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { zoomTl(Math.exp(-e.deltaY * 0.004), e.offsetX); return; }
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) Ed.sx = Math.max(0, Ed.sx + (e.deltaX || e.deltaY));
    else Ed.sy = clamp(Ed.sy + e.deltaY, 0, maxSy());
    renderHeads(); drawTimeline();
  }, { passive: false });
  $('#heads').addEventListener('wheel', e => { e.preventDefault(); Ed.sy = clamp(Ed.sy + e.deltaY, 0, maxSy()); renderHeads(); drawTimeline(); }, { passive: false });
  // vertical drag on the track list
  let hd = null;
  $('#heads').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; hd = { y: e.clientY, sy: Ed.sy, moved: false }; });
  addEventListener('pointermove', e => { if (!hd) return; const dy = e.clientY - hd.y; if (Math.abs(dy) > 6) hd.moved = true; if (hd.moved) { Ed.sy = clamp(hd.sy - dy, 0, maxSy()); renderHeads(); drawTimeline(); } });
  addEventListener('pointerup', () => { if (hd && hd.moved) { const blk = ev => { ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', blk, { capture: true, once: true }); setTimeout(() => removeEventListener('click', blk, { capture: true }), 50); } hd = null; });
}
const maxSy = () => Math.max(0, (song.tracks.length + 1) * TH() + 44 - (tlH - RUL));
