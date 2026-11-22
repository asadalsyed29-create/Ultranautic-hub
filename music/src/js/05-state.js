/* ================= song, sounds library, saving, undo ================= */
const TRACK_COLORS = ['#3fd6c0', '#e0a43a', '#6c8cff', '#e0627a', '#8bd14f', '#b77ce8', '#4fb6e0', '#e07d4f', '#d4cf5a', '#5fd18e', '#e05fb8', '#9aa3b5'];
const defFx = () => ({ drive: 0, chorus: 0, trem: 0, low: 0, mid: 0, high: 0, lowcut: 0, highcut: 0, comp: 0, rev: 0.12, delay: 0 });
function newTrack(kind, preset, name) {
  const n = song ? song.tracks.length : 0;
  const pr = preset ? getPreset(preset) : null;
  const tr = { id: uid(), kind, name: name || (kind === 'audio' ? 'Audio ' + (n + 1) : pr ? pr.name : 'Track'), preset: preset || null, color: TRACK_COLORS[n % TRACK_COLORS.length], vol: 0.8, pan: 0, mute: false, solo: false, oct: 0, att: 0, relx: 1, swing: 0, fx: defFx() };
  if (pr && pr.tfx) Object.assign(tr.fx, pr.tfx);
  return tr;
}
function newSong() {
  const s = { v: 1, id: uid(), name: 'My song', bpm: 120, sig: 4, key: 0, scale: 'none', master: 0.85, fx: { revType: 'hall', revLvl: 1, delTime: '1/8.', delFb: 0.35, glue: true }, loop: { on: false, a: 0, b: 16 }, metro: false, tracks: [], clips: [], updated: Date.now() };
  return s;
}
let song = null;
const clipLen = c => c.sid ? c.dur * song.bpm / 60 / Math.pow(2, (c.pitch || 0) / 12) : c.len;
const trackOf = c => song.tracks.find(t => t.id === c.tr);
const songEnd = () => song.clips.reduce((m, c) => Math.max(m, c.start + clipLen(c)), 0);

/* ---------- IndexedDB ---------- */
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('nautic-music', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('songs', { keyPath: 'id' }); d.createObjectStore('sounds', { keyPath: 'id' }); d.createObjectStore('meta'); };
      r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error);
    });
  },
  async tx(store, mode, fn) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  put(store, v, k) { return this.tx(store, 'readwrite', s => s.put(v, k)); },
  get(store, k) { return this.tx(store, 'readonly', s => s.get(k)); },
  del(store, k) { return this.tx(store, 'readwrite', s => s.delete(k)); },
  all(store) { return this.tx(store, 'readonly', s => s.getAll()); }
};

/* ---------- sounds you import or record ---------- */
const Sounds = {
  map: new Map(),
  get(id) { return this.map.get(id); },
  list() { return [...this.map.values()].sort((a, b) => b.added - a.added); },
  fromBuffer(buf, name, id) {
    const s = { id: id || uid(), name, added: Date.now(), buf, dur: buf.duration };
    s.peaks = peaksOf(buf);
    this.map.set(s.id, s); return s;
  },
  async save(s) { const chans = []; for (let c = 0; c < s.buf.numberOfChannels; c++) chans.push(s.buf.getChannelData(c).slice()); await DB.put('sounds', { id: s.id, name: s.name, added: s.added, sr: s.buf.sampleRate, chans }); },
  async loadAll() {
    try {
      const all = await DB.all('sounds');
      for (const r of all) { if (this.map.has(r.id)) continue; const b = new AudioBuffer({ numberOfChannels: r.chans.length, length: r.chans[0].length, sampleRate: r.sr }); r.chans.forEach((c, i) => b.copyToChannel(c, i)); const s = this.fromBuffer(b, r.name, r.id); s.added = r.added; }
    } catch (e) { }
  },
  async remove(id) { this.map.delete(id); try { await DB.del('sounds', id); } catch (e) { } }
};
function peaksOf(buf, per = 256) {
  const n = Math.ceil(buf.length / per), mx = new Float32Array(n), mn = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) { let a = mx[i], b = mn[i]; const e = Math.min(d.length, (i + 1) * per); for (let j = i * per; j < e; j++) { const v = d[j]; if (v > a) a = v; if (v < b) b = v; } mx[i] = a; mn[i] = b; } }
  return { per, mx, mn };
}
async function decodeFile(file) {
  const ab = await file.arrayBuffer();
  const ctx = AC || new (window.AudioContext || window.webkitAudioContext)();
  return await new Promise((res, rej) => ctx.decodeAudioData(ab.slice(0), res, rej));
}

/* ---------- undo / redo / autosave ---------- */
const Hist = { past: [], future: [], cur: null };
function snap() { return JSON.stringify(song); }
function resetHistory() { Hist.past = []; Hist.future = []; Hist.cur = snap(); updUndo(); }
// call after every finished change
function commit(label) {
  const s = snap(); if (s === Hist.cur) return;
  Hist.past.push(Hist.cur); if (Hist.past.length > 100) Hist.past.shift();
  Hist.future = []; Hist.cur = s; song.updated = Date.now(); updUndo(); scheduleSave();
}
function undo() { if (!Hist.past.length) return; Hist.future.push(Hist.cur); Hist.cur = Hist.past.pop(); restoreSong(JSON.parse(Hist.cur)); }
function redo() { if (!Hist.future.length) return; Hist.past.push(Hist.cur); Hist.cur = Hist.future.pop(); restoreSong(JSON.parse(Hist.cur)); }
function restoreSong(s) { const keepSel = Sel.clip; song = s; if (!song.clips.find(c => c.id === keepSel)) Sel.clip = null; if (!song.tracks.find(t => t.id === Sel.track)) Sel.track = song.tracks[0] && song.tracks[0].id; afterSongChange(); updUndo(); scheduleSave(); }
let saveT = null;
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(saveNow, 600); }
async function saveNow() { try { song.updated = Date.now(); await DB.put('songs', JSON.parse(JSON.stringify(song))); await DB.put('meta', song.id, 'last'); } catch (e) { } }
function updUndo() { const u = $('#bUndo'), r = $('#bRedo'); if (u) u.disabled = !Hist.past.length; if (r) r.disabled = !Hist.future.length; }

/* ---------- selection ---------- */
const Sel = { track: null, clip: null, notes: new Set() };
const selClip = () => song.clips.find(c => c.id === Sel.clip);
const selTrack = () => song.tracks.find(t => t.id === Sel.track);
