/* ================= playback: scheduler, live playing, recording ================= */
function ensureAudio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    makeBus(AC, song);
    for (const t of song.tracks) strip(AC, t);
    Render.start();
  }
  if (AC.state !== 'running') AC.resume();
  return AC;
}
const T = { playing: false, t0: 0, b0: 0, sched: 0, voices: [], timer: null, pos: 0, rec: false, recNotes: new Map(), mono: new Map() };
const spb = () => 60 / song.bpm;
function beatNow() { if (!T.playing) return T.pos; let b = T.b0 + (AC.currentTime - T.t0) / spb(); if (song.loop.on && song.loop.b > song.loop.a && b >= song.loop.b) b = song.loop.a + ((b - song.loop.a) % (song.loop.b - song.loop.a)); return b; }
function play() {
  ensureAudio();
  if (T.playing) return;
  preloadSong();
  T.playing = true; T.t0 = AC.currentTime + 0.06; T.b0 = T.pos; T.sched = T.pos; T.wrapT0 = T.t0;
  if (song.loop.on && (T.pos < song.loop.a || T.pos >= song.loop.b)) { T.b0 = T.sched = T.pos = song.loop.a; }
  T.started = new Set();
  startAudioClips(T.b0, T.t0);
  T.timer = setInterval(tick, 25); tick();
  updTransport();
}
function stop(toStart) {
  if (T.playing) { T.pos = beatNow(); T.playing = false; clearInterval(T.timer); const t = AC.currentTime; for (const v of T.voices) { try { v.stop(t); if (v.src && v.audio) v.src.stop(t + 0.03); } catch (e) { } } T.voices = []; T.mono.clear(); if (Mic.on) Mic.stop(); }
  else if (toStart !== false) T.pos = song.loop.on ? song.loop.a : 0;
  flushRec(); updTransport(); drawAll();
}
function toggle() { T.playing ? stop(false) : play(); }
function seek(b) { b = Math.max(0, b); const was = T.playing; if (was) { stop(false); } T.pos = b; if (was) play(); else drawAll(); }
// beat -> context time while playing (accounts for loop wraps already scheduled)
function tick() {
  const horizon = AC.currentTime + 0.18, sp = spb();
  let endB = T.b0 + (horizon - T.t0) / sp;
  while (T.sched < endB) {
    let a = T.sched, b = endB;
    if (song.loop.on && song.loop.b > song.loop.a && b >= song.loop.b) {
      b = song.loop.b;
      schedRange(a, b);
      // wrap: continue from loop start
      const tWrap = T.t0 + (song.loop.b - T.b0) * sp;
      T.t0 = tWrap; T.b0 = song.loop.a; T.sched = song.loop.a; T.started = new Set();
      startAudioClips(song.loop.a, tWrap, true);
      endB = T.b0 + (horizon - T.t0) / sp;
      continue;
    }
    schedRange(a, b); T.sched = b;
  }
  T.voices = T.voices.filter(v => v.end > AC.currentTime - 0.1);
  if (!song.loop.on && T.sched > songEnd() + 8 && !T.rec && !Mic.on) { /* keep running; user stops */ }
}
const b2t = b => T.t0 + (b - T.b0) * spb();
function schedRange(a, b) {
  const solo = song.tracks.some(t => t.solo);
  for (const c of song.clips) {
    if (c.sid) continue;
    const tr = trackOf(c); if (!tr || tr.mute || (solo && !tr.solo)) continue;
    const cs = c.start, ce = c.start + c.len; if (ce <= a || cs >= b) continue;
    const pr = getPreset(tr.preset), dest = strip(AC, tr).input;
    for (const n of c.notes) {
      if (n.t >= c.len) continue;
      let nb = cs + n.t;
      if (tr.swing && Math.abs((n.t * 4) % 2 - 1) < 0.01) nb += tr.swing * 0.25 * 0.66;
      if (nb < a || nb >= b) continue;
      const dur = Math.min(n.d, c.len - n.t) * spb();
      fire(tr, pr, n.m + (pr.e === 'drum' ? 0 : tr.oct * 12), n.v, b2t(nb), dur, dest);
    }
  }
}
function fire(tr, pr, m, v, when, dur, dest, live) {
  const ent = soundFor(pr, m, true);
  const opt = { bpm: song.bpm, lastMidi: tr._last };
  tr._last = m;
  const go = (e, w) => {
    const pr2 = trAdj(tr, pr);
    if (pr.mono) { const pv = T.mono.get(tr.id); if (pv) pv.stop(w); }
    const vc = playNote(AC, dest, pr2, m, v, w, dur, e, opt);
    if (vc) { T.voices.push(vc); if (pr.mono) T.mono.set(tr.id, vc); }
    return vc;
  };
  if (ent && ent.then) { // not rendered yet: play as soon as it is (only if not too late)
    let vc = null, stopped = null;
    const proxy = { end: Infinity, stop(t) { stopped = t; if (vc) vc.stop(t); } };
    ent.then(e => { const now = AC.currentTime; if (!live && now > when + 0.12) return; vc = go(e, Math.max(when, now + 0.005)); if (stopped != null && vc) vc.stop(Math.max(stopped, now + 0.01)); });
    return proxy;
  }
  return go(ent, when);
}
// track-level sound adjustments (attack, release)
function trAdj(tr, pr) { if (!tr.att && (tr.relx || 1) === 1) return pr; const o = Object.assign({}, pr); o.a = Math.max(pr.a || 0.002, tr.att || 0); o.rel = (pr.rel || 0.2) * (tr.relx || 1); if (pr.e === 'syn') { o.p = Object.assign({}, pr.p); const a = (pr.p.a || [0.005, 0.3, 0.8, 0.3]).slice(); a[0] = Math.max(a[0], tr.att || 0); a[3] *= tr.relx || 1; o.p.a = a; } return o; }
function startAudioClips(fromB, atT, wrapped) {
  const solo = song.tracks.some(t => t.solo);
  for (const c of song.clips) {
    if (!c.sid) continue;
    const tr = trackOf(c); if (!tr || tr.mute || (solo && !tr.solo)) continue;
    const s = Sounds.get(c.sid); if (!s) continue;
    const L = clipLen(c), ce = c.start + L;
    const loopEnd = song.loop.on ? song.loop.b : Infinity;
    if (ce <= fromB) continue;
    if (c.start >= loopEnd) continue;
    playAudioClip(c, tr, s, fromB, atT, loopEnd);
  }
}
function playAudioClip(c, tr, s, fromB, atT, loopEnd, ctx = AC, destOverride) {
  const sp = 60 / song.bpm, rate = Math.pow(2, (c.pitch || 0) / 12);
  const startB = Math.max(c.start, fromB), when = atT + (startB - fromB) * sp;
  const intoSec = (startB - c.start) * sp * rate;
  const L = clipLen(c), endB = Math.min(c.start + L, loopEnd), playSec = (endB - startB) * sp;
  if (playSec <= 0.001) return;
  const src = ctx.createBufferSource(); src.buffer = c.rev ? reversedBuf(s) : s.buf; src.playbackRate.value = rate;
  const g = ctx.createGain(); src.connect(g).connect(destOverride || strip(ctx, tr).input);
  const gain = (c.gain != null ? c.gain : 1), fi = c.fin || 0, fo = c.fout || 0;
  const off = c.rev ? s.dur - (c.off + c.dur) + intoSec : c.off + intoSec;
  // fades in song time
  const tIn = (startB - c.start) * sp, total = L * sp;
  const gAt = t => gain * (fi > 0 ? Math.min(1, t / fi) : 1) * (fo > 0 ? Math.min(1, (total - t) / fo) : 1);
  g.gain.setValueAtTime(gAt(tIn), when);
  if (fi > tIn) g.gain.linearRampToValueAtTime(gain, when + (fi - tIn));
  if (fo > 0) { const st = Math.max(tIn, total - fo); g.gain.setValueAtTime(gAt(st), when + (st - tIn)); g.gain.linearRampToValueAtTime(0, when + (total - tIn)); }
  src.start(when, Math.max(0, off), playSec * rate + 0.001);
  const v = { src, audio: 1, end: when + playSec + 0.05, stop(t) { try { src.stop(t); } catch (e) { } } };
  if (ctx === AC) T.voices.push(v);
  return v;
}
const REV = new WeakMap();
function reversedBuf(s) { let r = REV.get(s.buf); if (r) return r; r = new AudioBuffer({ numberOfChannels: s.buf.numberOfChannels, length: s.buf.length, sampleRate: s.buf.sampleRate }); for (let c = 0; c < r.numberOfChannels; c++) { const d = s.buf.getChannelData(c).slice().reverse(); r.copyToChannel(d, c); } REV.set(s.buf, r); return r; }
function preloadSong() {
  for (const tr of song.tracks) {
    if (tr.kind === 'audio') continue;
    const pr = getPreset(tr.preset), ms = new Set();
    for (const c of song.clips) if (c.tr === tr.id && c.notes) for (const n of c.notes) ms.add(n.m + (pr.e === 'drum' ? 0 : tr.oct * 12));
    preload(pr, ms);
  }
}

