/* ================= Draw: brushes, layers, eraser, bucket, eyedropper, shapes, smudge ================= */
/* A drawing is a picture clip (type 'image') with c.draw = { w, h, layers: [{ id, name, vis, op, blend, lock, media }] }.
   Each layer is saved as its own hidden PNG (name starts with "~"), and the flattened picture is the clip's media. */

/* ---------- brush tips (white shapes on transparent, 128 px) ---------- */
const TIP = {};
function tipRand(seed) { let s = seed | 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function makeTip(kind, hard, ratio) {
  const key = kind + '|' + hard + '|' + ratio;
  if (TIP[key]) return TIP[key];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const r = tipRand(kind.length * 977 + Math.round(hard * 100) * 31 + Math.round(ratio * 10));
  x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  x.translate(S / 2, S / 2); x.scale(1, ratio || 1);
  const soft = (rad, h) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(clamp(h, 0, .99), 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.fill(); };
  const holes = (n, sz, a) => { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { const ang = r() * 7, d = Math.sqrt(r()) * 60; x.globalAlpha = a * (.4 + r() * .6); x.beginPath(); x.arc(Math.cos(ang) * d, Math.sin(ang) * d, sz * (.3 + r()), 0, 7); x.fill(); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; };
  const star = (n, ro, ri) => { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? ri : ro; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); };
  switch (kind) {
    case 'round': soft(62, hard); break;
    case 'square': x.fillRect(-58, -58, 116, 116); break;
    case 'pixel': x.fillRect(-64, -64, 128, 128); break;
    case 'grain': soft(62, hard); holes(260, 5, 1); break;
    case 'chalk': soft(60, .9); holes(420, 6, 1); break;
    case 'charcoal': soft(60, .75); holes(300, 8, .9); for (let i = 0; i < 40; i++) { x.globalCompositeOperation = 'destination-out'; x.globalAlpha = .5; x.fillRect(-64, -64 + r() * 128, 128, 1 + r() * 2); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; break;
    case 'crayon': soft(58, .95); holes(500, 3.5, 1); break;
    case 'pencil': soft(58, hard); holes(160, 3, .8); break;
    case 'bristle': for (let i = 0; i < 22; i++) { x.globalAlpha = .35 + r() * .65; x.beginPath(); x.arc((r() - .5) * 110, (r() - .5) * 26, 4 + r() * 7, 0, 7); x.fill(); } break;
    case 'fan': for (let i = 0; i < 14; i++) { x.globalAlpha = .5 + r() * .5; x.save(); x.rotate((i / 13 - .5) * 1.4); x.fillRect(-2, -62, 4, 50); x.restore(); } break;
    case 'sponge': for (let i = 0; i < 90; i++) { x.globalAlpha = .3 + r() * .7; x.beginPath(); const a = r() * 7, d = Math.sqrt(r()) * 56; x.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + r() * 8, 0, 7); x.fill(); } break;
    case 'splat': soft(36, .95); for (let i = 0; i < 16; i++) { const a = r() * 7, d = 30 + r() * 30, rr = 3 + r() * 10; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, 7); x.fill(); } break;
    case 'star': star(5, 62, 25); break;
    case 'sparkle': star(4, 62, 12); break;
    case 'heart': x.beginPath(); x.moveTo(0, 50); x.bezierCurveTo(-70, 0, -40, -60, 0, -25); x.bezierCurveTo(40, -60, 70, 0, 0, 50); x.fill(); break;
    case 'leaf': x.beginPath(); x.moveTo(0, -62); x.quadraticCurveTo(46, 0, 0, 62); x.quadraticCurveTo(-46, 0, 0, -62); x.fill(); x.globalCompositeOperation = 'destination-out'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -50); x.lineTo(0, 54); x.stroke(); x.globalCompositeOperation = 'source-over'; break;
    case 'grass': for (let i = 0; i < 7; i++) { const bx = (r() - .5) * 70, bend = (r() - .5) * 50; x.globalAlpha = .6 + r() * .4; x.beginPath(); x.moveTo(bx - 4, 62); x.quadraticCurveTo(bx + bend * .5, 0, bx + bend, -40 - r() * 22); x.quadraticCurveTo(bx + bend * .5 + 2, 0, bx + 4, 62); x.fill(); } break;
    case 'cloud': for (let i = 0; i < 9; i++) { x.globalAlpha = .25; x.beginPath(); x.arc((r() - .5) * 70, (r() - .5) * 34, 22 + r() * 18, 0, 7); x.fill(); } break;
    case 'drop': x.beginPath(); x.moveTo(0, -62); x.quadraticCurveTo(36, 10, 0, 50); x.quadraticCurveTo(-36, 10, 0, -62); x.fill(); break;
    case 'snow': x.lineWidth = 7; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * Math.PI / 3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -58); x.moveTo(0, -34); x.lineTo(-14, -48); x.moveTo(0, -34); x.lineTo(14, -48); x.stroke(); x.restore(); } break;
    case 'bubble': x.lineWidth = 7; x.beginPath(); x.arc(0, 0, 54, 0, 7); x.stroke(); x.globalAlpha = .9; x.beginPath(); x.arc(-20, -22, 10, 0, 7); x.fill(); x.globalAlpha = .15; x.beginPath(); x.arc(0, 0, 50, 0, 7); x.fill(); break;
    case 'ring': x.lineWidth = 14; x.beginPath(); x.arc(0, 0, 52, 0, 7); x.stroke(); break;
    case 'tri': x.beginPath(); x.moveTo(0, -60); x.lineTo(56, 44); x.lineTo(-56, 44); x.closePath(); x.fill(); break;
    case 'diamond': x.beginPath(); x.moveTo(0, -62); x.lineTo(42, 0); x.lineTo(0, 62); x.lineTo(-42, 0); x.closePath(); x.fill(); break;
    case 'confetti': x.fillRect(-40, -14, 80, 28); break;
    case 'dots': for (let i = 0; i < 7; i++) { const a = r() * 7, d = Math.sqrt(r()) * 50; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 5 + r() * 6, 0, 7); x.fill(); } break;
    case 'hair': x.lineWidth = 2; for (let i = 0; i < 26; i++) { x.globalAlpha = .4 + r() * .6; const sx = (r() - .5) * 110; x.beginPath(); x.moveTo(sx, -60); x.quadraticCurveTo(sx + (r() - .5) * 30, 0, sx + (r() - .5) * 20, 60); x.stroke(); } break;
    case 'fur': x.lineWidth = 3; for (let i = 0; i < 40; i++) { x.globalAlpha = .3 + r() * .7; const a = r() * 7, d = r() * 30; const sx = Math.cos(a) * d, sy = Math.sin(a) * d; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * (20 + r() * 26), sy + Math.sin(a) * (20 + r() * 26)); x.stroke(); } break;
    case 'feather': x.lineWidth = 2; x.beginPath(); x.moveTo(0, 62); x.lineTo(0, -62); x.stroke(); for (let i = -56; i < 56; i += 4) { const w = 40 * Math.sin((i + 62) / 124 * Math.PI); x.globalAlpha = .7; x.beginPath(); x.moveTo(0, i); x.lineTo(-w, i - 12); x.moveTo(0, i); x.lineTo(w, i - 12); x.stroke(); } break;
    case 'hatch': x.lineWidth = 4; for (let i = -60; i < 60; i += 14) { x.beginPath(); x.moveTo(i - 30, 60); x.lineTo(i + 30, -60); x.stroke(); } break;
    case 'cross': x.lineWidth = 3; for (let i = -60; i < 60; i += 14) { x.beginPath(); x.moveTo(i - 30, 60); x.lineTo(i + 30, -60); x.moveTo(i - 30, -60); x.lineTo(i + 30, 60); x.stroke(); } break;
    case 'canvas': x.globalAlpha = 1; x.fillRect(-60, -60, 120, 120); x.globalCompositeOperation = 'destination-out'; for (let i = -64; i < 64; i += 6) { x.globalAlpha = .35; x.fillRect(-64, i, 128, 2); x.fillRect(i, -64, 2, 128); } x.globalCompositeOperation = 'source-over'; break;
    case 'flower': for (let i = 0; i < 5; i++) { x.save(); x.rotate(i * Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, -30, 17, 30, 0, 0, 7); x.fill(); x.restore(); } x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; break;
    case 'pebble': x.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = 44 + r() * 16; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .75); } x.closePath(); x.fill(); break;
    case 'pine': x.lineWidth = 3; x.beginPath(); x.moveTo(0, 62); x.lineTo(0, -62); x.stroke(); for (let i = -50; i < 60; i += 7) { x.beginPath(); x.moveTo(0, i); x.lineTo(-40 * (1 - (i + 62) / 160), i + 14); x.moveTo(0, i); x.lineTo(40 * (1 - (i + 62) / 160), i + 14); x.stroke(); } break;
    default: soft(62, hard);
  }
  TIP[key] = c; return c;
}
const TINT = new Map();
function tintedTip(b, color) {
  const key = b.tip + '|' + b.hard + '|' + (b.ratio || 1) + '|' + color;
  let c = TINT.get(key); if (c) return c;
  const t = makeTip(b.tip, b.hard, b.ratio || 1);
  c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, 128, 128);
  if (TINT.size > 300) TINT.clear();
  TINT.set(key, c); return c;
}

