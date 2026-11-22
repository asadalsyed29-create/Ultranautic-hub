/* ================= audio engine: workers, sound cache, voices, mixer ================= */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = m => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
let AC = null; // live AudioContext
const BUS = new WeakMap(); // ctx -> bus

/* ---------- background render workers ---------- */
const Render = {
  workers: [], queue: [], busy: new Map(), seq: 1, cache: new Map(), pending: new Map(), samples: 0,
  start() {
    if (this.workers.length) return;
    const src = '(' + DSP_WORKER.toString() + ')()';
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const n = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new Worker(url); w.idle = true;
      w.onmessage = e => { const job = this.busy.get(e.data.id); this.busy.delete(e.data.id); w.idle = true; if (job) job.done(e.data); this.pump(); };
      this.workers.push(w);
    }
  },
  pump() {
    for (const w of this.workers) {
      if (!w.idle || !this.queue.length) continue;
      const job = this.queue.shift(); w.idle = false; this.busy.set(job.id, job);
      w.postMessage({ id: job.id, kind: job.kind, p: job.p, m: job.m, sr: job.sr });
    }
  },
  job(kind, p, m, sr, front) {
    this.start();
    return new Promise(res => { const j = { id: this.seq++, kind, p, m, sr, done: res }; front ? this.queue.unshift(j) : this.queue.push(j); this.pump(); });
  },
  // a rendered note (or drum piece) as an AudioBuffer; returns the cached entry or a promise
  get(pr, key, kind, p, m, front) {
    const k = pr.id + '|' + key;
    const c = this.cache.get(k); if (c) { c.used = performance.now(); return c; }
    if (this.pending.has(k)) return this.pending.get(k);
    const sr = (AC && AC.sampleRate) || 48000;
    const pr2 = this.job(kind, p, m, sr, front).then(d => {
      const ch = d.ch, buf = new AudioBuffer({ numberOfChannels: ch.length, length: Math.max(1, ch[0].length), sampleRate: sr });
      ch.forEach((x, i) => buf.copyToChannel(x, i));
      const ent = { buf, loopStart: d.loopStart, loopEnd: d.loopEnd, used: performance.now() };
      this.cache.set(k, ent); this.pending.delete(k); this.samples += buf.length * buf.numberOfChannels; this.trim();
      return ent;
    });
    this.pending.set(k, pr2); return pr2;
  },
  trim() {
    if (this.samples < 24e6) return;
    const ents = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k, e] of ents) { if (this.samples < 16e6) break; this.cache.delete(k); this.samples -= e.buf.length * e.buf.numberOfChannels; }
  }
};
const RENDERED = { piano: 'piano', ep: 'ep', ks: 'ks', modal: 'modal', sus: 'sus' };
function zoneOf(pr, m) { const zs = pr.zs || 4; return Math.max(12, Math.min(112, 21 + Math.round((m - 21) / zs) * zs)); }
function getPreset(id) {
  if (PRESETS[id]) return PRESETS[id];
  if (id && id.startsWith('user:')) { const s = Sounds.get(id.slice(5)); return { id, e: 'user', name: s ? s.name : 'Missing sound', fam: 'user', sid: id.slice(5), rel: 0.15, vf: 0, gain: 1, root: 60 }; }
  return PRESETS['piano.0'];
}
// returns entry, a promise, or null (live engines)
function soundFor(pr, m, front) {
  if (pr.e === 'drum') { const row = DRUM_NOTES.indexOf(m); const r = row < 0 ? 0 : row; return Render.get(pr, 'd' + r, 'drum', pr.p.kit[r], 60, front); }
  if (pr.e === 'user') { const s = Sounds.get(pr.sid); return s && s.buf ? { buf: s.buf, user: 1 } : null; }
  const kind = RENDERED[pr.e]; if (!kind) return null;
  const z = zoneOf(pr, m); return Render.get(pr, z, kind, pr.p, z, front);
}
function preload(pr, notes) {
  if (!pr) return Promise.resolve();
  const ps = [];
  if (pr.e === 'drum') for (const m of DRUM_NOTES) ps.push(soundFor(pr, m));
  else if (RENDERED[pr.e]) { const zs = new Set(); for (const m of notes) zs.add(zoneOf(pr, m)); for (const z of zs) ps.push(soundFor(pr, z)); }
  return Promise.all(ps.map(p => p && p.then ? p : Promise.resolve(p)));
}

