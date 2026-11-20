/* ================= stickers, arrows, callouts, shapes (drawn by hand, marker style) ================= */
function vnoise(seed) {
  const r = rng(seed * 9973 + 17), tab = Array.from({ length: 256 }, () => r());
  return x => { const i = Math.floor(x), f = x - i, a = tab[i & 255], b = tab[(i + 1) & 255]; return a + (b - a) * f * f * (3 - 2 * f); };
}
// sample helpers return arrays of [x,y]
const S_line = (x0, y0, x1, y1, n = 24) => Array.from({ length: n + 1 }, (_, i) => [lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
const S_quad = (x0, y0, cx, cy, x1, y1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; });
const S_cubic = (x0, y0, a, b, c, d, x1, y1, n = 50) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * b + 3 * u * t * t * d + t * t * t * y1]; });
const S_ell = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const S_poly = (pts, closed = true, per = 10) => { const out = []; const P2 = closed ? [...pts, pts[0]] : pts; for (let i = 0; i < P2.length - 1; i++) { const [a, b] = P2[i], [c, d] = P2[i + 1]; for (let k = 0; k < per; k++) out.push([lerp(a, c, k / per), lerp(b, d, k / per)]); } out.push(P2[P2.length - 1]); return out; };
function wobble(pts, seed, amp) {
  if (!amp) return pts;
  const nx = vnoise(seed), ny = vnoise(seed + 5);
  let len = 0;
  return pts.map((p, i) => { if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return [p[0] + (nx(len / 60) - .5) * amp, p[1] + (ny(len / 60) - .5) * amp]; });
}
function cutPath(pts, prog) {
  if (prog >= 1) return pts;
  if (prog <= 0) return [];
  let tot = 0; const L = [0];
  for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(tot); }
  const tgt = tot * prog, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (L[i] <= tgt) out.push(pts[i]); else { const f = (tgt - L[i - 1]) / (L[i] - L[i - 1]); out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); break; } }
  return out;
}
// marker stroke: main pass + a thinner lighter pass offset a little, like real ink
function mstroke(x, pts, w, col, prog = 1, seed = 1, amp = 3) {
  const p = cutPath(wobble(pts, seed, amp), prog);
  if (p.length < 2) return;
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = col[0] === '#' ? css(col) : col; x.lineWidth = w;
  x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); x.stroke();
  x.save(); x.globalAlpha *= 0.28; x.lineWidth = w * 0.45; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.globalCompositeOperation = 'source-atop';
  x.beginPath(); x.moveTo(p[0][0] - w * .12, p[0][1] - w * .18); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0] - w * .12, p[i][1] - w * .18); x.stroke();
  x.restore();
}
function mfill(x, pts, col, seed = 1, amp = 2) { const p = wobble(pts, seed, amp); x.fillStyle = col[0] === '#' ? css(col) : col; x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); x.closePath(); x.fill(); }
function head(x, pts, w, col, prog, seed, size = 1) {
  if (prog < 0.98) return;
  const n = pts.length, [x1, y1] = pts[n - 1], [x0, y0] = pts[Math.max(0, n - 6)];
  const a = Math.atan2(y1 - y0, x1 - x0), L = (28 + w * 2.2) * size;
  mstroke(x, [[x1 - Math.cos(a - .5) * L, y1 - Math.sin(a - .5) * L], [x1, y1]], w, col, 1, seed + 3, 2);
  mstroke(x, [[x1, y1], [x1 - Math.cos(a + .5) * L, y1 - Math.sin(a + .5) * L]], w, col, 1, seed + 4, 2);
}
function stxt(x, o, cx, cy, maxW, size) {
  if (!o.txt) return;
  x.save(); x.fillStyle = css(o.tc); x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = size; x.font = `800 ${fs}px ${o.font || 'system-ui, sans-serif'}`;
  const lines = String(o.txt).split('\n');
  let w = Math.max(...lines.map(l => x.measureText(l).width));
  if (w > maxW) { fs *= maxW / w; x.font = `800 ${fs}px ${o.font || 'system-ui, sans-serif'}`; }
  lines.forEach((l, i) => x.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * fs * 1.15));
  x.restore();
}
const star = (cx, cy, R, r, n = 5, rot = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const heartPts = (s = 1) => Array.from({ length: 80 }, (_, i) => { const t = i / 79 * Math.PI * 2; return [16 * Math.pow(Math.sin(t), 3) * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s]; });

const STK = [
  // ---------- arrows ----------
  { id: 'arrow', n: 'Arrow', cat: 'Arrows', w: 420, h: 140, d(x, o) { const p = S_line(-180, 20, 180, -10); mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); } },
  { id: 'arrowCurve', n: 'Curved arrow', cat: 'Arrows', w: 400, h: 260, d(x, o) { const p = S_quad(-170, 90, -20, -150, 165, 40); mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); } },
  { id: 'arrowLoop', n: 'Loop arrow', cat: 'Arrows', w: 440, h: 260, d(x, o) { const p = [...S_cubic(-200, 60, -80, 80, -10, -40, -60, -90, 30), ...S_cubic(-60, -90, -110, -140, -150, 0, 10, 30, 30).slice(1), ...S_quad(10, 30, 120, 60, 190, -40, 24).slice(1)]; mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); } },
  { id: 'arrowSquig', n: 'Squiggle arrow', cat: 'Arrows', w: 440, h: 160, d(x, o) { const p = Array.from({ length: 90 }, (_, i) => { const t = i / 89; return [-190 + t * 370, Math.sin(t * Math.PI * 3.2) * 40 * (1 - t * .6)]; }); mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); } },
  { id: 'arrowDouble', n: 'Double arrow', cat: 'Arrows', w: 440, h: 120, d(x, o) { const p = S_line(-180, 0, 180, 0); mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); head(x, [...p].reverse(), o.sw, o.c1, o.p, o.seed + 9); } },
  { id: 'arrowBlock', n: 'Block arrow', cat: 'Arrows', w: 420, h: 220, d(x, o) { const pts = S_poly([[-190, -45], [60, -45], [60, -100], [195, 0], [60, 100], [60, 45], [-190, 45]], true, 8); x.save(); x.beginPath(); x.rect(-210, -120, 420 * o.p, 240); x.clip(); mfill(x, pts, css(o.c2), o.seed, 3); mstroke(x, pts, o.sw * .6, o.c1, 1, o.seed, 3); x.restore(); } },
  { id: 'arrowDown', n: 'Point down', cat: 'Arrows', w: 160, h: 320, anim: 1, d(x, o) { const b = Math.sin(o.t * 6) * 18; x.translate(0, b); const p = S_line(0, -130, 0, 120); mstroke(x, p, o.sw, o.c1, o.p, o.seed); head(x, p, o.sw, o.c1, o.p, o.seed); } },
  { id: 'chevrons', n: 'Chevrons', cat: 'Arrows', w: 360, h: 160, anim: 1, d(x, o) { for (let i = 0; i < 3; i++) { const k = (Math.sin(o.t * 6 - i * 1.1) + 1) / 2; x.globalAlpha = .25 + k * .75; const cx = -100 + i * 100; mstroke(x, [[cx - 30, -55], [cx + 30, 0], [cx - 30, 55]], o.sw, o.c1, o.p, o.seed + i, 2); } x.globalAlpha = 1; } },
  // ---------- callouts ----------
  { id: 'bubble', n: 'Speech bubble', cat: 'Callouts', w: 460, h: 320, txt: 'Hello!', d(x, o) { const pts = [...S_ell(0, -20, 200, 115, Math.PI * .62, Math.PI * 2.5, 80), [-150, 140]]; mfill(x, pts, css(o.c2), o.seed, 3); mstroke(x, [...pts, pts[0]], o.sw * .7, o.c1, o.p, o.seed, 3); stxt(x, o, 0, -20, 320, 64); } },
  { id: 'bubbleRect', n: 'Box bubble', cat: 'Callouts', w: 480, h: 300, txt: 'Look here', d(x, o) { const pts = S_poly([[-210, -120], [210, -120], [210, 70], [-40, 70], [-120, 135], [-100, 70], [-210, 70]], true, 10); mfill(x, pts, css(o.c2), o.seed); mstroke(x, pts, o.sw * .7, o.c1, o.p, o.seed); stxt(x, o, 0, -25, 380, 60); } },
  { id: 'thought', n: 'Thought bubble', cat: 'Callouts', w: 460, h: 340, txt: 'Hmm...', d(x, o) { const bumps = []; const n = 11; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; const pa = [Math.cos(a0) * 190, -30 + Math.sin(a0) * 110], pb = [Math.cos(a1) * 190, -30 + Math.sin(a1) * 110]; const am = (a0 + a1) / 2; bumps.push(...S_quad(pa[0], pa[1], Math.cos(am) * 245, -30 + Math.sin(am) * 150, pb[0], pb[1], 10)); } mfill(x, bumps, css(o.c2), o.seed); mstroke(x, bumps, o.sw * .6, o.c1, o.p, o.seed); for (const [cx, cy, r] of [[-120, 120, 22], [-160, 150, 13]]) { const e = S_ell(cx, cy, r, r); mfill(x, e, css(o.c2), o.seed); mstroke(x, e, o.sw * .5, o.c1, o.p, o.seed); } stxt(x, o, 0, -30, 300, 56); } },
  { id: 'shout', n: 'Shout burst', cat: 'Callouts', w: 440, h: 340, txt: 'WOW!', d(x, o) { const pts = star(0, 0, 210, 140, 14, -Math.PI / 2).map((p, i) => [p[0], p[1] * .78]); const s = S_poly(pts, true, 3); mfill(x, s, css(o.c2), o.seed, 4); mstroke(x, s, o.sw * .7, o.c1, o.p, o.seed, 4); stxt(x, o, 0, 0, 230, 80); } },
  { id: 'tag', n: 'Label tag', cat: 'Callouts', w: 420, h: 180, txt: 'NEW', d(x, o) { const pts = S_poly([[-130, -70], [190, -70], [190, 70], [-130, 70], [-195, 0]], true, 10); mfill(x, pts, css(o.c2), o.seed); mstroke(x, pts, o.sw * .6, o.c1, o.p, o.seed); const e = S_ell(-130, 0, 14, 14); mstroke(x, e, o.sw * .5, o.c1, o.p, o.seed); stxt(x, o, 30, 0, 260, 72); } },
  { id: 'ribbon', n: 'Ribbon banner', cat: 'Callouts', w: 560, h: 200, txt: 'TODAY ONLY', d(x, o) { const dk = css(o.c2, 1); x.save(); x.filter = 'brightness(0.62)'; mfill(x, S_poly([[-270, -20], [-190, -20], [-190, 70], [-270, 70], [-240, 25]]), dk, o.seed); mfill(x, S_poly([[270, -20], [190, -20], [190, 70], [270, 70], [240, 25]]), dk, o.seed + 1); x.restore(); const m = S_poly([[-210, -60], [210, -60], [210, 45], [-210, 45]], true, 12); mfill(x, m, dk, o.seed + 2); mstroke(x, m, o.sw * .5, o.c1, o.p, o.seed + 2); stxt(x, o, 0, -8, 380, 56); } },
  { id: 'badge', n: 'Number badge', cat: 'Callouts', w: 220, h: 220, txt: '1', d(x, o) { const e = S_ell(0, 0, 95, 95); mfill(x, e, css(o.c2), o.seed); mstroke(x, e, o.sw * .7, o.c1, o.p, o.seed); stxt(x, o, 0, 4, 130, 110); } },
  { id: 'note', n: 'Sticky note', cat: 'Callouts', w: 360, h: 360, txt: 'Remember\nthis!', d(x, o) { const pts = S_poly([[-160, -160], [160, -160], [160, 110], [110, 160], [-160, 160]], true, 10); mfill(x, pts, css(o.c2), o.seed, 2); x.save(); x.filter = 'brightness(0.78)'; mfill(x, [[160, 110], [110, 160], [118, 118]], css(o.c2), o.seed, 0); x.restore(); stxt(x, o, -10, -10, 270, 52); } },
  { id: 'lower', n: 'Lower third', cat: 'Callouts', w: 760, h: 170, txt: 'Your Name\nTitle here', d(x, o) { const w = 700 * easeOutCubic(o.p); x.fillStyle = css(o.c1); x.fillRect(-350, -70, 22, 140 * Math.min(1, o.p * 3)); x.fillStyle = css(o.c2); x.fillRect(-320, -70, w - 30, 140); x.save(); x.beginPath(); x.rect(-320, -70, w - 30, 140); x.clip(); o.tc && (x.textAlign = 'left'); const ls = String(o.txt || '').split('\n'); x.fillStyle = css(o.tc); x.textBaseline = 'middle'; x.font = `800 52px ${o.font || 'system-ui, sans-serif'}`; x.fillText(ls[0] || '', -295, ls.length > 1 ? -24 : 0); if (ls[1]) { x.globalAlpha = .75; x.font = `500 34px ${o.font || 'system-ui, sans-serif'}`; x.fillText(ls[1], -295, 34); } x.restore(); } },
  { id: 'pointer', n: 'Callout line', cat: 'Callouts', w: 560, h: 300, txt: 'Detail', d(x, o) { const e = S_ell(-200, 80, 50, 50); mstroke(x, e, o.sw * .7, o.c1, Math.min(1, o.p * 2), o.seed); const l = [[-165, 45], [-30, -80], [240, -80]]; mstroke(x, S_poly(l, false, 12), o.sw * .6, o.c1, clamp(o.p * 2 - 1, 0, 1), o.seed + 2, 1.5); if (o.p > .9) stxt(x, { ...o, tc: o.tc }, 105, -120, 260, 50); } },
  // ---------- shapes ----------
  { id: 'ring', n: 'Circle', cat: 'Shapes', w: 300, h: 300, d(x, o) { const e = S_ell(0, 0, 130, 130, -1.6, -1.6 + Math.PI * 2.08); if (o.fill) mfill(x, e, css(o.c2), o.seed); mstroke(x, e, o.sw, o.c1, o.p, o.seed, 4); } },
  { id: 'rect', n: 'Rectangle', cat: 'Shapes', w: 420, h: 280, d(x, o) { const r = S_poly([[-190, -120], [190, -120], [190, 120], [-190, 120]], true, 14); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, r, o.sw, o.c1, o.p, o.seed, 3); } },
  { id: 'tri', n: 'Triangle', cat: 'Shapes', w: 320, h: 290, d(x, o) { const r = S_poly([[0, -130], [150, 125], [-150, 125]], true, 14); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, r, o.sw, o.c1, o.p, o.seed, 3); } },
  { id: 'star', n: 'Star', cat: 'Shapes', w: 320, h: 310, d(x, o) { const r = S_poly(star(0, 12, 150, 62), true, 6); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, r, o.sw, o.c1, o.p, o.seed, 3); } },
  { id: 'heart', n: 'Heart', cat: 'Shapes', w: 320, h: 300, d(x, o) { const r = heartPts(8.5); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, [...r, r[0]], o.sw, o.c1, o.p, o.seed, 3); } },
  { id: 'hex', n: 'Hexagon', cat: 'Shapes', w: 320, h: 300, d(x, o) { const r = S_poly(Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * 145, Math.sin(i * Math.PI / 3) * 130]), true, 10); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, r, o.sw, o.c1, o.p, o.seed, 3); } },
  { id: 'burst', n: 'Starburst', cat: 'Shapes', w: 340, h: 340, d(x, o) { const r = S_poly(star(0, 0, 160, 115, 16), true, 3); if (o.fill) mfill(x, r, css(o.c2), o.seed); mstroke(x, r, o.sw, o.c1, o.p, o.seed, 2); } },
  { id: 'cross', n: 'Cross', cat: 'Shapes', w: 260, h: 260, d(x, o) { mstroke(x, S_line(-100, -100, 100, 100), o.sw * 1.3, o.c1, Math.min(1, o.p * 2), o.seed); mstroke(x, S_line(100, -100, -100, 100), o.sw * 1.3, o.c1, clamp(o.p * 2 - 1, 0, 1), o.seed + 1); } },
  { id: 'check', n: 'Check', cat: 'Shapes', w: 300, h: 240, d(x, o) { mstroke(x, [...S_line(-120, 0, -40, 90, 12), ...S_quad(-40, 90, 30, -40, 130, -100, 30).slice(1)], o.sw * 1.3, o.c1, o.p, o.seed); } },
  { id: 'swoosh', n: 'Underline', cat: 'Shapes', w: 520, h: 120, d(x, o) { mstroke(x, S_cubic(-240, 20, -80, -10, 80, 30, 240, -15), o.sw, o.c1, o.p, o.seed, 2); } },
  { id: 'scribble', n: 'Scribble circle', cat: 'Shapes', w: 460, h: 280, d(x, o) { const p = Array.from({ length: 160 }, (_, i) => { const a = -2.4 + i / 159 * Math.PI * 2.25, rr = 1 + i / 159 * .08; return [Math.cos(a) * 200 * rr, Math.sin(a) * 105 * rr + i * .1]; }); mstroke(x, p, o.sw * .8, o.c1, o.p, o.seed, 6); } },
  { id: 'highlight', n: 'Highlighter', cat: 'Shapes', w: 520, h: 120, d(x, o) { mstroke(x, S_line(-230, 8, 230, -4), 70, css(o.c2), o.p, o.seed, 5); } },
  { id: 'brackets', n: 'Focus corners', cat: 'Shapes', w: 460, h: 300, d(x, o) { const L = 60, W = 210, H = 130; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mstroke(x, [[sx * W, sy * (H - L)], [sx * W, sy * H], [sx * (W - L), sy * H]], o.sw, o.c1, o.p, o.seed + sx * 3 + sy, 1.5); } },
  { id: 'line', n: 'Line', cat: 'Shapes', w: 460, h: 60, d(x, o) { mstroke(x, S_line(-210, 0, 210, 0), o.sw, o.c1, o.p, o.seed, 2); } },
  // ---------- animated decor ----------
  { id: 'sparkle', n: 'Sparkles', cat: 'Animated', w: 360, h: 300, anim: 1, d(x, o) { const pts = [[-90, -50, 70, 0], [80, -90, 44, 1.7], [100, 80, 56, 3.1], [-60, 100, 30, 4.4], [10, 10, 24, 5.3]]; for (const [cx, cy, r, ph] of pts) { const k = (Math.sin(o.t * 4 + ph) + 1) / 2; const rr = r * (.45 + k * .55) * o.p; x.fillStyle = css(o.c1); x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + o.t * .4, R = i % 2 ? rr * .22 : rr; x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } x.closePath(); x.fill(); } } },
  { id: 'confetti', n: 'Confetti', cat: 'Animated', w: 500, h: 500, anim: 1, d(x, o) { const r = rng(o.seed * 7 + 3), cols = [o.c1, o.c2, '#ffd60aff', '#3fd6c0ff', '#ff2d78ff', '#0a84ffff']; const T = o.t % 3; for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, v = 120 + r() * 260, rot = r() * 6, sz = 8 + r() * 12, ci = cols[(r() * cols.length) | 0]; const px = Math.cos(a) * v * Math.min(T, 1) * (1 - Math.min(T, 1) * .3), py = Math.sin(a) * v * Math.min(T, 1) * .8 + T * T * 60; x.save(); x.globalAlpha = clamp(3 - T, 0, 1); x.translate(px, py); x.rotate(rot + T * (4 + r() * 6)); x.scale(1, Math.cos(T * 8 + i)); x.fillStyle = css(ci); x.fillRect(-sz / 2, -sz / 4, sz, sz / 2); x.restore(); } } },
  { id: 'hearts', n: 'Floating hearts', cat: 'Animated', w: 300, h: 460, anim: 1, d(x, o) { const r = rng(o.seed + 11); for (let i = 0; i < 9; i++) { const ph = r(), sp = .5 + r() * .6, xo = (r() - .5) * 200, s = 2 + r() * 3; const k = ((o.t * sp + ph) % 1); x.save(); x.globalAlpha = Math.sin(k * Math.PI); x.translate(xo + Math.sin(k * 9 + i) * 24, 200 - k * 420); x.rotate(Math.sin(k * 6 + i) * .3); mfill(x, heartPts(s), css(i % 2 ? o.c1 : o.c2), i, 0); x.restore(); } } },
  { id: 'rings', n: 'Pulse rings', cat: 'Animated', w: 340, h: 340, anim: 1, d(x, o) { for (let i = 0; i < 3; i++) { const k = (o.t * .8 + i / 3) % 1; x.globalAlpha = 1 - k; mstroke(x, S_ell(0, 0, 30 + k * 130, 30 + k * 130), o.sw * (1 - k * .6), o.c1, 1, o.seed + i, 2); } x.globalAlpha = 1; mfill(x, S_ell(0, 0, 26, 26), css(o.c1), o.seed); } },
  { id: 'dots', n: 'Loading dots', cat: 'Animated', w: 300, h: 100, anim: 1, d(x, o) { for (let i = 0; i < 3; i++) { const k = Math.max(0, Math.sin(o.t * 6 - i * .9)); mfill(x, S_ell(-90 + i * 90, -k * 26, 24, 24, 0, 6.3, 24), css(o.c1), o.seed + i, 1); } } },
  { id: 'rec', n: 'REC', cat: 'Animated', w: 300, h: 110, anim: 1, d(x, o) { if ((o.t % 1) < .6) mfill(x, S_ell(-95, 0, 26, 26, 0, 6.3, 30), '#ff3b30', o.seed, 1); x.fillStyle = css(o.c1); x.font = `800 64px ${o.font || 'system-ui, sans-serif'}`; x.textBaseline = 'middle'; x.fillText('REC', -50, 3); } },
  { id: 'rays', n: 'Sun rays', cat: 'Animated', w: 360, h: 360, anim: 1, d(x, o) { x.rotate(o.t * .6); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mstroke(x, S_line(Math.cos(a) * 95, Math.sin(a) * 95, Math.cos(a) * 160, Math.sin(a) * 160, 8), o.sw * .8, o.c1, o.p, o.seed + i, 1.5); } mfill(x, S_ell(0, 0, 70, 70), css(o.c2), o.seed); } },
  { id: 'speed', n: 'Motion lines', cat: 'Animated', w: 420, h: 260, anim: 1, d(x, o) { const r = rng(o.seed); for (let i = 0; i < 7; i++) { const y = -100 + i * 33 + (r() - .5) * 10, L = 120 + r() * 160, ph = r(); const k = (o.t * 1.8 + ph) % 1; x.globalAlpha = Math.sin(k * Math.PI); const x0 = 200 - k * 380; mstroke(x, S_line(x0, y, x0 + L * .6, y, 6), o.sw * .5, o.c1, 1, o.seed + i, .5); } x.globalAlpha = 1; } },
  { id: 'bolt', n: 'Lightning', cat: 'Animated', w: 220, h: 360, anim: 1, d(x, o) { const fl = (Math.sin(o.t * 37) * Math.sin(o.t * 13) > .5) ? .45 : 1; x.globalAlpha = fl; const b = S_poly([[30, -165], [-70, 15], [5, 15], [-35, 165], [75, -30], [0, -30], [55, -165]], true, 6); mfill(x, b, css(o.c2), o.seed, 2); mstroke(x, b, o.sw * .55, o.c1, o.p, o.seed, 2); x.globalAlpha = 1; } },
  { id: 'click', n: 'Click', cat: 'Animated', w: 300, h: 300, anim: 1, d(x, o) { const k = o.t % 1.4; if (k < .7) { const q = k / .7; x.globalAlpha = 1 - q; mstroke(x, S_ell(-40, -50, 20 + q * 70, 20 + q * 70), o.sw * .6, o.c1, 1, o.seed, 1.5); x.globalAlpha = 1; } const pr = k < .15 ? 1 - k / .15 * .1 : k < .3 ? .9 + (k - .15) / .15 * .1 : 1; x.save(); x.translate(-40, -50); x.scale(pr, pr); const hand = S_poly([[0, 0], [0, 150], [36, 116], [62, 176], [86, 166], [60, 106], [108, 104]], true, 8); mfill(x, hand, css(o.c2), o.seed, 1.5); mstroke(x, hand, o.sw * .5, o.c1, 1, o.seed, 1.5); x.restore(); } }
];
const STK_BY = Object.fromEntries(STK.map(s => [s.id, s]));
function drawSticker(x, st, lt) {
  const d = STK_BY[st.id]; if (!d) return;
  const p = st.drawOn > 0 ? clamp(lt / st.drawOn, 0, 1) : 1;
  const o = { t: lt * (st.speed || 1), p, c1: st.c1, c2: st.c2, sw: st.sw || 12, txt: st.txt, tc: st.tc || '#111111ff', seed: st.seed || 1, font: st.font, fill: st.fill };
  x.save(); d.d(x, o); x.restore();
}
function stickerDefaults(d) {
  const cat = d.cat;
  return { id: d.id, c1: cat === 'Callouts' ? '#111111ff' : '#ffffffff', c2: d.id === 'note' ? '#ffe680ff' : d.id === 'highlight' ? '#ffe14dcc' : d.id === 'lower' ? '#111111e6' : cat === 'Callouts' ? '#ffffffff' : '#ff3b30ff', sw: 12, txt: d.txt || '', tc: d.id === 'lower' || d.id === 'pointer' ? '#ffffffff' : '#111111ff', drawOn: cat === 'Animated' ? 0 : 0.6, speed: 1, seed: (Math.random() * 1000) | 0, fill: false, font: '' };
}