/* ---------- live playing (screen keys, computer keys, MIDI) ---------- */
const Live = new Map(); // key -> voice
function liveOn(m, v = 0.8, key) {
  const tr = selTrack(); if (!tr || tr.kind === 'audio') return;
  ensureAudio();
  const pr = getPreset(tr.preset), mm = m + (pr.e === 'drum' ? 0 : tr.oct * 12);
  const k = key || m; if (Live.has(k)) liveOff(k);
  const vc = fire(tr, pr, mm, v, AC.currentTime + 0.005, pr.e === 'drum' ? null : null, strip(AC, tr).input, true);
  Live.set(k, { vc: pr.e === 'drum' ? null : vc, m });
  if (T.rec && T.playing) T.recNotes.set(k, { m, v, b: beatNow() });
  if (typeof onLiveNote === 'function') onLiveNote(m, true);
}
function liveOff(key) {
  const lv = Live.get(key); Live.delete(key);
  if (lv && lv.vc) lv.vc.stop(AC.currentTime + 0.005);
  const r = T.recNotes.get(key);
  if (r) { T.recNotes.delete(key); addRecorded(r, beatNow()); }
  if (lv && typeof onLiveNote === 'function') onLiveNote(lv.m, false);
}
// audition a note (preview), short
function audition(tr, m, v = 0.8, dur = 0.5) { ensureAudio(); const pr = getPreset(tr.preset); fire(tr, pr, m + (pr.e === 'drum' ? 0 : tr.oct * 12), v, AC.currentTime + 0.01, pr.e === 'drum' ? null : dur, strip(AC, tr).input, true); }
let recClip = null;
function addRecorded(r, endB) {
  const tr = selTrack(); if (!tr) return;
  let start = r.b, end = endB < start ? song.loop.b : endB;
  const q = Ed.snap || 0.25; start = Math.round(start / q) * q;
  let c = song.clips.find(c => c.tr === tr.id && !c.sid && start >= c.start && start < c.start + c.len);
  if (!c) { const bar = song.sig, cs = Math.floor(start / bar) * bar; c = { id: uid(), tr: tr.id, start: cs, len: bar * 2, notes: [] }; song.clips.push(c); }
  const t = start - c.start, d = Math.max(q, Math.round((end - r.b) / q) * q || q);
  if (t + d > c.len) c.len = Math.ceil((t + d) / song.sig) * song.sig;
  c.notes.push({ t, d, m: r.m, v: r.v });
  recClip = c; Sel.clip = c.id;
  drawAll();
}
function flushRec() { for (const [k] of [...T.recNotes]) liveOff(k); if (recClip) { recClip = null; commit('record'); } T.rec = false; updTransport(); }

