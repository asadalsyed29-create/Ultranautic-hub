/* ================= note editor: piano roll, drum grid, on-screen keyboard ================= */
let redrawEditor = null, resizeEditor = null;
const CHORDS = { none: ['One note', [0]], diat: ['Scale chord', null], maj: ['Major', [0, 4, 7]], min: ['Minor', [0, 3, 7]], 7: ['Seventh', [0, 4, 7, 10]], maj7: ['Major 7', [0, 4, 7, 11]], min7: ['Minor 7', [0, 3, 7, 10]], sus2: ['Sus 2', [0, 2, 7]], sus4: ['Sus 4', [0, 5, 7]], dim: ['Diminished', [0, 3, 6]], aug: ['Augmented', [0, 4, 8]], pow: ['Power', [0, 7, 12]], oct: ['Octave', [0, 12]] };
const SNAPS = [{ v: 1, l: '1/4' }, { v: 0.5, l: '1/8' }, { v: 1 / 3, l: '1/8 triplet' }, { v: 0.25, l: '1/16' }, { v: 1 / 6, l: '1/16 triplet' }, { v: 0.125, l: '1/32' }, { v: 0, l: 'Off' }];
const LENS = [{ v: 4, l: 'Whole' }, { v: 2, l: 'Half' }, { v: 1, l: 'Quarter' }, { v: 0.5, l: 'Eighth' }, { v: 0.25, l: 'Sixteenth' }, { v: 0.125, l: '32nd' }];
const R = { kh: 16, rz: 90, sx: 0, sy: 0, dz: 30, clipId: null };
function chordNotes(m) {
  if (Ed.chord === 'diat') { const sc = SCALES[song.scale === 'none' ? 'major' : song.scale].s, rel = ((m - song.key) % 12 + 12) % 12; let i = sc.indexOf(rel); if (i < 0) return [m]; const base = m - rel; const out = []; for (const k of [0, 2, 4]) { const j = i + k; out.push(base + sc[j % sc.length] + 12 * Math.floor(j / sc.length)); } return out; }
  return CHORDS[Ed.chord][1].map(x => m + x);
}
const rsnap = b => Ed.snap ? Math.round(b / Ed.snap) * Ed.snap : b;
const fsnap = b => Ed.snap ? Math.floor(b / Ed.snap + 1e-6) * Ed.snap : b;

