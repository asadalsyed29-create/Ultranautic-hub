/* ================= sound file writers: FLAC, AIFF, MP4/M4A (AAC), OGG (Opus) ================= */
function toInt(x, bits) { const m = bits === 24 ? 8388607 : 32767; const v = Math.round(Math.max(-1, Math.min(1, x)) * m); return v; }

/* ---------- FLAC (lossless): fixed predictors + Rice coding ---------- */
function flacBytes(buf, bits) {
  const ch = Math.min(2, buf.numberOfChannels), n = buf.length, sr = buf.sampleRate, BS = 4096;
  const data = []; for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c), a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = toInt(d[i] + (bits === 16 ? (Math.random() - Math.random()) / 32768 : 0), bits); data.push(a); }
  // bit writer
  let out = new Uint8Array(1 << 20), pos = 0, acc = 0, nb = 0;
  const grow = () => { if (pos + 64 > out.length) { const o = new Uint8Array(out.length * 2); o.set(out); out = o; } };
  const put = (v, k) => { // k <= 32
    while (k > 0) { const take = Math.min(k, 8); k -= take; const part = Math.floor(v / Math.pow(2, k)) & ((1 << take) - 1); acc = (acc << take) | part; nb += take; while (nb >= 8) { grow(); nb -= 8; out[pos++] = (acc >>> nb) & 255; } acc &= (1 << nb) - 1; }
  };
  const align = () => { if (nb) put(0, 8 - nb); };
  const unary = q => { while (q >= 24) { put(0, 24); q -= 24; } put(1, q + 1); };
  // CRCs
  const crc8 = (a, s, e) => { let c = 0; for (let i = s; i < e; i++) { c ^= a[i]; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 255 : (c << 1) & 255; } return c; };
  const T16 = new Uint16Array(256); for (let i = 0; i < 256; i++) { let c = i << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x8005) & 0xffff : (c << 1) & 0xffff; T16[i] = c; }
  const crc16 = (a, s, e) => { let c = 0; for (let i = s; i < e; i++) c = ((c << 8) & 0xffff) ^ T16[((c >> 8) ^ a[i]) & 255]; return c; };
  // header: fLaC + STREAMINFO (last block)
  for (const ch2 of 'fLaC') put(ch2.charCodeAt(0), 8);
  put(0x80, 8); put(34, 24); put(BS, 16); put(BS, 16); put(0, 24); put(0, 24);
  put(sr, 20); put(ch - 1, 3); put(bits - 1, 5); put(Math.floor(n / 4294967296), 4); put(n >>> 0, 32); for (let i = 0; i < 16; i++) put(0, 8);
  const srCode = { 44100: 9, 48000: 10, 96000: 11, 88200: 0, 32000: 8, 22050: 7 }[sr] || 0, ssCode = bits === 24 ? 6 : 4;
  const res = new Int32Array(BS);
  for (let f = 0, start = 0; start < n; f++, start += BS) {
    const len = Math.min(BS, n - start), fstart = pos;
    put(0x3FFE, 14); put(0, 1); put(0, 1);
    put(len === BS ? 12 : 7, 4); put(srCode, 4); put(ch === 2 ? 1 : 0, 4); put(ssCode, 3); put(0, 1);
    // frame number, UTF-8 style
    if (f < 0x80) put(f, 8); else if (f < 0x800) { put(0xC0 | (f >> 6), 8); put(0x80 | (f & 63), 8); } else if (f < 0x10000) { put(0xE0 | (f >> 12), 8); put(0x80 | ((f >> 6) & 63), 8); put(0x80 | (f & 63), 8); } else { put(0xF0 | (f >> 18), 8); put(0x80 | ((f >> 12) & 63), 8); put(0x80 | ((f >> 6) & 63), 8); put(0x80 | (f & 63), 8); }
    if (len !== BS) put(len - 1, 16);
    if (!srCode) { /* sample rate from STREAMINFO */ }
    put(crc8(out, fstart, pos), 8);
    for (let c = 0; c < ch; c++) {
      const x = data[c].subarray(start, start + len);
      // choose fixed predictor order by smallest residual sum
      let best = 0, bestSum = Infinity;
      for (let o = 0; o <= Math.min(4, len - 1); o++) { let s = 0; for (let i = o; i < len; i++) { const r = o === 0 ? x[i] : o === 1 ? x[i] - x[i - 1] : o === 2 ? x[i] - 2 * x[i - 1] + x[i - 2] : o === 3 ? x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3] : x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4]; s += Math.abs(r); } if (s < bestSum) { bestSum = s; best = o; } }
      const o = best;
      for (let i = o; i < len; i++) res[i - o] = o === 0 ? x[i] : o === 1 ? x[i] - x[i - 1] : o === 2 ? x[i] - 2 * x[i - 1] + x[i - 2] : o === 3 ? x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3] : x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4];
      const m = len - o; const mean = bestSum / Math.max(1, m);
      let k = mean > 0 ? Math.max(0, Math.min(30, Math.floor(Math.log2(mean * Math.LN2)))) : 0;
      put(0, 1); put(8 | o, 6); put(0, 1); // SUBFRAME_FIXED, order o
      for (let i = 0; i < o; i++) put(x[i] & ((1 << bits) - 1), bits);
      put(1, 2); put(0, 4); put(k, 5); // RICE2, partition order 0, parameter
      for (let i = 0; i < m; i++) { const r = res[i], u = r >= 0 ? r * 2 : -r * 2 - 1, q = Math.floor(u / Math.pow(2, k)); unary(q); if (k) put(u - q * Math.pow(2, k), k); }
    }
    align();
    const c16 = crc16(out, fstart, pos); put(c16, 16);
  }
  align();
  return out.slice(0, pos);
}

