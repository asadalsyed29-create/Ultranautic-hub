/* ================= export (WAV), song files ================= */
const Exp = { range: 'song', bits: 16, sr: 48000, tail: 2.5, stems: false };
function exportDialog() {
  const end = songEnd();
  if (end <= 0) { msgBox('Nothing to export', 'Add some notes or sounds first.'); return; }
  const b = h('div');
  b.append(row('Part', segBox({ value: Exp.range, options: [{ v: 'song', l: 'Whole song' }, { v: 'loop', l: 'Loop part' }], onChange: v => Exp.range = v })));
  b.append(row('Quality', segBox({ value: Exp.bits, options: [{ v: 16, l: '16-bit' }, { v: 24, l: '24-bit' }, { v: 32, l: '32-bit float' }], onChange: v => Exp.bits = v })));
  b.append(row('Sample rate', segBox({ value: Exp.sr, options: [{ v: 44100, l: '44.1 kHz' }, { v: 48000, l: '48 kHz' }, { v: 96000, l: '96 kHz' }], onChange: v => Exp.sr = v })));
  b.append(rangeRow('Ending', { value: Exp.tail, min: 0, max: 10, step: 0.5, suf: 's', onInput: v => Exp.tail = v }));
  b.append(row('', checkBox('Each track as its own file too', Exp.stems, v => Exp.stems = v)));
  b.append(h('div', { class: 'note', style: { marginTop: '6px' } }, 'Saves a WAV file. Ending adds time after the last note so the reverb can fade out.'));
  modal('Export audio', b, [{ l: 'Cancel' }, { l: 'Export', pri: 1, onClick: () => { runExport(); } }]);
}
async function runExport() {
  if (T.playing) stop(false);
  ensureAudio();
  const loop = Exp.range === 'loop' && song.loop.b > song.loop.a;
  const fromB = loop ? song.loop.a : 0, toB = loop ? song.loop.b : songEnd();
  const bar = h('i'), lab = h('div', { class: 'note' }, 'Getting the instruments ready…');
  const m = modal('Exporting', h('div', null, lab, h('div', { class: 'prog' }, bar)), [], { noX: true });
  try {
    await Promise.all(song.tracks.filter(t => t.kind !== 'audio').map(tr => { const pr = getPreset(tr.preset), ms = new Set(); for (const c of song.clips) if (c.tr === tr.id && c.notes) for (const n of c.notes) ms.add(n.m + (pr.e === 'drum' ? 0 : tr.oct * 12)); return preload(pr, ms); }));
    const name = (song.name || 'song').replace(/[\\/:*?"<>|]+/g, '').trim() || 'song';
    const jobs = [{ label: song.name, only: null, file: name + '.wav' }];
    if (Exp.stems) for (const tr of song.tracks) jobs.push({ label: tr.name, only: tr.id, file: name + ' - ' + tr.name.replace(/[\\/:*?"<>|]+/g, '') + '.wav' });
    for (let j = 0; j < jobs.length; j++) {
      lab.textContent = 'Rendering ' + jobs[j].label + (jobs.length > 1 ? ' (' + (j + 1) + ' of ' + jobs.length + ')' : '') + '…';
      const buf = await renderOffline(fromB, toB, jobs[j].only, p => bar.style.width = ((j + p) / jobs.length * 100) + '%');
      download(new Blob([wavBytes(buf, Exp.bits)], { type: 'audio/wav' }), jobs[j].file);
      await sleep(400);
    }
    m.close(); toast('Exported');
  } catch (e) { m.close(); msgBox('Export failed', String(e && e.message || e)); }
}
async function renderOffline(fromB, toB, only, prog) {
  const sp = 60 / song.bpm, len = (toB - fromB) * sp + Exp.tail, sr = Exp.sr;
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  makeBus(ctx, song);
  const solo = song.tracks.some(t => t.solo);
  for (const tr of song.tracks) {
    if (only ? tr.id !== only : (tr.mute || (solo && !tr.solo))) continue;
    const st = strip(ctx, tr); updateStrip(ctx, tr, false); st.mute.gain.value = 1;
    const pr = getPreset(tr.preset); let mono = null, last = null;
    const notes = [];
    for (const c of song.clips) {
      if (c.tr !== tr.id) continue;
      if (c.sid) { const s = Sounds.get(c.sid); if (s) playAudioClip(c, tr, s, fromB, 0, toB, ctx, st.input); continue; }
      for (const n of c.notes) { if (n.t >= c.len) continue; let nb = c.start + n.t; if (tr.swing && Math.abs((n.t * 4) % 2 - 1) < 0.01) nb += tr.swing * 0.25 * 0.66; if (nb < fromB || nb >= toB) continue; notes.push({ b: nb, d: Math.min(n.d, c.len - n.t), m: n.m, v: n.v }); }
    }
    notes.sort((a, b) => a.b - b.b);
    const pr2 = trAdj(tr, pr);
    for (const n of notes) {
      const m = n.m + (pr.e === 'drum' ? 0 : tr.oct * 12), when = (n.b - fromB) * sp;
      let ent = soundFor(pr, m); if (ent && ent.then) ent = await ent;
      if (pr.mono && mono) mono.stop(when);
      const v = playNote(ctx, st.input, pr2, m, n.v, when, n.d * sp, ent, { bpm: song.bpm, lastMidi: last });
      last = m; if (pr.mono) mono = v;
    }
  }
  const step = Math.max(1, Math.floor(len / 40));
  for (let t = step; t < len; t += step) { const tt = t; ctx.suspend(tt).then(() => { prog(tt / len); ctx.resume(); }); }
  const out = await ctx.startRendering();
  prog(1);
  return out;
}
function wavBytes(buf, bits) {
  const ch = buf.numberOfChannels, n = buf.length, bps = bits / 8, fmt = bits === 32 ? 3 : 1;
  const ab = new ArrayBuffer(44 + n * ch * bps), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * bps, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, fmt, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * ch * bps, true); dv.setUint16(32, ch * bps, true); dv.setUint16(34, bits, true); ws(36, 'data'); dv.setUint32(40, n * ch * bps, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44; let e1 = 0, e2 = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    let v = Math.max(-1, Math.min(1, data[c][i]));
    if (bits === 32) { dv.setFloat32(o, v, true); o += 4; }
    else if (bits === 24) { const x = Math.round(v * 8388607); dv.setUint8(o, x & 255); dv.setUint8(o + 1, (x >> 8) & 255); dv.setUint8(o + 2, (x >> 16) & 255); o += 3; }
    else { const d = (Math.random() - Math.random()) / 32768; const x = Math.max(-32768, Math.min(32767, Math.round((v + d) * 32767))); dv.setInt16(o, x, true); o += 2; }
  }
  return ab;
}
function download(blob, name) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }

/* ---------- song files (.nmusic): the song plus every sound it uses ---------- */
function saveProjectFile() {
  const used = [...new Set(song.clips.filter(c => c.sid).map(c => c.sid).concat(song.tracks.filter(t => t.preset && t.preset.startsWith('user:')).map(t => t.preset.slice(5))))].map(id => Sounds.get(id)).filter(Boolean);
  const meta = { song, sounds: [] }; const parts = []; let off = 0;
  for (const s of used) { const chs = []; for (let c = 0; c < s.buf.numberOfChannels; c++) { const d = s.buf.getChannelData(c); chs.push(new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength))); } meta.sounds.push({ id: s.id, name: s.name, sr: s.buf.sampleRate, len: s.buf.length, ch: chs.length, off }); for (const x of chs) { parts.push(x); off += x.length; } }
  const js = new TextEncoder().encode(JSON.stringify(meta)), head = new Uint8Array(8);
  head.set([78, 77, 85, 83]); new DataView(head.buffer).setUint32(4, js.length, true);
  download(new Blob([head, js, ...parts], { type: 'application/octet-stream' }), (song.name || 'song') + '.nmusic');
}
async function openProjectFile(file) {
  try {
    const ab = await file.arrayBuffer(), u8 = new Uint8Array(ab);
    if (String.fromCharCode(...u8.slice(0, 4)) !== 'NMUS') throw new Error('This is not a Nautic Music song file.');
    const jl = new DataView(ab).getUint32(4, true), meta = JSON.parse(new TextDecoder().decode(u8.slice(8, 8 + jl))), base = 8 + jl;
    for (const m of meta.sounds) {
      if (Sounds.get(m.id)) continue;
      const b = new AudioBuffer({ numberOfChannels: m.ch, length: m.len, sampleRate: m.sr });
      for (let c = 0; c < m.ch; c++) { const st = base + m.off + c * m.len * 4; b.copyToChannel(new Float32Array(ab.slice(st, st + m.len * 4)), c); }
      const s = Sounds.fromBuffer(b, m.name, m.id); await Sounds.save(s);
    }
    loadSong(meta.song); toast('Opened ' + meta.song.name);
  } catch (e) { msgBox('Could not open', String(e.message || e)); }
}