function noteEditor(pb, c) {
  const tr = trackOf(c); const drum = tr.kind === 'drum';
  if (R.clipId !== c.id) { R.clipId = c.id; R.sx = 0; Sel.notes.clear(); if (!drum) { const ms = c.notes.map(n => n.m); const mid = ms.length ? (Math.min(...ms) + Math.max(...ms)) / 2 : 60; R.sy = (127 - mid) * R.kh - 120; } }
  const ed = h('div', { class: 'ed' });
  const tools = h('div', { class: 'tools' });
  const lenF = numField({ value: c.len / song.sig, min: 0.25, max: 256, step: 0.25, dec: 2, onInput: (v, f) => { c.len = v * song.sig; draw(); drawTimeline(); if (f) commit(); } });
  lenF.style.width = '64px'; lenF.style.flex = 'none';
  if (!drum) {
    const toolSeg = segBox({ value: Ed.tool, options: [{ v: 'draw', i: 'pen', l: 'Draw', t: 'Draw notes' }, { v: 'erase', i: 'erase', l: 'Delete', t: 'Tap or swipe over notes to delete them' }, { v: 'select', i: 'sel', l: 'Pick', t: 'Pick notes by dragging a box' }, { v: 'pan', i: 'hand', l: 'Scroll', t: 'Drag to scroll the notes' }], onChange: v => { const was = Ed.tool; Ed.tool = v; if (v === 'erase' && was === 'select' && Sel.notes.size) delNotes(); } });
    toolSeg.style.flex = 'none'; toolSeg.classList.add('pin');
    tools.append(toolSeg, h('span', { class: 'sep' }),
      h('span', { class: 'lab' }, 'Snap'), selectBox({ value: Ed.snap, options: SNAPS, onChange: v => { Ed.snap = v; draw(); } }),
      h('span', { class: 'lab' }, 'Length'), selectBox({ value: Ed.len, options: LENS, onChange: v => Ed.len = v }),
      h('span', { class: 'lab' }, 'Chord'), selectBox({ value: Ed.chord, options: Object.keys(CHORDS).map(k => ({ v: k, l: CHORDS[k][0] })), onChange: v => Ed.chord = v }),
      h('span', { class: 'sep' }),
      tbtn('copy', 'Copy notes', copyNotes), tbtn('paste', 'Paste notes at the playhead', pasteNotes), tbtn('dup', 'Repeat the picked notes after themselves', dupNotes),
      tbtn('quant', 'Snap notes to the grid', quantize, 'Snap'), tbtn('up', 'Up a semitone', () => transp(1)), tbtn('down', 'Down a semitone', () => transp(-1)),
      h('button', { class: 'tb', title: 'Up an octave', onclick: () => transp(12) }, '+8'), h('button', { class: 'tb', title: 'Down an octave', onclick: () => transp(-12) }, '-8'),
      h('button', { class: 'tb', title: 'Pick all notes', onclick: () => { c.notes.forEach((n, i) => Sel.notes.add(n)); draw(); } }, 'All'),
      h('span', { class: 'sep' }), h('span', { class: 'lab' }, 'Velocity'), velSlider(),
      h('span', { class: 'lab' }, 'Bars'), lenF,
      h('span', { class: 'sep' }), kbBtn());
  } else {
    tools.append(h('span', { class: 'lab' }, 'Steps'), selectBox({ value: R.dstep || 0.25, options: [{ v: 0.25, l: '1/16' }, { v: 0.125, l: '1/32' }, { v: 1 / 6, l: '1/16 triplet' }, { v: 0.5, l: '1/8' }], onChange: v => { R.dstep = v; draw(); } }),
      h('span', { class: 'lab' }, 'Velocity'), velSlider(),
      h('span', { class: 'lab' }, 'Swing'), (() => { const s = slider({ value: tr.swing || 0, min: 0, max: 1, step: 0.05, onInput: (v, f) => { tr.swing = v; if (f) commit(); } }); s.style.width = '90px'; s.style.flex = 'none'; return s; })(),
      h('span', { class: 'lab' }, 'Bars'), lenF,
      h('span', { class: 'sep' }), tbtn('dup', 'Double the clip (repeat its beat)', () => { const L = c.len; c.notes = c.notes.concat(c.notes.filter(n => n.t < L).map(n => ({ ...n, t: n.t + L }))); c.len = L * 2; lenF.set(c.len / song.sig); commit(); draw(); drawTimeline(); }, 'Double'),
      tbtn('trash', 'Clear all hits', () => { c.notes = []; commit(); draw(); drawTimeline(); }, 'Clear'),
      h('span', { class: 'sep' }), kbBtn('Pads'));
  }
  const cvw = h('div', { class: 'cv' }), cv = h('canvas');
  cvw.append(cv); ed.append(tools, cvw);
  if (Ed.kbd) ed.append(keyboardEl());
  pb.append(ed);
  const g = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); const r = cvw.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); };
  const ro = new ResizeObserver(() => { size(); draw(); }); ro.observe(cvw);
  const draw = () => { if (!document.body.contains(cv)) { ro.disconnect(); return; } if (!song.clips.includes(c)) return; drum ? drawDrums(g, W, H, dpr, c, tr) : drawRoll(g, W, H, dpr, c, tr); };
  redrawEditor = draw; resizeEditor = () => { size(); draw(); }; drawEditorHead = draw;
  size(); draw();
  drum ? drumInput(cv, c, tr, draw) : rollInput(cv, c, tr, draw);

  function velSlider() { const s = slider({ value: Ed.vel, min: 0.05, max: 1, step: 0.01, onInput: (v, f) => { Ed.vel = v; if (Sel.notes.size) { Sel.notes.forEach(n => n.v = v); draw(); if (f) commit(); } } }); s.style.width = '90px'; s.style.flex = 'none'; return s; }
  function kbBtn(l = 'Keyboard') { return tbtn(drum ? 'drum' : 'keys', 'Show the playable ' + l.toLowerCase(), () => { Ed.kbd = !Ed.kbd; renderPanel(); }, l, 'tb' + (Ed.kbd ? ' on' : '')); }
  function picked() { return Sel.notes.size ? c.notes.filter(n => Sel.notes.has(n)) : c.notes; }
  function copyNotes() { const ns = picked(); if (!ns.length) return; const t0 = Math.min(...ns.map(n => n.t)); R.clip = ns.map(n => ({ ...n, t: n.t - t0 })); toast('Copied ' + ns.length + ' notes'); }
  function pasteNotes() { if (!R.clip) { toast('Copy some notes first'); return; } let at = fsnap(beatNow() - c.start); if (at < 0 || at >= c.len) at = 0; Sel.notes.clear(); for (const n of R.clip) { const n2 = { ...n, t: n.t + at }; c.notes.push(n2); Sel.notes.add(n2); } const e = Math.max(...c.notes.map(n => n.t + n.d)); if (e > c.len) { c.len = Math.ceil(e / song.sig) * song.sig; lenF.set(c.len / song.sig); } commit(); draw(); drawTimeline(); }
  function dupNotes() { const ns = picked(); if (!ns.length) return; const t0 = Math.min(...ns.map(n => n.t)), t1 = Math.max(...ns.map(n => n.t + n.d)), L = Ed.snap ? Math.ceil((t1 - t0) / Ed.snap - 1e-6) * Ed.snap : t1 - t0; Sel.notes.clear(); for (const n of ns) { const n2 = { ...n, t: n.t + L }; c.notes.push(n2); Sel.notes.add(n2); } const e = Math.max(...c.notes.map(n => n.t + n.d)); if (e > c.len) { c.len = Math.ceil(e / song.sig) * song.sig; lenF.set(c.len / song.sig); } commit(); draw(); drawTimeline(); }
  function delNotes() { if (!Sel.notes.size) { toast('Pick notes first (Select tool, or tap them)'); return; } c.notes = c.notes.filter(n => !Sel.notes.has(n)); Sel.notes.clear(); commit(); draw(); drawTimeline(); }
  function quantize() { const q = Ed.snap || 0.25; for (const n of picked()) { const s = Math.round(n.t / q) * q, e = Math.max(s + q, Math.round((n.t + n.d) / q) * q); n.t = s; n.d = e - s; } commit(); draw(); drawTimeline(); }
  function transp(k) { for (const n of picked()) n.m = clamp(n.m + k, 0, 127); commit(); draw(); drawTimeline(); }
}