/* ---------- waves ---------- */
const WAVES = new WeakMap();
function wave(ctx, w) {
  let m = WAVES.get(ctx); if (!m) { m = new Map(); WAVES.set(ctx, m); }
  const key = typeof w === 'string' ? w : JSON.stringify(w);
  if (m.has(key)) return m.get(key);
  const N = 64, re = new Float32Array(N), im = new Float32Array(N);
  if (w === 'p25' || w === 'p12') { const d = w === 'p25' ? 0.25 : 0.125; for (let n = 1; n < N; n++) { re[n] = (2 / (n * Math.PI)) * Math.sin(2 * n * Math.PI * d) * 0.5; im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * n * Math.PI * d)) * 0.5; } }
  else if (w === 'tri4') { // 16-step triangle like old game consoles
    const S = 32, x = []; for (let i = 0; i < S; i++) { const v = i < 16 ? i : 31 - i; x.push(v / 7.5 - 1); }
    for (let n = 1; n < N; n++) { let a = 0, b = 0; for (let i = 0; i < S; i++) { const t = (i + 0.5) / S; a += x[i] * Math.cos(2 * Math.PI * n * t); b += x[i] * Math.sin(2 * Math.PI * n * t); } re[n] = a * 2 / S; im[n] = b * 2 / S; }
  }
  else if (w && w.h) { w.h.forEach((a, n) => { if (n > 0 && n < N) im[n] = a; }); }
  const pw = ctx.createPeriodicWave(re, im, { disableNormalization: false });
  m.set(key, pw); return pw;
}
const NOISE = new WeakMap();
function noiseBuf(ctx) { let b = NOISE.get(ctx); if (b) return b; b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NOISE.set(ctx, b); return b; }
const CURVES = new Map();
function curve(kind, amt) {
  const key = kind + amt; if (CURVES.has(key)) return CURVES.get(key);
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1) * 2 - 1;
    if (kind === 'drive') { const k = 1 + amt * 12; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    else { const st = Math.pow(2, amt); c[i] = Math.round(x * st) / st; }
  }
  CURVES.set(key, c); return c;
}
function holdAt(p, t) { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); } }
const velGain = v => Math.pow(Math.max(0.02, v), 1.5);

