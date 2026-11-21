/* ================= Photo editor: adjustments and filters ================= */
const lumN = (r, g, b) => r * .299 + g * .587 + b * .114;
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s, l]; }
function hsl2rgb(hh, s, l) { hh = ((hh % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]; }
function lutRun(d, lr, lg, lb) { lg = lg || lr; lb = lb || lr; for (let i = 0; i < d.length; i += 4) { d[i] = lr[d[i]]; d[i + 1] = lg[d[i + 1]]; d[i + 2] = lb[d[i + 2]]; } }
function lutOf(f) { const l = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) l[v] = f(v); return l; }
// smooth curve through points (monotone cubic)
function curveLut(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]), n = p.length; if (n < 2) return lutOf(v => v);
  const dx = [], m = [], s = []; for (let i = 0; i < n - 1; i++) { dx[i] = Math.max(1e-6, p[i + 1][0] - p[i][0]); s[i] = (p[i + 1][1] - p[i][1]) / dx[i]; }
  m[0] = s[0]; m[n - 1] = s[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (!s[i]) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / s[i], b = m[i + 1] / s[i], hh = a * a + b * b; if (hh > 9) { const t = 3 / Math.sqrt(hh); m[i] = t * a * s[i]; m[i + 1] = t * b * s[i]; } }
  return lutOf(v => { if (v <= p[0][0]) return p[0][1]; if (v >= p[n - 1][0]) return p[n - 1][1]; let i = 0; while (v > p[i + 1][0]) i++; const hh = dx[i], t = (v - p[i][0]) / hh, t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p[i][1] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * p[i + 1][1] + (t3 - t2) * hh * m[i + 1]; });
}
function imgCanvas(img) { const c = newLayerCanvas(img.width, img.height); c.getContext('2d').putImageData(img, 0, 0); return c; }
const P_ = (k, l, min, max, v, suf, step) => ({ k, l, min, max, v, suf, step });
const PC = (k, l, v) => ({ k, l, v, type: 'color' }), PS = (k, l, v, options) => ({ k, l, v, type: 'seg', options }), PK = (k, l, v) => ({ k, l, v, type: 'check' });

