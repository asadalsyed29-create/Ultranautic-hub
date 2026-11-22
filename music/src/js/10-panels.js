/* ================= panels: instrument browser, track effects, mixer, sounds, audio editor ================= */
const Brow = { fam: null, q: '' };
function instPanel(pb) {
  const tr = selTrack();
  if (!tr) { pb.append(h('div', { class: 'empty' }, 'Add a track first.')); return; }
  if (tr.kind === 'audio') { pb.append(h('div', { class: 'empty' }, h('div', null, 'This is an audio track. Pick an instrument or drum track to choose its sound.'), h('button', { class: 'btn pri', onclick: () => addTrack('inst') }, 'Add an instrument track'))); return; }
  const cur = getPreset(tr.preset);
  if (!Brow.fam) Brow.fam = cur.fam;
  const ed = h('div', { class: 'ed' });
  const q = h('input', { class: 'txt', placeholder: 'Search 500 sounds', value: Brow.q, oninput: e => { Brow.q = e.target.value; fill(); }, onkeydown: e => e.stopPropagation() });
  const oct = segBox({ value: tr.oct || 0, options: [-2, -1, 0, 1, 2].map(v => ({ v, l: v > 0 ? '+' + v : String(v) })), onChange: v => { tr.oct = v; commit(); } }); oct.style.flex = 'none'; oct.style.width = '170px';
  ed.append(h('div', { class: 'srch' }, q, h('span', { class: 'lab note hidem' }, 'Octave'), oct));
  const famsEl = h('div', { class: 'fams' }), grid = h('div', { class: 'styles' });
  ed.append(h('div', { class: 'brow' }, famsEl, grid));
  pb.append(ed);
  const fams = FAMILIES.concat([{ id: 'user', name: 'Your sounds', items: Sounds.list().map(s => getPreset('user:' + s.id)) }]);
  for (const f of fams) {
    const d = h('div', { class: f.id === Brow.fam ? 'on' : '', onclick: () => { Brow.fam = f.id; Brow.q = ''; q.value = ''; $$('div', famsEl).forEach(x => x.classList.remove('on')); d.classList.add('on'); fill(); } }, f.name, h('small', null, String(f.items.length)));
    famsEl.append(d);
  }
  function fill() {
    grid.innerHTML = '';
    const qq = Brow.q.trim().toLowerCase();
    const items = qq ? fams.flatMap(f => f.items.filter(p => p.name.toLowerCase().includes(qq) || f.name.toLowerCase().includes(qq))) : (fams.find(f => f.id === Brow.fam) || fams[0]).items;
    if (!items.length) grid.append(h('div', { class: 'note' }, Brow.fam === 'user' && !qq ? 'Import or record sounds in the Sounds tab, then play them here like an instrument.' : 'Nothing found.'));
    for (const p of items) {
      const famName = (FAMILIES.find(f => f.id === p.fam) || { name: 'Your sound' }).name;
      const el = h('div', { class: 'sty' + (p.id === tr.preset ? ' on' : ''), onclick: () => { choosePreset(tr, p); $$('.sty', grid).forEach(x => x.classList.remove('on')); el.classList.add('on'); } }, h('b', null, p.name), qq ? h('small', null, famName) : null);
      grid.append(el);
    }
    const on = $('.sty.on', grid); if (on) setTimeout(() => on.scrollIntoView({ block: 'nearest' }), 0);
  }
  fill();
}
function choosePreset(tr, p) {
  const old = getPreset(tr.preset);
  if (tr.name === old.name) tr.name = p.name;
  tr.preset = p.id; tr.kind = p.e === 'drum' ? 'drum' : 'inst';
  // effects that belonged to the old sound go back to normal, the new sound's own effects come in
  const d = defFx(); for (const k of ['drive', 'chorus', 'trem', 'delay']) if (old.tfx && old.tfx[k] != null && tr.fx[k] === old.tfx[k]) tr.fx[k] = d[k];
  if (old.tfx && old.tfx.rev != null && tr.fx.rev === old.tfx.rev) tr.fx.rev = d.rev;
  if (p.tfx) Object.assign(tr.fx, p.tfx);
  if (AC) updateStrip(AC, tr);
  commit(); renderHeads(); drawTimeline();
  previewPreset(tr, p);
}
let prevT = 0;
function previewPreset(tr, p) {
  ensureAudio();
  const id = ++prevT;
  if (p.e === 'drum') { const pat = [[0, 0], [4, 0.5], [1, 1], [4, 1.5], [0, 2], [0, 2.25], [4, 2.5], [1, 3], [5, 3.5]]; preload(p).then(() => { if (id !== prevT) return; const t0 = AC.currentTime + 0.05, sp = 0.25; for (const [r, b] of pat) fire(tr, p, DRUM_NOTES[r], 0.85, t0 + b * sp, null, strip(AC, tr).input, true); }); return; }
  const low = ['bass'].includes(p.fam) ? 36 : p.fam === 'fx' ? 60 : 48 + 12;
  const ns = [low, low + 4, low + 7, low + 12];
  preload(p, ns.map(n => n + tr.oct * 12)).then(() => {
    if (id !== prevT) return;
    const t0 = AC.currentTime + 0.05, dest = strip(AC, tr).input;
    ns.forEach((n, i) => fire(tr, p, n + tr.oct * 12, 0.8, t0 + i * 0.16, 0.18, dest, true));
    if (p.fam !== 'fx' && p.fam !== 'lead' && p.fam !== 'bass') [low, low + 4, low + 7].forEach(n => fire(tr, p, n + tr.oct * 12, 0.75, t0 + 0.72, 0.9, dest, true));
  });
}

