/* ================= project model ================= */
const RATIOS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:3': [1440, 1080], '3:4': [1080, 1440], '4:5': [1080, 1350], '21:9': [2520, 1080], '2.35:1': [2538, 1080] };
const KF_PROPS = ['x', 'y', 'scale', 'rot', 'opacity'];
const VISUAL = { video: 1, image: 1, text: 1, sticker: 1, effect: 1, filter: 1, adjust: 1 };
const MAX_ROT = 35999640;

let P;            // the project
let SEL = null;   // selected clip id
let SELKF = null; // {prop, idx} selected keyframe on selected clip
let T = 0;        // playhead seconds
const MEDIA = {}; // media library by id

function newProject() {
  return {
    v: 1, name: 'Untitled project', ratio: '16:9', w: 1920, h: 1080, fps: 30,
    bg: { type: 'color', color: '#000000ff', blur: 40 },
    tracks: [{ id: uid(), kind: 'visual', main: true, clips: [] }, { id: uid(), kind: 'audio', clips: [] }]
  };
}
function defGrade() { return { brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, tint: 0, hue: 0, highlights: 0, shadows: 0, fade: 0, vignette: 0, grain: 0, sharpen: 0 }; }
function baseClip(type, extra) {
  return Object.assign({
    id: uid(), type, start: 0, dur: 5, in: 0, speed: 1, name: '',
    tf: { x: P.w / 2, y: P.h / 2, scale: 1, rot: 0, opacity: 100 },
    kf: { x: [], y: [], scale: [], rot: [], opacity: [] },
    flipH: false, flipV: false, blend: 'source-over',
    crop: { l: 0, t: 0, r: 0, b: 0 },
    mask: { type: 'none', x: 0, y: 0, w: 0.6, h: 0.6, rot: 0, feather: 0, round: 0, invert: false },
    grade: defGrade(), filter: { id: 'none', amount: 100 }, effects: [], chroma: { on: false, color: '#00ff00ff', sim: 30, smooth: 10, spill: 50 },
    anim: { in: { id: 'none', dur: 0.5 }, out: { id: 'none', dur: 0.5 }, loop: { id: 'none', speed: 1 } },
    trans: null, vol: 100, fadeIn: 0, fadeOut: 0, muted: false
  }, extra || {});
}
function allClips() { const a = []; for (const t of P.tracks) for (const c of t.clips) a.push(c); return a; }
function findClip(id) { for (const t of P.tracks) for (const c of t.clips) if (c.id === id) return c; return null; }
function trackOf(clip) { return P.tracks.find(t => t.clips.includes(clip)); }
function selClip() { return SEL ? findClip(SEL) : null; }
function projDur() { let d = 0; for (const c of allClips()) d = Math.max(d, c.start + c.dur); return d; }
function visualTracks() { return P.tracks.filter(t => t.kind === 'visual'); }
function audioTracks() { return P.tracks.filter(t => t.kind === 'audio'); }
function sortTrack(t) { t.clips.sort((a, b) => a.start - b.start); }
function fits(track, start, dur, ignore) { return !track.clips.some(c => c !== ignore && c.start < start + dur - 1e-6 && start < c.start + c.dur - 1e-6); }
function mediaDur(c) { const m = MEDIA[c.media]; return m && m.dur ? m.dur : Infinity; }

/* ================= undo / redo ================= */
const HIST = { list: [], i: -1 };
let saveTimer;
function snapshot() { return JSON.stringify({ P, SEL }); }
function commit() {
  const s = snapshot();
  if (HIST.list[HIST.i] === s) return;
  HIST.list.splice(HIST.i + 1);
  HIST.list.push(s);
  if (HIST.list.length > 150) HIST.list.shift();
  HIST.i = HIST.list.length - 1;
  updUndo();
  clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 700);
}
function restore(s) { const o = JSON.parse(s); P = o.P; SEL = o.SEL && findClip(o.SEL) ? o.SEL : null; SELKF = null; refreshAll(); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 700); }
function undo() { if (HIST.i > 0) { HIST.i--; restore(HIST.list[HIST.i]); updUndo(); } }
function redo() { if (HIST.i < HIST.list.length - 1) { HIST.i++; restore(HIST.list[HIST.i]); updUndo(); } }
function updUndo() { $('#bUndo').disabled = HIST.i <= 0; $('#bRedo').disabled = HIST.i >= HIST.list.length - 1; }