/* ---------- the 200+ brushes ---------- */
// fields: n name, cat, tip, hard, sz default size, sp spacing (x size), sj size jitter, aj angle jitter, am angle mode, ang, sc scatter, oj opacity jitter,
// fl flow, cnt dabs per step, tp taper, hj hue jitter, ratio, glow, mode ('smudge'|'blur'), pix (pixel snapping)
const BRUSHES = [];
function B(cat, n, o) { BRUSHES.push(Object.assign({ cat, n, tip: 'round', hard: .8, sz: 12, sp: .12, sj: 0, aj: 0, am: 'fixed', ang: 0, sc: 0, oj: 0, fl: 1, cnt: 1, tp: 0, hj: 0, ratio: 1 }, o)); }
[['HB', .9, 3, .5], ['2B', .75, 4, .7], ['4B', .6, 6, .85], ['6B', .45, 8, 1], ['Mechanical 0.5', .95, 2, .6], ['Colored pencil', .7, 5, .55], ['Sketch', .6, 4, .35], ['Soft pencil', .4, 9, .6], ['Hard pencil', .98, 2.5, .45], ['Graphite stick', .5, 14, .7], ['Blue lead', .8, 3, .4], ['Technical pencil', .99, 1.5, .9]]
  .forEach(([n, h, s, f]) => B('Pencils', n, { tip: 'pencil', hard: h, sz: s, sp: .08, fl: f, oj: .25, tp: .3 }));
[['Fine liner', 2, 1, 0], ['G-pen', 6, 1, .7], ['Brush pen', 14, 1, .8], ['Technical pen 0.1', 1, 1, 0], ['Technical pen 0.3', 2.5, 1, 0], ['Technical pen 0.8', 5, 1, 0], ['Ballpoint', 2.5, .85, .2], ['Felt tip', 7, .9, .1], ['Dip pen', 5, 1, .9], ['Mapping pen', 2, 1, .6], ['Sumi ink', 22, .95, .85], ['Dry ink', 10, .6, .5], ['Taper liner', 8, 1, 1], ['Bold inker', 18, 1, .4]]
  .forEach(([n, s, f, t]) => B('Inking', n, { tip: n === 'Dry ink' ? 'grain' : 'round', hard: .97, sz: s, sp: .06, fl: f, tp: t }));
[['Marker fine', 6, .5, 1], ['Marker round', 14, .55, 1], ['Marker chisel', 18, .55, .35], ['Highlighter', 26, .35, .3], ['Alcohol marker', 20, .3, 1], ['Brush marker', 16, .4, 1], ['Paint marker', 12, .95, 1], ['Wide marker', 40, .45, .4], ['Dry marker', 16, .45, 1], ['Blender marker', 22, .18, 1]]
  .forEach(([n, s, f, r]) => B('Markers', n, { tip: n === 'Dry marker' ? 'grain' : 'round', hard: .9, sz: s, sp: .08, fl: f, ratio: r, ang: r < 1 ? 30 : 0 }));
[['Soft airbrush', 60, 0, .08], ['Medium airbrush', 40, .3, .12], ['Hard airbrush', 30, .7, .15], ['Fine airbrush', 10, .2, .15], ['Wide airbrush', 160, 0, .05], ['Speckled airbrush', 50, 0, .1], ['Gentle haze', 220, 0, .03], ['Shadow builder', 90, 0, .05], ['Glow builder', 70, 0, .07], ['Tiny airbrush', 5, .4, .25]]
  .forEach(([n, s, h, f]) => B('Airbrush', n, { tip: n.includes('Speckled') ? 'sponge' : 'round', hard: h, sz: s, sp: .06, fl: f }));
[['Wet wash', 50, .15, .1, 'round'], ['Round wet', 22, .25, .3, 'round'], ['Flat wash', 46, .18, .2, 'round'], ['Bleed', 34, .12, .1, 'cloud'], ['Granulating', 30, .3, .4, 'grain'], ['Dry brush', 26, .5, .7, 'bristle'], ['Salt texture', 40, .3, .1, 'sponge'], ['Wet edge', 30, .2, .6, 'ring'], ['Splash wash', 60, .12, .2, 'splat'], ['Glaze', 70, .08, 0, 'round'], ['Fine detail', 6, .5, .7, 'round'], ['Cloudy sky', 80, .1, 0, 'cloud']]
  .forEach(([n, s, f, h, t]) => B('Watercolor', n, { tip: t, hard: h, sz: s, sp: .1, fl: f, sj: .2, oj: .3, aj: t !== 'round' ? 1 : 0, am: 'random', ratio: n === 'Flat wash' ? .45 : 1 }));
[['Bristle round', 22, 'bristle', 'follow'], ['Bristle flat', 30, 'bristle', 'follow'], ['Filbert', 24, 'round', 'follow'], ['Palette knife', 34, 'square', 'follow'], ['Impasto', 28, 'bristle', 'follow'], ['Fan brush', 40, 'fan', 'follow'], ['Dry bristle', 26, 'fan', 'follow'], ['Thick oil', 30, 'round', 'fixed'], ['Acrylic flat', 26, 'square', 'follow'], ['Acrylic round', 18, 'round', 'fixed'], ['Scumble', 40, 'sponge', 'random'], ['Detail sable', 5, 'round', 'fixed']]
  .forEach(([n, s, t, am]) => B('Oils & acrylics', n, { tip: t, hard: .85, sz: s, sp: .07, fl: .85, oj: .1, am, ratio: n.includes('flat') || n.includes('knife') ? .35 : n === 'Filbert' ? .6 : 1 }));
[['Soft pastel', 26, .7], ['Hard pastel', 14, .85], ['Oil pastel', 22, .95], ['Chalk', 18, .8], ['Sidewalk chalk', 34, .75], ['Pastel side', 46, .5], ['Chalk line', 6, .9], ['Dusty chalk', 30, .45], ['Conté', 10, .85], ['Pastel pencil', 6, .8]]
  .forEach(([n, s, f]) => B('Chalk & pastel', n, { tip: 'chalk', hard: .9, sz: s, sp: .08, fl: f, aj: 1, am: 'random', ratio: n === 'Pastel side' ? .4 : 1 }));
[['Vine charcoal', 12, .7], ['Compressed charcoal', 16, .9], ['Charcoal pencil', 5, .8], ['Willow', 20, .55], ['Charcoal side', 44, .5], ['Smudgy charcoal', 30, .4], ['Dark charcoal', 18, 1], ['Light charcoal', 14, .35], ['Charcoal dust', 50, .25], ['Charcoal block', 36, .8]]
  .forEach(([n, s, f]) => B('Charcoal', n, { tip: 'charcoal', hard: .8, sz: s, sp: .07, fl: f, aj: 1, am: 'random', ratio: n.includes('side') || n.includes('block') ? .4 : 1 }));
[['Wax crayon', 14, .9], ['Fat crayon', 26, .9], ['Kid crayon', 18, .8], ['Soft crayon', 20, .7], ['Crayon pencil', 6, .85], ['Waxy line', 10, 1], ['Crayon side', 34, .6], ['Glitter crayon', 16, .9]]
  .forEach(([n, s, f]) => B('Crayon', n, { tip: 'crayon', hard: .95, sz: s, sp: .08, fl: f, aj: 1, am: 'random', hj: n.includes('Glitter') ? 18 : 0, ratio: n === 'Crayon side' ? .45 : 1 }));
[['Spray can', 50, 30, .9], ['Fine spray', 24, 20, .6], ['Wide spray', 110, 60, .9], ['Dense spray', 40, 60, .8], ['Light mist', 90, 25, .5], ['Drippy spray', 46, 34, .9], ['Stencil spray', 36, 50, .6], ['Splatter spray', 70, 14, 1], ['Speckle', 60, 8, 1], ['Rough spray', 56, 36, .9]]
  .forEach(([n, s, cnt, sc]) => B('Spray paint', n, { tip: 'round', hard: .95, sz: s, sp: .25, fl: .9, cnt, sc, sj: .7, dot: n === 'Splatter spray' ? .16 : .045 }));
[[0, 'Flat nib 0°'], [30, 'Flat nib 30°'], [45, 'Flat nib 45°'], [60, 'Flat nib 60°'], [90, 'Flat nib 90°'], [40, 'Italic'], [35, 'Broad edge'], [25, 'Ribbon'], [50, 'Chisel'], [15, 'Brush script']]
  .forEach(([a, n]) => B('Calligraphy', n, { tip: n === 'Brush script' ? 'round' : 'square', hard: 1, sz: n === 'Broad edge' ? 26 : 16, sp: .04, ratio: n === 'Brush script' ? .5 : .14, ang: a, tp: n === 'Brush script' ? .8 : .2 }));