/* ---------- voices ---------- */
// plays one note into dest. returns {stop(t), end}; dur null = held until stop()
function playNote(ctx, dest, pr, m, vel, when, dur, ent, opt = {}) {
  if (pr.e === 'syn') return synVoice(ctx, dest, pr, m, vel, when, dur, opt);
  if (!ent || !ent.buf) return null;
  const src = ctx.createBufferSource(); src.buffer = ent.buf;
  let rate = 1;
  if (pr.e === 'user') rate = Math.pow(2, (m - (pr.root || 60)) / 12);
  else if (pr.e !== 'drum') rate = Math.pow(2, (m - zoneOf(pr, m)) / 12);
  src.playbackRate.value = rate;
  if (ent.loopStart != null) { src.loop = true; src.loopStart = ent.loopStart; src.loopEnd = ent.loopEnd; }
  const g = ctx.createGain(); let node = src;
  if (pr.vf > 0 && pr.e !== 'drum') { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.5; f.frequency.value = Math.max(mtof(m) * 2.5, Math.min(20000, 20000 * Math.pow(2, -(1 - vel) * pr.vf * 5.5))); node.connect(f); node = f; }
  node.connect(g);
  let out = g;
  if (pr.trem) { const t = ctx.createGain(), lfo = ctx.createOscillator(), d = ctx.createGain(); lfo.frequency.value = pr.trem[0]; d.gain.value = pr.trem[1] / 2; t.gain.value = 1 - pr.trem[1] / 2; lfo.connect(d).connect(t.gain); lfo.start(when); g.connect(t); out = t; src.addEventListener('ended', () => { try { lfo.stop(); } catch (e) { } }); }
  out.connect(dest);
  const peak = velGain(vel) * (pr.gain || 1) * (pr.e === 'drum' ? 0.9 : 0.8);
  const a = pr.a || 0.002;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + a);
  src.start(when);
  const rel = pr.rel || 0.2;
  const v = {
    src, stopped: false, end: when + ent.buf.duration / rate,
    stop(t) { if (v.stopped) return; v.stopped = true; t = Math.max(t, when + a); holdAt(g.gain, t); g.gain.setTargetAtTime(0, t, rel / 4); const e = t + rel * 1.6 + 0.05; try { src.stop(e); } catch (er) { } v.end = Math.min(v.end, e); }
  };
  if (dur != null && pr.e !== 'drum') v.stop(when + dur);
  if (dur == null && !src.loop) { /* one-shot: ends by itself */ }
  return v;
}
function synVoice(ctx, dest, pr, m, vel, when, dur, opt) {
  const p = pr.p, f0 = mtof(m), nodes = [], oscs = [];
  const [A, D, S, R] = p.a || [0.005, 0.3, 0.8, 0.3];
  const mix = ctx.createGain(); mix.gain.value = 1;
  let pitchFrom = 0;
  if (p.glide && opt.lastMidi != null && opt.lastMidi !== m) pitchFrom = (opt.lastMidi - m) * 100;
  const detuneTargets = [];
  for (const o of p.o) {
    const u = o.u || 1, og = ctx.createGain(); og.gain.value = (o.g != null ? o.g : 0.5) / Math.sqrt(u);
    if (o.env) { const [a, d, s] = o.env; og.gain.setValueAtTime(0, when); og.gain.linearRampToValueAtTime(o.g, when + a); og.gain.setTargetAtTime(o.g * s, when + a, d / 3); }
    for (let k = 0; k < u; k++) {
      let src;
      if (o.w === 'noise') { src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx); src.loop = true; src.loopStart = Math.random(); }
      else {
        src = ctx.createOscillator();
        if (typeof o.w === 'string' && ['sine', 'square', 'sawtooth', 'triangle'].includes(o.w)) src.type = o.w;
        else if (o.w === 'saw') src.type = 'sawtooth'; else if (o.w === 'tri') src.type = 'triangle';
        else src.setPeriodicWave(wave(ctx, o.w));
        src.frequency.value = f0 * Math.pow(2, (o.t || 0) / 12);
        const det = (o.d || 0) + (u > 1 ? (k / (u - 1) - 0.5) * 2 * (o.s || 10) : 0);
        src.detune.value = det + pitchFrom; detuneTargets.push([src.detune, det]);
      }
      let n = src;
      if (u > 1 && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = (k / (u - 1) - 0.5) * 1.4; n.connect(pn); n = pn; }
      n.connect(og); oscs.push(src);
    }
    og.connect(mix);
  }
  if (p.nz) { const ns = ctx.createBufferSource(); ns.buffer = noiseBuf(ctx); ns.loop = true; const ng = ctx.createGain(); ng.gain.value = p.nz; ns.connect(ng).connect(mix); oscs.push(ns); }
  let chain = mix;
  if (p.drv || p.crush) { const ws = ctx.createWaveShaper(); ws.curve = p.crush ? curve('crush', p.crush) : curve('drive', p.drv); if (!p.crush) ws.oversample = '2x'; chain.connect(ws); chain = ws; if (p.crush && p.drv) { const w2 = ctx.createWaveShaper(); w2.curve = curve('drive', p.drv); chain.connect(w2); chain = w2; } }
  const flt = ctx.createBiquadFilter();
  const ft = p.f || ['lp', 8000, 0.7];
  flt.type = ft[0] === 'hp' ? 'highpass' : ft[0] === 'bp' ? 'bandpass' : 'lowpass';
  let fc = ft[1] || f0; if (p.kt) fc = (ft[1] || f0 * 1) * (ft[1] ? Math.pow(f0 / 261.6, p.kt) : 1);
  fc *= Math.pow(2, -(1 - vel) * (pr.vf || 0) * 2);
  flt.frequency.value = Math.min(20000, Math.max(20, fc)); flt.Q.value = ft[2] || 0.7;
  chain.connect(flt);
  const amp = ctx.createGain(); flt.connect(amp);
  let out = amp;
  // click / chiff at the start
  if (p.click || p.chiff) {
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf(ctx); ns.loopStart = Math.random();
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = p.chiff ? Math.min(8000, f0 * 2) : 2500; bf.Q.value = p.chiff ? 3 : 0.8;
    const cg = ctx.createGain(); const lv = (p.click || 0) * 0.25 + (p.chiff || 0) * 0.5;
    cg.gain.setValueAtTime(lv * velGain(vel), when); cg.gain.setTargetAtTime(0, when, p.chiff ? 0.03 : 0.004);
    ns.connect(bf).connect(cg).connect(amp); ns.start(when); ns.stop(when + 0.25);
  }
  // envelopes
  const peak = velGain(vel) * (pr.gain || 1) * 0.7;
  amp.gain.setValueAtTime(0, when); amp.gain.linearRampToValueAtTime(peak, when + A);
  amp.gain.setTargetAtTime(peak * S, when + A, Math.max(0.005, D / 3));
  if (p.fe && p.fe[0]) { const [amt, a, d, s] = p.fe, c = amt * 1200 * (0.5 + 0.5 * vel); flt.detune.setValueAtTime(0, when); flt.detune.linearRampToValueAtTime(c, when + Math.max(0.001, a)); flt.detune.setTargetAtTime(c * s, when + a, Math.max(0.005, d / 3)); }
  if (pitchFrom) for (const [dp, v] of detuneTargets) { dp.setValueAtTime(v + pitchFrom, when); dp.setTargetAtTime(v, when, p.glide / 3); }
  if (p.pe && p.pe[0]) { const [st, tm, mode] = p.pe; for (const [dp, v] of detuneTargets) { dp.setValueAtTime(v + st * 100, when); if (mode === 'lin') dp.linearRampToValueAtTime(v, when + tm); else if (mode === 'step') dp.setValueAtTime(v, when + tm); else dp.setTargetAtTime(v, when, tm / 3); } }
  // LFO
  let lfo = null;
  if (p.lfo) {
    const [rate, pc, fo, ad, delay, shape] = p.lfo;
    lfo = ctx.createOscillator(); lfo.type = shape === 'sq' ? 'square' : shape === 'rnd' ? 'sawtooth' : 'sine';
    lfo.frequency.value = shape === 'sync' ? rate * ((opt.bpm || 120) / 120) : rate;
    const ramp = ctx.createGain(); ramp.gain.setValueAtTime(delay ? 0 : 1, when); if (delay) ramp.gain.linearRampToValueAtTime(1, when + delay);
    lfo.connect(ramp);
    if (pc) { const g = ctx.createGain(); g.gain.value = pc; ramp.connect(g); for (const o of oscs) if (o.detune) g.connect(o.detune); }
    if (fo) { const g = ctx.createGain(); g.gain.value = fo * 1200; ramp.connect(g).connect(flt.detune); }
    if (ad) { const t = ctx.createGain(); t.gain.value = 1 - ad / 2; const g = ctx.createGain(); g.gain.value = ad / 2; ramp.connect(g).connect(t.gain); amp.connect(t); out = t; }
    lfo.start(when);
  }
  out.connect(dest);
  for (const o of oscs) o.start(when);
  const v = {
    stopped: false, end: Infinity,
    stop(t) {
      if (v.stopped) return; v.stopped = true; t = Math.max(t, when + 0.001);
      holdAt(amp.gain, t); amp.gain.setTargetAtTime(0, t, Math.max(0.004, R / 4));
      if (p.fe && p.fe[0]) { holdAt(flt.detune, t); flt.detune.setTargetAtTime(0, t, Math.max(0.01, (p.fe[4] || 0.2) / 3)); }
      const e = t + R * 1.7 + 0.05; for (const o of oscs) try { o.stop(e); } catch (er) { } if (lfo) try { lfo.stop(e); } catch (er) { }
      v.end = e;
    }
  };
  if (dur != null) v.stop(when + dur);
  return v;
}

