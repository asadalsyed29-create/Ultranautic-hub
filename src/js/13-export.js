/* ================= MP4 writer (own, offline) ================= */
const MUX = (() => {
  const B = () => { const a = []; return { a, u8: v => a.push(v & 255), u16: v => a.push((v >>> 8) & 255, v & 255), i16: v => { v = v < 0 ? v + 65536 : v; a.push((v >>> 8) & 255, v & 255); }, u24: v => a.push((v >>> 16) & 255, (v >>> 8) & 255, v & 255), u32: v => { v = Math.floor(v); a.push(Math.floor(v / 16777216) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); }, u64: v => { const hi = Math.floor(v / 4294967296), lo = v - hi * 4294967296; const b = []; for (const x of [hi, lo]) b.push(Math.floor(x / 16777216) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); a.push(...b); }, str: s => { for (const ch of s) a.push(ch.charCodeAt(0)); }, bytes: u => { for (let i = 0; i < u.length; i++) a.push(u[i]); }, zeros: n => { for (let i = 0; i < n; i++) a.push(0); } }; };
  function box(type, fill) { const b = B(); fill && fill(b); const body = b.a; const out = new Uint8Array(8 + body.length); const dv = new DataView(out.buffer); dv.setUint32(0, out.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(body, 8); return out; }
  function fbox(type, ver, flags, fill) { return box(type, b => { b.u8(ver); b.u24(flags); fill && fill(b); }); }
  const kids = (b, ...bs) => { for (const x of bs) if (x) b.bytes(x); };
  const MATRIX = b => { for (const v of [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000]) b.u32(v); };
  function desc(tag, bytes) { return [tag, 0x80, 0x80, 0x80, bytes.length, ...bytes]; }
  function sampleEntry(tr) {
    if (tr.kind === 'video') {
      const inner = tr.codec === 'avc' ? box('avcC', b => b.bytes(tr.desc)) : tr.codec === 'hevc' ? box('hvcC', b => b.bytes(tr.desc))
        : fbox('vpcC', 1, 0, b => { b.u8(tr.vp.profile); b.u8(tr.vp.level); b.u8((tr.vp.bitDepth << 4) | (1 << 1) | 0); b.u8(1); b.u8(1); b.u8(1); b.u16(0); });
      const type = tr.codec === 'avc' ? 'avc1' : tr.codec === 'hevc' ? 'hvc1' : 'vp09';
      return box(type, b => { b.zeros(6); b.u16(1); b.u16(0); b.u16(0); b.zeros(12); b.u16(tr.w); b.u16(tr.h); b.u32(0x00480000); b.u32(0x00480000); b.u32(0); b.u16(1); b.zeros(32); b.u16(0x18); b.i16(-1); kids(b, inner, box('pasp', x => { x.u32(1); x.u32(1); })); });
    }
    if (tr.codec === 'aac') {
      const asc = tr.desc && tr.desc.length ? Array.from(tr.desc) : [0x11, 0x90];
      const es = desc(3, [0, 1, 0, ...desc(4, [0x40, 0x15, 0, 0, 0, ...u32a(tr.bitrate), ...u32a(tr.bitrate), ...desc(5, asc)]), ...desc(6, [2])]);
      return box('mp4a', b => { b.zeros(6); b.u16(1); b.zeros(8); b.u16(tr.ch); b.u16(16); b.u16(0); b.u16(0); b.u32(tr.sr * 65536); kids(b, fbox('esds', 0, 0, x => x.bytes(es))); });
    }
    let pre = 312; if (tr.desc && tr.desc.length >= 12 && String.fromCharCode(...tr.desc.slice(0, 8)) === 'OpusHead') pre = tr.desc[10] | (tr.desc[11] << 8);
    return box('Opus', b => { b.zeros(6); b.u16(1); b.zeros(8); b.u16(tr.ch); b.u16(16); b.u16(0); b.u16(0); b.u32(48000 * 65536); kids(b, box('dOps', x => { x.u8(0); x.u8(tr.ch); x.u16(pre); x.u32(tr.sr); x.i16(0); x.u8(0); })); });
  }
  const u32a = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  function trak(tr, id, offsets, movieDur) {
    const n = tr.samples.length, ts = tr.timescale;
    const ticks = tr.samples.map(s => Math.round(s.ts * ts / 1e6));
    const durs = ticks.map((t, i) => i < n - 1 ? Math.max(1, ticks[i + 1] - t) : Math.max(1, Math.round(tr.samples[i].dur * ts / 1e6) || (ticks[i] - (ticks[i - 1] || 0)) || 1));
    const mediaDur = durs.reduce((a, b) => a + b, 0);
    const stts = []; for (const d of durs) { const l = stts[stts.length - 1]; if (l && l[1] === d) l[0]++; else stts.push([1, d]); }
    const isV = tr.kind === 'video';
    const stbl = box('stbl', b => kids(b,
      fbox('stsd', 0, 0, x => { x.u32(1); x.bytes(sampleEntry(tr)); }),
      fbox('stts', 0, 0, x => { x.u32(stts.length); for (const [c, d] of stts) { x.u32(c); x.u32(d); } }),
      isV ? fbox('stss', 0, 0, x => { const k = []; tr.samples.forEach((s, i) => s.key && k.push(i + 1)); x.u32(k.length); for (const v of k) x.u32(v); }) : null,
      fbox('stsc', 0, 0, x => { x.u32(1); x.u32(1); x.u32(1); x.u32(1); }),
      fbox('stsz', 0, 0, x => { x.u32(0); x.u32(n); for (const s of tr.samples) x.u32(s.data.length); }),
      fbox('co64', 0, 0, x => { x.u32(n); for (let i = 0; i < n; i++) x.u64(offsets ? offsets[i] : 0); })));
    const minf = box('minf', b => kids(b, isV ? fbox('vmhd', 0, 1, x => x.zeros(8)) : fbox('smhd', 0, 0, x => x.zeros(4)),
      box('dinf', x => x.bytes(fbox('dref', 0, 0, y => { y.u32(1); y.bytes(fbox('url ', 0, 1)); }))), stbl));
    const mdia = box('mdia', b => kids(b,
      fbox('mdhd', 0, 0, x => { x.u32(0); x.u32(0); x.u32(ts); x.u32(mediaDur); x.u16(0x55c4); x.u16(0); }),
      fbox('hdlr', 0, 0, x => { x.u32(0); x.str(isV ? 'vide' : 'soun'); x.zeros(12); x.str(isV ? 'Framewright video' : 'Framewright sound'); x.u8(0); }), minf));
    const tdur = Math.round(mediaDur / ts * 1000);
    movieDur.v = Math.max(movieDur.v, tdur);
    return box('trak', b => kids(b,
      fbox('tkhd', 0, 3, x => { x.u32(0); x.u32(0); x.u32(id); x.u32(0); x.u32(tdur); x.zeros(8); x.u16(0); x.u16(0); x.u16(isV ? 0 : 0x0100); x.u16(0); MATRIX(x); x.u32(isV ? tr.w * 65536 : 0); x.u32(isV ? tr.h * 65536 : 0); }), mdia));
  }
  function build(tracks) {
    // interleave samples by time in mdat
    const all = []; tracks.forEach((tr, ti) => tr.samples.forEach((s, si) => all.push({ ti, si, ts: s.ts, s })));
    all.sort((a, b) => a.ts - b.ts || a.ti - b.ti);
    const rel = tracks.map(tr => new Array(tr.samples.length)); let off = 0;
    for (const e of all) { rel[e.ti][e.si] = off; off += e.s.data.length; }
    const ftyp = box('ftyp', b => { b.str('isom'); b.u32(512); b.str('isom'); b.str('iso2'); b.str('avc1'); b.str('mp41'); });
    const mk = offs => { const md = { v: 0 }; const traks = tracks.map((tr, i) => trak(tr, i + 1, offs && offs[i], md)); return box('moov', b => kids(b, fbox('mvhd', 0, 0, x => { x.u32(0); x.u32(0); x.u32(1000); x.u32(md.v); x.u32(0x00010000); x.u16(0x0100); x.zeros(10); MATRIX(x); x.zeros(24); x.u32(tracks.length + 1); }), ...traks)); };
    const moov0 = mk(null);
    const base = ftyp.length + moov0.length + 16;
    const moov = mk(rel.map(r => r.map(o => o + base)));
    const mh = new Uint8Array(16); const dv = new DataView(mh.buffer); dv.setUint32(0, 1); mh.set([109, 100, 97, 116], 4); const sz = 16 + off; dv.setUint32(8, Math.floor(sz / 4294967296)); dv.setUint32(12, sz >>> 0);
    return new Blob([ftyp, moov, mh, ...all.map(e => e.s.data)], { type: 'video/mp4' });
  }
  return { build };
})();

/* ================= export ================= */
const EXP = { res: 1080, fps: 30, mbps: null, name: '' };
function exportDims(cls) {
  const ar = P.w / P.h; let w, hh;
  if (ar >= 1) { hh = cls; w = Math.round(cls * ar); } else { w = cls; hh = Math.round(cls / ar); }
  // stay inside what encoders accept (about 8.9 million pixels for level 5.2)
  const maxMB = 36864; const mb = Math.ceil(w / 16) * Math.ceil(hh / 16);
  if (mb > maxMB) { const s = Math.sqrt(maxMB / mb) * 0.995; w *= s; hh *= s; }
  w = Math.round(w / 2) * 2; hh = Math.round(hh / 2) * 2;
  return [w, hh];
}
function defMbps(cls, fps) { const base = cls >= 2160 ? 45 : cls >= 1080 ? 16 : 8; return Math.round(base * (fps >= 50 ? 1.5 : fps <= 24 ? 0.85 : 1)); }
async function pickVideoCodec(w, hh, fps, bitrate) {
  if (!window.VideoEncoder) return null;
  const list = [
    ['avc', 'avc1.640034'], ['avc', 'avc1.640033'], ['avc', 'avc1.64002a'], ['avc', 'avc1.640028'], ['avc', 'avc1.4d0034'], ['avc', 'avc1.42e034'],
    ['hevc', 'hvc1.1.6.L156.B0'], ['hevc', 'hvc1.1.6.L153.B0'], ['vp9', 'vp09.00.51.08'], ['vp9', 'vp09.00.50.08'], ['vp9', 'vp09.00.41.08']
  ];
  for (const hw of ['prefer-hardware', 'no-preference', 'prefer-software']) for (const [kind, codec] of list) {
    const cfg = { codec, width: w, height: hh, bitrate, framerate: fps, hardwareAcceleration: hw, bitrateMode: 'variable', latencyMode: 'quality' };
    if (kind === 'avc') cfg.avc = { format: 'avc' }; if (kind === 'hevc') cfg.hevc = { format: 'hevc' };
    try { const s = await VideoEncoder.isConfigSupported(cfg); if (s.supported) return { kind, cfg: s.config || cfg }; } catch (e) { }
  }
  return null;
}
async function pickAudioCodec() {
  if (!window.AudioEncoder) return null;
  for (const [kind, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: kind === 'aac' ? 256000 : 192000 };
    try { const s = await AudioEncoder.isConfigSupported(cfg); if (s.supported) return { kind, cfg }; } catch (e) { }
  }
  return null;
}
function openExport() {
  if (PLAY.on) pause();
  if (projDur() <= 0) { toast('The timeline is empty'); return; }
  EXP.name = EXP.name || ($('#pname').value || 'video').replace(/[\\/:*?"<>|]+/g, '_');
  const body = h('div');
  const dimsTxt = h('div', { class: 'hint' });
  let mb = EXP.mbps || defMbps(EXP.res, EXP.fps);
  const mbF = numField({ value: mb, min: 1, max: 250, dec: 1, suf: 'Mbps', step: 1, onInput: v => { mb = v; EXP.mbps = v; updInfo(); } });
  mbF.querySelector('.num').style.paddingRight = '46px';
  const updInfo = () => { const [w, hh] = exportDims(EXP.res); const sz = mb * projDur() / 8 + 0.256 * projDur() / 8; dimsTxt.textContent = `${w} × ${hh} · ${EXP.fps} fps · ${fmtDur(projDur())} · about ${sz < 1000 ? Math.max(1, Math.round(sz)) + ' MB' : (sz / 1000).toFixed(1) + ' GB'}`; };
  const nameIn = h('input', { class: 'txt', value: EXP.name, spellcheck: 'false' }); nameIn.addEventListener('keydown', e => e.stopPropagation()); nameIn.addEventListener('input', () => EXP.name = nameIn.value);
  const resetMb = () => { mb = defMbps(EXP.res, EXP.fps); EXP.mbps = null; mbF.set(mb); updInfo(); };
  body.append(
    row('File name', nameIn),
    row('Resolution', segBox({ options: [{ v: 720, l: '720p' }, { v: 1080, l: '1080p' }, { v: 2160, l: '4K' }], value: EXP.res, onChange: v => { EXP.res = v; resetMb(); } })),
    row('Frame rate', segBox({ options: [{ v: 24, l: '24' }, { v: 30, l: '30' }, { v: 60, l: '60' }], value: EXP.fps, onChange: v => { EXP.fps = v; resetMb(); } })),
    row('Bitrate', mbF), row('', h('div', { class: 'presets', style: { margin: 0 } }, ...[['Lower', .6], ['Recommended', 1], ['Higher', 1.6]].map(([l, f]) => h('button', { onclick: () => { mb = Math.round(defMbps(EXP.res, EXP.fps) * f); EXP.mbps = mb; mbF.set(mb); updInfo(); } }, l)))),
    row('Format', h('div', { class: 'note', style: { color: 'var(--tx)' } }, 'MP4 · made on this device, no watermark')), dimsTxt);
  updInfo();
  const m = modal('Export video', body, [{ l: 'Cancel' }, { l: 'Export MP4', pri: 1, onClick: () => { EXP.name = nameIn.value || 'video'; runExport(mb); } }], { width: 460 });
}
async function runExport(mbps) {
  const fps = EXP.fps, [W, H] = exportDims(EXP.res), dur = projDur(), N = Math.max(1, Math.round(dur * fps));
  const bitrate = Math.round(mbps * 1e6);
  const st = h('div', { class: 'note', style: { color: 'var(--tx)' } }, 'Getting ready…'), pr = h('div', { class: 'prog' }, h('i')), sub = h('div', { class: 'hint' });
  let cancel = false;
  const dlg = modal('Exporting', h('div', null, st, pr, sub), [{ l: 'Cancel', onClick: () => { cancel = true; return false; } }], { noX: true, width: 440 });
  const setP = (f, msg, s2) => { pr.firstChild.style.width = (f * 100).toFixed(1) + '%'; if (msg) st.textContent = msg; if (s2 != null) sub.textContent = s2; };
  let venc, aenc;
  EXPORTING = true;
  try {
    const vc = await pickVideoCodec(W, H, fps, bitrate);
    if (!vc) throw new Error('This browser cannot make MP4 video here. Please use Chrome, Edge or another Chromium browser (version 94 or newer).');
    const ac = await pickAudioCodec();
    // ---- sound: mix everything offline ----
    let mix = null;
    const sound = soundClips();
    if (sound.length && ac) {
      setP(0, 'Mixing sound…');
      const len = Math.ceil(dur * 48000) + 1;
      const oc = new OfflineAudioContext(2, len, 48000);
      for (const { c, tr } of sound) {
        const m = MEDIA[c.media]; if (!m.audio) continue;
        const src = oc.createBufferSource(); src.buffer = m.audio; src.playbackRate.value = c.speed || 1;
        const g = oc.createGain(); const v = (c.vol == null ? 100 : c.vol) / 100;
        const t0 = c.start, t1 = c.start + c.dur;
        g.gain.setValueAtTime(c.fadeIn > 0 ? 0 : v, t0);
        if (c.fadeIn > 0) g.gain.linearRampToValueAtTime(v, t0 + Math.min(c.fadeIn, c.dur));
        if (c.fadeOut > 0) { g.gain.setValueAtTime(v, Math.max(t0, t1 - c.fadeOut)); g.gain.linearRampToValueAtTime(0, t1); }
        src.connect(g).connect(oc.destination);
        src.start(t0, c.in, c.dur * (c.speed || 1));
      }
      mix = await oc.startRendering();
    }
    if (cancel) throw new Error('cancel');
    // ---- encoders ----
    const vTrack = { kind: 'video', codec: vc.kind, w: W, h: H, timescale: fps * 1000, samples: [], desc: null, vp: { profile: 0, level: parseInt((vc.cfg.codec.split('.')[2]) || '50', 10), bitDepth: 8 } };
    const aTrack = mix ? { kind: 'audio', codec: ac.kind, sr: 48000, ch: 2, timescale: 48000, samples: [], desc: null, bitrate: ac.cfg.bitrate } : null;
    let encErr = null;
    venc = new VideoEncoder({
      output: (chunk, meta) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); if (meta && meta.decoderConfig && meta.decoderConfig.description && !vTrack.desc) vTrack.desc = new Uint8Array(meta.decoderConfig.description.buffer ? meta.decoderConfig.description.buffer.slice(meta.decoderConfig.description.byteOffset || 0, (meta.decoderConfig.description.byteOffset || 0) + meta.decoderConfig.description.byteLength) : meta.decoderConfig.description); vTrack.samples.push({ data: d, ts: chunk.timestamp, dur: chunk.duration || 1e6 / fps, key: chunk.type === 'key' }); },
      error: e => { encErr = e; }
    });
    venc.configure(vc.cfg);
    if (aTrack) {
      aenc = new AudioEncoder({
        output: (chunk, meta) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); if (meta && meta.decoderConfig && meta.decoderConfig.description && !aTrack.desc) { const ds = meta.decoderConfig.description; aTrack.desc = new Uint8Array(ds.buffer ? ds.buffer.slice(ds.byteOffset || 0, (ds.byteOffset || 0) + ds.byteLength) : ds); } aTrack.samples.push({ data: d, ts: chunk.timestamp, dur: chunk.duration || 0 }); },
        error: e => { encErr = e; }
      });
      aenc.configure(ac.cfg);
      const L = mix.length, ch0 = mix.getChannelData(0), ch1 = mix.getChannelData(1), F = 4800;
      for (let i = 0; i < L; i += F) {
        const n = Math.min(F, L - i), buf = new Float32Array(n * 2); buf.set(ch0.subarray(i, i + n), 0); buf.set(ch1.subarray(i, i + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / 48000 * 1e6), data: buf });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush();
    }
    // ---- pictures: one exact frame at a time ----
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { alpha: false });
    const t0 = performance.now(); let lastUi = 0;
    for (let i = 0; i < N; i++) {
      if (cancel) throw new Error('cancel');
      if (encErr) throw encErr;
      const t = i / fps;
      await prepFrame(t);
      renderFrame(x, t, W, H);
      const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
      while (venc.encodeQueueSize > 4) await sleep(2);
      const now = performance.now();
      if (now - lastUi > 150 || i === N - 1) {
        lastUi = now; const el = (now - t0) / 1000, rate = (i + 1) / el, left = (N - i - 1) / Math.max(rate, 0.01);
        setP((i + 1) / N, `Frame ${i + 1} of ${N}`, `${rate.toFixed(1)} frames a second · about ${fmtDur(left)} left · ${vc.cfg.codec.startsWith('avc') ? 'H.264' : vc.cfg.codec.startsWith('hvc') ? 'H.265' : 'VP9'} ${W}×${H}`);
        await sleep(0);
      }
    }
    setP(1, 'Finishing…');
    await venc.flush(); venc.close(); venc = null;
    if (aenc) { aenc.close(); aenc = null; }
    if (encErr) throw encErr;
    if (vTrack.codec !== 'vp9' && !vTrack.desc) throw new Error('The encoder did not describe the video stream.');
    const blob = MUX.build(aTrack && aTrack.samples.length ? [vTrack, aTrack] : [vTrack]);
    dlg.close();
    const url = URL.createObjectURL(blob), fname = (EXP.name || 'video').replace(/\.mp4$/i, '') + '.mp4';
    const a = h('a', { href: url, download: fname }); document.body.append(a); a.click(); a.remove();
    const share = navigator.canShare && navigator.canShare({ files: [new File([blob], fname, { type: 'video/mp4' })] });
    modal('Export finished', h('div', null,
      h('div', { class: 'note', style: { color: 'var(--tx)', marginBottom: '8px' } }, `${fname} · ${W}×${H} · ${fps} fps · ${(blob.size / 1048576).toFixed(1)} MB`),
      h('div', { class: 'note' }, 'The download started. If it did not, use the button below.')),
      [share ? { l: 'Share', onClick: () => { navigator.share({ files: [new File([blob], fname, { type: 'video/mp4' })] }).catch(() => { }); return false; } } : null, { l: 'Download again', pri: 1, onClick: () => { const b2 = h('a', { href: url, download: fname }); document.body.append(b2); b2.click(); b2.remove(); return false; } }, { l: 'Close' }].filter(Boolean));
  } catch (e) {
    try { venc && venc.state !== 'closed' && venc.close(); } catch (x) { }
    try { aenc && aenc.state !== 'closed' && aenc.close(); } catch (x) { }
    dlg.close();
    if (String(e && e.message) !== 'cancel') { console.error(e); modal('Export stopped', h('div', { class: 'note', style: { color: 'var(--tx)' } }, String(e && e.message || e)), [{ l: 'OK', pri: 1 }]); }
    else toast('Export cancelled');
  }
  EXPORTING = false;
  requestRender();
}
function soundClips() {
  const out = [];
  for (const tr of P.tracks) {
    if (tr.muted) continue;
    for (const c of tr.clips) { if ((c.type === 'audio' || c.type === 'video') && !c.muted && MEDIA[c.media] && MEDIA[c.media].hasAudio && (c.vol == null || c.vol > 0)) out.push({ c, tr }); }
  }
  return out;
}
// make every video element show the exact frame for time t
async function prepFrame(t) {
  const jobs = [];
  for (const v of visibleAt(t)) {
    if (v.c.type !== 'video') continue;
    const e = VP.ensure(v.c); if (!e) continue;
    const el = e.el, m = MEDIA[v.c.media];
    if (!el.paused) el.pause();
    const target = clamp(v.c.in + v.lt * (v.c.speed || 1), 0, Math.max(0, (m.dur || 0) - 0.001));
    if (el.readyState < 2) jobs.push(new Promise(r => { const f = () => { el.removeEventListener('loadeddata', f); r(); }; el.addEventListener('loadeddata', f); setTimeout(r, 4000); }).then(() => seekEl(el, target + 0.0005)));
    else if (Math.abs(el.currentTime - target - 0.0005) > 0.25 / 120) jobs.push(seekEl(el, target + 0.0005));
  }
  // background blur uses the bottom clip too: it is already covered above
  if (jobs.length) await Promise.all(jobs);
}