/* ---------- piano roll ---------- */
const KW = 46, RT = 18, SB = 22;
/* left/right scroll bar along the bottom of the note panels */
function sbGeo(W, x0, total) { const vis = W - x0, tot = Math.max(total, vis + 1), tw = Math.max(44, (W - x0) * vis / tot), max = tot - vis; return { x0, vis, tot, tw, max, tx: x0 + (W - x0 - tw) * (max > 0 ? R.sx / max : 0) }; }
function drawSB(g, W, H, q) { const y = H - SB; g.fillStyle = '#141518'; g.fillRect(0, y, W, SB); g.fillStyle = '#2a2c31'; g.fillRect(0, y, W, 1); g.fillStyle = '#8d919a'; g.font = '10px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText('Scroll', 6, y + SB / 2 + 1); g.fillStyle = R.sbDrag ? '#7a7f89' : '#4d515a'; g.fillRect(q.tx, y + 5, q.tw, SB - 9); g.fillStyle = '#9ea2aa'; for (let i = -1; i <= 1; i++) g.fillRect(q.tx + q.tw / 2 + i * 4, y + 8, 1, SB - 15); }
function sbDown(p, q, draw) { const grab = p.x >= q.tx && p.x <= q.tx + q.tw ? p.x - q.tx : q.tw / 2; const mv = x => { const f = (x - grab - q.x0) / Math.max(1, (q.vis - q.tw)); R.sx = clamp(f, 0, 1) * q.max; draw(); }; R.sbDrag = true; mv(p.x); return { kind: 'sb', mv }; }
function rollTotal(c, W) { return Math.max(c.len + song.sig * 2, ...c.notes.map(n => n.t + n.d + song.sig)) * R.rz; }
const velH = H => H > 330 ? 46 : 0;
function drawRoll(g, W, H, dpr, c, tr) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const kh = R.kh, vh = velH(H - SB), gh = H - RT - vh - SB;
  R.sy = clamp(R.sy, 0, Math.max(0, 128 * kh - gh)); R.sx = clamp(R.sx, 0, Math.max(0, rollTotal(c, W) - (W - KW)));
  g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  const mTop = 127 - Math.floor(R.sy / kh), mBot = 127 - Math.floor((R.sy + gh) / kh);
  const ny = m => RT + (127 - m) * kh - R.sy;
  const nx = b => KW + b * R.rz - R.sx;
  // rows
  for (let m = mTop; m >= mBot - 1; m--) {
    const y = ny(m); const blk = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
    g.fillStyle = !inScale(m) ? '#0b0c0d' : blk ? '#131417' : '#17181b';
    if (song.scale !== 'none' && inScale(m) && ((m - song.key) % 12 + 12) % 12 === 0) g.fillStyle = '#1b2422';
    g.fillRect(KW, y, W - KW, kh);
    g.fillStyle = m % 12 === 0 ? '#2a2d33' : '#1c1e22'; g.fillRect(KW, y + kh - 1, W - KW, 1);
  }
  // beats
  const b0 = Math.floor((R.sx) / R.rz), b1 = Math.ceil((R.sx + W) / R.rz);
  const sub = Ed.snap && Ed.snap * R.rz >= 8 ? Ed.snap : (R.rz >= 40 ? 0.25 : 1);
  for (let b = Math.floor(b0 / sub) * sub; b <= b1; b += sub) {
    const x = Math.round(nx(b)) + 0.5; if (x < KW) continue;
    const isBar = Math.abs(b % song.sig) < 1e-6, isBeat = Math.abs(b % 1) < 1e-6;
    g.fillStyle = isBar ? '#363a41' : isBeat ? '#25282d' : '#1a1c1f'; g.fillRect(x, RT, 1, gh);
  }
  // outside clip
  const xe = nx(c.len); if (xe < W) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(Math.max(KW, xe), RT, W - xe, gh); }
  // notes
  for (const n of c.notes) {
    const x = nx(n.t), y = ny(n.m), w = Math.max(3, n.d * R.rz); if (x > W || x + w < KW || y > RT + gh || y + kh < RT) continue;
    const sel = Sel.notes.has(n), out = n.t >= c.len;
    g.fillStyle = out ? '#555' : sel ? '#ffffff' : tr.color;
    g.globalAlpha = 0.45 + 0.55 * n.v;
    g.fillRect(x + 0.5, y + 1, w - 1, kh - 2); g.globalAlpha = 1;
    g.strokeStyle = sel ? '#fff' : '#00000088'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 1.5, w - 1, kh - 3);
    if (w > 22 && kh >= 12) { g.fillStyle = sel ? '#111' : '#0b0c0e'; g.font = '10px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText(noteName(n.m), x + 3, y + kh / 2); }
  }
  // box select
  if (R.box) { g.strokeStyle = '#3fd6c0'; g.setLineDash([4, 3]); g.strokeRect(R.box.x1 + 0.5, R.box.y1 + 0.5, R.box.x2 - R.box.x1, R.box.y2 - R.box.y1); g.setLineDash([]); g.fillStyle = 'rgba(63,214,192,.08)'; g.fillRect(R.box.x1, R.box.y1, R.box.x2 - R.box.x1, R.box.y2 - R.box.y1); }
  // keys
  for (let m = mTop; m >= mBot - 1; m--) {
    const y = ny(m), blk = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
    g.fillStyle = R.down === m ? '#3fd6c0' : blk ? '#1b1c1f' : '#d9dbe0'; g.fillRect(0, y, KW, kh);
    g.fillStyle = '#00000055'; g.fillRect(0, y + kh - 1, KW, 1);
    if (m % 12 === 0 && kh >= 9) { g.fillStyle = '#3a3d44'; g.font = '600 9.5px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText('C' + (m / 12 - 1), 4, y + kh / 2); }
  }
  g.fillStyle = '#2a2c31'; g.fillRect(KW - 1, RT, 1, gh);
  // velocity lane
  if (vh) {
    const vy = H - SB - vh; g.fillStyle = '#121315'; g.fillRect(0, vy, W, vh); g.fillStyle = '#2a2c31'; g.fillRect(0, vy, W, 1);
    g.fillStyle = '#8d919a'; g.font = '10px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText('Velocity', 4, vy + vh / 2);
    for (const n of c.notes) { const x = nx(n.t); if (x < KW || x > W) continue; const hh = (vh - 8) * n.v; g.fillStyle = Sel.notes.has(n) ? '#fff' : tr.color; g.fillRect(x, H - SB - 4 - hh, 3, hh); g.fillRect(x, H - SB - 4 - hh, 8, 2); }
  }
  // ruler
  g.fillStyle = '#16171a'; g.fillRect(0, 0, W, RT); g.fillStyle = '#2a2c31'; g.fillRect(0, RT - 1, W, 1);
  g.font = '10.5px system-ui,sans-serif'; g.textBaseline = 'middle';
  for (let b = Math.floor(b0 / song.sig) * song.sig; b <= b1; b += song.sig) { const x = nx(b); if (x < KW) continue; g.fillStyle = '#a5a9b1'; g.fillText(String(Math.floor((c.start + b) / song.sig) + 1), x + 3, 9); g.fillStyle = '#62666e'; g.fillRect(x, 8, 1, 10); }
  g.fillStyle = '#16171a'; g.fillRect(0, 0, KW, RT);
  // playhead
  const pb = (AC ? beatNow() : T.pos) - c.start;
  if (pb >= 0 && pb <= c.len) { const x = nx(pb); if (x >= KW) { g.fillStyle = '#ff5a4d'; g.fillRect(x, 0, 1.5, H - SB); } }
  drawSB(g, W, H, sbGeo(W, KW, rollTotal(c, W)));
}
function rollInput(cv, c, tr, draw) {
  const ptrs = new Map(); let act = null, lastTap = { t: 0, n: null };
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, H: r.height, W: r.width }; };
  const toB = x => (x - KW + R.sx) / R.rz, toM = y => 127 - Math.floor((y - RT + R.sy) / R.kh);
  const noteAt = (x, y) => { const b = toB(x), m = toM(y); for (let i = c.notes.length - 1; i >= 0; i--) { const n = c.notes[i]; if (n.m === m && b >= n.t && b <= n.t + n.d) return n; } return null; };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = pos(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 2) { if (act && act.kind === 'new' && act.made) { c.notes = c.notes.filter(n => !act.made.includes(n)); } const [a, b] = [...ptrs.values()]; act = { kind: 'pinch', dx0: Math.abs(a.x - b.x) || 1, dy0: Math.abs(a.y - b.y) || 1, rz0: R.rz, kh0: R.kh, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, bx: toB((a.x + b.x) / 2), my: ((a.y + b.y) / 2 - RT + R.sy) / R.kh }; return; }
    const vh = velH(p.H - SB);
    if (p.y > p.H - SB) { act = sbDown(p, sbGeo(p.W, KW, rollTotal(c, p.W)), draw); return; }
    if (p.y < RT) { act = { kind: 'seek' }; T.pos = Math.max(0, c.start + rsnap(toB(p.x))); if (T.playing) seek(T.pos); draw(); drawTimeline(); return; }
    if (vh && p.y > p.H - SB - vh) { act = { kind: 'vel' }; velAt(p); return; }
    if (p.x < KW) { const m = toM(p.y); R.down = m; liveOn(m, Ed.vel, 'rk'); act = { kind: 'keys', y0: p.y, sy0: R.sy, m }; draw(); return; }
    const n = noteAt(p.x, p.y);
    if (Ed.tool === 'pan') { act = { kind: 'pan', x0: p.x, y0: p.y, sx0: R.sx, sy0: R.sy }; return; }
    if (Ed.tool === 'erase') { act = { kind: 'erase', gone: 0 }; eraseAt(p); return; }
    if (n) {
      const now = performance.now();
      if (now - lastTap.t < 330 && lastTap.n === n) { c.notes = c.notes.filter(x => x !== n); Sel.notes.delete(n); commit(); draw(); drawTimeline(); act = null; lastTap = { t: 0 }; return; }
      lastTap = { t: now, n };
      if (!Sel.notes.has(n)) { if (!e.shiftKey) Sel.notes.clear(); Sel.notes.add(n); }
      const x2 = KW + (n.t + n.d) * R.rz - R.sx, edge = Math.min(14, n.d * R.rz * 0.35);
      const ns = [...Sel.notes];
      act = { kind: p.x > x2 - edge ? 'resize' : 'move', x0: p.x, y0: p.y, n, orig: ns.map(q => ({ q, t: q.t, d: q.d, m: q.m })), moved: false };
      audition(tr, n.m, n.v, 0.3); draw(); return;
    }
    if (Ed.tool === 'select') { if (!e.shiftKey) Sel.notes.clear(); act = { kind: 'box', x0: p.x, y0: p.y }; R.box = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; draw(); return; }
    // draw a new note (or chord)
    const b = fsnap(toB(p.x)), m = toM(p.y); if (b < 0 || m < 0 || m > 127) return;
    Sel.notes.clear();
    const made = chordNotes(m).filter(x => x >= 0 && x <= 127).map(mm => ({ t: b, d: Ed.len, m: mm, v: Ed.vel }));
    for (const q of made) { c.notes.push(q); Sel.notes.add(q); }
    act = { kind: 'new', made, x0: p.x, b0: b, moved: false };
    ensureAudio(); for (const q of made) audition(tr, q.m, q.v, 0.3);
    draw(); drawTimeline();
  });
  const eraseAt = p => { const n = noteAt(p.x, p.y); if (!n) return; c.notes = c.notes.filter(x => x !== n); Sel.notes.delete(n); act.gone++; draw(); drawTimeline(); };
  const velAt = p => { const b = toB(p.x), vh = velH(p.H - SB); const v = clamp((p.H - SB - 4 - p.y) / (vh - 8), 0.02, 1); let best = null, bd = 1e9; for (const n of c.notes) { const d = Math.abs(n.t - b) * R.rz; if (d < 12 && d < bd && (!Sel.notes.size || Sel.notes.has(n))) { bd = d; best = n; } } if (best) { for (const n of c.notes) if (Math.abs(n.t - best.t) < 1e-6 && (!Sel.notes.size || Sel.notes.has(n))) n.v = v; draw(); } };
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !act) return; const p = pos(e); ptrs.set(e.pointerId, p);
    if (act.kind === 'pinch') { if (ptrs.size < 2) return; const [a, b] = [...ptrs.values()]; const dx = Math.abs(a.x - b.x) || 1, dy = Math.abs(a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; if (act.dx0 > 40) R.rz = clamp(act.rz0 * dx / act.dx0, 12, 600); if (act.dy0 > 40) R.kh = clamp(act.kh0 * dy / act.dy0, 7, 40); R.sx = act.bx * R.rz - (cx - KW); R.sy = act.my * R.kh - (cy - RT); draw(); return; }
    if (act.kind === 'seek') { T.pos = Math.max(0, c.start + rsnap(toB(p.x))); draw(); drawTimeline(); return; }
    if (act.kind === 'sb') { act.mv(p.x); return; }
    if (act.kind === 'erase') { eraseAt(p); return; }
    if (act.kind === 'vel') { velAt(p); return; }
    if (act.kind === 'keys') { const m = toM(p.y); if (m !== act.m) { liveOff('rk'); liveOn(m, Ed.vel, 'rk'); act.m = m; R.down = m; draw(); } return; }
    if (act.kind === 'pan') { R.sx = Math.max(0, act.sx0 - (p.x - act.x0)); R.sy = act.sy0 - (p.y - act.y0); draw(); return; }
    if (act.kind === 'box') { R.box = { x1: Math.min(act.x0, p.x), y1: Math.min(act.y0, p.y), x2: Math.max(act.x0, p.x), y2: Math.max(act.y0, p.y) }; const b1 = toB(R.box.x1), b2 = toB(R.box.x2), m1 = toM(R.box.y2), m2 = toM(R.box.y1); for (const n of c.notes) { if (n.m >= m1 && n.m <= m2 && n.t + n.d >= b1 && n.t <= b2) Sel.notes.add(n); } draw(); return; }
    if (act.kind === 'new') { const e2 = Math.max(Ed.snap || 0.0625, rsnap(toB(p.x)) - act.b0); if (Math.abs(p.x - act.x0) > 6) { act.moved = true; for (const q of act.made) q.d = Math.max(Ed.snap || 0.0625, e2); draw(); } return; }
    const dxb = (p.x - act.x0) / R.rz, dm = -Math.round((p.y - act.y0) / R.kh);
    if (!act.moved && Math.hypot(p.x - act.x0, p.y - act.y0) < 5) return; act.moved = true;
    if (act.kind === 'move') {
      const d = Ed.snap ? Math.round(dxb / Ed.snap) * Ed.snap : dxb;
      const minT = Math.min(...act.orig.map(o => o.t)), dd = Math.max(-minT, d);
      let changed = false;
      for (const o of act.orig) { const nm = clamp(o.m + dm, 0, 127); if (o.q.m !== nm) changed = true; o.q.t = o.t + dd; o.q.m = nm; }
      if (changed) audition(tr, act.n.m, act.n.v, 0.2);
    } else { for (const o of act.orig) { const end = Ed.snap ? Math.round((o.t + o.d + dxb) / Ed.snap) * Ed.snap : o.t + o.d + dxb; o.q.d = Math.max(Ed.snap || 0.0625, end - o.t); } }
    draw();
  });
  const end = e => {
    ptrs.delete(e.pointerId); if (!act) return;
    if (act.kind === 'pinch') { if (!ptrs.size) act = null; return; }
    if (act.kind === 'sb') { R.sbDrag = false; draw(); }
    if (act.kind === 'erase' && act.gone) commit();
    if (act.kind === 'keys') { liveOff('rk'); R.down = null; draw(); }
    if (act.kind === 'seek' && T.playing) seek(T.pos);
    if (act.kind === 'box') { R.box = null; draw(); }
    if (act.kind === 'new') { const e2 = Math.max(...c.notes.map(n => n.t + n.d)); if (e2 > c.len) c.len = Math.ceil(e2 / song.sig) * song.sig; commit(); drawTimeline(); }
    if ((act.kind === 'move' || act.kind === 'resize' || act.kind === 'vel') && (act.moved || act.kind === 'vel')) { const e2 = Math.max(0, ...c.notes.map(n => n.t + n.d)); if (e2 > c.len) c.len = Math.ceil(e2 / song.sig) * song.sig; commit(); drawTimeline(); }
    act = null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey || e.metaKey) { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, b = toB(x); R.rz = clamp(R.rz * Math.exp(-e.deltaY * 0.004), 12, 600); R.sx = Math.max(0, b * R.rz - (x - KW)); } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) R.sx = Math.max(0, R.sx + (e.deltaX || e.deltaY)); else R.sy += e.deltaY; draw(); }, { passive: false });
}

