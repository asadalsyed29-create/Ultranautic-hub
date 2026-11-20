/* ================= easing / bezier ================= */
function bezierY(b, x) {
  // cubic bezier from (0,0) to (1,1) with control points (b0,b1),(b2,b3); returns y for x
  if (x <= 0) return 0; if (x >= 1) return 1;
  const x1 = clamp(b[0], 0, 1), y1 = b[1], x2 = clamp(b[2], 0, 1), y2 = b[3];
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, dsx = t => (3 * ax * t + 2 * bx) * t + cx;
  let t = x;
  for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) break; const d = dsx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
  if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
  return ((ay * t + by) * t + cy) * t;
}
const EASE_PRESETS = [
  { n: 'Linear', b: [0, 0, 1, 1] }, { n: 'Ease', b: [0.25, 0.1, 0.25, 1] }, { n: 'Ease in', b: [0.42, 0, 1, 1] }, { n: 'Ease out', b: [0, 0, 0.58, 1] },
  { n: 'In-out', b: [0.42, 0, 0.58, 1] }, { n: 'Strong in-out', b: [0.83, 0, 0.17, 1] }, { n: 'Back in', b: [0.36, 0, 0.66, -0.56] }, { n: 'Back out', b: [0.34, 1.56, 0.64, 1] },
  { n: 'Overshoot', b: [0.68, -0.6, 0.32, 1.6] }, { n: 'Snap', b: [0.9, 0, 0.1, 1] }, { n: 'Slow middle', b: [0.1, 0.9, 0.9, 0.1] }
];
const smooth = p => p * p * (3 - 2 * p);
const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
const easeInCubic = p => p * p * p;
const easeOutBack = p => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const easeOutBounce = p => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375; return n * (p -= 2.625 / d) * p + .984375; };
const easeOutElastic = p => p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - .75) * (2 * Math.PI / 3)) + 1;

/* ================= keyframes ================= */
// Each keyframe: {t (clip-local seconds), v, mode:'linear'|'smooth'|'hold', bez:[4], speed (0..99999), over:'clamp'|'loop'|'pingpong', steps}
// The settings on a keyframe control the segment that LEAVES it (towards the next keyframe).
function newKey(t, v) { return { t, v, mode: 'linear', bez: [0.42, 0, 0.58, 1], speed: 1, over: 'clamp', steps: 1 }; }
function segProgress(k, p) {
  // fixed-window speed multiplier: the window between the two keys never moves; speed only remaps progress inside it
  const sp = k.speed == null ? 1 : k.speed;
  const q = p * sp;
  let f;
  if (k.over === 'loop') { f = q - Math.floor(q); if (f === 0 && q > 0) f = 1; }
  else if (k.over === 'pingpong') { const m = q % 2; f = m <= 1 ? m : 2 - m; }
  else f = Math.min(q, 1);
  if (k.mode === 'hold') { const st = Math.max(1, k.steps || 1); return f >= 1 ? 1 : Math.floor(f * st) / st; }
  if (k.mode === 'smooth') return bezierY(k.bez || [0.42, 0, 0.58, 1], f);
  return f;
}
function evalProp(c, prop, lt) {
  const ks = c.kf && c.kf[prop];
  if (!ks || !ks.length) return c.tf[prop];
  if (ks.length === 1 || lt <= ks[0].t) return ks[0].v;
  const L = ks[ks.length - 1]; if (lt >= L.t) return L.v;
  let i = 0; while (i < ks.length - 2 && ks[i + 1].t <= lt) i++;
  const a = ks[i], b = ks[i + 1];
  const p = (lt - a.t) / Math.max(1e-9, b.t - a.t);
  return a.v + (b.v - a.v) * segProgress(a, p);
}
function propsAt(c, lt) { return { x: evalProp(c, 'x', lt), y: evalProp(c, 'y', lt), scale: evalProp(c, 'scale', lt), rot: evalProp(c, 'rot', lt), opacity: evalProp(c, 'opacity', lt) }; }
function keyAt(c, prop, lt, tol) { const ks = c.kf[prop] || []; tol = tol == null ? 0.5 / P.fps : tol; return ks.findIndex(k => Math.abs(k.t - lt) <= tol); }
// set a property: if it is keyframed, add/update the key at the playhead, else set the static value
function setProp(c, prop, v) {
  if (prop === 'rot') v = clamp(v, -MAX_ROT, MAX_ROT);
  const ks = c.kf[prop];
  if (ks && ks.length) {
    const lt = clamp(T - c.start, 0, c.dur);
    const i = keyAt(c, prop, lt);
    if (i >= 0) ks[i].v = v;
    else { const nk = newKey(lt, v); const prev = [...ks].reverse().find(k => k.t < lt); if (prev) { nk.mode = prev.mode; nk.bez = prev.bez.slice(); } ks.push(nk); ks.sort((a, b) => a.t - b.t); }
  } else c.tf[prop] = v;
}
function toggleKey(c, prop) {
  const lt = clamp(T - c.start, 0, c.dur);
  const ks = c.kf[prop];
  const i = keyAt(c, prop, lt);
  if (i >= 0) { const v = ks[i].v; ks.splice(i, 1); if (!ks.length) c.tf[prop] = v; return false; }
  const nk = newKey(lt, evalProp(c, prop, lt));
  ks.push(nk); ks.sort((a, b) => a.t - b.t); return true;
}
function clipKeyTimes(c) { const s = new Set(); for (const p of KF_PROPS) for (const k of c.kf[p] || []) s.add(round(k.t, 4)); return [...s].sort((a, b) => a - b); }