[['Neon tube', 10], ['Soft glow', 26], ['Laser', 4], ['Light saber', 14], ['Fairy light', 8], ['Plasma', 20], ['Glow pen', 6], ['Lightning', 5], ['Aura', 50], ['Starlight', 12]]
  .forEach(([n, s]) => B('Glow & neon', n, { tip: n === 'Starlight' ? 'sparkle' : 'round', hard: .9, sz: s, sp: n === 'Starlight' ? .9 : .08, glow: 1, sc: n === 'Lightning' ? .5 : n === 'Starlight' ? 1.5 : 0, sj: n === 'Starlight' ? .6 : 0, aj: n === 'Starlight' ? 1 : 0, am: 'random' }));
[['Pixel 1', 1], ['Pixel 2', 2], ['Pixel 3', 3], ['Pixel 4', 4], ['Pixel 6', 6], ['Pixel 8', 8], ['Pixel dither', 4], ['Pixel spray', 2]]
  .forEach(([n, s]) => B('Pixel', n, { tip: 'pixel', hard: 1, sz: s, sp: .5, pix: 1, cnt: n === 'Pixel spray' ? 8 : 1, sc: n === 'Pixel spray' ? 6 : 0, dith: n === 'Pixel dither' ? 1 : 0 }));
[['Ink splatter', 40], ['Paint flick', 30], ['Big splash', 90], ['Fine drops', 20], ['Blood splat', 50], ['Mud', 60], ['Paint blob', 46], ['Drip line', 18], ['Spatter cloud', 70], ['Speckled splash', 34]]
  .forEach(([n, s]) => B('Splatter', n, { tip: n === 'Paint blob' ? 'splat' : n === 'Fine drops' || n === 'Speckled splash' ? 'dots' : 'splat', hard: .95, sz: s, sp: .8, sj: .7, aj: 1, am: 'random', sc: .8, oj: .2 }));
[['Noise', 'grain', 40], ['Film grain', 'grain', 70], ['Canvas weave', 'canvas', 60], ['Sponge', 'sponge', 40], ['Rough', 'charcoal', 50], ['Stipple', 'dots', 30], ['Hatching', 'hatch', 30], ['Crosshatch', 'cross', 30], ['Sand', 'grain', 50], ['Rust', 'sponge', 60], ['Concrete', 'chalk', 70], ['Scratches', 'hair', 50]]
  .forEach(([n, t, s]) => B('Textures', n, { tip: t, hard: .8, sz: s, sp: .35, aj: t === 'hatch' || t === 'cross' ? 0 : 1, am: 'random', oj: .3, sj: .2 }));
[['Grass', 'grass', 40, 'fixed'], ['Leaves', 'leaf', 26, 'random'], ['Flowers', 'flower', 26, 'random'], ['Clouds', 'cloud', 80, 'random'], ['Rain', 'drop', 10, 'fixed'], ['Snow', 'snow', 18, 'random'], ['Stars', 'star', 18, 'random'], ['Bubbles', 'bubble', 24, 'fixed'], ['Foliage', 'leaf', 40, 'random'], ['Pine needles', 'pine', 34, 'follow'], ['Pebbles', 'pebble', 16, 'random'], ['Moss', 'sponge', 30, 'random'], ['Petals', 'drop', 18, 'random'], ['Sparkles', 'sparkle', 20, 'random']]
  .forEach(([n, t, s, am]) => B('Nature', n, { tip: t, hard: .9, sz: s, sp: t === 'cloud' ? .3 : .9, sj: .5, aj: am === 'random' ? 1 : 0, am, sc: .9, oj: .2, hj: n === 'Flowers' || n === 'Foliage' || n === 'Petals' ? 14 : 0 }));
[['Hearts', 'heart'], ['Stars', 'star'], ['Circles', 'round'], ['Rings', 'ring'], ['Triangles', 'tri'], ['Squares', 'square'], ['Twinkles', 'sparkle'], ['Confetti', 'confetti'], ['Diamonds', 'diamond'], ['Dots', 'dots']]
  .forEach(([n, t]) => B('Shapes', n, { tip: t, hard: 1, sz: 20, sp: 1.2, sj: .5, aj: 1, am: 'random', sc: 1, hj: n === 'Confetti' ? 180 : 0 }));
[['Smudge', .5, 24], ['Soft smudge', .3, 40], ['Hard smudge', .8, 18], ['Finger', .65, 22], ['Blender', .25, 50], ['Blur', 0, 40], ['Soft blur', 0, 80], ['Pull', .9, 14]]
  .forEach(([n, s, sz]) => B('Smudge & blur', n, { tip: 'round', hard: .3, sz, sp: .1, mode: n.includes('lur') ? 'blur' : 'smudge', str: s || .6 }));
[['Short fur', 'fur', 30], ['Long fur', 'fur', 50], ['Hair strands', 'hair', 40], ['Fine hair', 'hair', 24], ['Feather', 'feather', 40], ['Wool', 'sponge', 30], ['Mane', 'hair', 60], ['Whiskers', 'hair', 20], ['Fluff', 'fur', 40], ['Plumes', 'feather', 60]]
  .forEach(([n, t, s]) => B('Hair & fur', n, { tip: t, hard: .9, sz: s, sp: .35, am: 'follow', aj: .2, oj: .3, sj: .2 }));
const GRAIN_BY_CAT = { 'Pencils': .55, 'Chalk & pastel': .6, 'Charcoal': .5, 'Crayon': .62, 'Textures': .25 };
for (const b of BRUSHES) { if (b.grain == null) b.grain = GRAIN_BY_CAT[b.cat] || 0; if (/Dry|Granulating|Sketch|Graphite/.test(b.n)) b.grain = Math.max(b.grain, .4); }
const BRUSH_CATS = [...new Set(BRUSHES.map(b => b.cat))];
/* paper tooth: a tiling texture that takes paint off the tops of the grain, so pencils, chalk and crayons catch the paper */
let PAPER = null;
function paperTex() {
  if (PAPER) return PAPER;
  const S = 256, c = newLayerCanvas(S, S), x = c.getContext('2d'), r = tipRand(4242), v = new Float32Array(S * S);
  for (let o = 0; o < 4; o++) { const cell = [32, 16, 4, 2][o], amp = [.3, .25, .3, .35][o], n = S / cell, g = []; for (let i = 0; i < n * n; i++) g.push(r()); for (let y = 0; y < S; y++) for (let X = 0; X < S; X++) { const fx = X / cell, fy = y / cell, x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n, tx = fx - Math.floor(fx), ty = fy - Math.floor(fy), sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); v[y * S + X] += amp * ((g[y0 * n + x0] * (1 - sx) + g[y0 * n + x1] * sx) * (1 - sy) + (g[y1 * n + x0] * (1 - sx) + g[y1 * n + x1] * sx) * sy); } }
  // fibres running across the sheet
  for (let k = 0; k < 140; k++) { let px = r() * S, py = r() * S, a = r() * Math.PI; for (let s = 0; s < 40; s++) { px = (px + Math.cos(a) + S) % S; py = (py + Math.sin(a) + S) % S; a += (r() - .5) * .3; v[(py | 0) * S + (px | 0)] -= .12; } }
  const img = x.createImageData(S, S); for (let i = 0; i < S * S; i++) { const t = clamp((v[i] - .45) * 2.6 + .5, 0, 1); img.data[i * 4 + 3] = Math.pow(t, 1.6) * 255; }
  x.putImageData(img, 0, 0); PAPER = c; return c;
}
function grainStroke(src, g, out) {
  const x = out.getContext('2d'); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'destination-out'; x.globalAlpha = g; x.fillStyle = x.createPattern(paperTex(), 'repeat'); x.fillRect(0, 0, out.width, out.height);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; return out;
}

/* ---------- editor state ---------- */
const DW = { on: false };
const DW_TOOLS = [['brush', 'Brush', 'dbrush'], ['eraser', 'Eraser', 'deraser'], ['fill', 'Bucket', 'dfill'], ['pick', 'Eyedropper', 'dpick'], ['line', 'Line', 'dline'], ['shape', 'Shapes', 'dshape'], ['move', 'Move', 'dmove'], ['photo', 'Photo', 'dphoto']];
const DW_PREF = { tool: 'brush', brush: 0, eraser: 1, size: null, esize: 30, op: 100, color: '#1b1d22ff', steady: 30, fillMode: 'fill', tol: 24, grow: 1, sample: 'layer', shape: 'rect', filled: false, ref: true };
try { Object.assign(DW_PREF, JSON.parse(localStorage.getItem('fw-draw') || '{}')); } catch (e) { }
function savePref() { try { localStorage.setItem('fw-draw', JSON.stringify(DW_PREF)); } catch (e) { } }