/* ---------- drum grid ---------- */
const DNW = 92;
function drawDrums(g, W, H, dpr, c, tr) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const st = R.dstep || 0.25, n = DRUM_ROWS.length, rh = Math.max(18, Math.min(34, (H - RT - SB) / n)), cw = R.dz * (st / 0.25);
  R.dsy = clamp(R.dsy || 0, 0, Math.max(0, n * rh - (H - RT - SB)));
  const steps = Math.ceil(c.len / st - 1e-6);
  R.sx = clamp(R.sx, 0, Math.max(0, steps * cw + 20 - (W - DNW)));
  g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  const hits = new Map(); for (const q of c.notes) { const k = DRUM_NOTES.indexOf(q.m) + ':' + Math.round(q.t / st); hits.set(k, q); }
  for (let r = 0; r < n; r++) {
    const y = RT + r * rh - R.dsy; if (y > H || y + rh < RT) continue;
    for (let s = 0; s < steps; s++) {
      const x = DNW + s * cw - R.sx; if (x > W || x + cw < DNW) continue;
      const beat = Math.floor(s * st + 1e-6), q = hits.get(r + ':' + s);
      g.fillStyle = q ? tr.color : (beat % 2 ? '#191a1d' : '#202226');
      if (q) g.globalAlpha = 0.35 + 0.65 * q.v;
      g.fillRect(x + 1, y + 1, cw - 2, rh - 2); g.globalAlpha = 1;
    }
  }
  // bar lines
  for (let s = 0; s <= steps; s++) { const b = s * st; if (Math.abs(b % song.sig) > 1e-6) continue; const x = DNW + s * cw - R.sx; if (x < DNW) continue; g.fillStyle = '#4a4e57'; g.fillRect(x - 1, RT, 2, H); }
  // names
  for (let r = 0; r < n; r++) { const y = RT + r * rh - R.dsy; g.fillStyle = R.ddown === r ? '#3fd6c0' : '#16171a'; g.fillRect(0, y, DNW - 1, rh); g.fillStyle = R.ddown === r ? '#04201b' : '#c9ccd2'; g.font = '11px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText(DRUM_ROWS[r], 7, y + rh / 2); g.fillStyle = '#25272c'; g.fillRect(0, y + rh - 1, DNW, 1); }
  g.fillStyle = '#16171a'; g.fillRect(0, 0, W, RT); g.fillStyle = '#2a2c31'; g.fillRect(0, RT - 1, W, 1);
  g.font = '10.5px system-ui,sans-serif';
  for (let s = 0; s < steps; s++) { const b = s * st; if (Math.abs(b % 1) > 1e-6) continue; const x = DNW + s * cw - R.sx; if (x < DNW) continue; g.fillStyle = Math.abs(b % song.sig) < 1e-6 ? '#c9ccd2' : '#62666e'; g.fillText(Math.abs(b % song.sig) < 1e-6 ? String(Math.floor((c.start + b) / song.sig) + 1) : String(Math.floor(b % song.sig) + 1), x + 3, 9); }
  const pb = (AC ? beatNow() : T.pos) - c.start;
  if (pb >= 0 && pb <= c.len) { const x = DNW + pb / st * cw - R.sx; if (x >= DNW) { g.fillStyle = '#ff5a4d'; g.fillRect(x, 0, 1.5, H - SB); } }
  drawSB(g, W, H, sbGeo(W, DNW, steps * cw + 20));
}
function drumInput(cv, c, tr, draw) {
  let act = null; const ptrs = new Map();
  const geo = () => { const r = cv.getBoundingClientRect(); const st = R.dstep || 0.25, rh = Math.max(18, Math.min(34, (r.height - RT - SB) / DRUM_ROWS.length)); return { r, st, rh, cw: R.dz * (st / 0.25) }; };
  const cell = (e) => { const { r, st, rh, cw } = geo(); const x = e.clientX - r.left, y = e.clientY - r.top; return { x, y, row: Math.floor((y - RT + (R.dsy || 0)) / rh), s: Math.floor((x - DNW + R.sx) / cw), st }; };
  const setHit = (row, s, st, on) => {
    if (row < 0 || row >= DRUM_ROWS.length || s < 0 || s * st >= c.len - 1e-6) return;
    const m = DRUM_NOTES[row], t = s * st, ex = c.notes.find(q => q.m === m && Math.abs(q.t - t) < st / 2);
    if (on && !ex) { c.notes.push({ t, d: st, m, v: Ed.vel }); audition(tr, m, Ed.vel); }
    if (!on && ex) c.notes = c.notes.filter(q => q !== ex);
  };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = cell(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 2) { act = { kind: 'pan', x0: p.x, y0: p.y, sx0: R.sx, sy0: R.dsy || 0 }; return; }
    { const r = cv.getBoundingClientRect(); if (p.y > r.height - SB) { const { cw, st } = geo(); act = sbDown(p, sbGeo(r.width, DNW, Math.ceil(c.len / st - 1e-6) * cw + 20), draw); return; } }
    if (p.y < RT) { act = { kind: 'seek' }; T.pos = c.start + Math.max(0, p.s * p.st); if (T.playing) seek(T.pos); draw(); drawTimeline(); return; }
    if (p.x < DNW) { if (p.row >= 0 && p.row < DRUM_ROWS.length) { R.ddown = p.row; audition(tr, DRUM_NOTES[p.row], Ed.vel); draw(); } act = { kind: 'name', y0: p.y, sy0: R.dsy || 0 }; return; }
    const m = DRUM_NOTES[p.row], on = !c.notes.some(q => q.m === m && Math.abs(q.t - p.s * p.st) < p.st / 2);
    act = { kind: 'paint', on, last: p.row + ':' + p.s, x0: p.x, y0: p.y, sx0: R.sx };
    setHit(p.row, p.s, p.st, on); draw(); drawTimeline();
  });
  cv.addEventListener('pointermove', e => {
    if (!act || !ptrs.has(e.pointerId)) return; const p = cell(e); ptrs.set(e.pointerId, p);
    if (act.kind === 'pan') { R.sx = Math.max(0, act.sx0 - (p.x - act.x0)); R.dsy = Math.max(0, act.sy0 - (p.y - act.y0)); draw(); return; }
    if (act.kind === 'sb') { act.mv(p.x); return; }
    if (act.kind === 'name') { R.dsy = Math.max(0, act.sy0 - (p.y - act.y0)); draw(); return; }
    if (act.kind === 'seek') { T.pos = c.start + Math.max(0, p.s * p.st); draw(); drawTimeline(); return; }
    if (act.kind === 'paint') { const k = p.row + ':' + p.s; if (k !== act.last) { act.last = k; act.painted = true; setHit(p.row, p.s, p.st, act.on); draw(); } }
  });
  const end = e => { ptrs.delete(e.pointerId); if (!act) return; if (act.kind === 'paint') { commit(); drawTimeline(); } if (act.kind === 'name') { R.ddown = null; draw(); } if (act.kind === 'seek' && T.playing) seek(T.pos); if (act.kind === 'sb') { R.sbDrag = false; draw(); } if (!ptrs.size) act = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey) R.dz = clamp(R.dz * Math.exp(-e.deltaY * 0.003), 12, 80); else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) R.sx = Math.max(0, R.sx + (e.deltaX || e.deltaY)); else R.dsy = (R.dsy || 0) + e.deltaY; draw(); }, { passive: false });
}