/* ---------- AIFF ---------- */
function aiffBytes(buf, bits) {
  const ch = buf.numberOfChannels, n = buf.length, bps = bits / 8, dataLen = n * ch * bps;
  const ab = new ArrayBuffer(54 + dataLen), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'FORM'); dv.setUint32(4, 46 + dataLen); ws(8, 'AIFF'); ws(12, 'COMM'); dv.setUint32(16, 18); dv.setUint16(20, ch); dv.setUint32(22, n); dv.setUint16(26, bits);
  // 80-bit extended sample rate
  let sr = buf.sampleRate, e = 16383 + 31; while (sr < 0x80000000) { sr *= 2; e--; } dv.setUint16(28, e); dv.setUint32(30, sr >>> 0); dv.setUint32(34, 0);
  ws(38, 'SSND'); dv.setUint32(42, 8 + dataLen); dv.setUint32(46, 0); dv.setUint32(50, 0);
  const d = []; for (let c = 0; c < ch; c++) d.push(buf.getChannelData(c));
  let o = 54;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = toInt(d[c][i], bits); if (bits === 24) { dv.setUint8(o, (v >> 16) & 255); dv.setUint8(o + 1, (v >> 8) & 255); dv.setUint8(o + 2, v & 255); o += 3; } else { dv.setInt16(o, v); o += 2; } }
  return ab;
}