/* ---------- track effects ---------- */
function fxPanel(pb) {
  const tr = selTrack();
  if (!tr) { pb.append(h('div', { class: 'empty' }, 'Add a track first.')); return; }
  const sc = h('div', { class: 'scroll' }), cols = h('div', { class: 'cols' });
  const f = tr.fx, up = (fn) => (v, fin) => { fn(v); if (AC) updateStrip(AC, tr); if (fin) commit(); };
  const R2 = (l, k, min, max, step, suf, scale = 1) => rangeRow(l, { value: f[k] * scale, min, max, step, suf, dec: step < 1 ? 2 : 0, onInput: up(v => f[k] = v / scale) });
  const g1 = h('div', { class: 'grp' }, h('h4', null, 'Tone'), R2('Drive', 'drive', 0, 1, 0.01), R2('Chorus', 'chorus', 0, 1, 0.01), R2('Tremolo', 'trem', 0, 1, 0.01));
  const g2 = h('div', { class: 'grp' }, h('h4', null, 'EQ'), R2('Low', 'low', -15, 15, 0.5, 'dB'), R2('Mid', 'mid', -15, 15, 0.5, 'dB'), R2('High', 'high', -15, 15, 0.5, 'dB'),
    rangeRow('Low cut', { value: f.lowcut || 0, min: 0, max: 1000, step: 5, suf: 'Hz', onInput: up(v => f.lowcut = v) }), rangeRow('High cut', { value: f.highcut || 0, min: 0, max: 20000, step: 100, suf: 'Hz', onInput: up(v => f.highcut = v) }),
    h('div', { class: 'note' }, 'Cuts at 0 are off.'));
  const g3 = h('div', { class: 'grp' }, h('h4', null, 'Space and punch'), R2('Reverb', 'rev', 0, 1, 0.01), R2('Echo', 'delay', 0, 1, 0.01), R2('Compressor', 'comp', 0, 1, 0.01));
  const parts = [g1, g2, g3];
  if (tr.kind !== 'audio') {
    parts.unshift(h('div', { class: 'grp' }, h('h4', null, 'Sound: ' + getPreset(tr.preset).name),
      rangeRow('Attack', { value: tr.att || 0, min: 0, max: 3, step: 0.01, suf: 's', onInput: (v, fin) => { tr.att = v; if (fin) commit(); } }),
      rangeRow('Release', { value: tr.relx || 1, min: 0.1, max: 4, step: 0.05, suf: 'x', onInput: (v, fin) => { tr.relx = v; if (fin) commit(); } }),
      row('Octave', segBox({ value: tr.oct || 0, options: [-2, -1, 0, 1, 2].map(v => ({ v, l: v > 0 ? '+' + v : String(v) })), onChange: v => { tr.oct = v; commit(); } })),
      h('div', { class: 'btnrow', style: { marginTop: '6px' } }, h('button', { class: 'btn sm', onclick: () => { tr.fx = Object.assign(defFx(), getPreset(tr.preset).tfx || {}); tr.att = 0; tr.relx = 1; if (AC) updateStrip(AC, tr); commit(); renderPanel(); } }, 'Reset effects'))));
  }
  cols.append(...parts);
  sc.append(h('div', { class: 'note', style: { marginBottom: '8px' } }, 'Effects for ', h('b', { style: { color: tr.color } }, tr.name), '. The reverb and echo amounts send this track to the song reverb and echo (set them in the Mixer).'), cols);
  pb.append(sc);
}