/* ---------- playable keyboard / drum pads ---------- */
const KB = { oct: 4, down: new Map(), lit: new Set() };
function keyboardEl() {
  const tr = selTrack(); const drum = tr && tr.kind === 'drum';
  const box = h('div', { id: 'kbd' });
  const cv = h('canvas');
  if (!drum) { const oc = h('div', { class: 'oct' }, h('button', { onclick: () => { KB.oct = Math.min(8, KB.oct + 1); draw(); } }, 'Oct +'), h('button', { style: { pointerEvents: 'none', color: 'var(--tx)' } }, 'C' + KB.oct), h('button', { onclick: () => { KB.oct = Math.max(0, KB.oct - 1); draw(); } }, 'Oct -')); box.append(oc); KB.ocLab = oc.children[1]; }
  box.append(cv);
  const g = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, keys = [];
  const layout = () => {
    keys = [];
    if (drum) { const cols = W > 600 ? 16 : 8, rows = Math.ceil(DRUM_ROWS.length / cols), w = W / cols, hh = H / rows; DRUM_ROWS.forEach((n, i) => keys.push({ m: DRUM_NOTES[i], x: (i % cols) * w, y: Math.floor(i / cols) * hh, w, h: hh, n, pad: 1 })); return; }
    const whiteW = W > 900 ? 40 : W > 600 ? 36 : 32, nW = Math.max(7, Math.floor(W / whiteW)), ww = W / nW;
    const base = (KB.oct + 1) * 12; let wi = 0; const blacks = [];
    for (let m = base; wi < nW; m++) { const blk = [1, 3, 6, 8, 10].includes(m % 12); if (blk) blacks.push({ m, x: wi * ww - ww * 0.3, y: 0, w: ww * 0.6, h: H * 0.6, blk: 1 }); else { keys.push({ m, x: wi * ww, y: 0, w: ww, h: H }); wi++; } }
    keys = blacks.concat(keys); // blacks first for hit testing
  };
  const draw = () => {
    if (KB.ocLab) KB.ocLab.textContent = 'C' + KB.oct;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H); layout();
    const lit = m => [...KB.down.values()].includes(m) || KB.lit.has(m);
    for (const k of keys.slice().reverse()) {
      if (k.pad) { g.fillStyle = lit(k.m) ? tr.color : '#24262b'; g.fillRect(k.x + 2, k.y + 2, k.w - 4, k.h - 4); g.fillStyle = lit(k.m) ? '#04201b' : '#c9ccd2'; g.font = '11px system-ui,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(k.n, k.x + k.w / 2, k.y + k.h / 2); g.textAlign = 'left'; continue; }
      g.fillStyle = lit(k.m) ? '#3fd6c0' : k.blk ? '#1b1c1f' : '#e4e6ea'; g.fillRect(k.x + (k.blk ? 0 : 0.5), k.y, k.w - (k.blk ? 0 : 1), k.h);
      if (!k.blk && k.m % 12 === 0) { g.fillStyle = '#62666e'; g.font = '10px system-ui,sans-serif'; g.fillText('C' + (k.m / 12 - 1), k.x + 4, H - 8); }
    }
  };
  const ro = new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); draw(); });
  ro.observe(cv);
  const at = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return keys.find(k => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h); };
  const velOf = (e, k) => { if (!k || k.pad) return Ed.vel; const r = cv.getBoundingClientRect(); return clamp(0.35 + 0.65 * (e.clientY - r.top) / (k.h || 1), 0.2, 1); };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const k = at(e); if (!k) return; KB.down.set(e.pointerId, k.m); liveOn(k.m, velOf(e, k), 'kb' + e.pointerId); draw(); });
  cv.addEventListener('pointermove', e => { if (!KB.down.has(e.pointerId) || drum) return; const k = at(e); if (k && k.m !== KB.down.get(e.pointerId)) { liveOff('kb' + e.pointerId); KB.down.set(e.pointerId, k.m); liveOn(k.m, velOf(e, k), 'kb' + e.pointerId); draw(); } });
  const up = e => { if (!KB.down.has(e.pointerId)) return; KB.down.delete(e.pointerId); liveOff('kb' + e.pointerId); draw(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  KB.draw = draw;
  return box;
}
function onLiveNote(m, on) { if (on) KB.lit.add(m); else KB.lit.delete(m); if (KB.draw && document.body.contains($('#kbd'))) KB.draw(); }