/* ================= clip in / out / loop animations ================= */
// each returns a state delta for progress p (in: 0 -> 1 arriving, out: 0 -> 1 leaving)
const A0 = () => ({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, a: 1, blur: 0 });
const IN_ANIMS = {
  none: { n: 'None' },
  fade: { n: 'Fade in', f: (s, p) => { s.a *= smooth(p); } },
  zoomin: { n: 'Zoom in', f: (s, p) => { const e = easeOutCubic(p); s.sx *= lerp(0.5, 1, e); s.sy = s.sx; s.a *= Math.min(1, p * 2); } },
  zoomout: { n: 'Zoom out', f: (s, p) => { const e = easeOutCubic(p); s.sx *= lerp(1.6, 1, e); s.sy = s.sx; s.a *= Math.min(1, p * 2); } },
  slideL: { n: 'Slide from right', f: (s, p, W) => { s.x += (1 - easeOutCubic(p)) * W; } },
  slideR: { n: 'Slide from left', f: (s, p, W) => { s.x -= (1 - easeOutCubic(p)) * W; } },
  slideU: { n: 'Slide up', f: (s, p, W, H) => { s.y += (1 - easeOutCubic(p)) * H; } },
  slideD: { n: 'Slide down', f: (s, p, W, H) => { s.y -= (1 - easeOutCubic(p)) * H; } },
  rise: { n: 'Rise', f: (s, p, W, H) => { const e = easeOutCubic(p); s.y += (1 - e) * H * 0.08; s.a *= e; } },
  pop: { n: 'Pop', f: (s, p) => { const e = easeOutBack(p); s.sx *= Math.max(0, e); s.sy = s.sx; s.a *= Math.min(1, p * 3); } },
  bounce: { n: 'Bounce in', f: (s, p, W, H) => { s.y -= (1 - easeOutBounce(p)) * H * 0.5; s.a *= Math.min(1, p * 4); } },
  elastic: { n: 'Elastic', f: (s, p) => { const e = easeOutElastic(p); s.sx *= e; s.sy = s.sx; } },
  spin: { n: 'Spin in', f: (s, p) => { const e = easeOutCubic(p); s.rot += (1 - e) * -360; s.sx *= e; s.sy = s.sx; } },
  swing: { n: 'Swing', f: (s, p) => { const e = easeOutElastic(p); s.rot += (1 - e) * 30; s.a *= Math.min(1, p * 3); } },
  flip: { n: 'Flip', f: (s, p) => { s.sx *= Math.cos((1 - easeOutCubic(p)) * Math.PI / 2); } },
  blur: { n: 'Blur in', f: (s, p) => { s.blur += (1 - p) * 30; s.a *= smooth(p); } },
  drop: { n: 'Drop', f: (s, p, W, H) => { const e = easeOutBack(p); s.y -= (1 - e) * H * 0.3; s.a *= Math.min(1, p * 2); } }
};
const OUT_ANIMS = {
  none: { n: 'None' },
  fade: { n: 'Fade out', f: (s, p) => { s.a *= 1 - smooth(p); } },
  zoomin: { n: 'Zoom in', f: (s, p) => { s.sx *= lerp(1, 1.6, easeInCubic(p)); s.sy = s.sx; s.a *= 1 - Math.max(0, p * 2 - 1); } },
  zoomout: { n: 'Zoom out', f: (s, p) => { s.sx *= lerp(1, 0.4, easeInCubic(p)); s.sy = s.sx; s.a *= 1 - Math.max(0, p * 2 - 1); } },
  slideL: { n: 'Slide to left', f: (s, p, W) => { s.x -= easeInCubic(p) * W; } },
  slideR: { n: 'Slide to right', f: (s, p, W) => { s.x += easeInCubic(p) * W; } },
  slideU: { n: 'Slide up', f: (s, p, W, H) => { s.y -= easeInCubic(p) * H; } },
  slideD: { n: 'Slide down', f: (s, p, W, H) => { s.y += easeInCubic(p) * H; } },
  sink: { n: 'Sink', f: (s, p, W, H) => { const e = easeInCubic(p); s.y += e * H * 0.08; s.a *= 1 - e; } },
  pop: { n: 'Pop out', f: (s, p) => { const e = 1 - easeOutBack(1 - p); s.sx *= Math.max(0, 1 - e); s.sy = s.sx; } },
  spin: { n: 'Spin out', f: (s, p) => { const e = easeInCubic(p); s.rot += e * 360; s.sx *= 1 - e; s.sy = s.sx; } },
  flip: { n: 'Flip', f: (s, p) => { s.sx *= Math.cos(easeInCubic(p) * Math.PI / 2); } },
  blur: { n: 'Blur out', f: (s, p) => { s.blur += p * 30; s.a *= 1 - smooth(p); } }
};
const LOOP_ANIMS = {
  none: { n: 'None' },
  float: { n: 'Float', f: (s, t, H) => { s.y += Math.sin(t * Math.PI) * H * 0.015; } },
  pulse: { n: 'Pulse', f: (s, t) => { const k = 1 + Math.sin(t * Math.PI * 2) * 0.05; s.sx *= k; s.sy *= k; } },
  heartbeat: { n: 'Heartbeat', f: (s, t) => { const f = t % 1; const k = 1 + (f < .15 ? Math.sin(f / .15 * Math.PI) * .09 : f > .25 && f < .4 ? Math.sin((f - .25) / .15 * Math.PI) * .06 : 0); s.sx *= k; s.sy *= k; } },
  sway: { n: 'Sway', f: (s, t) => { s.rot += Math.sin(t * Math.PI) * 6; } },
  shake: { n: 'Shake', f: (s, t, H) => { s.x += (Math.sin(t * 71) + Math.sin(t * 43)) * H * 0.004; s.y += (Math.sin(t * 59) + Math.cos(t * 37)) * H * 0.004; } },
  spin: { n: 'Spin', f: (s, t) => { s.rot += t * 360; } },
  wobble: { n: 'Jelly', f: (s, t) => { const k = Math.sin(t * Math.PI * 3) * 0.06; s.sx *= 1 + k; s.sy *= 1 - k; } },
  flicker: { n: 'Flicker', f: (s, t) => { const n = Math.sin(t * 91.7) * Math.sin(t * 33.1); s.a *= n > 0.6 ? 0.35 : 1; } },
  blink: { n: 'Blink', f: (s, t) => { s.a *= (t % 1) < 0.5 ? 1 : 0; } }
};
function clipAnimState(c, lt, W, H) {
  const s = A0(), a = c.anim; if (!a) return s;
  if (a.in && a.in.id !== 'none' && lt < a.in.dur) IN_ANIMS[a.in.id].f(s, clamp(lt / Math.max(0.01, a.in.dur), 0, 1), W, H);
  const rem = c.dur - lt;
  if (a.out && a.out.id !== 'none' && rem < a.out.dur) OUT_ANIMS[a.out.id].f(s, clamp(1 - rem / Math.max(0.01, a.out.dur), 0, 1), W, H);
  if (a.loop && a.loop.id !== 'none') LOOP_ANIMS[a.loop.id].f(s, lt * (a.loop.speed || 1), H, W);
  return s;
}