/* ---------- adjustments (also usable as adjustment layers) ---------- */
const ADJ = {
  brightcon: { n: 'Brightness / contrast', ps: [P_('b', 'Brightness', -150, 150, 0), P_('c', 'Contrast', -100, 100, 0)], f(d, W, H, p) { const k = (259 * (p.c * 1.28 + 255)) / (255 * (259 - p.c * 1.28)); lutRun(d, lutOf(v => (v + p.b * .6 - 128) * k + 128)); } },
  levels: { n: 'Levels', ps: [PS('ch', 'Channel', 'rgb', [['rgb', 'All'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']]), P_('ib', 'Dark point', 0, 254, 0), P_('g', 'Middle', .1, 9.9, 1, '', .01), P_('iw', 'Light point', 1, 255, 255), P_('ob', 'Output dark', 0, 255, 0), P_('ow', 'Output light', 0, 255, 255)], hist: true,
    f(d, W, H, p) { const l = lutOf(v => p.ob + (p.ow - p.ob) * Math.pow(clamp((v - p.ib) / Math.max(1, p.iw - p.ib), 0, 1), 1 / p.g)), id = lutOf(v => v); lutRun(d, p.ch === 'rgb' || p.ch === 'r' ? l : id, p.ch === 'rgb' || p.ch === 'g' ? l : id, p.ch === 'rgb' || p.ch === 'b' ? l : id); } },
  curves: { n: 'Curves', ps: [{ k: 'pts', type: 'curves', v: { rgb: [[0, 0], [255, 255]], r: [[0, 0], [255, 255]], g: [[0, 0], [255, 255]], b: [[0, 0], [255, 255]] } }], hist: true,
    f(d, W, H, p) { const m = curveLut(p.pts.rgb), r = curveLut(p.pts.r), g = curveLut(p.pts.g), b = curveLut(p.pts.b); lutRun(d, lutOf(v => r[m[v]]), lutOf(v => g[m[v]]), lutOf(v => b[m[v]])); } },
  exposure: { n: 'Exposure', ps: [P_('e', 'Exposure', -5, 5, 0, '', .01), P_('o', 'Offset', -.5, .5, 0, '', .005), P_('g', 'Gamma', .1, 3, 1, '', .01)], f(d, W, H, p) { const k = Math.pow(2, p.e); lutRun(d, lutOf(v => Math.pow(Math.max(0, v / 255 * k + p.o), 1 / p.g) * 255)); } },
  vibrance: { n: 'Vibrance', ps: [P_('v', 'Vibrance', -100, 100, 0), P_('s', 'Saturation', -100, 100, 0)], f(d, W, H, p) { const vb = p.v / 100, sa = 1 + p.s / 100; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), cur = (mx - mn) / 255, k = sa * (1 + vb * (1 - cur) * (vb > 0 ? 1.2 : 1)), l = lumN(r, g, b); d[i] = l + (r - l) * k; d[i + 1] = l + (g - l) * k; d[i + 2] = l + (b - l) * k; } } },
  huesat: { n: 'Hue / saturation', ps: [P_('h', 'Hue', -180, 180, 0, '°'), P_('s', 'Saturation', -100, 100, 0), P_('l', 'Lightness', -100, 100, 0), PK('col', 'Colorize', false)],
    f(d, W, H, p) { for (let i = 0; i < d.length; i += 4) { let [hh, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); if (p.col) { hh = p.h + 180; s = clamp(.25 + p.s / 100 * .75, 0, 1); } else { hh += p.h; s = clamp(s * (1 + p.s / 100), 0, 1); } l = p.l > 0 ? l + (1 - l) * p.l / 100 : l * (1 + p.l / 100); const [r, g, b] = hsl2rgb(hh, s, l); d[i] = r; d[i + 1] = g; d[i + 2] = b; } } },
  colorbal: { n: 'Color balance', ps: [P_('sr', 'Shadows: cyan / red', -100, 100, 0), P_('sg', 'Shadows: magenta / green', -100, 100, 0), P_('sb', 'Shadows: yellow / blue', -100, 100, 0), P_('mr', 'Middle: cyan / red', -100, 100, 0), P_('mg', 'Middle: magenta / green', -100, 100, 0), P_('mb', 'Middle: yellow / blue', -100, 100, 0), P_('hr', 'Lights: cyan / red', -100, 100, 0), P_('hg', 'Lights: magenta / green', -100, 100, 0), P_('hb', 'Lights: yellow / blue', -100, 100, 0), PK('keep', 'Keep brightness', true)],
    f(d, W, H, p) { for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], l = lumN(r, g, b) / 255, ws = Math.pow(1 - l, 2), wh = l * l, wm = 1 - ws - wh; let R = r + (p.sr * ws + p.mr * wm + p.hr * wh) * .5, G = g + (p.sg * ws + p.mg * wm + p.hg * wh) * .5, B = b + (p.sb * ws + p.mb * wm + p.hb * wh) * .5; if (p.keep) { const k = lumN(r, g, b) / Math.max(1, lumN(R, G, B)); R *= k; G *= k; B *= k; } d[i] = R; d[i + 1] = G; d[i + 2] = B; } } },
  bw: { n: 'Black and white', ps: [P_('r', 'Reds', -200, 300, 40, '%'), P_('y', 'Yellows', -200, 300, 60, '%'), P_('g', 'Greens', -200, 300, 40, '%'), P_('c', 'Cyans', -200, 300, 60, '%'), P_('b', 'Blues', -200, 300, 20, '%'), P_('m', 'Magentas', -200, 300, 80, '%'), PK('tint', 'Tint', false), PC('tc', 'Tint color', '#e0c49aff')],
    f(d, W, H, p) { const [tr, tg, tb] = hexToRgba(p.tc); for (let i = 0; i < d.length; i += 4) { const c = [d[i], d[i + 1], d[i + 2]], idx = [0, 1, 2].sort((a, b) => c[b] - c[a]), mx = c[idx[0]], md = c[idx[1]], mn = c[idx[2]]; const prim = ['r', 'g', 'b'][idx[0]], sec = (idx[0] + idx[1] === 1) ? 'y' : (idx[0] + idx[1] === 3) ? 'c' : 'm'; const g = clamp((mx - md) * p[prim] / 100 + (md - mn) * p[sec] / 100 + mn, 0, 255); if (p.tint) { const l = g / 255; d[i] = l < .5 ? 2 * l * tr : 255 - 2 * (1 - l) * (255 - tr); d[i + 1] = l < .5 ? 2 * l * tg : 255 - 2 * (1 - l) * (255 - tg); d[i + 2] = l < .5 ? 2 * l * tb : 255 - 2 * (1 - l) * (255 - tb); } else d[i] = d[i + 1] = d[i + 2] = g; } } },
  photofilter: { n: 'Photo filter', ps: [PC('c', 'Color', '#ec8a00ff'), P_('d', 'Density', 0, 100, 25, '%'), PK('keep', 'Keep brightness', true)], f(d, W, H, p) { const [fr, fg, fb] = hexToRgba(p.c), k = p.d / 100; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; let R = r + (r * fr / 255 - r) * k * 2, G = g + (g * fg / 255 - g) * k * 2, B = b + (b * fb / 255 - b) * k * 2; if (p.keep) { const q = lumN(r, g, b) / Math.max(1, lumN(R, G, B)); R *= q; G *= q; B *= q; } d[i] = R; d[i + 1] = G; d[i + 2] = B; } } },
  chanmix: { n: 'Channel mixer', ps: [P_('rr', 'Red from red', -200, 200, 100, '%'), P_('rg', 'Red from green', -200, 200, 0, '%'), P_('rb', 'Red from blue', -200, 200, 0, '%'), P_('gr', 'Green from red', -200, 200, 0, '%'), P_('gg', 'Green from green', -200, 200, 100, '%'), P_('gb', 'Green from blue', -200, 200, 0, '%'), P_('br', 'Blue from red', -200, 200, 0, '%'), P_('bg', 'Blue from green', -200, 200, 0, '%'), P_('bb', 'Blue from blue', -200, 200, 100, '%'), PK('mono', 'Gray (uses the red row)', false)],
    f(d, W, H, p) { for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], R = (r * p.rr + g * p.rg + b * p.rb) / 100; if (p.mono) { d[i] = d[i + 1] = d[i + 2] = R; continue; } d[i] = R; d[i + 1] = (r * p.gr + g * p.gg + b * p.gb) / 100; d[i + 2] = (r * p.br + g * p.bg + b * p.bb) / 100; } } },
  temp: { n: 'White balance', ps: [P_('t', 'Temperature', -100, 100, 0), P_('ti', 'Tint', -100, 100, 0)], f(d, W, H, p) { const t = p.t * .5, g_ = p.ti * .4; for (let i = 0; i < d.length; i += 4) { d[i] += t; d[i + 2] -= t; d[i + 1] -= g_; d[i] += g_ * .3; d[i + 2] += g_ * .3; } } },
  shadhigh: { n: 'Shadows / highlights', ps: [P_('s', 'Shadows', 0, 100, 35, '%'), P_('h', 'Highlights', 0, 100, 0, '%'), P_('r', 'Radius', 1, 200, 30, 'px')],
    f(d, W, H, p, sc) { const bl = blurData(imgCanvas(new ImageData(new Uint8ClampedArray(d), W, H)), Math.max(1, p.r * sc)); for (let i = 0; i < d.length; i += 4) { const L = lumN(bl[i], bl[i + 1], bl[i + 2]) / 255, up = p.s / 100 * Math.pow(1 - L, 2) * 1.6, dn = p.h / 100 * L * L * .6; for (let c = 0; c < 3; c++) { let v = d[i + c] / 255; v = v + (1 - v) * up * (1 - v); v = v * (1 - dn); d[i + c] = v * 255; } } } },
  clarity: { n: 'Clarity', ps: [P_('a', 'Amount', -100, 100, 30), P_('r', 'Radius', 4, 200, 40, 'px')], f(d, W, H, p, sc) { const bl = blurData(imgCanvas(new ImageData(new Uint8ClampedArray(d), W, H)), Math.max(1, p.r * sc)), k = p.a / 100; for (let i = 0; i < d.length; i += 4) { const l = lumN(d[i], d[i + 1], d[i + 2]) / 255, w = 1 - Math.pow(2 * l - 1, 2); for (let c = 0; c < 3; c++) d[i + c] += (d[i + c] - bl[i + c]) * k * w; } } },
  dehaze: { n: 'Remove haze', ps: [P_('a', 'Amount', -100, 100, 40)], f(d, W, H, p, sc) { const t = newLayerCanvas(W, H), x = t.getContext('2d'), im = x.createImageData(W, H); for (let i = 0; i < d.length; i += 4) { const m = Math.min(d[i], d[i + 1], d[i + 2]); im.data[i] = im.data[i + 1] = im.data[i + 2] = m; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); const dk = blurData(t, Math.max(2, 15 * sc)), A = 245, k = p.a / 100; for (let i = 0; i < d.length; i += 4) { const tt = clamp(1 - k * .9 * dk[i] / A, .25, 1.6); for (let c = 0; c < 3; c++) d[i + c] = (d[i + c] - A) / tt + A; } } },
  invert: { n: 'Invert', ps: [], f(d) { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } } },
  posterize: { n: 'Posterize', ps: [P_('n', 'Levels', 2, 64, 6)], f(d, W, H, p) { const n = p.n - 1; lutRun(d, lutOf(v => Math.round(v / 255 * n) / n * 255)); } },
  threshold: { n: 'Threshold', ps: [P_('t', 'Level', 1, 255, 128)], hist: true, f(d, W, H, p) { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = lumN(d[i], d[i + 1], d[i + 2]) >= p.t ? 255 : 0; } },
  gradmap: { n: 'Gradient map', ps: [PC('a', 'Dark color', '#1b1446ff'), PC('m', 'Middle color', '#d1495bff'), PC('b', 'Light color', '#ffe9a8ff'), PK('rev', 'Reverse', false)],
    f(d, W, H, p) { const A = hexToRgba(p.rev ? p.b : p.a), M = hexToRgba(p.m), B = hexToRgba(p.rev ? p.a : p.b); for (let i = 0; i < d.length; i += 4) { const l = lumN(d[i], d[i + 1], d[i + 2]) / 255, [u, v, t] = l < .5 ? [A, M, l * 2] : [M, B, l * 2 - 1]; for (let c = 0; c < 3; c++) d[i + c] = u[c] + (v[c] - u[c]) * t; } } },
  selcolor: { n: 'Selective color', ps: [PS('rng', 'Colors', 'r', [['r', 'Reds'], ['y', 'Yellows'], ['g', 'Greens'], ['c', 'Cyans'], ['b', 'Blues'], ['m', 'Magentas']]), P_('hs', 'Hue', -60, 60, 0, '°'), P_('ss', 'Saturation', -100, 100, 0), P_('ls', 'Lightness', -100, 100, 0)],
    f(d, W, H, p) { const c0 = { r: 0, y: 60, g: 120, c: 180, b: 240, m: 300 }[p.rng]; for (let i = 0; i < d.length; i += 4) { let [hh, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); let dh = Math.abs(((hh - c0 + 540) % 360) - 180); const w = clamp(1 - (dh - 15) / 30, 0, 1) * Math.min(1, s * 3); if (w <= 0) continue; hh += p.hs * w; s = clamp(s * (1 + p.ss / 100 * w), 0, 1); l = clamp(l + p.ls / 100 * w * .5, 0, 1); const [r, g, b] = hsl2rgb(hh, s, l); d[i] = r; d[i + 1] = g; d[i + 2] = b; } } },
  desat: { n: 'Remove color', ps: [], instant: true, f(d) { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = lumN(d[i], d[i + 1], d[i + 2]); } },
  equalize: { n: 'Equalize', ps: [], instant: true, f(d) { const hs = new Float64Array(256); let n = 0; for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; hs[Math.round(lumN(d[i], d[i + 1], d[i + 2]))]++; n++; } let acc = 0; const map = new Float64Array(256); for (let v = 0; v < 256; v++) { acc += hs[v]; map[v] = acc / Math.max(1, n) * 255; } for (let i = 0; i < d.length; i += 4) { const l = Math.round(lumN(d[i], d[i + 1], d[i + 2])), k = map[l] / Math.max(1, l); for (let c = 0; c < 3; c++) d[i + c] *= k; } } },
  autotone: { n: 'Auto tone', ps: [], instant: true, f(d) { autoStretch(d, true); } },
  autocon: { n: 'Auto contrast', ps: [], instant: true, f(d) { autoStretch(d, false); } },
  autocol: { n: 'Auto color', ps: [], instant: true, f(d) { autoStretch(d, true); let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } const m = (r + g + b) / 3 / n; const kr = m / Math.max(1, r / n), kg = m / Math.max(1, g / n), kb = m / Math.max(1, b / n); for (let i = 0; i < d.length; i += 4) { d[i] *= (1 + (kr - 1) * .6); d[i + 1] *= (1 + (kg - 1) * .6); d[i + 2] *= (1 + (kb - 1) * .6); } } }
};
function autoStretch(d, perCh) {
  const cut = (hs, n) => { let a = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { a += hs[v]; if (a > n * .002) { lo = v; break; } } a = 0; for (let v = 255; v >= 0; v--) { a += hs[v]; if (a > n * .002) { hi = v; break; } } return [lo, Math.max(lo + 1, hi)]; };
  const H3 = [new Float64Array(256), new Float64Array(256), new Float64Array(256)], HL = new Float64Array(256); let n = 0;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; for (let c = 0; c < 3; c++) H3[c][d[i + c]]++; HL[Math.round(lumN(d[i], d[i + 1], d[i + 2]))]++; n++; }
  const r = perCh ? H3.map(h_ => cut(h_, n)) : [0, 1, 2].map(() => cut(HL, n));
  const luts = r.map(([lo, hi]) => lutOf(v => (v - lo) / (hi - lo) * 255)); lutRun(d, luts[0], luts[1], luts[2]);
}
function phAdjust(op, p, img, W, H, sc) { const a = ADJ[op]; if (a) a.f(img.data, W || img.width, H || img.height, p, sc || 1); }