function newLayerCanvas(w, hh) { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
function dwLayer(name) { return { id: uid(), name, vis: true, op: 100, blend: 'source-over', lock: false, cv: newLayerCanvas(DW.w, DW.h) }; }

/* open the editor for a clip (existing drawing or a picture to draw on), or for a new drawing when c is null */
async function openDraw(c) {
  if (PLAY.on) pause();
  let w = P.w, hh = P.h, layers = [];
  DW.clip = c; DW.isNew = !c;
  if (c && c.draw) {
    w = c.draw.w; hh = c.draw.h; DW.w = w; DW.h = hh;
    for (const L of c.draw.layers) { const l = { ...L, cv: newLayerCanvas(w, hh) }; const m = MEDIA[L.media]; if (m && m.el) l.cv.getContext('2d').drawImage(m.el, 0, 0, w, hh); layers.push(l); }
  } else if (c) {
    const m = MEDIA[c.media]; if (!m || !m.el) { toast('This picture is still loading'); return; }
    w = m.w; hh = m.h; DW.w = w; DW.h = hh;
    const photo = dwLayer('Photo'); photo.cv.getContext('2d').drawImage(m.el, 0, 0, w, hh); layers.push(photo, dwLayer('Layer 1'));
  } else { DW.w = w; DW.h = hh; layers.push(dwLayer('Layer 1')); }
  DW.layers = layers; DW.cur = layers.length - 1; DW.undo = []; DW.redo = [];
  DW.stroke = newLayerCanvas(w, hh); DW.view = { z: 1, x: 0, y: 0, fit: true };
  DW.ref = null;
  if (!c || (c && c.draw && c.draw.w === P.w && c.draw.h === P.h)) { // the video frame behind, as a guide
    DW.ref = newLayerCanvas(P.w, P.h); if (c) c._hide = true; try { renderFrame(DW.ref.getContext('2d'), T, P.w, P.h); } catch (e) { } if (c) delete c._hide;
  }
  if (DW_PREF.size == null) DW_PREF.size = BRUSHES[DW_PREF.brush].sz;
  buildDrawUI(); DW.on = true; dwFit(); dwRender();
}

/* ---------- UI ---------- */
function buildDrawUI() {
  const old = $('#dw'); if (old) old.remove();
  const root = h('div', { id: 'dw' });
  const top = h('div', { class: 'dwtop' },
    h('button', { class: 'tb', onclick: () => closeDraw(false), html: icon('close') }, 'Cancel'),
    h('div', { class: 'dwtitle' }, DW.clip && DW.clip.draw ? 'Edit drawing' : DW.clip ? 'Draw on picture' : 'New drawing'),
    h('button', { class: 'tb', id: 'dwUndo', title: 'Undo', html: icon('undo'), onclick: dwUndo }),
    h('button', { class: 'tb', id: 'dwRedo', title: 'Redo', html: icon('redo'), onclick: dwRedo }),
    DW.ref ? h('button', { class: 'tb' + (DW_PREF.ref ? ' on' : ''), id: 'dwRef', title: 'Show the video behind', html: icon('video'), onclick: e => { DW_PREF.ref = !DW_PREF.ref; e.currentTarget.classList.toggle('on', DW_PREF.ref); savePref(); dwRender(); } }) : '',
    h('button', { class: 'tb lyb', title: 'Layers', html: icon('layers'), onclick: dwLayersSheet }, h('span', { class: 'hide-m' }, 'Layers')),
    h('button', { class: 'tb', title: 'Fit to screen', html: icon('fit'), onclick: () => { DW.view.fit = true; dwFit(); dwRender(); } }),
    h('div', { class: 'sp' }),
    h('button', { class: 'btn pri', onclick: () => closeDraw(true) }, 'Done'));
  const stage = h('div', { class: 'dwstage' }); const cv = h('canvas', { class: 'dwview' }); stage.append(cv);
  const tools = h('div', { class: 'dwtools' });
  for (const [id, n, ic] of DW_TOOLS) tools.append(h('button', { 'data-t': id, title: n, html: icon(ic), onclick: () => { DW_PREF.tool = id; savePref(); dwToolUI(); } }, n));
  const opts = h('div', { class: 'dwopts' });
  root.append(top, stage, h('div', { class: 'dwbar' }, tools, opts));
  document.body.append(root);
  DW.root = root; DW.cv = cv; DW.x = cv.getContext('2d'); DW.stageEl = stage; DW.opts = opts;
  new ResizeObserver(() => { if (DW.on) { if (DW.view.fit) dwFit(); dwRender(); } }).observe(stage);
  dwBindStage(stage); dwToolUI(); dwUndoUI();
}
function dwToolUI() {
  for (const b of $$('.dwtools [data-t]', DW.root)) b.classList.toggle('on', b.dataset.t === DW_PREF.tool);
  if (DW_PREF.tool !== 'photo' && DW.live && !DW.stroking) { DW.live = null; dwRender(); }
  const o = DW.opts; o.innerHTML = '';
  const t = DW_PREF.tool;
  const colorRow = () => { const cb = colorBtn({ value: DW_PREF.color, onInput: v => { DW_PREF.color = v; savePref(); } }); DW.colorBtn = cb; return h('div', { class: 'dwo' }, h('label', null, 'Color'), cb); };
  const sizeRow = (key, max) => { const r = rangeRow('Size', { min: 1, max: max || 500, step: 1, value: DW_PREF[key], suf: 'px', onInput: v => { DW_PREF[key] = v; savePref(); } }); return r; };
  if (t === 'brush' || t === 'eraser') {
    const bi = t === 'brush' ? DW_PREF.brush : DW_PREF.eraser, b = BRUSHES[bi];
    const pv = h('canvas', { class: 'bprev' }); pv.width = 160; pv.height = 40; brushPreview(pv, b, t === 'eraser' ? '#e4e5e8ff' : DW_PREF.color);
    o.append(h('div', { class: 'dwo' }, h('label', null, t === 'eraser' ? 'Eraser tip' : 'Brush'), h('button', { class: 'bpick', onclick: () => dwBrushSheet(t) }, pv, h('span', null, b.n), h('small', null, b.cat))));
    o.append(sizeRow(t === 'brush' ? 'size' : 'esize'));
    o.append(rangeRow(t === 'eraser' ? 'Strength' : 'Opacity', { min: 1, max: 100, step: 1, value: DW_PREF.op, suf: '%', onInput: v => { DW_PREF.op = v; savePref(); } }));
    o.append(rangeRow('Steady', { min: 0, max: 95, step: 1, value: DW_PREF.steady, suf: '%', onInput: v => { DW_PREF.steady = v; savePref(); } }));
    if (t === 'brush' && b.mode !== 'smudge' && b.mode !== 'blur') o.append(colorRow());
    if (t === 'eraser') o.append(h('div', { class: 'hint' }, 'Erasing makes those parts see-through. Any brush can be an eraser tip.'));
  } else if (t === 'fill') {
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Mode'), segBox({ options: [{ v: 'fill', l: 'Fill' }, { v: 'erase', l: 'Erase' }], value: DW_PREF.fillMode, onChange: v => { DW_PREF.fillMode = v; savePref(); dwToolUI(); } })));
    o.append(rangeRow('Tolerance', { min: 0, max: 255, step: 1, value: DW_PREF.tol, onInput: v => { DW_PREF.tol = v; savePref(); } }));
    o.append(rangeRow('Grow edge', { min: 0, max: 6, step: 1, value: DW_PREF.grow, suf: 'px', onInput: v => { DW_PREF.grow = v; savePref(); } }));
    o.append(h('div', { class: 'dwo' }, h('label', null, 'Look at'), segBox({ options: [{ v: 'layer', l: 'This layer' }, { v: 'all', l: 'All layers' }], value: DW_PREF.sample, onChange: v => { DW_PREF.sample = v; savePref(); } })));
    if (DW_PREF.fillMode === 'fill') o.append(colorRow()); else o.append(h('div', { class: 'hint' }, 'Tap an area to make it see-through.'));
  } else if (t === 'pick') {
    o.append(colorRow(), h('div', { class: 'hint' }, 'Tap the picture to take a color. It goes straight back to the brush.'));
  } else if (t === 'line' || t === 'shape') {
    if (t === 'shape') o.append(h('div', { class: 'dwo' }, h('label', null, 'Shape'), segBox({ options: [{ v: 'rect', l: 'Box' }, { v: 'ellipse', l: 'Circle' }, { v: 'tri', l: 'Triangle' }, { v: 'star', l: 'Star' }], value: DW_PREF.shape, onChange: v => { DW_PREF.shape = v; savePref(); } })),
      h('div', { class: 'dwo' }, h('label', null, ''), checkBox('Filled', DW_PREF.filled, v => { DW_PREF.filled = v; savePref(); })));
    o.append(rangeRow('Line width', { min: 1, max: 200, step: 1, value: DW_PREF.lw || 6, suf: 'px', onInput: v => { DW_PREF.lw = v; savePref(); } }));
    o.append(rangeRow('Opacity', { min: 1, max: 100, step: 1, value: DW_PREF.op, suf: '%', onInput: v => { DW_PREF.op = v; savePref(); } }));
    o.append(colorRow());
  } else if (t === 'photo') photoUI(o);
  else if (t === 'move') o.append(h('div', { class: 'hint' }, 'Drag to move everything on the current layer.'));
}
function brushPreview(cv, b, color) {
  const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
  const S = newLayerCanvas(cv.width, cv.height), sx = S.getContext('2d');
  const sz = clamp(b.sz, 3, 22), st = { last: null, dist: 0, n: 0, b, color, size: sz, rnd: tipRand(7) };
  if (b.mode) { sx.fillStyle = '#d23c3c'; sx.fillRect(0, 0, cv.width, cv.height / 2); sx.fillStyle = '#3c78d2'; sx.fillRect(0, cv.height / 2, cv.width, cv.height / 2); st.size = 18; }
  for (let i = 0; i <= 60; i++) { const tt = i / 60; dabTo(b.mode ? null : sx, st, 10 + tt * (cv.width - 20), cv.height / 2 + Math.sin(tt * Math.PI * 2) * cv.height * .22, .5 + .5 * Math.sin(tt * Math.PI), b.mode ? sx : null); }
  x.drawImage(b.grain ? grainStroke(S, b.grain, newLayerCanvas(S.width, S.height)) : S, 0, 0);
}
function dwBrushSheet(which) {
  let cat = BRUSHES[which === 'brush' ? DW_PREF.brush : DW_PREF.eraser].cat;
  const body = h('div', { class: 'bsheet' });
  const cats = h('div', { class: 'bcats' }), grid = h('div', { class: 'bgrid' });
  const fill = () => {
    cats.innerHTML = ''; grid.innerHTML = '';
    for (const c of BRUSH_CATS) cats.append(h('button', { class: c === cat ? 'on' : '', onclick: () => { cat = c; fill(); } }, c));
    BRUSHES.forEach((b, i) => {
      if (b.cat !== cat) return;
      if (which === 'eraser' && b.mode) return;
      const pv = h('canvas'); pv.width = 160; pv.height = 40; brushPreview(pv, b, '#e4e5e8ff');
      const sel = i === (which === 'brush' ? DW_PREF.brush : DW_PREF.eraser);
      grid.append(h('button', { class: 'bitem' + (sel ? ' on' : ''), onclick: () => { if (which === 'brush') { DW_PREF.brush = i; DW_PREF.size = b.sz; } else { DW_PREF.eraser = i; DW_PREF.esize = Math.max(10, b.sz); } savePref(); dwToolUI(); close(); } }, pv, h('span', null, b.n)));
    });
  };
  fill();
  body.append(cats, grid);
  const close = modal(BRUSHES.length + ' brushes', body, [{ l: 'Close' }], { width: 560 });
}
function dwLayersSheet() {
  const body = h('div', { class: 'lsheet' });
  const draw = () => {
    body.innerHTML = '';
    for (let i = DW.layers.length - 1; i >= 0; i--) {
      const L = DW.layers[i];
      const th = h('canvas', { class: 'lthumb' }); th.width = 64; th.height = Math.max(8, Math.round(64 * DW.h / DW.w)); th.getContext('2d').drawImage(L.cv, 0, 0, th.width, th.height);
      const rowEl = h('div', { class: 'lrow' + (i === DW.cur ? ' on' : ''), onclick: () => { DW.cur = i; draw(); } },
        h('button', { class: 'tb', title: L.vis ? 'Hide' : 'Show', html: icon(L.vis ? 'eye' : 'eyeoff'), onclick: e => { e.stopPropagation(); L.vis = !L.vis; draw(); dwRender(); } }),
        th, h('div', { class: 'lname' }, L.name, h('small', null, `${L.op}%` + (L.blend !== 'source-over' ? ' · ' + (DW_BLENDS.find(b => b[0] === L.blend) || [0, ''])[1] : '') + (L.lock ? ' · see-through locked' : ''))));
      body.append(rowEl);
    }
    const L = DW.layers[DW.cur];
    const ctl = h('div', { class: 'lctl' });
    ctl.append(rangeRow('Opacity', { min: 0, max: 100, step: 1, value: L.op, suf: '%', onInput: v => { L.op = v; dwRender(); } }));
    ctl.append(row('Blend', selectBox({ options: DW_BLENDS.map(([v, l]) => ({ v, l })), value: L.blend, onChange: v => { L.blend = v; dwRender(); draw(); } })));
    ctl.append(row('', checkBox('Lock see-through parts', L.lock, v => { L.lock = v; draw(); })));
    const btn = (l, f) => h('button', { class: 'btn sm', onclick: () => { f(); draw(); dwRender(); } }, l);
    ctl.append(h('div', { class: 'lbtns' },
      btn('New layer', () => { DW.layers.splice(DW.cur + 1, 0, dwLayer('Layer ' + (DW.layers.length + 1))); DW.cur++; }),
      btn('Duplicate', () => { const n = dwLayer(L.name + ' copy'); Object.assign(n, { op: L.op, blend: L.blend }); n.cv.getContext('2d').drawImage(L.cv, 0, 0); DW.layers.splice(DW.cur + 1, 0, n); DW.cur++; }),
      btn('Move up', () => { if (DW.cur < DW.layers.length - 1) { DW.layers.splice(DW.cur + 1, 0, DW.layers.splice(DW.cur, 1)[0]); DW.cur++; } }),
      btn('Move down', () => { if (DW.cur > 0) { DW.layers.splice(DW.cur - 1, 0, DW.layers.splice(DW.cur, 1)[0]); DW.cur--; } }),
      btn('Merge down', () => { if (DW.cur > 0) { const B_ = DW.layers[DW.cur - 1]; dwSnap(B_); const x = B_.cv.getContext('2d'); x.globalAlpha = L.op / 100; x.globalCompositeOperation = L.blend; x.drawImage(L.cv, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; DW.layers.splice(DW.cur, 1); DW.cur--; } }),
      btn('Clear', () => { dwSnap(L); L.cv.getContext('2d').clearRect(0, 0, DW.w, DW.h); }),
      btn('Rename', async () => { const n = await promptBox('Layer name', L.name); if (n) { L.name = n; draw(); } }),
      btn('Delete', () => { if (DW.layers.length > 1) { DW.layers.splice(DW.cur, 1); DW.cur = Math.max(0, DW.cur - 1); } else toast('A drawing needs at least one layer'); })));
    body.append(ctl);
  };
  draw();
  modal('Layers', body, [{ l: 'Close' }], { width: 460 });
}
const DW_BLENDS = [['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['color-dodge', 'Color dodge'], ['color-burn', 'Color burn'], ['hard-light', 'Hard light'], ['soft-light', 'Soft light'], ['difference', 'Difference'], ['exclusion', 'Exclusion'], ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity'], ['lighter', 'Add (glow)']];

/* ---------- view ---------- */
function dwFit() {
  const r = DW.stageEl.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  DW.cv.width = Math.max(1, Math.round(r.width * dpr)); DW.cv.height = Math.max(1, Math.round(r.height * dpr)); DW.dpr = dpr;
  if (DW.view.fit) { const z = Math.min((r.width - 16) / DW.w, (r.height - 16) / DW.h); DW.view.z = z; DW.view.x = (r.width - DW.w * z) / 2; DW.view.y = (r.height - DW.h * z) / 2; }
}
function dwChecker() {
  if (DW.chk) return DW.chk; const c = newLayerCanvas(16, 16), x = c.getContext('2d'); x.fillStyle = '#d9dce0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#b9bdc3'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  DW.chk = DW.x.createPattern(c, 'repeat'); return DW.chk;
}
let dwRaf = 0;
function dwRender() { if (dwRaf) return; dwRaf = requestAnimationFrame(() => { dwRaf = 0; dwDraw(); }); }
function dwDraw() {
  if (!DW.on) return;
  const x = DW.x, v = DW.view, d = DW.dpr;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#0e0f11'; x.fillRect(0, 0, DW.cv.width, DW.cv.height);
  x.setTransform(d * v.z, 0, 0, d * v.z, d * v.x, d * v.y);
  x.imageSmoothingEnabled = v.z < 2;
  x.fillStyle = dwChecker(); x.save(); x.scale(1 / v.z, 1 / v.z); x.fillRect(0, 0, DW.w * v.z, DW.h * v.z); x.restore();
  if (DW.ref && DW_PREF.ref) { x.globalAlpha = .55; x.drawImage(DW.ref, 0, 0, DW.w, DW.h); x.globalAlpha = 1; }
  DW.layers.forEach((L, i) => {
    if (!L.vis) return;
    let src = L.cv;
    if (i === DW.cur && DW.live) src = DW.live(L);
    x.globalAlpha = L.op / 100; x.globalCompositeOperation = L.blend; x.drawImage(src, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  });
  x.setTransform(1, 0, 0, 1, 0, 0); x.strokeStyle = '#383a41'; x.lineWidth = 1; x.strokeRect(d * v.x - .5, d * v.y - .5, DW.w * v.z * d + 1, DW.h * v.z * d + 1);
  if (DW.cursor) { const c = DW.cursor; x.strokeStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(d * (v.x + c.x * v.z), d * (v.y + c.y * v.z), Math.max(2, c.r * v.z * d), 0, 7); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(d * (v.x + c.x * v.z), d * (v.y + c.y * v.z), Math.max(2, c.r * v.z * d) + 1, 0, 7); x.stroke(); }
}
function dwPt(e) { const r = DW.stageEl.getBoundingClientRect(); return { x: (e.clientX - r.left - DW.view.x) / DW.view.z, y: (e.clientY - r.top - DW.view.y) / DW.view.z }; }

/* ---------- undo (per layer snapshots) ---------- */
function dwSnap(L) { const c = newLayerCanvas(DW.w, DW.h); c.getContext('2d').drawImage(L.cv, 0, 0); DW.undo.push({ L, c }); if (DW.undo.length > 30) DW.undo.shift(); DW.redo = []; dwUndoUI(); }
function dwSwap(from, to) { const s = from.pop(); if (!s) return; if (!DW.layers.includes(s.L)) { dwUndoUI(); return; } const c = newLayerCanvas(DW.w, DW.h); c.getContext('2d').drawImage(s.L.cv, 0, 0); to.push({ L: s.L, c }); const x = s.L.cv.getContext('2d'); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(s.c, 0, 0); dwUndoUI(); dwRender(); }
function dwUndo() { dwSwap(DW.undo, DW.redo); }
function dwRedo() { dwSwap(DW.redo, DW.undo); }
function dwUndoUI() { const u = $('#dwUndo'), r = $('#dwRedo'); if (u) u.disabled = !DW.undo.length; if (r) r.disabled = !DW.redo.length; }

/* ---------- painting ---------- */
// one dab or a run of dabs from the last point to (x, y)
function dabTo(sx, st, x, y, pr, layerCtx) {
  const b = st.b, size = st.size;
  if (!st.last) { st.last = { x, y }; st.dist = 0; stampAt(sx, st, x, y, pr, 0, layerCtx); return; }
  const dx = x - st.last.x, dy = y - st.last.y, L = Math.hypot(dx, dy), step = Math.max(.5, size * b.sp);
  if (L < 1e-6) return;
  const ang = Math.atan2(dy, dx);
  let t = (step - st.dist);
  while (t <= L) { stampAt(sx, st, st.last.x + dx * t / L, st.last.y + dy * t / L, pr, ang, layerCtx); t += step; }
  st.dist = L - (t - step); st.last = { x, y };
}
function stampAt(sx, st, x, y, pr, ang, layerCtx) {
  const b = st.b, R = st.rnd; st.n++;
  // taper: thin at the start of the stroke
  const taper = b.tp ? Math.min(1, st.n / (6 + b.tp * 18)) : 1;
  let size = st.size * (st.pen ? .25 + pr * .75 : 1) * taper;
  if (b.mode === 'smudge' || b.mode === 'blur') { smudgeAt(layerCtx, st, x, y, size); return; }
  for (let k = 0; k < (b.cnt || 1); k++) {
    let s = size * (1 - b.sj * R()) * (b.cnt > 1 ? (b.dot || .06) : 1);
    let px = x, py = y;
    if (b.sc) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * st.size * b.sc * (b.cnt > 1 ? .5 : 1); px += Math.cos(a) * d; py += Math.sin(a) * d; }
    if (b.pix) { s = Math.max(1, Math.round(s)); px = Math.floor(px / s) * s + s / 2; py = Math.floor(py / s) * s + s / 2; if (b.dith && ((Math.floor(px / s) + Math.floor(py / s)) % 2)) continue; }
    let a = (b.am === 'follow' ? ang : 0) + b.ang * Math.PI / 180 + (b.aj ? (R() - .5) * Math.PI * 2 * b.aj : 0);
    let col = st.color;
    if (b.hj) { const [r, g, bb] = hexToRgba(st.color); let [hh, ss, vv] = rgb2hsv(r, g, bb); hh = (hh + Math.round((R() - .5) * 2 * b.hj / 15) * 15 + 360) % 360; const [R2, G2, B2] = hsv2rgb(hh, Math.max(ss, .35), Math.max(vv, .5)); col = rgbaToHex(R2, G2, B2, 1); }
    const tip = tintedTip(b, b.glow ? '#ffffffff' : col);
    const al = b.fl * (1 - b.oj * R());
    sx.save(); sx.translate(px, py); if (a) sx.rotate(a);
    if (b.glow) { // colored halo + bright core
      const halo = tintedTip({ tip: 'round', hard: 0, ratio: 1 }, col);
      const hs = s * 3.4 * Math.min(1, b.sp * 6);
      sx.globalAlpha = al * .05; sx.drawImage(halo, -hs, -hs, hs * 2, hs * 2);
      sx.globalAlpha = al * .5; sx.drawImage(tintedTip(b, col), -s / 2, -s / 2, s, s);
      sx.globalAlpha = al; sx.drawImage(tip, -s * .2, -s * .2, s * .4, s * .4);
    } else { sx.globalAlpha = al; sx.drawImage(tip, -s / 2, -s / 2 * (b.ratio < 1 ? 1 : 1), s, s); }
    sx.restore();
  }
}
// smudge: carry paint along; blur: soften under the brush
function smudgeAt(x, st, px, py, size) {
  if (!x) return; const s = Math.max(2, Math.round(size)), b = st.b;
  if (!st.buf) { st.buf = newLayerCanvas(s, s); st.mask = tintedTip({ tip: 'round', hard: b.hard, ratio: 1 }, '#ffffffff'); }
  const bx = st.buf.getContext('2d');
  if (b.mode === 'blur') {
    bx.clearRect(0, 0, s, s); bx.filter = `blur(${Math.max(1, s / 10)}px)`; bx.drawImage(x.canvas, px - s / 2 - 2, py - s / 2 - 2, s + 4, s + 4, -2, -2, s + 4, s + 4); bx.filter = 'none';
  } else if (!st.loaded) { bx.clearRect(0, 0, s, s); bx.drawImage(x.canvas, px - s / 2, py - s / 2, s, s, 0, 0, s, s); st.loaded = true; }
  // shape the buffer to a soft round tip and lay it down
  const tmp = newLayerCanvas(s, s), tx = tmp.getContext('2d'); tx.drawImage(st.buf, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(st.mask, 0, 0, s, s);
  x.save(); x.globalAlpha = b.mode === 'blur' ? .8 : b.str; x.drawImage(tmp, px - s / 2, py - s / 2); x.restore();
  if (b.mode !== 'blur') { // pick up a little of what is under it for the next dab
    bx.globalAlpha = 1 - b.str * .9; bx.drawImage(x.canvas, px - s / 2, py - s / 2, s, s, 0, 0, s, s); bx.globalAlpha = 1;
  }
}
function dwBindStage(stage) {
  const pts = new Map(); let st = null, pinch = null, sm = null;
  stage.addEventListener('pointerdown', e => {
    e.preventDefault(); stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { // second finger: cancel the stroke and pan / zoom instead
      if (st) { dwCancelStroke(st); st = null; }
      const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: DW.view.z, vx: DW.view.x, vy: DW.view.y }; return;
    }
    if (pts.size > 2) return;
    const p = dwPt(e), L = DW.layers[DW.cur], t = DW_PREF.tool;
    if (!L.vis && t !== 'pick') { toast('This layer is hidden'); return; }
    if (t === 'pick') { dwPick(p); return; }
    if (t === 'fill') { dwFill(p); return; }
    if (t === 'photo') return;
    st = dwStartStroke(t, p, e); sm = { x: p.x, y: p.y }; DW.stroking = true;
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse' && (DW_PREF.tool === 'brush' || DW_PREF.tool === 'eraser')) { const p = dwPt(e); DW.cursor = { x: p.x, y: p.y, r: (DW_PREF.tool === 'brush' ? DW_PREF.size : DW_PREF.esize) / 2 }; dwRender(); } return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = stage.getBoundingClientRect();
      const z = clamp(pinch.z * d / Math.max(1, pinch.d), .05, 40);
      const cx = (pinch.mx - r.left - pinch.vx) / pinch.z, cy = (pinch.my - r.top - pinch.vy) / pinch.z;
      DW.view = { z, x: mx - r.left - cx * z, y: my - r.top - cy * z, fit: false }; dwRender(); return;
    }
    if (!st) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const p = dwPt(ev), k = DW_PREF.steady / 100;
      sm.x += (p.x - sm.x) * (1 - k); sm.y += (p.y - sm.y) * (1 - k);
      dwMoveStroke(st, sm.x, sm.y, ev.pressure || .5, p);
    }
    if (e.pointerType === 'mouse') { const p = dwPt(e); DW.cursor = { x: p.x, y: p.y, r: st.size / 2 }; }
    dwRender();
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) pinch = null; return; }
    if (st) { dwEndStroke(st); st = null; } DW.stroking = false;
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { if (DW.cursor) { DW.cursor = null; dwRender(); } });
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, z0 = DW.view.z, z = clamp(z0 * Math.exp(-e.deltaY * .0015), .05, 40); DW.view = { z, x: mx - (mx - DW.view.x) * z / z0, y: my - (my - DW.view.y) * z / z0, fit: false }; dwRender(); }, { passive: false });
}
function dwStartStroke(t, p, e) {
  const L = DW.layers[DW.cur];
  const b = t === 'eraser' ? BRUSHES[DW_PREF.eraser] : BRUSHES[DW_PREF.brush];
  const st = { t, L, b, size: t === 'eraser' ? DW_PREF.esize : DW_PREF.size, color: t === 'eraser' ? '#000000ff' : DW_PREF.color, last: null, dist: 0, n: 0, rnd: tipRand(Date.now() & 0xffff), pen: e.pointerType === 'pen', p0: p, p1: p };
  dwSnap(L);
  const sx = DW.stroke.getContext('2d'); sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1; sx.clearRect(0, 0, DW.w, DW.h);
  if (t === 'move') { st.copy = newLayerCanvas(DW.w, DW.h); st.copy.getContext('2d').drawImage(L.cv, 0, 0); return st; }
  if (t === 'brush' && b.mode) { st.direct = true; dabTo(null, st, p.x, p.y, e.pressure || .5, L.cv.getContext('2d')); return st; }
  if (t === 'brush' || t === 'eraser') { dabTo(sx, st, p.x, p.y, e.pressure || .5); }
  DW.live = dwLiveFor(st);
  return st;
}
// how the current layer looks while the stroke is still going
function dwLiveFor(st) {
  if (st.t === 'move') return L => st.moved || L.cv;
  const tmp = newLayerCanvas(DW.w, DW.h), gtmp = st.b && st.b.grain && st.t !== 'line' && st.t !== 'shape' ? newLayerCanvas(DW.w, DW.h) : null;
  return L => {
    const x = tmp.getContext('2d'); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.drawImage(L.cv, 0, 0);
    x.globalAlpha = DW_PREF.op / 100;
    x.globalCompositeOperation = st.t === 'eraser' ? 'destination-out' : L.lock ? 'source-atop' : 'source-over';
    x.drawImage(gtmp ? grainStroke(DW.stroke, st.b.grain, gtmp) : DW.stroke, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return tmp;
  };
}
function dwMoveStroke(st, x, y, pr, raw) {
  const sx = DW.stroke.getContext('2d');
  if (st.t === 'brush' || st.t === 'eraser') { if (st.direct) dabTo(null, st, x, y, pr, st.L.cv.getContext('2d')); else dabTo(sx, st, x, y, pr); return; }
  st.p1 = raw;
  if (st.t === 'move') {
    if (!st.moved) st.moved = newLayerCanvas(DW.w, DW.h);
    const m = st.moved.getContext('2d'); m.clearRect(0, 0, DW.w, DW.h); m.drawImage(st.copy, Math.round(raw.x - st.p0.x), Math.round(raw.y - st.p0.y)); return;
  }
  sx.clearRect(0, 0, DW.w, DW.h); dwShape(sx, st.t, st.p0, raw);
}
function dwShape(x, t, a, b) {
  x.save(); x.strokeStyle = x.fillStyle = css(DW_PREF.color); x.lineWidth = DW_PREF.lw || 6; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  if (t === 'line') { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); x.restore(); return; }
  const l = Math.min(a.x, b.x), tp = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), hh = Math.abs(b.y - a.y);
  if (DW_PREF.shape === 'rect') x.rect(l, tp, w, hh);
  else if (DW_PREF.shape === 'ellipse') x.ellipse(l + w / 2, tp + hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2);
  else if (DW_PREF.shape === 'tri') { x.moveTo(l + w / 2, tp); x.lineTo(l + w, tp + hh); x.lineTo(l, tp + hh); x.closePath(); }
  else { for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? .4 : 1; x.lineTo(l + w / 2 + Math.cos(an) * w / 2 * rr, tp + hh / 2 + Math.sin(an) * hh / 2 * rr); } x.closePath(); }
  if (DW_PREF.filled) x.fill(); else x.stroke();
  x.restore();
}
function dwEndStroke(st) {
  const L = st.L, x = L.cv.getContext('2d');
  if (st.t === 'move') { if (st.moved) { x.clearRect(0, 0, DW.w, DW.h); x.drawImage(st.moved, 0, 0); } }
  else if (!st.direct) {
    x.save(); x.globalAlpha = DW_PREF.op / 100;
    x.globalCompositeOperation = st.t === 'eraser' ? 'destination-out' : L.lock ? 'source-atop' : 'source-over';
    x.drawImage(st.b && st.b.grain && st.t !== 'line' && st.t !== 'shape' ? grainStroke(DW.stroke, st.b.grain, newLayerCanvas(DW.w, DW.h)) : DW.stroke, 0, 0); x.restore();
  }
  DW.stroke.getContext('2d').clearRect(0, 0, DW.w, DW.h); DW.live = null; dwRender();
}
function dwCancelStroke(st) { DW.stroke.getContext('2d').clearRect(0, 0, DW.w, DW.h); DW.live = null; const s = DW.undo.pop(); if (s) { const x = s.L.cv.getContext('2d'); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(s.c, 0, 0); } dwUndoUI(); dwRender(); }