/* ================= text animations (per character) ================= */
// state per char: {dx,dy,s,rot,a,show,blur}
const TEXT_IN = {
  none: 'None', typewriter: 'Typewriter', fade: 'Fade in', bounce: 'Bounce', rise: 'Rise per letter', pop: 'Pop per letter', drop: 'Drop in', blur: 'Blur in', spread: 'Spread', wipe: 'Wipe'
};
const TEXT_OUT = { none: 'None', typewriter: 'Erase', fade: 'Fade out', bounce: 'Bounce out', sink: 'Sink', pop: 'Pop out', blur: 'Blur out', spread: 'Spread' };
const TEXT_LOOP = { none: 'None', wave: 'Wave', bounce: 'Bounce loop', pulse: 'Pulse', flicker: 'Neon flicker', shake: 'Shake', swing: 'Swing', jitter: 'Jitter' };
function textCharState(tx, i, n, lt, dur, size) {
  const s = { dx: 0, dy: 0, s: 1, rot: 0, a: 1, show: 1, blur: 0 };
  const ai = tx.ain || { id: 'none', dur: 1 }, ao = tx.aout || { id: 'none', dur: 1 }, al = tx.aloop || { id: 'none', speed: 1, amt: 1 };
  const stag = (p, i, n, w = 0.5) => clamp((p * (1 + w * (n - 1) / Math.max(1, n - 1)) - (n > 1 ? i / (n - 1) * w * (n - 1) / Math.max(1, n - 1) : 0)) / 1, 0, 1);
  const per = (p, i, n) => { const span = n > 1 ? 0.6 : 0; const st = n > 1 ? i / (n - 1) * span : 0; return clamp((p - st) / (1 - span), 0, 1); };
  if (ai.id !== 'none' && lt < ai.dur) {
    const p = clamp(lt / Math.max(0.01, ai.dur), 0, 1), q = per(p, i, n);
    switch (ai.id) {
      case 'typewriter': s.show = (i < Math.floor(p * n + 1e-6) || p >= 1) ? 1 : 0; break;
      case 'fade': s.a *= smooth(q); break;
      case 'bounce': s.dy -= (1 - easeOutBounce(q)) * size * 1.6; s.a *= Math.min(1, q * 4); break;
      case 'rise': s.dy += (1 - easeOutCubic(q)) * size * 0.8; s.a *= q; break;
      case 'pop': s.s *= Math.max(0, easeOutBack(q)); break;
      case 'drop': s.dy -= (1 - easeOutBack(q)) * size * 1.2; s.a *= Math.min(1, q * 3); break;
      case 'blur': s.blur += (1 - q) * size * 0.4; s.a *= q; break;
      case 'spread': s.dx += (i - (n - 1) / 2) * size * 0.6 * (1 - easeOutCubic(p)); s.a *= smooth(p); break;
      case 'wipe': s.a *= clamp(p * n - i, 0, 1); break;
    }
  }
  const rem = dur - lt;
  if (ao.id !== 'none' && rem < ao.dur) {
    const p = clamp(1 - rem / Math.max(0.01, ao.dur), 0, 1), q = per(p, i, n);
    switch (ao.id) {
      case 'typewriter': if (i >= n - Math.floor(p * n + 1e-6)) s.show = 0; break;
      case 'fade': s.a *= 1 - smooth(q); break;
      case 'bounce': s.dy -= easeInCubic(q) * size * 1.4; s.a *= 1 - q; break;
      case 'sink': s.dy += easeInCubic(q) * size * 0.8; s.a *= 1 - q; break;
      case 'pop': s.s *= 1 - easeInCubic(q); break;
      case 'blur': s.blur += q * size * 0.4; s.a *= 1 - q; break;
      case 'spread': s.dx += (i - (n - 1) / 2) * size * 0.6 * easeInCubic(p); s.a *= 1 - smooth(p); break;
    }
  }
  if (al.id !== 'none') {
    const t = lt * (al.speed || 1), am = al.amt == null ? 1 : al.amt;
    switch (al.id) {
      case 'wave': s.dy += Math.sin(t * 5 - i * 0.55) * size * 0.12 * am; break;
      case 'bounce': s.dy -= Math.abs(Math.sin(t * 4 - i * 0.4)) * size * 0.18 * am; break;
      case 'pulse': s.s *= 1 + Math.sin(t * 5) * 0.06 * am; break;
      case 'flicker': { const k = Math.sin(t * 61 + i * 7.3) * Math.sin(t * 23.1 + i); s.a *= k > 0.7 ? 0.25 : 1; break; }
      case 'shake': s.dx += Math.sin(t * 53 + i * 3) * size * 0.03 * am; s.dy += Math.cos(t * 47 + i * 5) * size * 0.03 * am; break;
      case 'swing': s.rot += Math.sin(t * 4 - i * 0.5) * 12 * am; break;
      case 'jitter': { const r = rng((Math.floor(t * 12) * 131 + i * 17) | 0); s.dx += (r() - .5) * size * .06 * am; s.dy += (r() - .5) * size * .06 * am; s.rot += (r() - .5) * 8 * am; break; }
    }
  }
  return s;
}