/* ================= storage (IndexedDB, all local) ================= */
let DB;
function idb() {
  if (DB) return Promise.resolve(DB);
  return new Promise((res, rej) => {
    const r = indexedDB.open('framewright', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('media'); };
    r.onsuccess = () => { DB = r.result; res(DB); };
    r.onerror = () => rej(r.error);
  });
}
async function dbPut(store, key, val) { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function dbGet(store, key) { const d = await idb(); return new Promise((res, rej) => { const r = d.transaction(store).objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function dbDel(store, key) { const d = await idb(); return new Promise(res => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = res; tx.onerror = res; }); }
async function dbKeys(store) { const d = await idb(); return new Promise(res => { const r = d.transaction(store).objectStore(store).getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => res([]); }); }
async function autosave() {
  try {
    P.name = $('#pname').value || 'Untitled project';
    await dbPut('kv', 'project', JSON.stringify(P));
    await dbPut('kv', 'library', JSON.stringify(Object.keys(MEDIA)));
  } catch (e) { console.warn('autosave', e); }
}

/* ================= media import ================= */
function extOf(n) { return (n.split('.').pop() || '').toLowerCase(); }
async function importFiles(files) {
  const out = [];
  for (const f of files) {
    try {
      const m = await addMedia(f, f.name);
      if (m) out.push(m);
    } catch (e) { console.error(e); toast('Could not open ' + f.name); }
  }
  renderLeft();
  return out;
}
async function addMedia(blob, name, id, saved) {
  id = id || uid();
  const ext = extOf(name), mt = blob.type || '';
  let kind = mt.startsWith('video') || ['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext) ? 'video'
    : mt.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext) ? 'audio'
    : mt.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'apng', 'avif', 'bmp'].includes(ext) ? 'image' : null;
  if (!kind) { toast('Not a supported file: ' + name); return null; }
  const m = { id, name, kind, blob, url: URL.createObjectURL(blob), w: 0, h: 0, dur: 0, thumbs: [], ready: false };
  MEDIA[id] = m;
  if (!saved) await dbPut('media', id, { id, name, kind, blob });
  if (kind === 'video') await prepVideo(m);
  else if (kind === 'audio') await prepAudio(m);
  else await prepImage(m, ext, mt);
  m.ready = true;
  return m;
}
function loadVideoEl(url) {
  return new Promise((res, rej) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.onloadeddata = () => res(v); v.onerror = () => rej(new Error('video decode failed'));
    v.src = url;
  });
}
function seekEl(v, t) {
  return new Promise(res => {
    if (Math.abs(v.currentTime - t) < 1e-4 && v.readyState >= 2) return res();
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin);
    v.currentTime = t;
    setTimeout(fin, 3000);
  });
}
async function prepVideo(m) {
  const v = await loadVideoEl(m.url);
  m.w = v.videoWidth; m.h = v.videoHeight; m.dur = isFinite(v.duration) ? v.duration : 10;
  // thumbnails
  const th = 64, tw = Math.max(16, Math.round(th * m.w / m.h));
  const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d');
  const n = Math.min(24, Math.max(4, Math.ceil(m.dur / 2)));
  for (let i = 0; i < n; i++) {
    await seekEl(v, Math.min(m.dur - 0.05, (i + 0.5) * m.dur / n));
    x.drawImage(v, 0, 0, tw, th);
    m.thumbs.push(c.toDataURL('image/jpeg', 0.7));
  }
  m.thumbW = tw;
  v.removeAttribute('src'); v.load();
  try { await decodeAudioFor(m); } catch (e) { m.hasAudio = false; }
}
let AC = null;
function actx() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); return AC; }
async function decodeAudioFor(m) {
  const ab = await m.blob.arrayBuffer();
  const ctx = new OfflineAudioContext(2, 2, 48000);
  const buf = await ctx.decodeAudioData(ab);
  m.audio = buf; m.hasAudio = true;
  if (m.kind === 'audio') m.dur = buf.duration;
  // peaks: 40 per second (max abs)
  const pps = 40, n = Math.ceil(buf.duration * pps), pk = new Float32Array(n), d0 = buf.getChannelData(0), d1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d0, step = buf.sampleRate / pps;
  let mx = 0;
  for (let i = 0; i < n; i++) { let a = 0; const s = Math.floor(i * step), e = Math.min(d0.length, Math.floor((i + 1) * step)); for (let j = s; j < e; j += 4) { const v = Math.abs(d0[j]) + Math.abs(d1[j]); if (v > a) a = v; } pk[i] = a / 2; if (a / 2 > mx) mx = a / 2; }
  if (mx > 0) for (let i = 0; i < n; i++) pk[i] /= mx;
  m.peaks = pk; m.pps = pps;
}
async function prepAudio(m) { await decodeAudioFor(m); }
async function prepImage(m, ext, mt) {
  // animated images (GIF / APNG / animated WebP) through ImageDecoder when the browser has it
  if (['gif', 'webp', 'png', 'apng', 'avif'].includes(ext) && 'ImageDecoder' in window) {
    try {
      const type = mt || (ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'avif' ? 'image/avif' : 'image/png');
      const dec = new ImageDecoder({ data: await m.blob.arrayBuffer(), type });
      await dec.tracks.ready;
      const tr = dec.tracks.selectedTrack;
      if (tr && tr.animated && tr.frameCount > 1) {
        await dec.completed;
        const frames = []; let t = 0; const n = Math.min(tr.frameCount, 900);
        for (let i = 0; i < n; i++) {
          const r = await dec.decode({ frameIndex: i });
          const vf = r.image, d = (vf.duration || 100000) / 1e6;
          const bmp = await createImageBitmap(vf); vf.close();
          frames.push({ t, bmp }); t += Math.max(0.02, d);
        }
        m.frames = frames; m.loop = t; m.w = frames[0].bmp.width; m.h = frames[0].bmp.height; m.animated = true;
        m.thumbs = [bmpThumb(frames[0].bmp)];
        dec.close();
        return;
      }
      dec.close();
    } catch (e) { /* fall back to static */ }
  }
  if (ext === 'svg' || mt === 'image/svg+xml') return prepSVG(m);
  const img = await loadImg(m.url);
  m.el = img; m.w = img.naturalWidth; m.h = img.naturalHeight;
  m.thumbs = [bmpThumb(img)];
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('image failed')); i.src = src; }); }
function bmpThumb(src, th = 96) { const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height; const c = document.createElement('canvas'); c.height = th; c.width = Math.max(8, Math.round(th * w / hh)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }

/* SVG: gives the file a size when it only has a viewBox, and bakes SMIL/CSS animation into frames so export is exact */
async function prepSVG(m) {
  let txt = await m.blob.text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const svg = doc.documentElement;
  let vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  let w = parseFloat(svg.getAttribute('width')), hh = parseFloat(svg.getAttribute('height'));
  if (!(w > 0 && hh > 0)) { if (vb.length === 4 && vb[2] > 0) { w = vb[2]; hh = vb[3]; } else { w = 512; hh = 512; } }
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
  const k = 1024 / Math.max(w, hh); if (k > 1) { w *= k; hh *= k; }
  svg.setAttribute('width', w); svg.setAttribute('height', hh);
  txt = new XMLSerializer().serializeToString(svg);
  m.w = w; m.h = hh;
  const animated = /<animate|<set[\s>]|animation\s*:|animation-name|@keyframes/i.test(txt);
  if (animated) {
    try { const ok = await bakeSVG(m, txt, w, hh); if (ok) return; } catch (e) { console.warn('svg bake', e); }
  }
  const url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
  m.el = await loadImg(url); m.thumbs = [bmpThumb(m.el)];
}
async function bakeSVG(m, txt, w, hh) {
  const host = h('div', { style: { position: 'fixed', left: '-99999px', top: '0', width: w + 'px', height: hh + 'px', pointerEvents: 'none' } });
  host.innerHTML = txt; document.body.append(host);
  const svg = host.querySelector('svg');
  try {
    svg.pauseAnimations && svg.pauseAnimations();
    // loop length: longest SMIL simple duration or CSS animation
    let L = 0;
    for (const a of svg.querySelectorAll('animate,animateTransform,animateMotion,animateColor,set')) { try { const d = a.getSimpleDuration(); if (isFinite(d)) L = Math.max(L, d + (a.getStartTime ? a.getStartTime() || 0 : 0)); } catch (e) { } }
    const cssAnims = svg.getAnimations ? svg.getAnimations({ subtree: true }) : [];
    for (const a of cssAnims) { const t = a.effect.getTiming(); const d = (t.delay || 0) + (typeof t.duration === 'number' ? t.duration : 0); L = Math.max(L, d / 1000); a.pause(); }
    if (!(L > 0)) L = 2; L = Math.min(L, 12);
    const fps = 30, n = Math.max(2, Math.round(L * fps));
    const els = [svg, ...svg.querySelectorAll('*')];
    const GEO = ['x', 'y', 'width', 'height', 'r', 'rx', 'ry', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2'];
    const STY = ['fill', 'stroke', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'visibility', 'display', 'transform', 'transform-origin', 'stop-color', 'stop-opacity'];
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      svg.setCurrentTime && svg.setCurrentTime(t);
      for (const a of cssAnims) a.currentTime = t * 1000;
      const clone = svg.cloneNode(true);
      const cEls = [clone, ...clone.querySelectorAll('*')];
      for (let j = 0; j < els.length; j++) {
        const e = els[j], c = cEls[j]; if (!c || !e.getAttribute) continue;
        for (const g of GEO) { const p = e[g]; if (p && p.animVal && p.animVal.valueAsString != null) c.setAttribute(g, p.animVal.valueAsString); }
        if (e.points && e.animatedPoints) { c.setAttribute('points', Array.from(e.animatedPoints).map(p => p.x + ',' + p.y).join(' ')); }
        if (e.transform && e.transform.animVal && e.transform.animVal.numberOfItems) { const q = new DOMMatrix(); const L = e.transform.animVal; for (let z = 0; z < L.numberOfItems; z++) { const mm = L.getItem(z).matrix; q.multiplySelf(new DOMMatrix([mm.a, mm.b, mm.c, mm.d, mm.e, mm.f])); } c.setAttribute('transform', `matrix(${q.a} ${q.b} ${q.c} ${q.d} ${q.e} ${q.f})`); }
        if (e.getAttribute('d') != null) { const anim = e.querySelector(':scope>animate[attributeName="d"]'); if (anim) { /* path morph: keep computed d */ const cs = getComputedStyle(e).d; if (cs && cs !== 'none') c.setAttribute('d', cs.replace(/^path\("|"\)$/g, '')); } }
        if (e instanceof SVGElement && e !== svg) {
          const cs = getComputedStyle(e); let st = 'animation:none!important;transition:none!important;';
          for (const s of STY) { const v = cs.getPropertyValue(s); if (v && v !== 'none' || s === 'display' || s === 'transform') { if (s === 'transform' && (v === 'none' || !cssAnims.length)) continue; st += s + ':' + v + ';'; } }
          c.setAttribute('style', st);
        }
      }
      clone.querySelectorAll('animate,animateTransform,animateMotion,animateColor,set').forEach(x => x.remove());
      const s = new XMLSerializer().serializeToString(clone);
      const img = await loadImg(URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })));
      const bmp = await createImageBitmap(img, { resizeWidth: Math.round(w), resizeHeight: Math.round(hh) });
      frames.push({ t, bmp });
    }
    m.frames = frames; m.loop = n / fps; m.animated = true; m.thumbs = [bmpThumb(frames[0].bmp)];
    return true;
  } finally { host.remove(); }
}
function mediaFrame(m, t) {
  // returns drawable for animated image at local time t
  const L = m.loop || 1; let tt = ((t % L) + L) % L;
  const fr = m.frames; let lo = 0, hi = fr.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (fr[mid].t <= tt) lo = mid; else hi = mid - 1; }
  return fr[lo].bmp;
}
async function removeMedia(id) {
  const used = allClips().some(c => c.media === id);
  if (used && !(await confirmBox('This file is used in the timeline. Remove it and its clips?', 'Remove'))) return;
  for (const t of P.tracks) t.clips = t.clips.filter(c => c.media !== id);
  const m = MEDIA[id]; if (m) URL.revokeObjectURL(m.url);
  delete MEDIA[id]; dbDel('media', id); dropMediaEls(id);
  commit(); refreshAll();
}