/* ---------- lossy: AAC in MP4/M4A, Opus in OGG ---------- */
async function lossyCodec(prefer) {
  if (!window.AudioEncoder) return null;
  const list = prefer === 'opus' ? [['opus', 'opus']] : [['aac', 'mp4a.40.2'], ['opus', 'opus']];
  for (const [kind, codec] of list) { try { const s = await AudioEncoder.isConfigSupported({ codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }); if (s.supported) return kind; } catch (e) { } }
  return null;
}
async function encodeAudio(buf, kind, kbps) {
  const sr = buf.sampleRate, chs = Math.min(2, buf.numberOfChannels), samples = []; let desc = null, err = null;
  const enc = new AudioEncoder({ output: (chunk, meta) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); if (meta && meta.decoderConfig && meta.decoderConfig.description && !desc) { const ds = meta.decoderConfig.description; desc = new Uint8Array(ds.buffer ? ds.buffer.slice(ds.byteOffset || 0, (ds.byteOffset || 0) + ds.byteLength) : ds); } samples.push({ data: d, ts: chunk.timestamp, dur: chunk.duration || 0 }); }, error: e => err = e });
  enc.configure({ codec: kind === 'aac' ? 'mp4a.40.2' : 'opus', sampleRate: sr, numberOfChannels: chs, bitrate: kbps * 1000 });
  const L = buf.length, F = 4800;
  for (let i = 0; i < L; i += F) {
    const n = Math.min(F, L - i), b = new Float32Array(n * chs); for (let c = 0; c < chs; c++) b.set(buf.getChannelData(c).subarray(i, i + n), c * n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: chs, timestamp: Math.round(i / sr * 1e6), data: b });
    enc.encode(ad); ad.close();
  }
  await enc.flush(); enc.close();
  if (err) throw err;
  return { samples, desc, sr, ch: chs, kind, bitrate: kbps * 1000 };
}
function mp4Blob(e, m4a) { return MUX.build([{ kind: 'audio', codec: e.kind, ch: e.ch, sr: e.sr, bitrate: e.bitrate, timescale: e.kind === 'opus' ? 48000 : e.sr, samples: e.samples, desc: e.desc }], m4a); }
function oggBlob(e) {
  const T = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i << 24; for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1; T[i] = c >>> 0; }
  const crc = a => { let c = 0; for (let i = 0; i < a.length; i++) c = ((c << 8) ^ T[((c >>> 24) ^ a[i]) & 255]) >>> 0; return c; };
  const serial = (Math.random() * 0xffffffff) >>> 0, pages = []; let seq = 0;
  const page = (pkt, gran, flags) => {
    const segs = []; let r = pkt.length; while (r >= 255) { segs.push(255); r -= 255; } segs.push(r);
    const p = new Uint8Array(27 + segs.length + pkt.length), dv = new DataView(p.buffer);
    p.set([79, 103, 103, 83], 0); p[4] = 0; p[5] = flags;
    dv.setUint32(6, gran % 4294967296, true); dv.setUint32(10, Math.floor(gran / 4294967296), true);
    dv.setUint32(14, serial, true); dv.setUint32(18, seq++, true); dv.setUint32(22, 0, true); p[26] = segs.length; p.set(segs, 27); p.set(pkt, 27 + segs.length);
    dv.setUint32(22, crc(p), true); pages.push(p);
  };
  const pre = 312;
  const head = new Uint8Array(19), hv = new DataView(head.buffer); head.set([...'OpusHead'].map(c => c.charCodeAt(0))); head[8] = 1; head[9] = e.ch; hv.setUint16(10, pre, true); hv.setUint32(12, e.sr, true); hv.setInt16(16, 0, true); head[18] = 0;
  page(head, 0, 2);
  const vendor = 'Nautic Music', tags = new Uint8Array(8 + 4 + vendor.length + 4), tv = new DataView(tags.buffer); tags.set([...'OpusTags'].map(c => c.charCodeAt(0))); tv.setUint32(8, vendor.length, true); tags.set([...vendor].map(c => c.charCodeAt(0)), 12); tv.setUint32(12 + vendor.length, 0, true);
  page(tags, 0, 0);
  let gran = pre; const last = e.samples.length - 1;
  e.samples.forEach((s, i) => { gran += Math.round((s.dur || 20000) * 48000 / 1e6); page(s.data, gran, i === last ? 4 : 0); });
  return new Blob(pages, { type: 'audio/ogg' });
}

/* ---------- MP3 (LAME encoder, lame.min.js, loaded only when needed) ---------- */
function loadLame() { if (window.lamejs) return Promise.resolve(); return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lame.min.js'; sc.onload = () => window.lamejs ? res() : rej(new Error('MP3 maker did not load')); sc.onerror = () => rej(new Error('The MP3 maker could not be loaded. Open the app once with internet, then try again.')); document.head.append(sc); }); }
function mp3Blob(buf, kbps) {
  const ch = Math.min(2, buf.numberOfChannels), enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, kbps), out = [], N = 1152;
  const L = buf.getChannelData(0), R = ch > 1 ? buf.getChannelData(1) : null, a = new Int16Array(N), b = new Int16Array(N);
  for (let i = 0; i < buf.length; i += N) {
    const n = Math.min(N, buf.length - i);
    for (let k = 0; k < n; k++) { a[k] = toInt(L[i + k], 16); if (R) b[k] = toInt(R[i + k], 16); }
    const m = R ? enc.encodeBuffer(a.subarray(0, n), b.subarray(0, n)) : enc.encodeBuffer(a.subarray(0, n));
    if (m.length) out.push(new Uint8Array(m));
  }
  const e = enc.flush(); if (e.length) out.push(new Uint8Array(e));
  return new Blob(out, { type: 'audio/mpeg' });
}