/* ---------- filters ---------- */
function remap(d, W, H, fn) { // fn(x, y) -> [sx, sy] or null
  const s = d.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = fn(x, y), i = (y * W + x) * 4; if (!q) { d[i + 3] = 0; continue; }
    let [fx, fy] = q; if (fx < 0 || fy < 0 || fx > W - 1 || fy > H - 1) { fx = clamp(fx, 0, W - 1); fy = clamp(fy, 0, H - 1); }
    const ix = Math.min(W - 2, fx | 0), iy = Math.min(H - 2, fy | 0), tx = fx - ix, ty = fy - iy, a = (iy * W + ix) * 4, b = a + 4, c = a + W * 4, e = c + 4;
    for (let ch = 0; ch < 4; ch++) d[i + ch] = (s[a + ch] * (1 - tx) + s[b + ch] * tx) * (1 - ty) + (s[c + ch] * (1 - tx) + s[e + ch] * tx) * ty;
  }
}
function convolve(d, W, H, k, div, add = 0, keepA = true) { const s = d.slice(), n = Math.sqrt(k.length) | 0, r = n >> 1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) { let v = 0; for (let j = 0; j < n; j++) for (let q = 0; q < n; q++) { const xx = clamp(x + q - r, 0, W - 1), yy = clamp(y + j - r, 0, H - 1); v += s[(yy * W + xx) * 4 + c] * k[j * n + q]; } d[i + c] = v / div + add; } } }
function minmax(d, W, H, r, isMax) {
  const f = isMax ? Math.max : Math.min, t = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { let v = isMax ? 0 : 255; for (let k = -r; k <= r; k++) v = f(v, d[(y * W + clamp(x + k, 0, W - 1)) * 4 + c]); t[(y * W + x) * 4 + c] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { let v = isMax ? 0 : 255; for (let k = -r; k <= r; k++) v = f(v, t[(clamp(y + k, 0, H - 1) * W + x) * 4 + c]); d[(y * W + x) * 4 + c] = v; }
}
function median(d, W, H, r, thr) {
  const s = d.slice(), hist = new Int32Array(256), half = ((2 * r + 1) * (2 * r + 1)) >> 1;
  for (let c = 0; c < 3; c++) for (let y = 0; y < H; y++) {
    hist.fill(0);
    for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) hist[s[(clamp(y + j, 0, H - 1) * W + clamp(k, 0, W - 1)) * 4 + c]]++;
    for (let x = 0; x < W; x++) {
      let a = 0, m = 0; for (; m < 256; m++) { a += hist[m]; if (a > half) break; }
      const i = (y * W + x) * 4 + c; if (!thr || Math.abs(s[i] - m) > thr) d[i] = m;
      for (let j = -r; j <= r; j++) { const yy = clamp(y + j, 0, H - 1); hist[s[(yy * W + clamp(x - r, 0, W - 1)) * 4 + c]]--; hist[s[(yy * W + clamp(x + r + 1, 0, W - 1)) * 4 + c]]++; }
    }
  }
}
function kuwahara(d, W, H, r) { // oil paint: average of the calmest quarter around each pixel
  const N = (W + 1) * (H + 1), S = [0, 1, 2].map(() => new Float64Array(N)), Q = new Float64Array(N);
  for (let y = 0; y < H; y++) { const rs = [0, 0, 0]; let rq = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, l = lumN(d[i], d[i + 1], d[i + 2]); for (let c = 0; c < 3; c++) rs[c] += d[i + c]; rq += l * l; const k = (y + 1) * (W + 1) + x + 1, k2 = y * (W + 1) + x + 1; for (let c = 0; c < 3; c++) S[c][k] = S[c][k2] + rs[c]; Q[k] = Q[k2] + rq; } }
  const Lsum = new Float64Array(N); for (let y = 0; y < H; y++) { let rl = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; rl += lumN(d[i], d[i + 1], d[i + 2]); Lsum[(y + 1) * (W + 1) + x + 1] = Lsum[y * (W + 1) + x + 1] + rl; } }
  const box = (A, x0, y0, x1, y1) => A[y1 * (W + 1) + x1] - A[y0 * (W + 1) + x1] - A[y1 * (W + 1) + x0] + A[y0 * (W + 1) + x0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = 1e18, out = null;
    for (const [ax, ay] of [[x - r, y - r], [x, y - r], [x - r, y], [x, y]]) {
      const x0 = clamp(ax, 0, W), y0 = clamp(ay, 0, H), x1 = clamp(ax + r + 1, 0, W), y1 = clamp(ay + r + 1, 0, H), n = (x1 - x0) * (y1 - y0); if (n <= 0) continue;
      const m = box(Lsum, x0, y0, x1, y1) / n, v = box(Q, x0, y0, x1, y1) / n - m * m; if (v < best) { best = v; out = [x0, y0, x1, y1, n]; }
    }
    const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) d[i + c] = box(S[c], out[0], out[1], out[2], out[3]) / out[4];
  }
}
function noise2(x, y, seed) { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, seed) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = noise2(ix, iy, seed), b = noise2(ix + 1, iy, seed), c = noise2(ix, iy + 1, seed), e = noise2(ix + 1, iy + 1, seed); return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + e * u) * v; }
const FILT = {
  gblur: { g: 'Blur', n: 'Gaussian blur', ps: [P_('r', 'Radius', 0, 250, 6, 'px', .5)], c: (cv, p, sc) => blurCv(cv, p.r * sc) },
  mblur: { g: 'Blur', n: 'Motion blur', ps: [P_('a', 'Angle', -180, 180, 0, '°'), P_('d', 'Distance', 1, 400, 30, 'px')], c(cv, p, sc) { const W = cv.width, H = cv.height, o = newLayerCanvas(W, H), x = o.getContext('2d'), n = Math.max(4, Math.min(48, Math.round(p.d * sc / 2))), a = p.a * Math.PI / 180; x.globalAlpha = 1; for (let i = 0; i < n; i++) { const t = (i / (n - 1) - .5) * p.d * sc; x.globalAlpha = 1 / (i + 1); x.drawImage(cv, Math.cos(a) * t, -Math.sin(a) * t); } return o; } },
  zblur: { g: 'Blur', n: 'Zoom blur', ps: [P_('a', 'Amount', 1, 100, 20), P_('cx', 'Center across', 0, 100, 50, '%'), P_('cy', 'Center down', 0, 100, 50, '%')], c(cv, p) { const W = cv.width, H = cv.height, o = newLayerCanvas(W, H), x = o.getContext('2d'), n = 28, cx = W * p.cx / 100, cy = H * p.cy / 100; for (let i = 0; i < n; i++) { const s = 1 + p.a / 100 * .5 * i / (n - 1); x.globalAlpha = 1 / (i + 1); x.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s); x.drawImage(cv, 0, 0); } return o; } },
  sblur: { g: 'Blur', n: 'Spin blur', ps: [P_('a', 'Angle', 1, 90, 12, '°'), P_('cx', 'Center across', 0, 100, 50, '%'), P_('cy', 'Center down', 0, 100, 50, '%')], c(cv, p) { const W = cv.width, H = cv.height, o = newLayerCanvas(W, H), x = o.getContext('2d'), n = 30, cx = W * p.cx / 100, cy = H * p.cy / 100; for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * p.a * Math.PI / 180; x.globalAlpha = 1 / (i + 1); x.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), cx - cx * Math.cos(a) + cy * Math.sin(a), cy - cx * Math.sin(a) - cy * Math.cos(a)); x.drawImage(cv, 0, 0); } return o; } },
  tilt: { g: 'Blur', n: 'Tilt-shift', ps: [P_('y', 'Sharp band at', 0, 100, 55, '%'), P_('w', 'Band size', 2, 100, 22, '%'), P_('r', 'Blur', 1, 120, 14, 'px')], c(cv, p, sc) { const W = cv.width, H = cv.height, b = blurCv(cv, p.r * sc), m = newLayerCanvas(W, H), mx = m.getContext('2d'), g = mx.createLinearGradient(0, 0, 0, H), c = p.y / 100, w = p.w / 200; g.addColorStop(0, '#fff'); g.addColorStop(clamp(c - w * 2, 0, 1), '#fff'); g.addColorStop(clamp(c - w, 0, 1), 'rgba(255,255,255,0)'); g.addColorStop(clamp(c + w, 0, 1), 'rgba(255,255,255,0)'); g.addColorStop(clamp(c + w * 2, 0, 1), '#fff'); g.addColorStop(1, '#fff'); mx.fillStyle = g; mx.fillRect(0, 0, W, H); return phMix(cv, b, m); } },
  unsharp: { g: 'Sharpen', n: 'Unsharp mask', ps: [P_('a', 'Amount', 1, 500, 120, '%'), P_('r', 'Radius', .5, 60, 2, 'px', .5), P_('t', 'Threshold', 0, 100, 2)], f(d, W, H, p, sc) { const b = blurData(imgCanvas(new ImageData(new Uint8ClampedArray(d), W, H)), Math.max(.5, p.r * sc)), k = p.a / 100; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const df = d[i + c] - b[i + c]; if (Math.abs(df) >= p.t) d[i + c] += df * k; } } },
  sharpen: { g: 'Sharpen', n: 'Sharpen', ps: [P_('a', 'Amount', 1, 100, 40)], f(d, W, H, p) { const k = p.a / 100 * 1.6; convolve(d, W, H, [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0], 1); } },
  highpass: { g: 'Sharpen', n: 'High pass', ps: [P_('r', 'Radius', 1, 100, 8, 'px')], f(d, W, H, p, sc) { const b = blurData(imgCanvas(new ImageData(new Uint8ClampedArray(d), W, H)), p.r * sc); for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = 128 + d[i + c] - b[i + c]; } },
  noise: { g: 'Noise', n: 'Add noise', ps: [P_('a', 'Amount', 0, 100, 12, '%'), PK('mono', 'Gray noise', true)], f(d, W, H, p) { const r = tipRand(77), k = p.a * 2.2; for (let i = 0; i < d.length; i += 4) { const n = (r() + r() + r() - 1.5) * k; if (p.mono) { d[i] += n; d[i + 1] += n; d[i + 2] += n; } else { d[i] += n; d[i + 1] += (r() + r() + r() - 1.5) * k; d[i + 2] += (r() + r() + r() - 1.5) * k; } } } },
  median: { g: 'Noise', n: 'Reduce noise (median)', ps: [P_('r', 'Radius', 1, 8, 2, 'px')], f(d, W, H, p, sc) { median(d, W, H, Math.max(1, Math.round(p.r * sc)), 0); } },
  dust: { g: 'Noise', n: 'Dust and scratches', ps: [P_('r', 'Radius', 1, 8, 2, 'px'), P_('t', 'Threshold', 0, 128, 20)], f(d, W, H, p, sc) { median(d, W, H, Math.max(1, Math.round(p.r * sc)), p.t); } },
  emboss: { g: 'Stylize', n: 'Emboss', ps: [P_('a', 'Angle', -180, 180, 135, '°'), P_('h', 'Height', 1, 10, 2), P_('k', 'Amount', 1, 300, 100, '%')], f(d, W, H, p) { const a = p.a * Math.PI / 180, dx = Math.round(Math.cos(a) * p.h), dy = Math.round(-Math.sin(a) * p.h), s = d.slice(), k = p.k / 100; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = (clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)) * 4, jj = (clamp(y - dy, 0, H - 1) * W + clamp(x - dx, 0, W - 1)) * 4; const v = 128 + (lumN(s[j], s[j + 1], s[j + 2]) - lumN(s[jj], s[jj + 1], s[jj + 2])) * k; d[i] = d[i + 1] = d[i + 2] = v; } } },
  edges: { g: 'Stylize', n: 'Find edges', ps: [], f(d, W, H) { const s = d.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) { const g = (xx, yy) => s[(clamp(yy, 0, H - 1) * W + clamp(xx, 0, W - 1)) * 4 + c]; const gx = g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x - 1, y) - g(x - 1, y + 1), gy = g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x, y - 1) - g(x + 1, y - 1); d[i + c] = 255 - Math.min(255, Math.hypot(gx, gy) * .5); } } } },
  glowedges: { g: 'Stylize', n: 'Glowing edges', ps: [P_('b', 'Brightness', 1, 30, 10)], f(d, W, H, p) { FILT.edges.f(d, W, H); for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, (255 - d[i + c]) * p.b / 5); } },
  oil: { g: 'Stylize', n: 'Oil paint', ps: [P_('r', 'Brush size', 1, 16, 4, 'px')], f(d, W, H, p, sc) { kuwahara(d, W, H, Math.max(1, Math.round(p.r * sc))); } },
  solarize: { g: 'Stylize', n: 'Solarize', ps: [], f(d) { for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) if (d[i + c] > 127) d[i + c] = 255 - d[i + c]; } },
  cartoon: { g: 'Stylize', n: 'Cartoon', ps: [P_('n', 'Color levels', 2, 16, 6), P_('e', 'Line strength', 0, 100, 60, '%')], f(d, W, H, p, sc) { const e = d.slice(); FILT.edges.f(e, W, H); kuwahara(d, W, H, Math.max(1, Math.round(3 * sc))); const n = p.n - 1, k = p.e / 100; for (let i = 0; i < d.length; i += 4) { const ed = 1 - (1 - lumN(e[i], e[i + 1], e[i + 2]) / 255) * k * 2.2; for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] / 255 * n) / n * 255 * clamp(ed, 0, 1); } } },
  sketch: { g: 'Stylize', n: 'Pencil sketch', ps: [P_('r', 'Softness', 1, 60, 8, 'px')], f(d, W, H, p, sc) { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = lumN(d[i], d[i + 1], d[i + 2]); const inv = new Uint8ClampedArray(d.length); for (let i = 0; i < d.length; i += 4) { inv[i] = inv[i + 1] = inv[i + 2] = 255 - d[i]; inv[i + 3] = 255; } const b = blurData(imgCanvas(new ImageData(inv, W, H)), p.r * sc); for (let i = 0; i < d.length; i += 4) { const v = Math.min(255, d[i] * 255 / Math.max(1, 255 - b[i])); d[i] = d[i + 1] = d[i + 2] = v; } } },
  halftone: { g: 'Pixelate', n: 'Halftone dots', ps: [P_('s', 'Dot size', 3, 80, 10, 'px'), PK('col', 'In color', false)], c(cv, p, sc) { const W = cv.width, H = cv.height, s = Math.max(2, p.s * sc), sm = newLayerCanvas(Math.ceil(W / s), Math.ceil(H / s)); sm.getContext('2d').drawImage(cv, 0, 0, sm.width, sm.height); const sd = sm.getContext('2d').getImageData(0, 0, sm.width, sm.height).data, o = newLayerCanvas(W, H), x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); for (let y = 0; y < sm.height; y++) for (let xx = 0; xx < sm.width; xx++) { const i = (y * sm.width + xx) * 4, l = lumN(sd[i], sd[i + 1], sd[i + 2]) / 255, r = s / 2 * Math.sqrt(1 - l) * 1.25; if (r < .3) continue; x.fillStyle = p.col ? `rgb(${sd[i]},${sd[i + 1]},${sd[i + 2]})` : '#111'; x.beginPath(); x.arc(xx * s + s / 2, y * s + s / 2, r, 0, 7); x.fill(); } x.globalCompositeOperation = 'destination-in'; x.drawImage(cv, 0, 0); return o; } },
  mosaic: { g: 'Pixelate', n: 'Mosaic', ps: [P_('s', 'Cell size', 2, 200, 16, 'px')], c(cv, p, sc) { const s = Math.max(1, p.s * sc), W = cv.width, H = cv.height, t = newLayerCanvas(Math.ceil(W / s), Math.ceil(H / s)); t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height); const o = newLayerCanvas(W, H), x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, t.width * s, t.height * s); return o; } },
  crystal: { g: 'Pixelate', n: 'Crystallize', ps: [P_('s', 'Cell size', 4, 200, 24, 'px')], f(d, W, H, p, sc) { const s = Math.max(3, p.s * sc), gw = Math.ceil(W / s) + 1, gh = Math.ceil(H / s) + 1, seeds = []; for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = Math.min(W - 1, (i + noise2(i, j, 1)) * s), y = Math.min(H - 1, (j + noise2(i, j, 2)) * s); const k = ((y | 0) * W + (x | 0)) * 4; seeds.push([x, y, d[k], d[k + 1], d[k + 2], d[k + 3]]); } for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const gi = Math.floor(x / s), gj = Math.floor(y / s); let best = 1e18, b = null; for (let j = gj - 1; j <= gj + 1; j++) for (let i = gi - 1; i <= gi + 1; i++) { if (i < 0 || j < 0 || i >= gw || j >= gh) continue; const q = seeds[j * gw + i], dd = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (dd < best) { best = dd; b = q; } } const k = (y * W + x) * 4; d[k] = b[2]; d[k + 1] = b[3]; d[k + 2] = b[4]; d[k + 3] = b[5]; } } },
  twirl: { g: 'Distort', n: 'Twirl', ps: [P_('a', 'Angle', -999, 999, 120, '°')], f(d, W, H, p) { const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2; remap(d, W, H, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R) return [x, y]; const a = p.a * Math.PI / 180 * Math.pow(1 - r / R, 2), c = Math.cos(a), s = Math.sin(a); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; }); } },
  pinch: { g: 'Distort', n: 'Pinch / bulge', ps: [P_('a', 'Amount', -100, 100, 50, '%')], f(d, W, H, p) { const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2, k = p.a / 100; remap(d, W, H, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R; if (r >= 1 || !r) return [x, y]; const f = Math.pow(r, k > 0 ? 1 + k : 1 / (1 - k)) / r; return [cx + dx * f, cy + dy * f]; }); } },
  spherize: { g: 'Distort', n: 'Spherize', ps: [P_('a', 'Amount', -100, 100, 60, '%')], f(d, W, H, p) { const cx = W / 2, cy = H / 2, rx = W / 2, ry = H / 2, k = p.a / 100; remap(d, W, H, (x, y) => { const nx = (x - cx) / rx, ny = (y - cy) / ry, r = Math.hypot(nx, ny); if (r >= 1 || !r) return [x, y]; const sr = Math.asin(r) / (Math.PI / 2), f = (r + (sr - r) * k) / r; return [cx + nx * f * rx, cy + ny * f * ry]; }); } },
  wave: { g: 'Distort', n: 'Wave', ps: [P_('a', 'Height', 0, 200, 12, 'px'), P_('l', 'Length', 4, 800, 120, 'px'), PS('dir', 'Direction', 'h', [['h', 'Side to side'], ['v', 'Up and down'], ['b', 'Both']])], f(d, W, H, p, sc) { const a = p.a * sc, l = p.l * sc; remap(d, W, H, (x, y) => [x + (p.dir !== 'v' ? Math.sin(y / l * Math.PI * 2) * a : 0), y + (p.dir !== 'h' ? Math.sin(x / l * Math.PI * 2) * a : 0)]); } },
  ripple: { g: 'Distort', n: 'Ripple', ps: [P_('a', 'Amount', 0, 100, 30), P_('s', 'Size', 2, 200, 30, 'px')], f(d, W, H, p, sc) { const cx = W / 2, cy = H / 2, s = p.s * sc, a = p.a / 100 * s * .4; remap(d, W, H, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1, o = Math.sin(r / s * Math.PI * 2) * a; return [x + dx / r * o, y + dy / r * o]; }); } },
  polar: { g: 'Distort', n: 'Polar coordinates', ps: [PS('m', 'Turn', 'to', [['to', 'Straight to round'], ['from', 'Round to straight']])], f(d, W, H, p) { const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2; if (p.m === 'to') remap(d, W, H, (x, y) => { const dx = (x - cx) / R * (W / 2) / (W / 2), dy = (y - cy), r = Math.hypot(x - cx, dy) / R, a = (Math.atan2(dy, x - cx) + Math.PI * 1.5) % (Math.PI * 2); if (r > 1) return null; return [a / (Math.PI * 2) * (W - 1), r * (H - 1)]; }); else remap(d, W, H, (x, y) => { const a = x / W * Math.PI * 2 - Math.PI / 2, r = y / H * R; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }); } },
  lens: { g: 'Distort', n: 'Lens correction', ps: [P_('k', 'Barrel / pincushion', -100, 100, -20)], f(d, W, H, p) { const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy), k = p.k / 200; remap(d, W, H, (x, y) => { const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy, f = 1 + k * r2; return [cx + dx * f * R, cy + dy * f * R]; }); } },
  offset: { g: 'Distort', n: 'Offset (wrap around)', ps: [P_('x', 'Across', -100, 100, 50, '%'), P_('y', 'Down', -100, 100, 0, '%')], c(cv, p) { const W = cv.width, H = cv.height, o = newLayerCanvas(W, H), x = o.getContext('2d'), ox = ((Math.round(W * p.x / 100) % W) + W) % W, oy = ((Math.round(H * p.y / 100) % H) + H) % H; for (const a of [0, -W]) for (const b of [0, -H]) x.drawImage(cv, ox + a, oy + b); return o; } },
  chroma: { g: 'Distort', n: 'Color split', ps: [P_('s', 'Shift', 0, 60, 6, 'px')], f(d, W, H, p, sc) { const s = d.slice(), o = Math.round(p.s * sc); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; d[i] = s[(y * W + clamp(x - o, 0, W - 1)) * 4]; d[i + 2] = s[(y * W + clamp(x + o, 0, W - 1)) * 4 + 2]; } } },
  glitch: { g: 'Distort', n: 'Glitch', ps: [P_('a', 'Amount', 1, 100, 40), P_('seed', 'Variation', 1, 99, 7)], f(d, W, H, p, sc) { const r = tipRand(p.seed * 31), s = d.slice(), n = Math.round(4 + p.a / 4); for (let k = 0; k < n; k++) { const y0 = Math.floor(r() * H), hh = Math.max(1, Math.floor(r() * H * .08)), sh = Math.round((r() - .5) * W * p.a / 300); for (let y = y0; y < Math.min(H, y0 + hh); y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = (y * W + clamp(x - sh, 0, W - 1)) * 4; d[i] = s[(y * W + clamp(x - sh - 6 * sc, 0, W - 1)) * 4]; d[i + 1] = s[j + 1]; d[i + 2] = s[j + 2]; } } } },
  clouds: { g: 'Render', n: 'Clouds', ps: [P_('s', 'Size', 10, 1000, 220, 'px'), P_('seed', 'Variation', 1, 99, 3)], usesColors: true, f(d, W, H, p, sc) { const [ar, ag, ab] = hexToRgba(DW_PREF.color), [br, bg, bb] = hexToRgba(DW_PREF.bg), s = p.s * sc; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0, a = .5, f = 1; for (let o = 0; o < 6; o++) { v += vnoise(x / s * f, y / s * f, p.seed + o) * a; a *= .5; f *= 2; } const i = (y * W + x) * 4; d[i] = ar + (br - ar) * v; d[i + 1] = ag + (bg - ag) * v; d[i + 2] = ab + (bb - ab) * v; d[i + 3] = 255; } } },
  flare: { g: 'Render', n: 'Lens flare', ps: [P_('x', 'Across', 0, 100, 25, '%'), P_('y', 'Down', 0, 100, 25, '%'), P_('b', 'Brightness', 10, 300, 100, '%')], c(cv, p) { const W = cv.width, H = cv.height, o = copyCv(cv), x = o.getContext('2d'), fx = W * p.x / 100, fy = H * p.y / 100, R = Math.hypot(W, H), k = p.b / 100; x.globalCompositeOperation = 'lighter'; const blob = (cx, cy, r, col, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${col},${a * k})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }; blob(fx, fy, R * .25, '255,240,210', .9); blob(fx, fy, R * .04, '255,255,255', 1); const cx = W / 2, cy = H / 2; [[.4, .03, '120,200,255', .25], [.7, .06, '255,160,90', .2], [1.2, .02, '200,255,180', .3], [1.5, .09, '150,120,255', .15], [1.8, .04, '255,200,120', .25]].forEach(([t, r, c, a]) => blob(fx + (cx - fx) * t * 2 / 1.8, fy + (cy - fy) * t * 2 / 1.8, R * r, c, a)); x.globalAlpha = .35 * Math.min(1, k); x.strokeStyle = 'rgba(255,240,220,1)'; x.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * R * .12, fy + Math.sin(a) * R * .12); x.stroke(); } return o; } },
  vignette: { g: 'Render', n: 'Vignette', ps: [P_('a', 'Amount', -100, 100, 50), P_('m', 'Middle size', 0, 100, 50, '%'), P_('f', 'Softness', 1, 100, 50, '%')], f(d, W, H, p) { const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy), m = p.m / 100 * .8, f = p.f / 100 + .05; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = Math.hypot((x - cx) / cx, (y - cy) / cy) / Math.SQRT2, t = clamp((r - m) / f, 0, 1), k = t * t * (3 - 2 * t) * p.a / 100, i = (y * W + x) * 4; for (let c = 0; c < 3; c++) d[i + c] = k > 0 ? d[i + c] * (1 - k) : d[i + c] + (255 - d[i + c]) * -k; } } },
  minimum: { g: 'Other', n: 'Minimum (spread dark)', ps: [P_('r', 'Radius', 1, 40, 2, 'px')], f(d, W, H, p, sc) { minmax(d, W, H, Math.max(1, Math.round(p.r * sc)), false); } },
  maximum: { g: 'Other', n: 'Maximum (spread light)', ps: [P_('r', 'Radius', 1, 40, 2, 'px')], f(d, W, H, p, sc) { minmax(d, W, H, Math.max(1, Math.round(p.r * sc)), true); } }
};
function blurCv(cv, r) { if (r <= 0) return copyCv(cv); const w = cv.width, hh = cv.height, p = Math.ceil(r * 2.5), t = newLayerCanvas(w + p * 2, hh + p * 2), x = t.getContext('2d'); x.drawImage(cv, p, p); const o = newLayerCanvas(w, hh), ox = o.getContext('2d'); ox.filter = `blur(${r}px)`; ox.drawImage(t, -p, -p); return o; }