/* ---------- reverb impulse ---------- */
const IRS = {};
function makeIR(sr, type) {
  const key = type + sr; if (IRS[key]) return IRS[key];
  const cfg = { room: [1.1, 0.012, 0.6], hall: [2.8, 0.022, 0.45], plate: [2.0, 0.004, 0.75], church: [5.2, 0.035, 0.35], studio: [0.6, 0.006, 0.55] }[type] || [2.2, 0.02, 0.5];
  const [T, pre, bright] = cfg, N = Math.floor((T * 1.1 + pre) * sr);
  const b = new AudioBuffer({ numberOfChannels: 2, length: N, sampleRate: sr });
  let s = 12345; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x3fffffff - 1; };
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), p0 = Math.floor(pre * sr);
    let lo = 0, hi = 0, lo2 = 0;
    for (let i = p0; i < N; i++) {
      const t = (i - p0) / sr, x = r();
      // highs die faster than lows; three bands mixed back together
      lo += 0.02 * (x - lo); lo2 += 0.12 * (x - lo2); hi = x - lo2;
      const eLow = Math.exp(-6.9 * t / (T * 1.15)), eMid = Math.exp(-6.9 * t / T), eHi = Math.exp(-6.9 * t / (T * bright));
      d[i] = (lo * 5 * eLow + (lo2 - lo) * 1.4 * eMid + hi * 0.7 * eHi) * Math.min(1, t / 0.006 + 0.15);
    }
    // a few early reflections
    for (let k = 0; k < 14; k++) { const i = p0 + Math.floor((0.004 + Math.abs(r()) * 0.07 * Math.min(1, T / 2)) * sr); if (i < N) d[i] += r() * 0.6 * Math.exp(-k * 0.15); }
  }
  let mx = 0; for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let e = 0; for (const v of d) e += v * v; mx = Math.max(mx, Math.sqrt(e)); }
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= 2.2 / mx; }
  IRS[key] = b; return b;
}