/* ---------- mixer ---------- */
function mixerPanel(pb) {
  const mx = h('div', { class: 'mixer' });
  const strips = [];
  for (const tr of song.tracks) {
    const el = h('div', { class: 'ms' + (tr.id === Sel.track ? ' sel' : ''), style: { '--c': tr.color } });
    el.addEventListener('pointerdown', () => { if (Sel.track !== tr.id) { Sel.track = tr.id; const c = selClip(); if (c && c.tr !== tr.id) Sel.clip = null; renderHeads(); drawTimeline(); $$('.ms', mx).forEach(x => x.classList.remove('sel')); el.classList.add('sel'); } });
    const up = (fin) => { if (AC) updateStrip(AC, tr); if (fin) commit(); };
    const knob = (l, get, set, min, max, center) => { const v = h('span'); const s = slider({ value: get(), min, max, step: 0.01, center, onInput: (x, fin) => { set(x); v.textContent = fmt(); up(fin); } }); const fmt = () => l === 'Pan' ? (Math.abs(get()) < 0.01 ? 'C' : (get() < 0 ? 'L' : 'R') + Math.round(Math.abs(get()) * 100)) : Math.round(get() * 100); v.textContent = fmt(); return h('div', { class: 'knobs' }, h('div', { class: 'kl' }, h('span', null, l), v), s); };
    const met = h('div', { class: 'met' }), mi = h('i'); met.append(mi);
    const vf = h('div', { class: 'vf' }), kb = h('b'); vf.append(kb);
    const db = h('div', { class: 'db' });
    const setV = () => { kb.style.top = (1 - tr.vol / 1.25) * 100 + '%'; const d = 20 * Math.log10(Math.max(1e-4, tr.vol * tr.vol)); db.textContent = tr.vol < 0.01 ? '-inf' : (d > 0 ? '+' : '') + d.toFixed(1) + ' dB'; };
    setV();
    vf.addEventListener('pointerdown', e => { e.preventDefault(); vf.setPointerCapture(e.pointerId); const r = vf.getBoundingClientRect(); const y0 = e.clientY, v0 = tr.vol; const mv = ev => { tr.vol = clamp(v0 - (ev.clientY - y0) / r.height * 1.25, 0, 1.25); setV(); up(false); }; const u = () => { vf.removeEventListener('pointermove', mv); vf.removeEventListener('pointerup', u); up(true); }; vf.addEventListener('pointermove', mv); vf.addEventListener('pointerup', u); });
    vf.addEventListener('dblclick', () => { tr.vol = 0.8; setV(); up(true); });
    const m = h('button', { class: 'm' + (tr.mute ? ' on' : ''), onclick: () => { tr.mute = !tr.mute; m.classList.toggle('on', tr.mute); refreshMix(); commit(); renderHeads(); } }, 'M');
    const s = h('button', { class: 's' + (tr.solo ? ' on' : ''), onclick: () => { tr.solo = !tr.solo; s.classList.toggle('on', tr.solo); refreshMix(); commit(); renderHeads(); } }, 'S');
    el.append(h('div', { class: 'nm' }, tr.name), knob('Pan', () => tr.pan, v => tr.pan = v, -1, 1, 0), knob('Reverb', () => tr.fx.rev, v => tr.fx.rev = v, 0, 1), knob('Echo', () => tr.fx.delay, v => tr.fx.delay = v, 0, 1),
      h('div', { class: 'fadr' }, vf, met), db, h('div', { class: 'msb' }, m, s), h('button', { class: 'fxb', onclick: () => { Sel.track = tr.id; setTab('fx'); renderHeads(); } }, 'Effects'));
    strips.push({ tr, mi, met });
    mx.append(el);
  }
  // master
  const f = song.fx, upm = fin => { if (AC) updateBus(AC, song); if (fin) commit(); };
  const ms = h('div', { class: 'ms', style: { '--c': '#ffffff', width: '170px' } });
  const met = h('div', { class: 'met' }), mi = h('i'); met.append(mi);
  const vf = h('div', { class: 'vf' }), kb = h('b'); vf.append(kb); const db = h('div', { class: 'db' });
  const setV = () => { kb.style.top = (1 - song.master / 1.25) * 100 + '%'; const d = 20 * Math.log10(Math.max(1e-4, song.master)); db.textContent = (d > 0 ? '+' : '') + d.toFixed(1) + ' dB'; };
  setV();
  vf.addEventListener('pointerdown', e => { e.preventDefault(); vf.setPointerCapture(e.pointerId); const r = vf.getBoundingClientRect(), y0 = e.clientY, v0 = song.master; const mv = ev => { song.master = clamp(v0 - (ev.clientY - y0) / r.height * 1.25, 0, 1.25); setV(); upm(false); }; const u = () => { vf.removeEventListener('pointermove', mv); vf.removeEventListener('pointerup', u); upm(true); }; vf.addEventListener('pointermove', mv); vf.addEventListener('pointerup', u); });
  ms.append(h('div', { class: 'nm' }, 'Song (master)'),
    h('div', { class: 'kl note' }, 'Reverb room'), selectBox({ value: f.revType, options: [{ v: 'studio', l: 'Studio' }, { v: 'room', l: 'Room' }, { v: 'plate', l: 'Plate' }, { v: 'hall', l: 'Hall' }, { v: 'church', l: 'Church' }], onChange: v => { f.revType = v; upm(true); } }),
    h('div', { class: 'knobs' }, h('div', { class: 'kl' }, h('span', null, 'Reverb level')), slider({ value: f.revLvl, min: 0, max: 2, step: 0.01, onInput: (v, fin) => { f.revLvl = v; upm(fin); } })),
    h('div', { class: 'kl note' }, 'Echo time'), selectBox({ value: f.delTime, options: ['1/16', '1/8', '1/8.', '1/4', '1/4.', '1/2'].map(v => ({ v, l: v.replace('.', ' dotted') })), onChange: v => { f.delTime = v; upm(true); } }),
    h('div', { class: 'knobs' }, h('div', { class: 'kl' }, h('span', null, 'Echo repeats')), slider({ value: f.delFb, min: 0, max: 0.9, step: 0.01, onInput: (v, fin) => { f.delFb = v; upm(fin); } })),
    checkBox('Glue', f.glue, v => { f.glue = v; upm(true); }),
    h('div', { class: 'fadr' }, vf, met), db);
  strips.push({ master: 1, mi, met });
  mx.append(ms);
  pb.append(mx);
  Mix.strips = strips;
}
const Mix = { strips: [], buf: new Float32Array(2048) };
function meters() {
  if (!AC) return;
  for (const s of Mix.strips) {
    const an = s.master ? BUS.get(AC).an : (BUS.get(AC).strips.get(s.tr.id) || {}).an; if (!an) continue;
    const b = Mix.buf.subarray(0, an.fftSize); an.getFloatTimeDomainData(b);
    let pk = 0; for (let i = 0; i < b.length; i++) { const a = Math.abs(b[i]); if (a > pk) pk = a; }
    const db = 20 * Math.log10(pk + 1e-6), hgt = clamp((db + 60) / 60, 0, 1);
    s.lv = Math.max(hgt, (s.lv || 0) - 0.025);
    s.mi.style.height = s.lv * 100 + '%'; s.mi.style.setProperty('--mh', s.met.clientHeight + 'px');
  }
}
function refreshMix() { if (!AC) return; const solo = song.tracks.some(t => t.solo); for (const t of song.tracks) updateStrip(AC, t, solo); }