/* ================= transitions ================= */
// fn(ctx, A, B, p, W, H): A = outgoing frame canvas (may be null), B = incoming
function drawFull(ctx, c, a = 1) { if (!c) return; ctx.globalAlpha = a; ctx.drawImage(c, 0, 0); ctx.globalAlpha = 1; }
function softWipe(ctx, B, W, H, x0, y0, x1, y1, p, soft = 0.08) {
  // reveal B along a gradient direction
  const tmp = scratch('wipe', W, H), t = tmp.getContext('2d');
  t.globalCompositeOperation = 'copy'; t.drawImage(B, 0, 0); t.globalCompositeOperation = 'destination-in';
  const g = t.createLinearGradient(x0, y0, x1, y1), e = lerp(-soft, 1, p);
  g.addColorStop(clamp(e, 0, 1), 'rgba(0,0,0,1)'); g.addColorStop(clamp(e + soft, 0, 1), 'rgba(0,0,0,0)');
  t.fillStyle = g; t.fillRect(0, 0, W, H); t.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
}
function shapeReveal(ctx, B, W, H, pathFn) { ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
const TRANS = {
  dissolve: { n: 'Dissolve', f: (x, A, B, p) => { drawFull(x, A, 1); drawFull(x, B, p); } },
  black: { n: 'Dip to black', f: (x, A, B, p, W, H) => { if (p < .5) { drawFull(x, A); x.fillStyle = `rgba(0,0,0,${p * 2})`; x.fillRect(0, 0, W, H); } else { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); drawFull(x, B, (p - .5) * 2); } } },
  white: { n: 'Dip to white', f: (x, A, B, p, W, H) => { if (p < .5) { drawFull(x, A); x.fillStyle = `rgba(255,255,255,${p * 2})`; x.fillRect(0, 0, W, H); } else { drawFull(x, B); x.fillStyle = `rgba(255,255,255,${2 - p * 2})`; x.fillRect(0, 0, W, H); } } },
  flash: { n: 'Flash', f: (x, A, B, p, W, H) => { drawFull(x, p < .5 ? A : B); const k = 1 - Math.abs(p - .5) * 2; x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(255,250,235,${k * k})`; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; } },
  pushL: { n: 'Push left', f: (x, A, B, p, W) => { const e = smooth(p) * W; if (A) x.drawImage(A, -e, 0); x.drawImage(B, W - e, 0); } },
  pushR: { n: 'Push right', f: (x, A, B, p, W) => { const e = smooth(p) * W; if (A) x.drawImage(A, e, 0); x.drawImage(B, e - W, 0); } },
  pushU: { n: 'Push up', f: (x, A, B, p, W, H) => { const e = smooth(p) * H; if (A) x.drawImage(A, 0, -e); x.drawImage(B, 0, H - e); } },
  pushD: { n: 'Push down', f: (x, A, B, p, W, H) => { const e = smooth(p) * H; if (A) x.drawImage(A, 0, e); x.drawImage(B, 0, e - H); } },
  coverL: { n: 'Cover left', f: (x, A, B, p, W) => { drawFull(x, A); x.drawImage(B, (1 - easeOutCubic(p)) * W, 0); } },
  coverR: { n: 'Cover right', f: (x, A, B, p, W) => { drawFull(x, A); x.drawImage(B, -(1 - easeOutCubic(p)) * W, 0); } },
  wipeL: { n: 'Wipe left', f: (x, A, B, p, W, H) => { drawFull(x, A); softWipe(x, B, W, H, W, 0, 0, 0, p); } },
  wipeR: { n: 'Wipe right', f: (x, A, B, p, W, H) => { drawFull(x, A); softWipe(x, B, W, H, 0, 0, W, 0, p); } },
  wipeU: { n: 'Wipe up', f: (x, A, B, p, W, H) => { drawFull(x, A); softWipe(x, B, W, H, 0, H, 0, 0, p); } },
  wipeD: { n: 'Wipe down', f: (x, A, B, p, W, H) => { drawFull(x, A); softWipe(x, B, W, H, 0, 0, 0, H, p); } },
  diag: { n: 'Diagonal wipe', f: (x, A, B, p, W, H) => { drawFull(x, A); softWipe(x, B, W, H, 0, 0, W, H, p, 0.12); } },
  circle: { n: 'Circle open', f: (x, A, B, p, W, H) => { drawFull(x, A); const r = easeInCubic(p) * Math.hypot(W, H) / 2; shapeReveal(x, B, W, H, c => c.arc(W / 2, H / 2, Math.max(0.1, r), 0, 7)); } },
  circleC: { n: 'Circle close', f: (x, A, B, p, W, H) => { drawFull(x, B); const r = (1 - easeOutCubic(p)) * Math.hypot(W, H) / 2; if (A) shapeReveal(x, A, W, H, c => c.arc(W / 2, H / 2, Math.max(0.1, r), 0, 7)); } },
  diamond: { n: 'Diamond', f: (x, A, B, p, W, H) => { drawFull(x, A); const r = easeInCubic(p) * (W + H) / 2 * 1.02; shapeReveal(x, B, W, H, c => { c.moveTo(W / 2, H / 2 - r); c.lineTo(W / 2 + r, H / 2); c.lineTo(W / 2, H / 2 + r); c.lineTo(W / 2 - r, H / 2); c.closePath(); }); } },
  clock: { n: 'Clock wipe', f: (x, A, B, p, W, H) => { drawFull(x, A); const R = Math.hypot(W, H); shapeReveal(x, B, W, H, c => { c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.closePath(); }); } },
  doors: { n: 'Split open', f: (x, A, B, p, W, H) => { drawFull(x, B); if (!A) return; const e = easeInCubic(p) * W / 2; x.save(); x.beginPath(); x.rect(0, 0, W / 2 - e, H); x.clip(); x.drawImage(A, -e, 0); x.restore(); x.save(); x.beginPath(); x.rect(W / 2 + e, 0, W / 2, H); x.clip(); x.drawImage(A, e, 0); x.restore(); } },
  blinds: { n: 'Blinds', f: (x, A, B, p, W, H) => { drawFull(x, A); const n = 10, bw = W / n, e = smooth(p); shapeReveal(x, B, W, H, c => { for (let i = 0; i < n; i++) c.rect(i * bw, 0, bw * e + 0.5, H); }); } },
  zoomIn: { n: 'Zoom in', f: (x, A, B, p, W, H) => { const e = easeInCubic(Math.min(1, p * 1.25)); if (A && p < .8) { x.save(); x.translate(W / 2, H / 2); x.scale(1 + e * 2, 1 + e * 2); x.globalAlpha = 1 - e; x.drawImage(A, -W / 2, -H / 2); x.restore(); } const f = clamp((p - .2) / .8, 0, 1); x.save(); x.translate(W / 2, H / 2); const s = lerp(0.6, 1, easeOutCubic(f)); x.scale(s, s); x.globalAlpha = f; x.drawImage(B, -W / 2, -H / 2); x.restore(); } },
  zoomOut: { n: 'Zoom out', f: (x, A, B, p, W, H) => { if (A) { x.save(); x.translate(W / 2, H / 2); const s = 1 - easeInCubic(p) * .5; x.scale(s, s); x.globalAlpha = 1 - p; x.drawImage(A, -W / 2, -H / 2); x.restore(); } x.save(); x.translate(W / 2, H / 2); const s2 = lerp(1.8, 1, easeOutCubic(p)); x.scale(s2, s2); x.globalAlpha = smooth(p); x.drawImage(B, -W / 2, -H / 2); x.restore(); } },
  spin: { n: 'Spin', f: (x, A, B, p, W, H) => { const e = smooth(p), S = p < .5 ? A : B; if (!S) return; x.save(); x.translate(W / 2, H / 2); x.rotate((p < .5 ? e : e - 1) * Math.PI); const s = 1 - Math.sin(p * Math.PI) * .5; x.scale(s, s); x.drawImage(S, -W / 2, -H / 2); x.restore(); } },
  whip: { n: 'Whip pan', f: (x, A, B, p, W, H) => { const e = smooth(p), off = e * W; for (let k = 0; k < 6; k++) { const o = off + (k - 3) * W * 0.02 * Math.sin(p * Math.PI); x.globalAlpha = k ? 0.22 : 1; if (A) x.drawImage(A, -o, 0); x.drawImage(B, W - o, 0); } x.globalAlpha = 1; } },
  blurx: { n: 'Blur dissolve', f: (x, A, B, p) => { const b = Math.sin(p * Math.PI) * 24; x.filter = `blur(${b}px)`; drawFull(x, A); drawFull(x, B, smooth(p)); x.filter = 'none'; } },
  pixel: { n: 'Pixelate', f: (x, A, B, p, W, H) => { const k = Math.sin(p * Math.PI), sz = Math.max(1, Math.round(k * 60)); const S = p < .5 ? A : B; if (!S) return; if (sz <= 1) { x.drawImage(S, 0, 0); return; } const sm = scratch('pix', Math.ceil(W / sz), Math.ceil(H / sz)); const sc = sm.getContext('2d'); sc.clearRect(0, 0, sm.width, sm.height); sc.drawImage(S, 0, 0, sm.width, sm.height); x.imageSmoothingEnabled = false; x.drawImage(sm, 0, 0, sm.width * sz, sm.height * sz); x.imageSmoothingEnabled = true; } },
  glitch: { n: 'Glitch', f: (x, A, B, p, W, H) => { const S = p < .5 ? A : B; if (!S) return; x.drawImage(S, 0, 0); const k = Math.sin(p * Math.PI), r = rng((p * 1000 | 0) + 7); for (let i = 0; i < 14; i++) { const y = r() * H, hh = r() * H * 0.08 * k + 2, dx = (r() - .5) * W * 0.25 * k; x.drawImage(S, 0, y, W, hh, dx, y, W, hh); } x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35 * k; x.drawImage(S, k * W * .015, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; } },
  burn: { n: 'Light leak', f: (x, A, B, p, W, H) => { drawFull(x, A); drawFull(x, B, smooth(p)); const k = Math.sin(p * Math.PI); const g = x.createRadialGradient(W * (.2 + p * .6), H * .4, 0, W * (.2 + p * .6), H * .4, W * .8); g.addColorStop(0, `rgba(255,190,90,${k * .9})`); g.addColorStop(.4, `rgba(255,90,40,${k * .45})`); g.addColorStop(1, 'rgba(255,60,0,0)'); x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; } }
};
const scratchMap = {};
function scratch(key, w, hh) {
  let c = scratchMap[key];
  if (!c) { c = scratchMap[key] = document.createElement('canvas'); }
  if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
  return c;
}