/* ---------- master bus and track strips ---------- */
function makeBus(ctx, song) {
  const bus = {};
  bus.input = ctx.createGain();
  bus.glue = ctx.createDynamicsCompressor(); bus.glue.threshold.value = -14; bus.glue.ratio.value = 2.5; bus.glue.attack.value = 0.02; bus.glue.release.value = 0.25; bus.glue.knee.value = 8;
  bus.vol = ctx.createGain();
  bus.lim = ctx.createDynamicsCompressor(); bus.lim.threshold.value = -2; bus.lim.ratio.value = 20; bus.lim.attack.value = 0.001; bus.lim.release.value = 0.08; bus.lim.knee.value = 0;
  bus.an = ctx.createAnalyser(); bus.an.fftSize = 2048;
  bus.input.connect(bus.glue).connect(bus.vol).connect(bus.lim).connect(bus.an).connect(ctx.destination);
  bus.rev = ctx.createConvolver(); bus.revIn = ctx.createGain(); bus.revOut = ctx.createGain();
  bus.revHp = ctx.createBiquadFilter(); bus.revHp.type = 'highpass'; bus.revHp.frequency.value = 180;
  bus.revIn.connect(bus.revHp).connect(bus.rev).connect(bus.revOut).connect(bus.input);
  bus.dIn = ctx.createGain(); bus.dL = ctx.createDelay(4); bus.dR = ctx.createDelay(4); bus.dFb = ctx.createGain(); bus.dLp = ctx.createBiquadFilter(); bus.dLp.frequency.value = 4500;
  const mg = ctx.createChannelMerger(2), dOut = ctx.createGain(); dOut.gain.value = 0.8;
  bus.dIn.connect(bus.dL); bus.dL.connect(bus.dR); bus.dR.connect(bus.dLp).connect(bus.dFb).connect(bus.dL);
  bus.dL.connect(mg, 0, 0); bus.dR.connect(mg, 0, 1); mg.connect(dOut).connect(bus.input); dOut.connect(bus.revIn);
  bus.strips = new Map();
  BUS.set(ctx, bus);
  updateBus(ctx, song);
  return bus;
}
function updateBus(ctx, song) {
  const bus = BUS.get(ctx); if (!bus) return;
  const fx = song.fx;
  if (bus.irType !== fx.revType) { bus.rev.buffer = makeIR(ctx.sampleRate, fx.revType); bus.irType = fx.revType; }
  bus.revOut.gain.value = fx.revLvl;
  const spb = 60 / song.bpm, dt = Math.min(3.9, spb * ({ '1/16': 0.25, '1/8': 0.5, '1/8.': 0.75, '1/4': 1, '1/4.': 1.5, '1/2': 2 }[fx.delTime] || 0.75));
  bus.dL.delayTime.value = dt; bus.dR.delayTime.value = dt; bus.dFb.gain.value = fx.delFb;
  bus.vol.gain.value = song.master;
  bus.glue.ratio.value = fx.glue ? 2.5 : 1;
}
function makeStrip(ctx, tr) {
  const bus = BUS.get(ctx), s = {};
  s.input = ctx.createGain();
  s.drive = ctx.createWaveShaper(); s.drive.oversample = '4x'; s.cab = ctx.createBiquadFilter(); s.cab.type = 'lowpass';
  s.dGain = ctx.createGain();
  s.input.connect(s.drive).connect(s.cab).connect(s.dGain);
  // chorus: two modulated delays left and right
  s.chDry = ctx.createGain(); s.chWet = ctx.createGain(); s.chOut = ctx.createGain();
  const mg = ctx.createChannelMerger(2); s.chL = ctx.createDelay(0.05); s.chR = ctx.createDelay(0.05);
  s.chL.delayTime.value = 0.012; s.chR.delayTime.value = 0.016;
  s.chLfo = ctx.createOscillator(); s.chLfo.frequency.value = 0.7; const l1 = ctx.createGain(), l2 = ctx.createGain(); l1.gain.value = 0.0025; l2.gain.value = -0.0025;
  s.chLfo.connect(l1).connect(s.chL.delayTime); s.chLfo.connect(l2).connect(s.chR.delayTime); s.chLfo.start();
  s.dGain.connect(s.chDry).connect(s.chOut); s.dGain.connect(s.chL).connect(mg, 0, 0); s.dGain.connect(s.chR).connect(mg, 0, 1); mg.connect(s.chWet).connect(s.chOut);
  // tremolo
  s.trem = ctx.createGain(); s.tLfo = ctx.createOscillator(); s.tLfo.frequency.value = 5.2; s.tDep = ctx.createGain(); s.tLfo.connect(s.tDep).connect(s.trem.gain); s.tLfo.start();
  s.chOut.connect(s.trem);
  // EQ, filters, compressor
  s.lo = ctx.createBiquadFilter(); s.lo.type = 'lowshelf'; s.lo.frequency.value = 160;
  s.mid = ctx.createBiquadFilter(); s.mid.type = 'peaking'; s.mid.frequency.value = 1000; s.mid.Q.value = 0.8;
  s.hi = ctx.createBiquadFilter(); s.hi.type = 'highshelf'; s.hi.frequency.value = 5000;
  s.hpf = ctx.createBiquadFilter(); s.hpf.type = 'highpass'; s.hpf.Q.value = 0.6;
  s.lpf = ctx.createBiquadFilter(); s.lpf.type = 'lowpass'; s.lpf.Q.value = 0.6;
  s.comp = ctx.createDynamicsCompressor(); s.comp.attack.value = 0.008; s.comp.release.value = 0.15;
  s.pan = ctx.createStereoPanner(); s.vol = ctx.createGain(); s.mute = ctx.createGain();
  s.an = ctx.createAnalyser(); s.an.fftSize = 512;
  s.trem.connect(s.lo).connect(s.mid).connect(s.hi).connect(s.hpf).connect(s.lpf).connect(s.comp).connect(s.pan).connect(s.vol).connect(s.mute);
  s.mute.connect(bus.input); s.mute.connect(s.an);
  s.rs = ctx.createGain(); s.ds = ctx.createGain(); s.mute.connect(s.rs).connect(bus.revIn); s.mute.connect(s.ds).connect(bus.dIn);
  bus.strips.set(tr.id, s);
  updateStrip(ctx, tr);
  return s;
}
function strip(ctx, tr) { const bus = BUS.get(ctx); return bus.strips.get(tr.id) || makeStrip(ctx, tr); }
function updateStrip(ctx, tr, soloOn) {
  const bus = BUS.get(ctx); if (!bus) return; const s = bus.strips.get(tr.id); if (!s) return;
  const f = tr.fx;
  s.drive.curve = f.drive > 0 ? curve('drive', Math.round(f.drive * 40) / 40) : null;
  s.cab.frequency.value = f.drive > 0 ? 7500 - f.drive * 3000 : 22000;
  s.dGain.gain.value = f.drive > 0 ? 1 - f.drive * 0.45 : 1;
  s.chWet.gain.value = f.chorus * 0.75; s.chDry.gain.value = 1 - f.chorus * 0.3;
  s.tDep.gain.value = f.trem * 0.5; s.trem.gain.value = 1 - f.trem * 0.5;
  s.lo.gain.value = f.low; s.mid.gain.value = f.mid; s.hi.gain.value = f.high;
  s.hpf.frequency.value = f.lowcut || 10; s.lpf.frequency.value = f.highcut || 22000;
  s.comp.threshold.value = f.comp ? -10 - f.comp * 22 : 0; s.comp.ratio.value = f.comp ? 1 + f.comp * 7 : 1; s.comp.knee.value = 6;
  s.pan.pan.value = tr.pan; s.vol.gain.value = tr.vol * tr.vol;
  const solo = soloOn != null ? soloOn : (typeof song !== 'undefined' && song.tracks.some(t => t.solo));
  s.mute.gain.value = tr.mute || (solo && !tr.solo) ? 0 : 1;
  s.rs.gain.value = f.rev; s.ds.gain.value = f.delay;
}