/* ---------- sounds library ---------- */
let renderSounds = null;
const Prev = { src: null, id: null };
function previewSound(s, off = 0, dur) { ensureAudio(); if (Prev.src) { try { Prev.src.stop(); } catch (e) { } Prev.src = null; if (Prev.id === s.id && off === 0 && dur == null) { Prev.id = null; return; } } const src = AC.createBufferSource(); src.buffer = s.buf; src.connect(BUS.get(AC).input); src.start(AC.currentTime + 0.01, off, dur); Prev.src = src; Prev.id = s.id; src.onended = () => { if (Prev.src === src) { Prev.src = null; Prev.id = null; } }; }
function soundsPanel(pb) {
  const sc = h('div', { class: 'scroll' });
  const list = h('div', { class: 'slist' });
  sc.append(h('div', { class: 'btnrow', style: { marginBottom: '10px' } },
    h('button', { class: 'btn pri', onclick: () => $('#fileIn').click() }, ...[iconEl('upload'), 'Import sounds']),
    h('button', { class: 'btn', onclick: () => { let tr = selTrack(); if (!tr || tr.kind !== 'audio') { tr = song.tracks.find(t => t.kind === 'audio') || addTrack('audio'); Sel.track = tr.id; renderHeads(); } Mic.start(); } }, ...[iconEl('mic'), 'Record with microphone'])),
    h('div', { class: 'note', style: { marginBottom: '8px' } }, 'Import sound effects, music or videos (their sound is used). Add a sound to the song, cut it in the Audio editor, or play it as an instrument.'), list);
  pb.append(sc);
  renderSounds = () => {
    if (!document.body.contains(list)) return;
    list.innerHTML = '';
    const all = Sounds.list();
    if (!all.length) list.append(h('div', { class: 'note' }, 'No sounds yet.'));
    for (const s of all) {
      const cv = h('canvas', { width: 220, height: 68 }); drawThumb(cv, s);
      const it = h('div', { class: 'si' }, cv, h('div', { class: 'inf' }, h('b', null, s.name), h('small', null, fmtDur(s.dur) + (s.dur < 10 ? '.' + String(Math.floor(s.dur * 10) % 10) : '') + ' · ' + s.buf.numberOfChannels + ' ch')),
        tbtn('play', 'Listen', () => previewSound(s)),
        tbtn('plus', 'Add to the song at the playhead', () => addSoundToSong(s)),
        tbtn('keys', 'Play it as an instrument', () => soundAsInstrument(s)),
        tbtn('menu', 'More', e => menu(e.currentTarget, [
          { l: 'Rename…', f: async () => { const v = await promptBox('Sound name', s.name); if (v) { s.name = v.trim(); await Sounds.save(s); renderSounds(); drawTimeline(); } } },
          { l: 'Delete', f: async () => { const used = song.clips.some(c => c.sid === s.id); if (!(await confirmBox(used ? 'This sound is used in the song. Delete it and its clips?' : 'Delete this sound?', 'Delete'))) return; song.clips = song.clips.filter(c => c.sid !== s.id); await Sounds.remove(s.id); commit(); drawAll(); renderSounds(); } }
        ])));
      list.append(it);
    }
  };
  renderSounds();
}
function drawThumb(cv, s) { const g = cv.getContext('2d'), W = cv.width, H = cv.height, pk = s.peaks; g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H); g.fillStyle = '#3fd6c0'; const n = pk.mx.length; for (let x = 0; x < W; x++) { const a = Math.floor(x / W * n), b = Math.max(a + 1, Math.floor((x + 1) / W * n)); let mx = 0, mn = 0; for (let k = a; k < b; k++) { mx = Math.max(mx, pk.mx[k]); mn = Math.min(mn, pk.mn[k]); } g.fillRect(x, H / 2 - mx * H / 2, 1, Math.max(1, (mx - mn) * H / 2)); } }
async function importFiles(files) {
  ensureAudio();
  let last = null, n = 0;
  for (const f of files) {
    toast('Reading ' + f.name + '…', 8000);
    try { const buf = await decodeFile(f); const s = Sounds.fromBuffer(buf, f.name.replace(/\.[^.]+$/, '')); await Sounds.save(s); last = s; n++; }
    catch (e) { msgBox('Could not read the file', f.name + ' has no sound this browser can read.'); }
  }
  if (n) toast(n === 1 ? 'Added ' + last.name : 'Added ' + n + ' sounds');
  if (renderSounds) renderSounds();
  if (Ed.tab === 'inst') renderPanel();
  return last;
}
function addSoundToSong(s) {
  let tr = selTrack(); if (!tr || tr.kind !== 'audio') { tr = song.tracks.find(t => t.kind === 'audio') || null; if (!tr) { tr = newTrack('audio'); song.tracks.push(tr); if (AC) strip(AC, tr); } }
  const c = { id: uid(), tr: tr.id, start: snapB(beatNow(), Ed.arrSnap === -1 ? 1 : Ed.arrSnap), sid: s.id, off: 0, dur: s.dur, gain: 1 };
  song.clips.push(c); Sel.track = tr.id; Sel.clip = c.id; commit(); drawAll(); toast('Added to ' + tr.name);
}
function soundAsInstrument(s) {
  const id = 'user:' + s.id;
  let tr = selTrack();
  if (!tr || tr.kind === 'audio') { tr = newTrack('inst', id, s.name); song.tracks.push(tr); if (AC) strip(AC, tr); }
  else { tr.preset = id; tr.kind = 'inst'; tr.name = s.name; }
  Sel.track = tr.id; commit(); drawAll(); setTab('edit');
  if (!selClip()) { Ed.kbd = true; renderPanel(); }
  toast('Middle C plays the sound as it is; other keys change its pitch');
}