/* ================= project file (.fwproj: one file with media inside) ================= */
async function saveProjectFile() {
  P.name = $('#pname').value;
  const used = new Set(allClips().map(c => c.media).filter(Boolean));
  const parts = [], index = []; let off = 0;
  for (const id of Object.keys(MEDIA)) { const m = MEDIA[id]; const buf = new Uint8Array(await m.blob.arrayBuffer()); index.push({ id, name: m.name, type: m.blob.type, off, len: buf.length, used: used.has(id) }); parts.push(buf); off += buf.length; }
  const head = new TextEncoder().encode(JSON.stringify({ app: 'framewright', v: 1, project: P, media: index }));
  const pre = new Uint8Array(12); pre.set([70, 87, 80, 82, 79, 74, 49, 0], 0); new DataView(pre.buffer).setUint32(8, head.length);
  const blob = new Blob([pre, head, ...parts], { type: 'application/octet-stream' });
  const a = h('a', { href: URL.createObjectURL(blob), download: (P.name || 'project').replace(/[\\/:*?"<>|]+/g, '_') + '.fwproj' }); document.body.append(a); a.click(); a.remove();
  toast('Project saved as a file');
}
async function openProjectFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...buf.slice(0, 6)) !== 'FWPROJ') { toast('Not a Framewright project file'); return; }
  const n = new DataView(buf.buffer).getUint32(8), head = JSON.parse(new TextDecoder().decode(buf.slice(12, 12 + n)));
  if (!(await confirmBox('Open this project? The current one will be replaced (it is kept only if you saved it as a file).', 'Open'))) return;
  await clearAllMedia();
  const base = 12 + n;
  for (const m of head.media) { const blob = new Blob([buf.slice(base + m.off, base + m.off + m.len)], { type: m.type }); await addMedia(blob, m.name, m.id); }
  P = head.project; $('#pname').value = P.name || 'Untitled project'; $('#ratioLbl').textContent = P.ratio;
  SEL = null; T = 0; HIST.list = []; HIST.i = -1; commit(); layoutView(); refreshAll(); renderLeft();
}
async function clearAllMedia() { for (const id of Object.keys(MEDIA)) { URL.revokeObjectURL(MEDIA[id].url); delete MEDIA[id]; await dbDel('media', id); } for (const [id] of VP.els) VP.drop(id); }
async function newProjectAsk() {
  if (!(await confirmBox('Start a new empty project? The current project and its files will be removed from this device unless you saved it as a file.', 'Start new'))) return;
  await clearAllMedia(); P = newProject(); SEL = null; T = 0; $('#pname').value = P.name; $('#ratioLbl').textContent = P.ratio;
  HIST.list = []; HIST.i = -1; commit(); layoutView(); refreshAll(); renderLeft();
}
function snapshotPNG() {
  const [w, hh] = exportDims(1080); const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
  prepFrame(T).then(() => { renderFrame(cv.getContext('2d'), T, w, hh); cv.toBlob(b => { const a = h('a', { href: URL.createObjectURL(b), download: 'frame-' + fmtTime(T, P.fps).replace(/:/g, '-') + '.png' }); document.body.append(a); a.click(); a.remove(); }, 'image/png'); });
}