/* ---------- the adjustment / filter panel with live preview ---------- */
function runOp(def, src, p, sc) {
  if (def.c) return def.c(src, p, sc);
  const W = src.width, H = src.height, out = copyCv(src), x = out.getContext('2d'), img = x.getImageData(0, 0, W, H);
  def.f(img.data, W, H, p, sc); x.putImageData(img, 0, 0); return out;
}
function histOf(cv) { const s = Math.max(1, Math.ceil(Math.max(cv.width, cv.height) / 400)), t = newLayerCanvas(Math.ceil(cv.width / s), Math.ceil(cv.height / s)), x = t.getContext('2d'); x.drawImage(cv, 0, 0, t.width, t.height); const d = x.getImageData(0, 0, t.width, t.height).data, hs = new Float64Array(256); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) hs[Math.round(lumN(d[i], d[i + 1], d[i + 2]))]++; return hs; }
function drawHist(cv, hs) { const x = cv.getContext('2d'), W = cv.width, H = cv.height, mx = Math.max(...hs.slice(2, 254)) || 1; x.fillStyle = '#1b1d22'; x.fillRect(0, 0, W, H); x.fillStyle = '#6a6e78'; for (let v = 0; v < 256; v++) { const hh = Math.min(1, hs[v] / mx) * H; x.fillRect(v / 256 * W, H - hh, W / 256 + .5, hh); } }
function curvesWidget(p, onChange, hs) {
  const wrap = h('div', { class: 'curvesw' }), cv = h('canvas', { class: 'curves' }); cv.width = 512; cv.height = 512;
  let ch = 'rgb';
  const seg = segBox({ options: [{ v: 'rgb', l: 'All' }, { v: 'r', l: 'Red' }, { v: 'g', l: 'Green' }, { v: 'b', l: 'Blue' }], value: ch, onChange: v => { ch = v; draw(); } });
  const col = { rgb: '#e4e5e8', r: '#ff5a52', g: '#4cd964', b: '#4aa3ff' };
  const draw = () => { const x = cv.getContext('2d'); if (hs) drawHist(cv, hs); else { x.fillStyle = '#1b1d22'; x.fillRect(0, 0, 512, 512); } x.strokeStyle = '#33363d'; x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke(); } x.beginPath(); x.moveTo(0, 512); x.lineTo(512, 0); x.stroke(); const l = curveLut(p.pts[ch]); x.strokeStyle = col[ch]; x.lineWidth = 3; x.beginPath(); for (let v = 0; v < 256; v++) { const X = v * 2, Y = 512 - l[v] * 2; v ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); for (const [a, b] of p.pts[ch]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(a * 2, 512 - b * 2, 9, 0, 7); x.fill(); } };
  let drag = -1;
  const pos = e => { const r = cv.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width * 255, 0, 255), clamp(255 - (e.clientY - r.top) / r.height * 255, 0, 255)]; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const [a, b] = pos(e), pts = p.pts[ch], r = cv.getBoundingClientRect(), tol = 18 / r.width * 255; drag = pts.findIndex(q => Math.hypot(q[0] - a, q[1] - b) < tol); if (drag < 0) { pts.push([a, b]); pts.sort((m, n) => m[0] - n[0]); drag = pts.findIndex(q => q[0] === a && q[1] === b); } draw(); onChange(); });
  cv.addEventListener('pointermove', e => { if (drag < 0) return; const [a, b] = pos(e), pts = p.pts[ch]; const lo = drag > 0 ? pts[drag - 1][0] + 1 : 0, hi = drag < pts.length - 1 ? pts[drag + 1][0] - 1 : 255; const out = (drag > 0 && drag < pts.length - 1) && (b < -0 || e.clientY > cv.getBoundingClientRect().bottom + 30); if (out) { pts.splice(drag, 1); drag = -1; } else pts[drag] = [drag === 0 ? (pts.length > 1 ? Math.min(a, hi) : a) : drag === pts.length - 1 ? Math.max(a, lo) : clamp(a, lo, hi), b]; draw(); onChange(); });
  const up = () => { drag = -1; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  wrap.append(seg, cv, h('div', { class: 'hint' }, 'Tap the line to add a point and drag it. Drag a middle point off the bottom to remove it.'), h('button', { class: 'btn sm', onclick: () => { p.pts[ch] = [[0, 0], [255, 255]]; draw(); onChange(); } }, 'Straighten this curve'));
  draw(); return wrap;
}
// opens a panel for an adjustment or filter; with opts.layer it edits an adjustment layer live
function phOpenOp(kind, id, opts = {}) {
  const def = kind === 'adj' ? ADJ[id] : FILT[id]; if (!def) return;
  const editL = opts.layer || null;
  const L = editL || DW.layers[DW.cur];
  if (!editL && !needPixels(L)) return;
  const p = editL ? editL.adj.p : {}; if (!editL) for (const q of def.ps) p[q.k] = deep(q.v);
  if (def.instant && !editL) { phApplyOp(def, L, p); return; }
  if (editL) phSnapDoc();
  const big = Math.max(L.cv.width, L.cv.height), sc = big > 1600 ? 1600 / big : 1;
  let small = null; if (!editL) { small = sc < 1 ? newLayerCanvas(Math.round(L.cv.width * sc), Math.round(L.cv.height * sc)) : L.cv; if (sc < 1) small.getContext('2d').drawImage(L.cv, 0, 0, small.width, small.height); }
  let key = '', cache = null, raf = 0;
  const preview = () => {
    if (editL) { dirty(editL); dwRender(); return; }
    if (raf) return; raf = requestAnimationFrame(() => { raf = 0; key = JSON.stringify(p); const pr = runOp(def, small, p, sc); const up = sc < 1 ? (() => { const u = tmpCv('opup'), ux = u.getContext('2d'); ux.drawImage(pr, 0, 0, L.cv.width, L.cv.height); return u; })() : pr; cache = phMix(L.cv, up, DW.sel, cache && cache.width === L.cv.width ? cache : null); DW.live = LL => LL === L ? cache : LL.cv; dwRender(); });
  };
  const hs = def.hist ? histOf(L.kind === 'adj' ? docFlat() : L.cv) : null;
  DW.panel = {
    title: (editL ? 'Adjustment layer: ' : '') + def.n,
    build(o) {
      if (def.hist && id !== 'curves') { const hc = h('canvas', { class: 'hist' }); hc.width = 512; hc.height = 120; drawHist(hc, hs); o.append(hc); }
      for (const q of def.ps) {
        if (q.type === 'curves') o.append(curvesWidget(p, preview, hs));
        else if (q.type === 'color') o.append(h('div', { class: 'dwo' }, h('label', null, q.l), colorBtn({ value: p[q.k], onInput: v => { p[q.k] = v; preview(); } })));
        else if (q.type === 'seg') o.append(h('div', { class: 'dwo' }, h('label', null, q.l), segBox({ options: q.options.map(([v, l]) => ({ v, l })), value: p[q.k], onChange: v => { p[q.k] = v; preview(); } })));
        else if (q.type === 'check') o.append(h('div', { class: 'dwo' }, h('label', null, ''), checkBox(q.l, p[q.k], v => { p[q.k] = v; preview(); })));
        else o.append(rangeRow(q.l, { min: q.min, max: q.max, step: q.step || 1, value: p[q.k], suf: q.suf, onInput: v => { p[q.k] = v; preview(); } }));
      }
      if (def.usesColors) fgbgRow(o);
      const close = () => { DW.panel = null; DW.live = null; dwToolUI(); dwRender(); };
      const btns = h('div', { class: 'dwo' }, h('label', null, ''));
      if (editL) btns.append(h('button', { class: 'btn pri sm', onclick: close }, 'Done'), h('button', { class: 'btn sm', onclick: () => { dwUndo(); DW.redo = []; dwUndoUI(); close(); } }, 'Cancel'));
      else {
        btns.append(h('button', { class: 'btn pri sm', onclick: () => { close(); phApplyOp(def, L, p); } }, 'Apply'));
        if (kind === 'adj') btns.append(h('button', { class: 'btn sm', title: 'Keep it changeable: adds an adjustment layer above', onclick: () => { close(); phAddAdjLayer(id, p); } }, 'As a layer'));
        btns.append(h('button', { class: 'btn sm', onclick: close }, 'Cancel'));
      }
      o.append(btns);
      o.append(h('div', { class: 'hint' }, editL ? 'Changes everything below this layer. Paint on its mask to limit where.' : (DW.sel ? 'Only the selected part changes. ' : '') + (kind === 'adj' ? 'As a layer keeps it changeable later.' : 'The picture shows a preview. Apply makes it final.')));
    }
  };
  dwToolUI(); preview();
}
function phOpenAdj(id, opts) { phOpenOp('adj', id, opts); }
function phApplyOp(def, L, p) {
  toast('Working…', 20000);
  setTimeout(() => {
    try { const r = runOp(def, L.cv, p, 1); dwSnap(L); const m = phMix(L.cv, r, DW.sel), x = ctxReset(L.cv.getContext('2d')); x.clearRect(0, 0, L.cv.width, L.cv.height); x.drawImage(m, 0, 0); dirty(L); toast(def.n + ' done'); }
    catch (e) { console.error(e); toast('That did not work: ' + e.message); }
    DW.live = null; dwRender();
  }, 30);
}
function phAddAdjLayer(id, p) {
  phSnapDoc();
  const L = dwLayer(ADJ[id].n); L.kind = 'adj'; L.adj = { op: id, p: deep(p || Object.fromEntries(ADJ[id].ps.map(q => [q.k, deep(q.v)]))) };
  L.mask = newLayerCanvas(DW.w, DW.h); const mx = L.mask.getContext('2d'); if (DW.sel) mx.drawImage(DW.sel, 0, 0); else { mx.fillStyle = '#fff'; mx.fillRect(0, 0, DW.w, DW.h); }
  DW.layers.splice(DW.cur + 1, 0, L); DW.cur++; DW.editMask = false; dwRender(); toast(ADJ[id].n + ' layer added');
  return L;
}