/* ---------- audio clip editor (cut, trim, fades) ---------- */
const AE = { v0: 0, v1: 0, a: null, b: null, cid: null };
function audioEditor(pb, c) {
  const s = Sounds.get(c.sid);
  if (!s) { pb.append(h('div', { class: 'empty' }, 'The sound for this clip is missing.')); return; }
  if (AE.cid !== c.id) { AE.cid = c.id; AE.v0 = 0; AE.v1 = s.dur; AE.a = AE.b = null; }
  const ed = h('div', { class: 'ed' });
  const hasSel = () => AE.a != null && AE.b != null && AE.b - AE.a > 0.005;
  const rate = () => Math.pow(2, (c.pitch || 0) / 12);
  const secToBeats = sec => sec / rate() * song.bpm / 60;
  const tools = h('div', { class: 'tools' },
    tbtn('play', 'Listen (the picked part, or the clip)', () => { if (hasSel()) previewSound(s, AE.a, AE.b - AE.a); else previewSound(s, c.off, c.dur); }, 'Listen'),
    tbtn('cut', 'Cut out the picked part (the rest closes up)', () => {
      if (!hasSel()) { toast('Drag across the wave to pick a part'); return; }
      const a = clamp(AE.a, c.off, c.off + c.dur), b = clamp(AE.b, c.off, c.off + c.dur); if (b - a < 0.005) { toast('Pick a part inside the clip (the bright area)'); return; }
      const tail = c.off + c.dur - b;
      if (tail > 0.005) { const c2 = Object.assign({}, c, { id: uid(), start: c.start + secToBeats(a - c.off), off: b, dur: tail, fin: 0 }); song.clips.push(c2); }
      c.dur = a - c.off; c.fout = 0;
      if (c.dur < 0.005) { song.clips = song.clips.filter(x => x !== c); Sel.clip = null; }
      AE.a = AE.b = null; commit(); drawAll(); renderPanel();
    }, 'Cut out'),
    tbtn('sel', 'Keep only the picked part', () => {
      if (!hasSel()) { toast('Drag across the wave to pick a part'); return; }
      const a = Math.max(0, AE.a), b = Math.min(s.dur, AE.b);
      c.start = Math.max(0, c.start + secToBeats(a - c.off)); c.off = a; c.dur = b - a; c.fin = Math.min(c.fin || 0, c.dur / 2); c.fout = Math.min(c.fout || 0, c.dur / 2);
      AE.a = AE.b = null; commit(); drawAll(); renderPanel();
    }, 'Keep'),
    tbtn('wave', 'Save the picked part as a new sound', async () => {
      if (!hasSel()) { toast('Drag across the wave to pick a part'); return; }
      const sr = s.buf.sampleRate, i0 = Math.floor(AE.a * sr), i1 = Math.floor(AE.b * sr), nb = new AudioBuffer({ numberOfChannels: s.buf.numberOfChannels, length: Math.max(1, i1 - i0), sampleRate: sr });
      for (let ch = 0; ch < nb.numberOfChannels; ch++) nb.copyToChannel(s.buf.getChannelData(ch).subarray(i0, i1), ch);
      const ns = Sounds.fromBuffer(nb, s.name + ' part'); await Sounds.save(ns); toast('Saved "' + ns.name + '" in Sounds');
    }, 'New sound'),
    h('span', { class: 'sep' }),
    tbtn('cut', 'Split at the playhead', splitClip, 'Split'),
    tbtn('reverse', 'Play backwards', () => { c.rev = !c.rev; commit(); drawAll(); renderPanel(); }, c.rev ? 'Forwards' : 'Reverse'),
    tbtn('up', 'Make it as loud as it can be without clipping', () => { const sr = s.buf.sampleRate; let pk = 1e-6; for (let ch = 0; ch < s.buf.numberOfChannels; ch++) { const d = s.buf.getChannelData(ch); for (let i = Math.floor(c.off * sr); i < Math.min(d.length, (c.off + c.dur) * sr); i++) pk = Math.max(pk, Math.abs(d[i])); } c.gain = Math.min(16, 0.97 / pk); commit(); drawAll(); renderPanel(); }, 'Normalize'),
    tbtn('keys', 'Play it as an instrument', () => soundAsInstrument(s), 'Instrument'),
    h('span', { class: 'sep' }),
    tbtn('zout', 'Zoom out', () => zoom(1.6)), tbtn('zin', 'Zoom in', () => zoom(1 / 1.6)), h('button', { class: 'tb', onclick: () => { AE.v0 = 0; AE.v1 = s.dur; draw(); } }, 'Fit'));
  const gdb = 20 * Math.log10(Math.max(1e-3, c.gain != null ? c.gain : 1));
  const ctl = h('div', { class: 'cols actl', style: { padding: '6px 10px', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', flex: 'none' } },
    rangeRow('Volume', { value: Math.round(gdb * 10) / 10, min: -30, max: 24, step: 0.5, suf: 'dB', onInput: (v, f) => { c.gain = Math.pow(10, v / 20); drawTimeline(); if (f) commit(); } }),
    rangeRow('Pitch', { value: c.pitch || 0, min: -12, max: 12, step: 1, suf: 'st', onInput: (v, f) => { c.pitch = v; drawTimeline(); draw(); if (f) commit(); } }),
    rangeRow('Fade in', { value: c.fin || 0, min: 0, max: Math.min(10, c.dur), step: 0.01, suf: 's', onInput: (v, f) => { c.fin = v; draw(); if (f) commit(); } }),
    rangeRow('Fade out', { value: c.fout || 0, min: 0, max: Math.min(10, c.dur), step: 0.01, suf: 's', onInput: (v, f) => { c.fout = v; draw(); if (f) commit(); } }));
  const cvw = h('div', { class: 'cv' }), cv = h('canvas'); cvw.append(cv);
  ed.append(tools, ctl, cvw); pb.append(ed);
  const g = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const ro = new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); const r = cvw.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); draw(); }); ro.observe(cvw);
  const sx = t => (t - AE.v0) / (AE.v1 - AE.v0) * W, st = x => AE.v0 + x / W * (AE.v1 - AE.v0);
  function zoom(f, cx = W / 2) { const t = st(cx), span = clamp((AE.v1 - AE.v0) * f, 0.02, s.dur); AE.v0 = clamp(t - (cx / W) * span, 0, s.dur - span); AE.v1 = AE.v0 + span; draw(); }
  function draw() {
    if (!document.body.contains(cv)) { ro.disconnect(); return; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
    const pk = s.peaks, sr = s.buf.sampleRate, top = 18, hh = H - top - 4, mid = top + hh / 2;
    const x1 = sx(c.off), x2 = sx(c.off + c.dur);
    g.fillStyle = '#14302c'; g.fillRect(x1, top, x2 - x1, hh);
    const gain = c.gain != null ? c.gain : 1;
    for (let x = 0; x < W; x++) {
      const t0 = st(x), t1 = st(x + 1), k0 = Math.floor(t0 * sr / pk.per), k1 = Math.max(k0 + 1, Math.ceil(t1 * sr / pk.per));
      let mx = 0, mn = 0; for (let k = Math.max(0, k0); k < Math.min(pk.mx.length, k1); k++) { if (pk.mx[k] > mx) mx = pk.mx[k]; if (pk.mn[k] < mn) mn = pk.mn[k]; }
      const inC = t0 >= c.off && t0 <= c.off + c.dur; let fg = 1;
      if (inC) { const rel = t0 - c.off; if (c.fin) fg = Math.min(fg, rel / c.fin); if (c.fout) fg = Math.min(fg, (c.dur - rel) / c.fout); }
      const gg = inC ? gain * clamp(fg, 0, 1) : 1;
      g.fillStyle = inC ? '#3fd6c0' : '#3a3d44';
      const a = Math.min(1, mx * gg), b = Math.max(-1, mn * gg);
      g.fillRect(x, mid - a * hh / 2, 1, Math.max(1, (a - b) * hh / 2));
    }
    // fades
    g.strokeStyle = '#ffd25a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x1, top + hh); g.lineTo(sx(c.off + (c.fin || 0)), top); g.lineTo(sx(c.off + c.dur - (c.fout || 0)), top); g.lineTo(x2, top + hh); g.stroke();
    // selection
    if (hasSel()) { const a = sx(AE.a), b = sx(AE.b); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(a, top, b - a, hh); g.fillStyle = '#fff'; g.fillRect(a, top, 1, hh); g.fillRect(b, top, 1, hh); }
    // handles
    g.fillStyle = '#ffffff'; for (const x of [x1, x2]) { g.fillRect(x - 1, top, 2, hh); g.fillRect(x - 6, mid - 14, 12, 28); }
    // ruler
    g.fillStyle = '#16171a'; g.fillRect(0, 0, W, top); g.fillStyle = '#8d919a'; g.font = '10px system-ui,sans-serif'; g.textBaseline = 'middle';
    const span = AE.v1 - AE.v0, steps = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60], stp = steps.find(x => span / x < W / 70) || 120;
    for (let t = Math.ceil(AE.v0 / stp) * stp; t <= AE.v1; t += stp) { const x = sx(t); g.fillRect(x, 10, 1, 8); g.fillText(t >= 60 ? fmtDur(t) : (Math.round(t * 100) / 100) + 's', x + 3, 7); }
    g.fillStyle = '#62666e'; g.fillText('Drag the white handles to trim. Drag across the wave to pick a part.', 8, H - 10);
  }
  redrawEditor = draw; resizeEditor = draw;
  // input
  let act = null; const ptrs = new Map();
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), x = e.clientX - r.left; ptrs.set(e.pointerId, x);
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; act = { kind: 'pinch', d0: Math.abs(p1 - p2) || 1, v0: AE.v0, v1: AE.v1, t: st((p1 + p2) / 2) }; return; }
    const x1 = sx(c.off), x2 = sx(c.off + c.dur);
    if (Math.abs(x - x1) < 16) act = { kind: 'h1', c0: { ...c } };
    else if (Math.abs(x - x2) < 16) act = { kind: 'h2', c0: { ...c } };
    else { act = { kind: 'sel', t0: clamp(st(x), 0, s.dur) }; AE.a = AE.b = null; draw(); }
  });
  cv.addEventListener('pointermove', e => {
    if (!act || !ptrs.has(e.pointerId)) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left; ptrs.set(e.pointerId, x);
    if (act.kind === 'pinch') { if (ptrs.size < 2) return; const [p1, p2] = [...ptrs.values()]; const span = clamp((act.v1 - act.v0) * act.d0 / (Math.abs(p1 - p2) || 1), 0.02, s.dur), cx = (p1 + p2) / 2; AE.v0 = clamp(act.t - cx / W * span, 0, s.dur - span); AE.v1 = AE.v0 + span; draw(); return; }
    const t = clamp(st(x), 0, s.dur);
    if (act.kind === 'h1') { const end = act.c0.off + act.c0.dur, no = clamp(t, 0, end - 0.01); c.start = Math.max(0, act.c0.start + secToBeats(no - act.c0.off)); c.off = no; c.dur = end - no; draw(); drawTimeline(); }
    else if (act.kind === 'h2') { c.dur = clamp(t - c.off, 0.01, s.dur - c.off); draw(); drawTimeline(); }
    else { AE.a = Math.min(act.t0, t); AE.b = Math.max(act.t0, t); draw(); }
  });
  const end = e => { ptrs.delete(e.pointerId); if (!act) return; if (act.kind === 'h1' || act.kind === 'h2') commit(); if (act.kind === 'pinch' && ptrs.size) return; act = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoom(Math.exp(e.deltaY * 0.003), e.clientX - r.left); else { const span = AE.v1 - AE.v0; AE.v0 = clamp(AE.v0 + e.deltaX / W * span, 0, s.dur - span); AE.v1 = AE.v0 + span; draw(); } }, { passive: false });
}
function iconEl(n) { const d = document.createElement('span'); d.innerHTML = icon(n); return d.firstChild; }