/* eyedropper: the color of all visible layers together */
function dwComposite() { const c = newLayerCanvas(DW.w, DW.h), x = c.getContext('2d'); for (const L of DW.layers) { if (!L.vis) continue; x.globalAlpha = L.op / 100; x.globalCompositeOperation = L.blend; x.drawImage(L.cv, 0, 0); } return c; }
function dwPick(p) {
  const X = Math.floor(p.x), Y = Math.floor(p.y); if (X < 0 || Y < 0 || X >= DW.w || Y >= DW.h) return;
  const c = dwComposite(); const d = c.getContext('2d').getImageData(X, Y, 1, 1).data;
  if (d[3] === 0 && DW.ref && DW_PREF.ref) { const r = DW.ref.getContext('2d').getImageData(Math.floor(X * P.w / DW.w), Math.floor(Y * P.h / DW.h), 1, 1).data; DW_PREF.color = rgbaToHex(r[0], r[1], r[2], 1); }
  else if (d[3] === 0) { toast('Nothing there to pick'); return; }
  else DW_PREF.color = rgbaToHex(d[0], d[1], d[2], d[3] / 255);
  savePref(); toast('Color picked'); DW_PREF.tool = 'brush'; dwToolUI();
}
/* bucket: flood fill, or flood erase (makes the area see-through) */
function dwFill(p) {
  const X = Math.floor(p.x), Y = Math.floor(p.y), W = DW.w, H = DW.h; if (X < 0 || Y < 0 || X >= W || Y >= H) return;
  const L = DW.layers[DW.cur]; dwSnap(L);
  const src = DW_PREF.sample === 'all' ? dwComposite() : L.cv;
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data;
  const i0 = (Y * W + X) * 4, r0 = sd[i0], g0 = sd[i0 + 1], b0 = sd[i0 + 2], a0 = sd[i0 + 3], tol = DW_PREF.tol;
  const mask = new Uint8Array(W * H), stack = [X, Y];
  const same = i => { const j = i * 4; return Math.abs(sd[j] - r0) <= tol && Math.abs(sd[j + 1] - g0) <= tol && Math.abs(sd[j + 2] - b0) <= tol && Math.abs(sd[j + 3] - a0) <= tol; };
  while (stack.length) {
    const y = stack.pop(); let x = stack.pop(); let i = y * W + x;
    while (x >= 0 && !mask[i] && same(i)) { x--; i--; }
    x++; i++; let up = false, dn = false;
    while (x < W && !mask[i] && same(i)) {
      mask[i] = 1;
      if (y > 0) { const k = i - W; if (!mask[k] && same(k)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false; }
      if (y < H - 1) { const k = i + W; if (!mask[k] && same(k)) { if (!dn) { stack.push(x, y + 1); dn = true; } } else dn = false; }
      x++; i++;
    }
  }
  for (let g = 0; g < DW_PREF.grow; g++) { const m2 = mask.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (mask[i]) continue; if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W])) m2[i] = 1; } mask.set(m2); }
  const lx = L.cv.getContext('2d'), img = lx.getImageData(0, 0, W, H), d = img.data;
  if (DW_PREF.fillMode === 'erase') { for (let i = 0; i < W * H; i++) if (mask[i]) d[i * 4 + 3] = 0; }
  else {
    const [r, g, b, a] = hexToRgba(DW_PREF.color), al = a * DW_PREF.op / 100;
    for (let i = 0; i < W * H; i++) if (mask[i]) {
      const j = i * 4; if (L.lock && d[j + 3] === 0) continue;
      const da = d[j + 3] / 255, oa = al + da * (1 - al);
      if (oa <= 0) continue;
      d[j] = (r * al + d[j] * da * (1 - al)) / oa; d[j + 1] = (g * al + d[j + 1] * da * (1 - al)) / oa; d[j + 2] = (b * al + d[j + 2] * da * (1 - al)) / oa; d[j + 3] = (L.lock ? da : oa) * 255;
    }
  }
  lx.putImageData(img, 0, 0); dwRender();
}

