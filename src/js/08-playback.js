/* ================= media elements for preview ================= */
const VP = {
  els: new Map(),
  peek(id) { const e = this.els.get(id); return e ? e.el : null; },
  ensure(c) {
    let e = this.els.get(c.id);
    const m = MEDIA[c.media];
    if (!m) return null;
    if (e && e.media !== c.media) { this.drop(c.id); e = null; }
    if (!e) {
      const el = document.createElement(m.kind === 'audio' ? 'audio' : 'video');
      el.preload = 'auto'; el.playsInline = true; el.muted = true; el.crossOrigin = 'anonymous';
      el.src = m.url;
      el.addEventListener('seeked', requestRender);
      el.addEventListener('loadeddata', requestRender);
      e = { el, media: c.media, gain: null };
      this.els.set(c.id, e);
    }
    return e;
  },
  drop(id) { const e = this.els.get(id); if (!e) return; try { e.el.pause(); e.el.removeAttribute('src'); e.el.load(); if (e.node) e.node.disconnect(); } catch (x) { } this.els.delete(id); },
  wire(e) {
    // route element audio through Web Audio so volume above 100% and fades work
    if (e.gain || !AC) return;
    try { e.node = AC.createMediaElementSource(e.el); e.gain = AC.createGain(); e.node.connect(e.gain).connect(AC.destination); e.el.muted = false; } catch (x) { }
  }
};
function dropMediaEls(mediaId) { for (const [id, e] of VP.els) if (e.media === mediaId) VP.drop(id); }
function audioGainAt(c, lt, tr) {
  if (c.muted || (tr && tr.muted)) return 0;
  let g = (c.vol == null ? 100 : c.vol) / 100;
  if (c.fadeIn > 0 && lt < c.fadeIn) g *= lt / c.fadeIn;
  if (c.fadeOut > 0 && c.dur - lt < c.fadeOut) g *= Math.max(0, (c.dur - lt) / c.fadeOut);
  return g;
}
function syncMedia(t, playing) {
  const want = new Map();
  for (const v of visibleAt(t)) if (v.c.type === 'video') want.set(v.c.id, v);
  for (const tr of audioTracks()) { const c = clipAt(tr, t); if (c) want.set(c.id, { c, lt: t - c.start, tr }); }
  // pre-load clips that start within the next second so they are ready
  for (const tr of P.tracks) for (const c of tr.clips) if ((c.type === 'video' || c.type === 'audio') && c.start > t && c.start - t < 1.2) VP.ensure(c);
  for (const [id, e] of VP.els) {
    const w = want.get(id);
    if (!w) { if (!e.el.paused) e.el.pause(); if (e.gain) e.gain.gain.value = 0; continue; }
  }
  for (const [id, w] of want) {
    const c = w.c, e = VP.ensure(c); if (!e) continue;
    const el = e.el, spd = c.speed || 1;
    const target = clamp(c.in + w.lt * spd, 0, (MEDIA[c.media] && MEDIA[c.media].dur) || 1e9);
    const tr = w.tr || trackOf(c);
    const hasSound = !w.frozen && (c.type === 'audio' || c.type === 'video');
    if (playing && hasSound) {
      if (AC) { VP.wire(e); if (e.gain) e.gain.gain.value = audioGainAt(c, w.lt, tr); else { el.muted = false; el.volume = clamp(audioGainAt(c, w.lt, tr), 0, 1); } }
      const rate = clamp(spd, 0.0625, 16);
      if (spd > 16 || spd < 0.0625) { if (!el.paused) el.pause(); if (Math.abs(el.currentTime - target) > 0.02) el.currentTime = target; continue; }
      if (el.playbackRate !== rate) el.playbackRate = rate;
      if (el.paused) { el.currentTime = target; const pr = el.play(); if (pr) pr.catch(() => { }); }
      else if (Math.abs(el.currentTime - target) > 0.25) el.currentTime = target;
    } else {
      if (!el.paused) el.pause();
      if (e.gain) e.gain.gain.value = 0;
      if (Math.abs(el.currentTime - target) > 0.4 / P.fps && !el.seeking) el.currentTime = target;
    }
  }
}