/* ---------- MIDI keyboards ---------- */
function initMidi() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then(acc => {
    const hook = () => acc.inputs.forEach(i => i.onmidimessage = e => { const [st, d1, d2] = e.data, c = st & 0xf0; if (c === 0x90 && d2 > 0) liveOn(d1, d2 / 127, 'midi' + d1); else if (c === 0x80 || (c === 0x90 && d2 === 0)) liveOff('midi' + d1); });
    hook(); acc.onstatechange = hook;
  }).catch(() => { });
}

/* ---------- microphone recording ---------- */
const Mic = {
  on: false, rec: null, stream: null, chunks: [], startB: 0, tr: null,
  async start() {
    const tr = selTrack(); if (!tr || tr.kind !== 'audio') return;
    ensureAudio();
    try { this.stream = this.stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { msgBox('Microphone', 'The microphone could not be opened. Allow microphone access for this page and try again.'); return; }
    this.chunks = []; this.tr = tr;
    const mr = new MediaRecorder(this.stream); this.rec = mr;
    mr.ondataavailable = e => this.chunks.push(e.data);
    mr.onstop = () => this.finish();
    this.on = true; T.rec = true;
    if (!T.playing) play();
    this.startB = beatNow(); this.lat = (AC.outputLatency || 0.02) + (AC.baseLatency || 0);
    mr.start();
    updTransport();
  },
  stop() { if (!this.on) return; this.on = false; try { this.rec.stop(); } catch (e) { } },
  async finish() {
    const blob = new Blob(this.chunks, { type: this.rec.mimeType });
    try {
      const ab = await blob.arrayBuffer(); const buf = await new Promise((res, rej) => AC.decodeAudioData(ab, res, rej));
      const s = Sounds.fromBuffer(buf, 'Recording ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); await Sounds.save(s);
      const off = Math.min(buf.duration - 0.01, this.lat);
      song.clips.push({ id: uid(), tr: this.tr.id, start: this.startB, sid: s.id, off, dur: buf.duration - off, gain: 1 });
      commit('record'); drawAll(); renderSounds && renderSounds();
    } catch (e) { msgBox('Recording', 'The recording could not be read.'); }
    T.rec = false; updTransport();
  }
};