/* ---------- finish: save layers + flattened picture, put the drawing on the timeline ---------- */
function canvasBlob(c) { return new Promise(res => c.toBlob(b => res(b), 'image/png')); }
async function closeDraw(save) {
  if (!save) { if (DW.undo.length && !(await confirmBox('Leave without saving this drawing?', 'Leave', 'Keep drawing'))) return; DW.on = false; DW.root.remove(); return; }
  toast('Saving drawing…', 8000);
  const metas = [];
  for (const L of DW.layers) { const m = await addMedia(await canvasBlob(L.cv), '~draw-layer.png'); metas.push({ id: L.id, name: L.name, vis: L.vis, op: L.op, blend: L.blend, lock: L.lock, media: m.id }); }
  const comp = await addMedia(await canvasBlob(dwComposite()), '~drawing.png');
  let c = DW.clip;
  if (!c) { addMediaClip(comp, true, 1); c = allClips().find(x => x.media === comp.id); if (c) c.name = 'Drawing'; }
  if (c) { c.media = comp.id; c.draw = { w: DW.w, h: DW.h, layers: metas }; }
  DW.on = false; DW.root.remove();
  commit(); refreshAll(); toast('Drawing saved');
}

/* ---------- photo tools: one-tap fixes and looks for the current layer, with a strength slider and live preview ---------- */
const PHOTO_OPS = [
  ['bright', 'Brightness', -100, 100, 20], ['contrast', 'Contrast', -100, 100, 20], ['sat', 'Saturation', -100, 100, 30], ['hue', 'Hue shift', -180, 180, 30],
  ['warm', 'Warmth', -100, 100, 30], ['expo', 'Exposure', -100, 100, 20], ['blur', 'Blur', 0, 100, 20], ['sharpen', 'Sharpen', 0, 100, 40],
  ['gray', 'Black and white', 0, 100, 100], ['sepia', 'Sepia', 0, 100, 80], ['invert', 'Invert', 0, 100, 100], ['posterize', 'Posterize', 2, 32, 6],
  ['pixelate', 'Pixelate', 2, 80, 10], ['noise', 'Grain', 0, 100, 25], ['vignette', 'Vignette', 0, 100, 50], ['threshold', 'Threshold', 0, 255, 128],
  ['removeWhite', 'Remove white background', 0, 100, 30], ['removeBlack', 'Remove black background', 0, 100, 30], ['removeColor', 'Remove the brush color', 0, 100, 30],
  ['outline', 'Outline around shapes', 1, 40, 6], ['shadow', 'Drop shadow', 1, 80, 14], ['glow', 'Glow', 1, 80, 20],
  ['flipH', 'Mirror', 0, 0, 0], ['flipV', 'Flip upside down', 0, 0, 0], ['rot180', 'Turn around', 0, 0, 0]
];
function photoApply(src, op, v) {
  const W = src.width, H = src.height, out = newLayerCanvas(W, H), x = out.getContext('2d');
  const cssF = { bright: `brightness(${100 + v}%)`, contrast: `contrast(${100 + v}%)`, sat: `saturate(${100 + v}%)`, hue: `hue-rotate(${v}deg)`, blur: `blur(${v * Math.max(W, H) / 2000}px)`, gray: `grayscale(${v}%)`, sepia: `sepia(${v}%)`, invert: `invert(${v}%)`, expo: `brightness(${Math.pow(2, v / 50) * 100}%)` }[op];
  if (cssF) { x.filter = cssF; x.drawImage(src, 0, 0); x.filter = 'none'; return out; }
  if (op === 'flipH' || op === 'flipV' || op === 'rot180') { x.translate(op !== 'flipV' ? W : 0, op !== 'flipH' ? H : 0); x.scale(op !== 'flipV' ? -1 : 1, op !== 'flipH' ? -1 : 1); x.drawImage(src, 0, 0); return out; }
  if (op === 'pixelate') { const s = Math.max(1, Math.round(v)), t = newLayerCanvas(Math.ceil(W / s), Math.ceil(H / s)); t.getContext('2d').drawImage(src, 0, 0, t.width, t.height); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, W, H); return out; }
  if (op === 'outline' || op === 'shadow' || op === 'glow') {
    const col = css(DW_PREF.color);
    if (op === 'outline') { const n = 16; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; x.drawImage(src, Math.cos(a) * v, Math.sin(a) * v); } x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; x.drawImage(src, 0, 0); return out; }
    x.shadowColor = op === 'glow' ? col : 'rgba(0,0,0,.65)'; x.shadowBlur = v; x.shadowOffsetX = x.shadowOffsetY = op === 'shadow' ? v * .6 : 0;
    x.drawImage(src, 0, 0); if (op === 'glow') x.drawImage(src, 0, 0); x.shadowColor = 'transparent'; return out;
  }
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, W, H), d = img.data;
  if (op === 'sharpen') {
    const s = d.slice(), k = v / 100 * 1.6;
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = (y * W + xx) * 4; for (let c = 0; c < 3; c++) { const lap = 4 * s[i + c] - s[i + c - 4] - s[i + c + 4] - s[i + c - W * 4] - s[i + c + W * 4]; d[i + c] = s[i + c] + lap * k; } }
  } else if (op === 'warm') { const k = v / 100 * 40; for (let i = 0; i < d.length; i += 4) { d[i] += k; d[i + 2] -= k; } }
  else if (op === 'posterize') { const n = Math.max(2, Math.round(v)) - 1; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] / 255 * n) / n * 255; }
  else if (op === 'noise') { const k = v * 1.2, r = tipRand(99); for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * k; d[i] += n; d[i + 1] += n; d[i + 2] += n; } }
  else if (op === 'threshold') { for (let i = 0; i < d.length; i += 4) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11, o = l >= v ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = o; } }
  else if (op === 'vignette') { const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy); for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const i = (y * W + xx) * 4, f = 1 - Math.pow(Math.hypot(xx - cx, y - cy) / R, 2.2) * v / 100; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; } }
  else if (op === 'removeWhite' || op === 'removeBlack' || op === 'removeColor') {
    const [tr, tg, tb] = op === 'removeWhite' ? [255, 255, 255] : op === 'removeBlack' ? [0, 0, 0] : hexToRgba(DW_PREF.color), lim = v * 2.2, soft = 30;
    for (let i = 0; i < d.length; i += 4) { const dist = Math.max(Math.abs(d[i] - tr), Math.abs(d[i + 1] - tg), Math.abs(d[i + 2] - tb)); if (dist <= lim) d[i + 3] = 0; else if (dist < lim + soft) d[i + 3] *= (dist - lim) / soft; }
  }
  x.putImageData(img, 0, 0); return out;
}
function photoUI(o) {
  const L = DW.layers[DW.cur];
  let op = DW.photoOp || 'bright', def = PHOTO_OPS.find(p => p[0] === op), val = def[4];
  const prev = () => { const src = L.cv; let cache = null, key = ''; DW.live = LL => { if (LL !== L) return LL.cv; const k = op + '|' + val; if (k !== key) { key = k; cache = photoApply(src, op, val); } return cache; }; dwRender(); };
  const sl = def[2] === def[3] ? null : rangeRow('Strength', { min: def[2], max: def[3], step: 1, value: val, onInput: v => { val = v; prev(); } });
  o.append(h('div', { class: 'dwo' }, h('label', null, 'Tool'), selectBox({ options: PHOTO_OPS.map(p => ({ v: p[0], l: p[1] })), value: op, onChange: v => { DW.photoOp = v; DW.live = null; dwToolUI(); } })));
  if (sl) o.append(sl);
  if (/outline|shadow|glow|removeColor/.test(op)) o.append(h('div', { class: 'dwo' }, h('label', null, 'Color'), colorBtn({ value: DW_PREF.color, onInput: v => { DW_PREF.color = v; savePref(); prev(); } })));
  o.append(h('div', { class: 'dwo' }, h('label', null, ''), h('button', { class: 'btn pri sm', onclick: () => { dwSnap(L); const r = photoApply(L.cv, op, val), x = L.cv.getContext('2d'); x.clearRect(0, 0, DW.w, DW.h); x.drawImage(r, 0, 0); DW.live = null; dwRender(); toast('Applied to ' + L.name); dwToolUI(); } }, 'Apply'), h('button', { class: 'btn sm', onclick: () => { DW.live = null; dwRender(); dwToolUI(); } }, 'Reset')));
  o.append(h('div', { class: 'hint' }, 'Changes the layer "' + L.name + '". The picture shows the result before you apply it.'));
  prev();
}
