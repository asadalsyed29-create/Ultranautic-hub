/* ================= sound rendering (runs in background workers) =================
   Every acoustic sound is built note by note from its physics:
   piano strings with stiffness and hammer, plucked strings (Karplus-Strong with body),
   struck bars and bells (modes), electric pianos (tine/reed FM with pickup),
   bowed/blown/sung tones (harmonics through a fixed body or vocal tract, with ensemble),
   and every drum piece. Results are cached as audio buffers and pitched a little between zones. */
function DSP_WORKER() {
  const TAU = Math.PI * 2;
  let seed = 1;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const nz = () => rnd() * 2 - 1;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const dbA = db => Math.pow(10, db / 20);

  // RBJ biquad, processed in place
  function biq(type, f, q, gainDb, sr) {
    const A = Math.pow(10, (gainDb || 0) / 40), w = TAU * Math.min(f, sr * 0.49) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * (q || 0.707));
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'pk') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else if (type === 'ls') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cs + s); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - s); a0 = (A + 1) + (A - 1) * cs + s; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - s; }
    else { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s; }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  }
  function run(c, x) { let { b0, b1, b2, a1, a2, x1, x2, y1, y2 } = c; for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; } c.x1 = x1; c.x2 = x2; c.y1 = y1; c.y2 = y2; return x; }
  const filt = (x, sr, ...fs) => { for (const f of fs) if (f) run(biq(f[0], f[1], f[2], f[3], sr), x); return x; };
  // biquad magnitude at a frequency (for spectral shaping of harmonics)
  function mag(c, f, sr) { const w = TAU * f / sr, cr = Math.cos(w), ci = -Math.sin(w), c2r = Math.cos(2 * w), c2i = -Math.sin(2 * w); const nr = c.b0 + c.b1 * cr + c.b2 * c2r, ni = c.b1 * ci + c.b2 * c2i, dr = 1 + c.a1 * cr + c.a2 * c2r, di = c.a1 * ci + c.a2 * c2i; return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di)); }
  // smooth random wander (for natural pitch / level drift)
  function wander(n, rate, sr) { const out = new Float32Array(n), step = Math.max(1, Math.floor(sr / rate)); let a = nz(), b = nz(); for (let i = 0; i < n; i++) { const k = i % step; if (k === 0 && i) { a = b; b = nz(); } const t = k / step, s = t * t * (3 - 2 * t); out[i] = a + (b - a) * s; } return out; }
  function fadeIn(x, n) { n = Math.min(n, x.length); for (let i = 0; i < n; i++) x[i] *= i / n; }
  function fadeOut(x, n) { const L = x.length; n = Math.min(n, L); for (let i = 0; i < n; i++) x[L - 1 - i] *= i / n; }
  function trimTail(chs, sr, floor = 0.00012) { const L = chs[0].length; let e = L - 1; while (e > sr * 0.05) { let m = 0; for (const c of chs) m = Math.max(m, Math.abs(c[e])); if (m > floor) break; e -= 64; } e = Math.min(L, e + 256); const out = chs.map(c => c.slice(0, e)); out.forEach(c => fadeOut(c, Math.min(2048, e >> 2))); return out; }
  function norm(chs, peak) { let m = 1e-9; for (const c of chs) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > m) m = a; } const g = peak / m; for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g; return chs; }
  // seamless loop: crossfade the end of the loop into the audio just before its start
  function makeLoop(x, a, b, xf) { const out = x.slice(0, b); for (let i = 0; i < xf; i++) { const t = i / xf, w1 = Math.cos(t * Math.PI / 2), w2 = Math.sin(t * Math.PI / 2); out[b - xf + i] = x[b - xf + i] * w1 + x[a - xf + i] * w2; } return out; }
  function softclip(x, drive) { if (!drive) return x; const k = 1 + drive * 8, n = Math.tanh(k); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * k) / n; return x; }

  /* ---------- piano: stiff strings, 1-3 per note, felt hammer, soundboard ---------- */
  function piano(p, m, sr) {
    const f0 = mtof(m);
    const T1 = Math.min(28, Math.max(0.9, (p.sus || 1) * 24 * Math.pow(f0 / 27.5, -0.62)));
    const dur = Math.min(p.len || 9, T1 * 0.9 + 0.6), N = Math.floor(dur * sr);
    const L = new Float32Array(N), R = new Float32Array(N);
    const B = Math.min(0.02, Math.max(0.00004, (p.B || 1) * 0.00022 * Math.pow(2, (m - 60) / 12 * 0.9)));
    const ns = m < 33 ? 1 : m < 45 ? 2 : 3;
    const det = [0, (p.det || 0.7), -(p.det || 0.7) * 0.8];
    const pan = [0, 0.35, -0.35];
    const hard = p.hard || 0.6, x0 = p.pos || 0.122;
    const fcH = 700 + hard * hard * 5200 * Math.pow(f0 / 261, 0.35);
    const nyq = Math.min(sr * 0.45, 16000);
    for (let s = 0; s < ns; s++) {
      const fs = f0 * Math.pow(2, det[s] / 1200), gl = Math.sqrt(0.5 - pan[s] * 0.5), gr = Math.sqrt(0.5 + pan[s] * 0.5);
      for (let n = 1; n <= 70; n++) {
        const fn = n * fs * Math.sqrt(1 + B * n * n); if (fn > nyq) break;
        let a = Math.abs(Math.sin(Math.PI * n * x0)) / Math.pow(n, 0.75) * Math.exp(-(fn - f0) / fcH);
        if (n === 1) a *= p.fund || 1;
        a *= (1 + 0.15 * nz()) / ns;
        if (a < 1e-5) continue;
        const al = 6.91 / T1 * (1 + (n - 1) * 0.09) + 3.5e-7 * fn * fn * (p.damp || 1);
        const d1 = Math.exp(-al * 1.9 / sr), d2 = Math.exp(-al * 0.42 / sr);
        let e1 = a * 0.68, e2 = a * 0.32;
        const w = TAU * fn / sr, cw = Math.cos(w), sw = Math.sin(w);
        let c = 1, si = 0; const ph = rnd() * 0.3; c = Math.cos(ph); si = Math.sin(ph);
        for (let i = 0; i < N; i++) {
          const v = si * (e1 + e2); L[i] += v * gl; R[i] += v * gr;
          const c2 = c * cw - si * sw; si = si * cw + c * sw; c = c2;
          e1 *= d1; e2 *= d2;
          if ((i & 1023) === 0 && e1 + e2 < 2e-6) break;
        }
      }
    }
    // hammer knock and soundboard thump
    const nh = Math.floor(0.06 * sr), hn = new Float32Array(nh), th = new Float32Array(nh);
    for (let i = 0; i < nh; i++) { hn[i] = nz() * Math.exp(-i / (0.0045 * sr)); th[i] = nz() * Math.exp(-i / (0.016 * sr)); }
    filt(hn, sr, ['bp', Math.min(6000, f0 * 3 + 900), 0.8], ['lp', 2000 + hard * 5000, 0.7]);
    filt(th, sr, ['lp', 160, 1.8]);
    const kn = (p.knock || 1) * 0.05 * (0.5 + hard), tk = (p.thump || 1) * 0.12 * Math.max(0.2, 1 - (m - 21) / 70);
    for (let i = 0; i < nh; i++) { const v = hn[i] * kn + th[i] * tk; L[i] += v; R[i] += v; }
    for (let i = 0; i < 64; i++) { L[i] *= i / 64; R[i] *= i / 64; }
    for (const x of [L, R]) filt(x, sr, ['pk', 110, 0.9, 2.5], ['pk', 2600, 1.2, p.presence || 0], ['hs', 7000, 0.7, p.air || -3], ['ls', 220, 0.7, p.warm || 0]);
    if (p.honky) { // detuned upright saloon piano
      const y = new Float32Array(N); let ph = 0; const ff = Math.pow(2, p.honky / 1200);
      // re-pitch copy for chorus-out-of-tune strings (simple resample)
      for (let i = 0; i < N; i++) { ph += ff; const k = ph | 0, t = ph - k; y[i] = k + 1 < N ? L[k] * (1 - t) + L[k + 1] * t : 0; }
      for (let i = 0; i < N; i++) { L[i] = L[i] * 0.7 + y[i] * 0.5; R[i] = R[i] * 0.7 + y[i] * 0.3; }
    }
    if (p.felt) for (const x of [L, R]) filt(x, sr, ['lp', 900 + f0 * 2.2, 0.6], ['lp', 1500 + f0 * 3, 0.6]);
    if (p.toy) { // toy piano: metal rods
      const y = modal({ modes: [[1, 1, 1.4], [2.76, .5, .5], [5.4, .3, .25], [8.9, .15, .15]], hard: .9, strike: .3 }, m, sr)[0];
      for (let i = 0; i < N; i++) { L[i] = L[i] * 0.15 + (y[i] || 0); R[i] = R[i] * 0.15 + (y[i] || 0); }
    }
    return { ch: norm(trimTail([L, R], sr), 0.7) };
  }

  /* ---------- plucked strings: extended Karplus-Strong with pick, damping and body ---------- */
  function ks(p, m, sr, f0o) {
    const f0 = f0o || mtof(m);
    const T = Math.min(14, Math.max(0.25, (p.sus || 1) * 7 * Math.pow(f0 / 110, -0.55)));
    const dur = Math.min(p.len || 7, T * 0.8 + 0.3), N = Math.floor(dur * sr);
    const nstr = p.course || 1, out = new Float32Array(N);
    for (let st = 0; st < nstr; st++) {
      const f = f0 * Math.pow(2, (st ? (p.cdet || 4) * (st % 2 ? 1 : -1) : 0) / 1200) * (p.oct && st === 1 ? 2 : 1);
      const S = Math.min(0.5, Math.max(0.02, p.dark != null ? p.dark : 0.35)); // loop lowpass weight
      const rho = Math.pow(0.001, 1 / (f * T)) ;
      const P = sr / f, Ni = Math.floor(P - S - 0.5), d = P - S - Ni; // fractional part via allpass
      const ac = (1 - d) / (1 + d);
      const buf = new Float32Array(Ni);
      // excitation: pick noise / smooth pluck, shaped by pick hardness and position
      const ex = new Float32Array(Ni);
      const soft = p.pick != null ? p.pick : 0.5;
      for (let i = 0; i < ex.length; i++) ex[i] = nz();
      if (p.pluckShape) { for (let i = 0; i < ex.length; i++) { const t = i / ex.length; ex[i] = (t < 0.3 ? t / 0.3 : (1 - t) / 0.7) * 2 - 1 + nz() * 0.2; } }
      let lp = 0; const lpa = 1 - soft * 0.92; for (let i = 0; i < ex.length; i++) { lp += lpa * (ex[i] - lp); ex[i] = lp; }
      const pp = Math.max(1, Math.floor((p.pos || 0.18) * Ni)); const ex2 = ex.slice(); for (let i = 0; i < ex.length; i++) ex[i] = ex2[i] - (i >= pp ? ex2[i - pp] : 0);
      let mean = 0; for (const v of ex) mean += v; mean /= ex.length; for (let i = 0; i < ex.length; i++) ex[i] -= mean;
      buf.set(ex.subarray(0, buf.length));
      let idx = 0, x1 = 0, apx = 0, apy = 0; const L = buf.length;
      const buzz = p.buzz || 0, g = (st ? 0.6 : 1) / nstr;
      for (let i = 0; i < N; i++) {
        const v = buf[idx];
        let y = ((1 - S) * v + S * x1) * rho; x1 = v;
        const ap = ac * y + apx - ac * apy; apx = y; apy = ap;
        let w = ap;
        if (buzz) { const th = 0.02 * (1 - buzz); if (w > th) w = th + (w - th) * (1 - buzz * 0.85); }
        buf[idx] = w; out[i] += v * g;
        idx++; if (idx >= L) idx = 0;
      }
    }
    // body / pickup
    const b = p.body || 'guitar';
    let bod;
    if (b === 'guitar') bod = [['pk', 98, 3, 6], ['pk', 204, 3, 5], ['pk', 390, 2, 3], ['pk', 2500, 1, 1.5], ['hp', 70, 0.7]];
    else if (b === 'nylon') bod = [['pk', 95, 2.5, 6], ['pk', 210, 3, 5], ['lp', 4500, 0.7], ['hp', 70, 0.7]];
    else if (b === 'violin') bod = [['pk', 280, 4, 6], ['pk', 460, 3, 5], ['pk', 2800, 1.2, 5], ['hp', 180, 0.7]];
    else if (b === 'cello') bod = [['pk', 110, 3, 6], ['pk', 220, 3, 4], ['pk', 1500, 1, 3], ['hp', 50, 0.7]];
    else if (b === 'banjo') bod = [['pk', 320, 2, 6], ['pk', 1100, 2, 5], ['hp', 160, 0.7]];
    else if (b === 'harp') bod = [['pk', 180, 1.5, 4], ['lp', 5200, 0.6]];
    else if (b === 'harpsi') bod = [['pk', 300, 1.5, 3], ['hp', 90, 0.7], ['pk', 3500, 1, 3]];
    else if (b === 'elec') bod = [['pk', 2600, 1.6, p.pickup || 4], ['lp', 5200, 0.9], ['hp', 80, 0.7]];
    else if (b === 'bass') bod = [['lp', p.tone || 2500, 0.8], ['pk', 700, 1, p.mid || 0], ['hp', 30, 0.7]];
    else if (b === 'upright') bod = [['pk', 95, 2.5, 6], ['pk', 260, 2, 3], ['lp', 1800, 0.7], ['hp', 35, 0.7]];
    else if (b === 'sitar') bod = [['pk', 600, 2, 6], ['pk', 2400, 2, 5], ['hp', 120, 0.7]];
    else if (b === 'oud') bod = [['pk', 120, 3, 6], ['pk', 300, 2, 4], ['lp', 3500, 0.7]];
    else if (b === 'koto') bod = [['pk', 250, 2, 5], ['pk', 900, 2, 4], ['hp', 100, 0.7]];
    else bod = [];
    filt(out, sr, ...bod);
    if (p.slap) { const n = Math.floor(0.02 * sr); for (let i = 0; i < n; i++) out[i] += nz() * Math.exp(-i / (0.003 * sr)) * p.slap * 0.6; }
    if (p.drive) softclip(out, p.drive);
    if (p.click) { const n = Math.floor(0.01 * sr); const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = nz() * Math.exp(-i / (0.0012 * sr)); filt(c, sr, ['hp', 1500, 0.7]); for (let i = 0; i < n; i++) out[i] += c[i] * p.click * 0.3; }
    fadeIn(out, 24);
    return [norm(trimTail([out], sr), 0.72)[0]];
  }

  /* ---------- struck bars, bells, tines: modal synthesis ---------- */
  function modal(p, m, sr) {
    const f0 = mtof(m);
    const sus = (p.sus || 1) * Math.pow(f0 / 440, -(p.dk != null ? p.dk : 0.5));
    let maxT = 0; for (const md of p.modes) maxT = Math.max(maxT, md[2] * sus);
    const dur = Math.min(p.len || 10, maxT * 1.05 + 0.15), N = Math.floor(dur * sr);
    const out = new Float32Array(N);
    const hard = p.hard != null ? p.hard : 0.6, nyq = sr * 0.45;
    for (const [r, a0, t60, det] of p.modes) {
      const f = f0 * r; if (f > nyq) continue;
      const a = a0 * Math.exp(-(r - 1) * (1 - hard) * 0.35) * (1 + 0.08 * nz());
      const T = t60 * sus, d = Math.exp(-6.91 / (T * sr));
      for (const dd of det ? [-det, det] : [0]) {
        const w = TAU * f * Math.pow(2, dd / 1200) / sr, cw = Math.cos(w), sw = Math.sin(w);
        let c = 1, s = 0, e = a / (det ? 2 : 1);
        for (let i = 0; i < N; i++) { out[i] += s * e; const c2 = c * cw - s * sw; s = s * cw + c * sw; c = c2; e *= d; if ((i & 1023) === 0 && e < 1e-6) break; }
      }
    }
    if (p.strike) { const n = Math.floor(0.03 * sr), c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = nz() * Math.exp(-i / ((0.0015 + (1 - hard) * 0.003) * sr)); filt(c, sr, ['bp', Math.min(9000, f0 * 4 + 1500), 0.7]); for (let i = 0; i < n; i++) out[i] += c[i] * p.strike * 0.25; }
    if (p.trem) { const w = TAU * p.trem / sr, dp = p.tremD || 0.4; for (let i = 0; i < N; i++) out[i] *= 1 - dp * (0.5 + 0.5 * Math.sin(w * i)); }
    if (p.f) filt(out, sr, ...p.f);
    fadeIn(out, 12);
    return [norm(trimTail([out], sr), 0.7)[0]];
  }

  /* ---------- electric pianos: tine / reed with FM and pickup ---------- */
  function ep(p, m, sr) {
    const f0 = mtof(m), T = Math.min(9, Math.max(0.6, (p.sus || 1) * 5 * Math.pow(f0 / 261, -0.5)));
    const dur = T * 0.9 + 0.3, N = Math.floor(dur * sr), L = new Float32Array(N);
    const I0 = (p.idx || 1.6) * Math.pow(f0 / 261, -0.25), tI = (p.idxT || 0.25), mr = p.mr || 1, br = p.bell || 0, brR = p.bellR || 7.1;
    const w = TAU * f0 / sr, wm = TAU * f0 * mr / sr, wb = TAU * f0 * brR / sr;
    const dA = Math.exp(-6.91 / (T * sr)), dI = Math.exp(-1 / (tI * sr)), dB = Math.exp(-1 / (0.08 * sr));
    let e = 1, ei = I0, eb = br, ph = 0, pm = 0, pb = 0; const sus = p.idxS || 0.15;
    const asym = p.asym != null ? p.asym : 0.35, drv = p.drive || 0.25, kd = 1 + drv * 4, tn = Math.tanh(kd);
    for (let i = 0; i < N; i++) {
      const mod = Math.sin(pm) * (ei + sus);
      let x = Math.sin(ph + mod) + Math.sin(pb) * eb;
      x = x + asym * x * x - asym * 0.5; // pickup bark (even harmonics)
      L[i] = Math.tanh(x * kd) / tn * e;
      ph += w; pm += wm; pb += wb; e *= dA; ei *= dI; eb *= dB;
      if (ph > 1e4) { ph %= TAU; pm %= TAU; pb %= TAU; }
    }
    // high-pass to remove DC from asymmetry, keyboard thunk
    filt(L, sr, ['hp', 25, 0.7], ['lp', p.tone || 6000, 0.7]);
    const nk = Math.floor(0.03 * sr); for (let i = 0; i < nk; i++) L[i] += nz() * Math.exp(-i / (0.004 * sr)) * 0.03 * (p.thunk || 1);
    fadeIn(L, 16);
    return [norm(trimTail([L], sr), 0.7)[0]];
  }

  /* ---------- sustained bowed / blown / sung tones (looped) ---------- */
  const VOWELS = { a: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -36, 130]], e: [[400, 0, 70], [1600, -24, 80], [2700, -30, 120]], i: [[270, 0, 60], [2290, -20, 90], [3010, -27, 100]], o: [[450, 0, 70], [800, -11, 80], [2830, -35, 100]], u: [[325, 0, 50], [700, -16, 60], [2700, -35, 170]], m: [[260, 0, 60], [1400, -30, 200]] };
  function sustain(p, m, sr) {
    const f0 = mtof(m), dur = 3.0, N = Math.floor(dur * sr);
    const out = new Float32Array(N);
    const V = p.voices || 1, nyq = Math.min(sr * 0.45, 14000);
    // spectral envelope at each harmonic: source slope + body/formant resonances (fixed in Hz)
    const res = (p.form || []).map(([f, db, bw]) => ({ f, g: dbA(db), bw }));
    const body = (p.body || []).map(b => biq(b[0], b[1], b[2], b[3], sr));
    const vow = p.vowel ? VOWELS[p.vowel] : null;
    const K = Math.min(80, Math.floor(nyq / f0));
    const amps = new Float32Array(K + 1);
    for (let k = 1; k <= K; k++) {
      const f = k * f0;
      let a = 1 / Math.pow(k, p.slope != null ? p.slope : 1);
      if (p.odd && k % 2 === 0) a *= f < (p.oddTo || 1800) ? p.odd : 0.6;
      for (const r of res) a *= 1 + r.g * 1 / (1 + Math.pow((f - r.f) / (r.bw * 0.5), 2));
      if (vow) { let v = 0; for (const [ff, db, bw] of vow) v += dbA(db) / (1 + Math.pow((f - ff) / (bw * 0.6), 2)); a *= v * 3 + 0.02; }
      for (const c of body) a *= mag(c, f, sr);
      if (p.cut) a *= 1 / (1 + Math.pow(f / p.cut, 4));
      amps[k] = a;
    }
    const att = (p.att || 0.08) * sr, bright = p.brightAtt || 0;
    for (let v = 0; v < V; v++) {
      const detc = V > 1 ? (v / (V - 1) - 0.5) * 2 * (p.spread || 9) + nz() * 2 : 0;
      const drift = wander(N, 2 + rnd() * 2, sr), amw = wander(N, 3 + rnd() * 3, sr);
      const vr = (p.vib || 5.2) * (1 + 0.08 * nz()), vd = (p.vibD != null ? p.vibD : 12) * (V > 1 ? 0.7 + 0.6 * rnd() : 1), vdel = (p.vibDel || 0.35) * sr;
      let ph = rnd() * TAU, vp = rnd() * TAU; const wv = TAU * vr / sr;
      const g = 1 / Math.sqrt(V), jit = p.jit != null ? p.jit : 3;
      const scoop = p.scoop || 0, scT = 0.05 * sr;
      for (let i = 0; i < N; i++) {
        const vibAmt = Math.min(1, i / (vdel + 1)) * vd;
        const cents = detc + vibAmt * Math.sin(vp) + drift[i] * jit + (scoop && i < scT * 3 ? -scoop * Math.exp(-i / scT) : 0);
        const f = f0 * Math.pow(2, cents / 1200);
        ph += TAU * f / sr; vp += wv; if (ph > TAU) ph -= TAU;
        const s1 = Math.sin(ph), cc = 2 * Math.cos(ph);
        let sk1 = s1, sk2 = 0, sum = amps[1] * s1;
        const bl = bright && i < att * 3 ? Math.min(1, i / (att * 3)) : 1;
        const kmax = bl < 1 ? Math.max(1, Math.floor(K * (0.15 + 0.85 * bl * bl))) : K;
        for (let k = 2; k <= kmax; k++) { const sk = cc * sk1 - sk2; sk2 = sk1; sk1 = sk; sum += amps[k] * sk; }
        const env = i < att ? (1 - Math.cos(Math.PI * i / att)) / 2 : 1;
        out[i] += sum * env * g * (1 + amw[i] * (p.shimmer || 0.05));
      }
    }
    // breath / bow noise, shaped by the same resonances
    if (p.noise) {
      const ns = new Float32Array(N); for (let i = 0; i < N; i++) ns[i] = nz();
      const nf = p.noiseF || [['bp', f0 * 2, 1.5]];
      filt(ns, sr, ...nf.map(x => x.map(y => typeof y === 'string' && y.startsWith('*') ? f0 * parseFloat(y.slice(1)) : y)));
      const nw = wander(N, 6, sr);
      let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(out[i])); let pn = 0; for (let i = 0; i < N; i++) pn = Math.max(pn, Math.abs(ns[i]));
      const g = p.noise * pk / (pn || 1);
      for (let i = 0; i < N; i++) { const env = i < att ? i / att : 1; const burst = p.chiff && i < 0.08 * sr ? 1 + p.chiff * Math.exp(-i / (0.02 * sr)) * 3 : 1; out[i] += ns[i] * g * env * (0.8 + 0.4 * nw[i]) * burst; }
    }
    if (p.post) filt(out, sr, ...p.post);
    if (p.drive) softclip(out, p.drive);
    const a = Math.floor(1.1 * sr), b = N - Math.floor(0.05 * sr), xf = Math.floor(0.35 * sr);
    const loop = makeLoop(out, a, b, xf);
    fadeIn(loop, 32);
    return { ch: norm([loop], 0.6), loopStart: a / sr, loopEnd: b / sr };
  }

  /* ---------- drums ---------- */
  function env(N, sr, a, d) { const e = new Float32Array(N); const na = Math.max(1, Math.floor(a * sr)); for (let i = 0; i < N; i++) e[i] = i < na ? i / na : Math.exp(-(i - na) / (d * sr)); return e; }
  function noiseArr(N) { const x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = nz(); return x; }
  // pitched membrane with sweep (kicks, toms)
  function membrane(q, sr) {
    const dur = q.len || Math.min(2.5, q.d * 7 + 0.05), N = Math.floor(dur * sr), out = new Float32Array(N);
    const modes = q.modes || [[1, 1]];
    for (const [r, a] of modes) {
      let ph = 0; const dm = q.d * (r === 1 ? 1 : 0.5 / r);
      for (let i = 0; i < N; i++) {
        const t = i / sr, f = (q.f + (q.f0 - q.f) * Math.exp(-t / q.sw)) * r;
        ph += TAU * f / sr; out[i] += Math.sin(ph) * a * Math.exp(-t / dm);
      }
    }
    if (q.drive) softclip(out, q.drive);
    if (q.click) { const n = Math.floor(0.015 * sr); const c = noiseArr(n); for (let i = 0; i < n; i++) c[i] *= Math.exp(-i / (0.0012 * sr)); filt(c, sr, ['bp', q.clickF || 3500, 0.8]); for (let i = 0; i < n; i++) out[i] += c[i] * q.click; }
    if (q.nz) { const n = Math.min(N, Math.floor(0.25 * sr)); const c = noiseArr(n); filt(c, sr, ['lp', q.nzF || 900, 0.8]); for (let i = 0; i < n; i++) out[i] += c[i] * q.nz * Math.exp(-i / ((q.nzD || 0.03) * sr)); }
    if (q.f2) filt(out, sr, ...q.f2);
    fadeIn(out, 8);
    return out;
  }
  function snare(q, sr) {
    const dur = Math.min(1.6, q.nd * 6 + 0.1), N = Math.floor(dur * sr), out = new Float32Array(N);
    for (const [f, a, d] of q.tones) { let ph = 0; for (let i = 0; i < N; i++) { const t = i / sr, ff = f * (1 + (q.bend || 0.25) * Math.exp(-t / 0.012)); ph += TAU * ff / sr; out[i] += Math.sin(ph) * a * Math.exp(-t / d); } }
    const ns = noiseArr(N); filt(ns, sr, ['hp', q.nhp || 1200, 0.7], ['pk', q.npk || 5000, 0.8, 4], ['lp', q.nlp || 12000, 0.7]);
    for (let i = 0; i < N; i++) { const t = i / sr; out[i] += ns[i] * q.na * (Math.exp(-t / q.nd) * 0.8 + 0.2 * Math.exp(-t / (q.nd * 0.3))); }
    if (q.drive) softclip(out, q.drive);
    fadeIn(out, 6);
    return out;
  }
  // metal: many inharmonic partials (cymbals, hats, cowbell)
  function metal(q, sr) {
    const dur = Math.min(6, q.d * 6 + 0.05), N = Math.floor(dur * sr), out = new Float32Array(N);
    if (q.square) { // classic analog six-oscillator metal
      for (const f of q.square) { let ph = rnd(); const inc = f * q.base / sr; for (let i = 0; i < N; i++) { ph += inc; if (ph >= 1) ph -= 1; out[i] += ph < 0.5 ? 1 : -1; } }
    } else {
      const np = q.parts || 80;
      for (let k = 0; k < np; k++) {
        const f = q.lo * Math.pow(q.hi / q.lo, Math.pow(rnd(), q.skew || 0.8)); if (f > sr * 0.45) continue;
        const a = (0.3 + rnd()) / Math.sqrt(np), T = q.d * (0.3 + rnd() * 0.9) * Math.pow(f / 3000, -(q.dk || 0.3));
        const w = TAU * f / sr, cw = Math.cos(w), sw = Math.sin(w); let c = Math.cos(rnd() * TAU), s = Math.sin(rnd() * TAU), e = a; const dd = Math.exp(-1 / (T * sr));
        for (let i = 0; i < N; i++) { out[i] += s * e; const c2 = c * cw - s * sw; s = s * cw + c * sw; c = c2; e *= dd; if ((i & 1023) === 0 && e < 1e-6) break; }
      }
      const ns = noiseArr(N); filt(ns, sr, ['hp', q.nhp || 5000, 0.7]);
      for (let i = 0; i < N; i++) out[i] += ns[i] * (q.na || 0.3) * Math.exp(-i / (q.d * 0.6 * sr)) * 0.3;
    }
    if (q.f) filt(out, sr, ...q.f);
    const e = env(N, sr, q.a || 0.0005, q.d); for (let i = 0; i < N; i++) out[i] *= q.square ? e[i] : Math.min(1, i / (q.a * sr || 20));
    if (q.choke) for (let i = 0; i < N; i++) out[i] *= Math.exp(-i / (q.choke * sr));
    return out;
  }
  function clap(q, sr) {
    const N = Math.floor((q.d * 6 + 0.1) * sr), out = new Float32Array(N), ns = noiseArr(N);
    filt(ns, sr, ['bp', q.f || 1200, q.q || 1.2], ['hp', 500, 0.7]);
    const bursts = q.n || 4, gap = (q.gap || 0.011) * sr;
    for (let i = 0; i < N; i++) { let e = 0; for (let b = 0; b < bursts; b++) { const st = b * gap * (1 + (b ? 0.15 * nz() : 0)); if (i >= st) e = Math.max(e, (b < bursts - 1 ? Math.exp(-(i - st) / (0.004 * sr)) : Math.exp(-(i - st) / (q.d * sr)))); } out[i] = ns[i] * e; }
    return out;
  }
  function shaker(q, sr) {
    const N = Math.floor((q.d * 4 + q.a + 0.05) * sr), out = noiseArr(N);
    filt(out, sr, ['hp', q.hp || 4000, 0.7], ['pk', q.pk || 8000, 1, 4]);
    const e = env(N, sr, q.a, q.d); for (let i = 0; i < N; i++) out[i] *= e[i];
    if (q.jingle) { const m = metal({ lo: 5000, hi: 12000, parts: 30, d: q.d * 1.5, na: 0 }, sr); for (let i = 0; i < Math.min(N, m.length); i++) out[i] += m[i] * q.jingle; }
    return out;
  }
  function drum(q, sr) {
    seed = 1234567 + Math.round((q.f || q.lo || q.base || 100) * 7);
    let x;
    if (q.t === 'mem') x = membrane(q, sr);
    else if (q.t === 'snare') x = snare(q, sr);
    else if (q.t === 'metal') x = metal(q, sr);
    else if (q.t === 'clap') x = clap(q, sr);
    else if (q.t === 'shaker') x = shaker(q, sr);
    else if (q.t === 'modal') x = modal(q, q.m || 60, sr)[0];
    else x = new Float32Array(100);
    if (q.post) filt(x, sr, ...q.post);
    if (q.bit) { const st = Math.pow(2, q.bit), hold = q.hold || 1; let v = 0; for (let i = 0; i < x.length; i++) { if (i % hold === 0) v = Math.round(x[i] * st) / st; x[i] = v; } }
    return [norm(trimTail([x], sr, 0.0002), q.lvl || 0.8)[0]];
  }

  self.onmessage = e => {
    const { id, kind, p, m, sr } = e.data;
    seed = (m * 7919 + 17) | 0;
    let r;
    try {
      if (kind === 'piano') r = piano(p, m, sr);
      else if (kind === 'ks') r = { ch: ks(p, m, sr) };
      else if (kind === 'modal') r = { ch: modal(p, m, sr) };
      else if (kind === 'ep') r = { ch: ep(p, m, sr) };
      else if (kind === 'sus') r = sustain(p, m, sr);
      else if (kind === 'drum') r = { ch: drum(p, sr) };
      else r = { ch: [new Float32Array(10)] };
    } catch (er) { r = { ch: [new Float32Array(10)], err: String(er) }; }
    self.postMessage({ id, ch: r.ch, loopStart: r.loopStart, loopEnd: r.loopEnd, err: r.err }, r.ch.map(c => c.buffer));
  };
}