/* ================= preview ================= */
const VIEW = { cv: null, x: null, ov: null, ox: null, k: 1, left: 0, top: 0, cssW: 0, cssH: 0, need: true };
function layoutView() {
  if (!P || !VIEW.cv) return;
  const st = $('#stage'), r = st.getBoundingClientRect();
  const pad = innerWidth < 1000 ? 8 : 20;
  const aw = Math.max(10, r.width - pad * 2), ah = Math.max(10, r.height - pad * 2);
  const s = Math.min(aw / P.w, ah / P.h);
  const cw = Math.max(2, Math.floor(P.w * s)), ch = Math.max(2, Math.floor(P.h * s));
  const dpr = Math.min(devicePixelRatio || 1, 2.5);
  let pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
  const cap = 1920 / Math.max(pw, ph); if (cap < 1) { pw = Math.round(pw * cap); ph = Math.round(ph * cap); }
  for (const c of [VIEW.cv, VIEW.ov]) {
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    c.style.width = cw + 'px'; c.style.height = ch + 'px'; c.style.left = Math.round((r.width - cw) / 2) + 'px'; c.style.top = Math.round((r.height - ch) / 2) + 'px';
  }
  VIEW.cssW = cw; VIEW.cssH = ch; VIEW.left = Math.round((r.width - cw) / 2); VIEW.top = Math.round((r.height - ch) / 2); VIEW.k = cw / P.w;
  requestRender();
}
let rafPending = false;
function requestRender() { VIEW.need = true; if (!rafPending) { rafPending = true; requestAnimationFrame(frameLoop); } }
function renderPreview() {
  const c = VIEW.cv;
  try { renderFrame(VIEW.x, T, c.width, c.height); } catch (e) { console.error(e); }
  drawOverlay();
  updTime();
}
const PLAY = { on: false, t0: 0, w0: 0 };
function frameLoop() {
  rafPending = false;
  if (EXPORTING) return;
  if (PLAY.on) {
    const end = projDur();
    T = PLAY.t0 + (performance.now() - PLAY.w0) / 1000;
    if (T >= end) { T = end; pause(); }
    syncMedia(T, PLAY.on);
    renderPreview(); updPlayhead(true);
    if (PLAY.on) { rafPending = true; requestAnimationFrame(frameLoop); }
    return;
  }
  if (VIEW.need) { VIEW.need = false; syncMedia(T, false); renderPreview(); }
  // keep animated stickers / titles alive when paused? no: paused shows one frame
}
function play() {
  if (PLAY.on) return;
  try { actx(); if (AC.state !== 'running') AC.resume(); } catch (e) { }
  if (T >= projDur() - 1e-3) T = 0;
  PLAY.on = true; PLAY.t0 = T; PLAY.w0 = performance.now();
  $('#playBtn').innerHTML = icon('pause');
  rafPending = true; requestAnimationFrame(frameLoop);
}
function pause() {
  PLAY.on = false; $('#playBtn').innerHTML = icon('play');
  for (const [, e] of VP.els) if (!e.el.paused) e.el.pause();
  T = Math.round(T * P.fps) / P.fps;
  requestRender(); updPlayhead(); refreshInspectorValues();
}
function togglePlay() { PLAY.on ? pause() : play(); }
function seek(t, noRefresh) {
  T = clamp(t, 0, Math.max(projDur(), 0));
  if (PLAY.on) { PLAY.t0 = T; PLAY.w0 = performance.now(); syncMedia(T, true); }
  requestRender(); updPlayhead();
  if (!noRefresh) refreshInspectorValues();
}
function updTime() { $('#tc').innerHTML = `<b>${fmtTime(T, P.fps)}</b> / ${fmtTime(projDur(), P.fps)}`; }
