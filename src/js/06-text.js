/* ================= text ================= */
const FONTS = [
  { v: 'system-ui, sans-serif', l: 'System Sans' }, { v: 'Arial, sans-serif', l: 'Arial' }, { v: 'Helvetica, Arial, sans-serif', l: 'Helvetica' }, { v: 'Verdana, sans-serif', l: 'Verdana' },
  { v: 'Tahoma, sans-serif', l: 'Tahoma' }, { v: '"Trebuchet MS", sans-serif', l: 'Trebuchet MS' }, { v: '"Segoe UI", sans-serif', l: 'Segoe UI' }, { v: 'Roboto, sans-serif', l: 'Roboto' },
  { v: '"Arial Black", "Arial Bold", sans-serif', l: 'Arial Black' }, { v: 'Impact, "Arial Black", sans-serif', l: 'Impact' }, { v: '"Carrois Gothic SC", "sans-serif-smallcaps", sans-serif', l: 'Small Caps (Android)' },
  { v: 'Georgia, serif', l: 'Georgia' }, { v: '"Times New Roman", serif', l: 'Times New Roman' }, { v: '"Noto Serif", serif', l: 'Noto Serif' }, { v: 'Garamond, "EB Garamond", serif', l: 'Garamond' }, { v: '"Palatino Linotype", Palatino, serif', l: 'Palatino' }, { v: 'serif', l: 'Serif' },
  { v: '"Courier New", monospace', l: 'Courier New' }, { v: 'Consolas, monospace', l: 'Consolas' }, { v: '"Cutive Mono", monospace', l: 'Cutive Mono' }, { v: '"Droid Sans Mono", monospace', l: 'Droid Sans Mono' }, { v: 'monospace', l: 'Monospace' },
  { v: '"Comic Sans MS", "Coming Soon", casual, cursive', l: 'Comic / Casual' }, { v: '"Dancing Script", "Brush Script MT", cursive', l: 'Script' }, { v: '"Segoe Print", "Bradley Hand", cursive', l: 'Handwriting' }, { v: 'fantasy', l: 'Fantasy' }
];
const USER_FONTS = []; // {v,l}
function fontOptions() {
  const a = FONTS.map(f => ({ ...f, font: f.v, g: 'Built in' }));
  for (const f of USER_FONTS) a.push({ ...f, font: f.v, g: f.g || 'Your fonts' });
  return a;
}
async function loadFontFile(file) {
  const name = 'UF ' + file.name.replace(/\.[^.]+$/, '').replace(/["']/g, '');
  const ff = new FontFace(name, await file.arrayBuffer());
  await ff.load(); document.fonts.add(ff);
  const v = `"${name}"`;
  if (!USER_FONTS.some(f => f.v === v)) USER_FONTS.push({ v, l: name.slice(3), g: 'Imported' });
  try { await dbPut('kv', 'font:' + name, { name, blob: file }); } catch (e) { }
  return v;
}
async function restoreFonts() {
  for (const k of await dbKeys('kv')) if (String(k).startsWith('font:')) {
    try { const r = await dbGet('kv', k); const ff = new FontFace(r.name, await r.blob.arrayBuffer()); await ff.load(); document.fonts.add(ff); USER_FONTS.push({ v: `"${r.name}"`, l: r.name.slice(3), g: 'Imported' }); } catch (e) { }
  }
}
async function useLocalFonts() {
  if (!window.queryLocalFonts) { toast('This browser cannot list computer fonts. Use Import font instead.'); return; }
  try {
    const list = await queryLocalFonts(); const fam = new Set();
    for (const f of list) fam.add(f.family);
    for (const f of [...fam].sort()) { const v = `"${f}"`; if (!USER_FONTS.some(x => x.v === v)) USER_FONTS.push({ v, l: f, g: 'On this computer' }); }
    toast(fam.size + ' fonts added');
  } catch (e) { toast('Font access was not allowed'); }
}

function defText(extra) {
  return Object.assign({
    txt: 'Your text', font: 'system-ui, sans-serif', weight: 800, italic: false, size: 120, ls: 0, lh: 1.15, align: 'center', upper: false,
    fillType: 'solid', color: '#ffffffff', g1: '#ffd36bff', g2: '#ff4f7aff', gAng: 90,
    stroke: { on: false, color: '#000000ff', w: 8 },
    shadow: { on: false, color: '#000000aa', blur: 12, x: 6, y: 8 },
    glow: { on: false, color: '#3fd6c0ff', size: 30, str: 2 },
    box: { on: false, color: '#000000a6', pad: 24, round: 0 },
    curve: 0,
    ain: { id: 'none', dur: 1 }, aout: { id: 'none', dur: 0.6 }, aloop: { id: 'none', speed: 1, amt: 1 }, cursor: true
  }, extra || {});
}
const MC = document.createElement('canvas').getContext('2d');
const layoutCache = new Map();
function textLayout(tx) {
  const key = [tx.txt, tx.font, tx.weight, tx.italic, tx.size, tx.ls, tx.lh, tx.align, tx.upper, tx.curve].join('|');
  let L = layoutCache.get(key); if (L) return L;
  const font = `${tx.italic ? 'italic ' : ''}${tx.weight} ${tx.size}px ${tx.font}`;
  MC.font = font;
  const raw = String(tx.upper ? tx.txt.toUpperCase() : tx.txt);
  const lines = raw.split('\n');
  const lh = tx.size * tx.lh, H = lines.length * lh;
  const out = { font, lines: [], chars: [], w: 0, h: H };
  lines.forEach((ln, li) => {
    const chars = Array.from(ln), xs = []; let pre = '';
    for (let i = 0; i < chars.length; i++) { xs.push(MC.measureText(pre).width + tx.ls * i); pre += chars[i]; }
    const lw = chars.length ? MC.measureText(ln).width + tx.ls * (chars.length - 1) : 0;
    out.w = Math.max(out.w, lw);
    out.lines.push({ text: ln, chars, xs, w: lw, y: -H / 2 + lh * li + lh / 2 });
  });
  // per-char positions (center of glyph), with optional arc
  const R = Math.abs(tx.curve) > 0.5 ? Math.max(out.w, 1) / (Math.abs(tx.curve) / 100 * Math.PI * 1.6) : 0, sg = Math.sign(tx.curve);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  out.lines.forEach((ln, li) => {
    const x0 = tx.align === 'left' ? -out.w / 2 : tx.align === 'right' ? out.w / 2 - ln.w : -ln.w / 2;
    ln.x0 = x0;
    ln.chars.forEach((ch, i) => {
      const cw = MC.measureText(ch).width; const s = x0 + ln.xs[i] + cw / 2;
      let x = s, y = ln.y, a = 0;
      if (R) { const r = R + (sg > 0 ? (ln.y + H / 2) : (H / 2 - ln.y)) * 0; const th = s / R; x = Math.sin(th) * R; y = ln.y + sg * R * (1 - Math.cos(th)); a = sg * th; }
      out.chars.push({ ch, x, y, a, w: cw, line: li, i });
      minX = Math.min(minX, x - cw / 2); maxX = Math.max(maxX, x + cw / 2); minY = Math.min(minY, y - lh / 2); maxY = Math.max(maxY, y + lh / 2);
    });
  });
  if (!out.chars.length) { minX = -tx.size / 2; maxX = tx.size / 2; minY = -lh / 2; maxY = lh / 2; }
  // arcs shift text: keep it centered on its box
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  if (R) { for (const c of out.chars) { c.x -= cx; c.y -= cy; } minX -= cx; maxX -= cx; minY -= cy; maxY -= cy; }
  out.bb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  out.R = R;
  if (layoutCache.size > 300) layoutCache.clear();
  layoutCache.set(key, out);
  return out;
}
function textBox(tx) { const L = textLayout(tx); const p = tx.box && tx.box.on ? tx.box.pad : 0; return { x: L.bb.x - p, y: L.bb.y - p, w: L.bb.w + p * 2, h: L.bb.h + p * 2 }; }
function rrect(x, X, Y, W, H, r) { r = Math.min(r, W / 2, H / 2); x.beginPath(); if (x.roundRect) x.roundRect(X, Y, W, H, r); else x.rect(X, Y, W, H); }
function drawText(x, tx, lt, dur) {
  const L = textLayout(tx);
  const m = x.getTransform(), ds = Math.hypot(m.a, m.b) || 1; // device pixels per unit (shadows are in device px)
  const anim = (tx.ain && tx.ain.id !== 'none') || (tx.aout && tx.aout.id !== 'none') || (tx.aloop && tx.aloop.id !== 'none');
  const n = L.chars.length;
  const st = L.chars.map((c, i) => anim ? textCharState(tx, i, n, lt, dur, tx.size) : null);
  // background box
  if (tx.box && tx.box.on) {
    x.fillStyle = css(tx.box.color); const p = tx.box.pad;
    let a = 1; if (anim) { const vis = st.filter(s => s.show && s.a > 0); a = vis.length ? Math.max(...vis.map(s => s.a)) : 0; }
    x.save(); x.globalAlpha *= a;
    if (L.R) { const b = L.bb; rrect(x, b.x - p, b.y - p, b.w + p * 2, b.h + p * 2, tx.box.round); x.fill(); }
    else for (const ln of L.lines) { if (!ln.w && L.lines.length > 1) continue; const lh = tx.size * tx.lh; rrect(x, ln.x0 - p, ln.y - lh / 2 - p * .35, Math.max(ln.w, tx.size * .3) + p * 2, lh + p * .7, tx.box.round); x.fill(); }
    x.restore();
  }
  x.font = L.font; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fill, gp = null, cfill = null;
  if (tx.fillType === 'gradient') {
    const b = L.bb, a = (tx.gAng || 0) * Math.PI / 180, cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.abs(Math.cos(a)) * b.w / 2 + Math.abs(Math.sin(a)) * b.h / 2;
    gp = [cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    fill = x.createLinearGradient(gp[0], gp[1], gp[2], gp[3]);
    fill.addColorStop(0, css(tx.g1)); fill.addColorStop(1, css(tx.g2));
  } else fill = css(tx.color);
  // fast path: whole lines (keeps the font's kerning) when nothing moves per letter and no arc
  const simple = !anim && !L.R;
  const passes = [];
  if (tx.glow && tx.glow.on) for (let k = 0; k < Math.max(1, Math.round(tx.glow.str)); k++) passes.push('glow');
  if (tx.shadow && tx.shadow.on) passes.push('shadow');
  passes.push('main');
  const lw = tx.stroke && tx.stroke.on ? tx.stroke.w : 0;
  for (const pass of passes) {
    x.save();
    if (pass === 'glow') { x.shadowColor = css(tx.glow.color); x.shadowBlur = tx.glow.size * ds; }
    if (pass === 'shadow') { x.shadowColor = css(tx.shadow.color); x.shadowBlur = tx.shadow.blur * ds; x.shadowOffsetX = tx.shadow.x * ds; x.shadowOffsetY = tx.shadow.y * ds; }
    const paint = (s, X, Y) => {
      if (lw > 0) { x.lineJoin = 'round'; x.miterLimit = 2; x.lineWidth = lw * 2; x.strokeStyle = css(tx.stroke.color); x.strokeText(s, X, Y); if (pass !== 'main') return; x.shadowColor = 'transparent'; }
      if (pass === 'glow') x.fillStyle = css(tx.glow.color); else x.fillStyle = cfill || fill;
      x.fillText(s, X, Y);
    };
    if (simple) {
      if ('letterSpacing' in x) x.letterSpacing = tx.ls + 'px';
      x.textAlign = 'left';
      for (const ln of L.lines) if (ln.text) paint(ln.text, ln.x0, ln.y);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    } else {
      for (let i = 0; i < n; i++) {
        const c = L.chars[i], s = st[i];
        if (c.ch === ' ' || (s && (!s.show || s.a <= 0.003))) continue;
        x.save(); x.translate(c.x + (s ? s.dx : 0), c.y + (s ? s.dy : 0)); x.rotate(c.a + (s ? s.rot * Math.PI / 180 : 0));
        if (s) { if (s.s !== 1) x.scale(s.s, s.s); x.globalAlpha *= clamp(s.a, 0, 1); if (s.blur > 0.3) x.filter = `blur(${s.blur * ds}px)`; }
        if (tx.fillType === 'gradient' && gp) {
          // letters keep their own slice of the text-wide gradient
          const ox = c.x + (s ? s.dx : 0), oy = c.y + (s ? s.dy : 0), an = -(c.a + (s ? s.rot * Math.PI / 180 : 0)), sc = s ? s.s || 1 : 1;
          const tp = (px, py) => { const dx = px - ox, dy = py - oy; return [(dx * Math.cos(an) - dy * Math.sin(an)) / sc, (dx * Math.sin(an) + dy * Math.cos(an)) / sc]; };
          const p0 = tp(gp[0], gp[1]), p1 = tp(gp[2], gp[3]);
          const g = x.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); g.addColorStop(0, css(tx.g1)); g.addColorStop(1, css(tx.g2)); cfill = g;
        }
        paint(c.ch, 0, 0);
        x.restore();
      }
    }
    x.restore();
  }
  // typewriter cursor
  if (tx.cursor && tx.ain && tx.ain.id === 'typewriter' && lt < tx.ain.dur + 0.8 && Math.floor(lt * 2.4) % 2 === 0) {
    let last = null; for (let i = 0; i < n; i++) if (st[i] && st[i].show) last = L.chars[i];
    const lh = tx.size * 0.9; const cx = last ? last.x + last.w / 2 + tx.size * 0.08 : (L.lines[0] ? L.lines[0].x0 : 0), cy = last ? last.y : (L.lines[0] ? L.lines[0].y : 0);
    x.fillStyle = tx.fillType === 'gradient' ? css(tx.g2) : css(tx.color); x.fillRect(cx, cy - lh / 2, Math.max(2, tx.size * 0.06), lh);
  }
}

/* pre-styled title cards */
const TITLES = [
  { n: 'Bold Impact', t: { txt: 'BIG NEWS', font: 'Impact, "Arial Black", sans-serif', weight: 900, size: 170, upper: true, stroke: { on: true, color: '#000000ff', w: 10 }, ain: { id: 'pop', dur: .6 }, aloop: { id: 'none', speed: 1, amt: 1 } } },
  { n: 'Neon Sign', t: { txt: 'open late', font: '"Trebuchet MS", sans-serif', weight: 700, size: 140, color: '#ffe6f6ff', glow: { on: true, color: '#ff2d9bff', size: 34, str: 3 }, aloop: { id: 'flicker', speed: 1, amt: 1 }, ain: { id: 'fade', dur: .8 } } },
  { n: 'Lower Third', t: { txt: 'Alex Rivera\nPhotographer', size: 64, weight: 700, align: 'left', box: { on: true, color: '#0e0f11d9', pad: 22, round: 0 }, ain: { id: 'rise', dur: .7 }, aout: { id: 'fade', dur: .5 } }, pos: [0.3, 0.82] },
  { n: 'Cinematic', t: { txt: 'THE LONG ROAD', font: 'Georgia, serif', weight: 400, size: 96, ls: 28, upper: true, color: '#f1eadbff', ain: { id: 'blur', dur: 1.6 }, aout: { id: 'fade', dur: 1 } } },
  { n: 'Gradient Pop', t: { txt: 'Summer Vibes', weight: 900, size: 150, fillType: 'gradient', g1: '#ffd36bff', g2: '#ff3d7fff', gAng: 0, ain: { id: 'bounce', dur: 1 }, shadow: { on: true, color: '#00000066', blur: 0, x: 8, y: 10 } } },
  { n: 'Retro Shadow', t: { txt: 'RETRO', font: '"Arial Black", sans-serif', weight: 900, size: 180, color: '#ffcf3dff', stroke: { on: true, color: '#2a1a4aff', w: 7 }, shadow: { on: true, color: '#e8417aff', blur: 0, x: 14, y: 14 }, ain: { id: 'drop', dur: .8 } } },
  { n: 'Subtitle', t: { txt: 'This is what they said', weight: 600, size: 58, box: { on: true, color: '#000000a6', pad: 14, round: 0 } }, pos: [0.5, 0.88] },
  { n: 'Typewriter', t: { txt: 'Day 1. It begins.', font: '"Courier New", monospace', weight: 700, size: 84, color: '#f4f1e8ff', ain: { id: 'typewriter', dur: 1.6 }, cursor: true } },
  { n: 'Arc Badge', t: { txt: 'BEST VIDEO EVER MADE', weight: 900, size: 64, ls: 6, curve: 45, color: '#ffffffff', stroke: { on: true, color: '#111111ff', w: 6 }, aloop: { id: 'none', speed: 1, amt: 1 }, ain: { id: 'spread', dur: .8 } } },
  { n: 'Chrome', t: { txt: 'CHROME', font: '"Arial Black", sans-serif', weight: 900, size: 170, fillType: 'gradient', g1: '#f7f9fcff', g2: '#6b7686ff', gAng: 90, stroke: { on: true, color: '#1d232cff', w: 6 }, glow: { on: true, color: '#9fd5ffaa', size: 24, str: 1 }, ain: { id: 'pop', dur: .7 } } },
  { n: 'Handwritten', t: { txt: 'with love', font: '"Dancing Script", "Brush Script MT", "Segoe Script", cursive', weight: 700, size: 150, color: '#ffffffff', ain: { id: 'wipe', dur: 1.4 } } },
  { n: 'Headline Box', t: { txt: 'BREAKING', weight: 900, size: 110, ls: 4, color: '#ffffffff', box: { on: true, color: '#e5372cff', pad: 26, round: 0 }, ain: { id: 'pop', dur: .5 }, aloop: { id: 'pulse', speed: .8, amt: .6 } } },
  { n: 'Wavy', t: { txt: 'good morning', weight: 800, size: 120, color: '#9ff2e4ff', stroke: { on: true, color: '#0b3b36ff', w: 7 }, aloop: { id: 'wave', speed: 1, amt: 1 } } },
  { n: 'Glitchy', t: { txt: 'SYSTEM ERROR', font: '"Courier New", monospace', weight: 700, size: 104, color: '#e8fff9ff', shadow: { on: true, color: '#ff2d55cc', blur: 0, x: -6, y: 0 }, glow: { on: true, color: '#00e5ffaa', size: 8, str: 1 }, aloop: { id: 'jitter', speed: 1, amt: 1 } } },
  { n: 'Minimal', t: { txt: 'chapter one', font: '"Helvetica", Arial, sans-serif', weight: 300, size: 80, ls: 16, color: '#ffffffff', ain: { id: 'fade', dur: 1.2 }, aout: { id: 'fade', dur: 1 } } },
  { n: 'Sticker Text', t: { txt: 'OMG', font: '"Arial Black", sans-serif', weight: 900, size: 190, color: '#ffffffff', stroke: { on: true, color: '#ff3d7fff', w: 16 }, shadow: { on: true, color: '#00000055', blur: 0, x: 0, y: 12 }, ain: { id: 'pop', dur: .5 }, aloop: { id: 'swing', speed: .8, amt: .5 } } }
];
