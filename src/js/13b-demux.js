/* ================= fast exact export: decode the video files in order instead of seeking for every frame ================= */
const EXPORT_FRAMES = new Map(); // clip id -> canvas with the exact frame, used by the renderer while exporting
// reads an MP4 / MOV file's sample table (only the small index is read up front)
async function mp4Index(blob) {
  const rd = async (o, n) => new Uint8Array(await blob.slice(o, o + n).arrayBuffer());
  let pos = 0, moov = null;
  while (pos < blob.size) {
    const hd = await rd(pos, 16); if (hd.length < 8) break;
    const dv = new DataView(hd.buffer); let size = dv.getUint32(0); const type = String.fromCharCode(...hd.subarray(4, 8)); let hs = 8;
    if (size === 1) { size = Number(dv.getBigUint64(8)); hs = 16; } else if (size === 0) size = blob.size - pos;
    if (type === 'moov') { moov = await rd(pos + hs, size - hs); break; }
    if (size < 8) break; pos += size;
  }
  if (!moov) return null;
  const kids = (u, s, e) => { const out = []; const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = s; while (p + 8 <= e) { let sz = dv.getUint32(p), hs = 8; const ty = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]); if (sz === 1) { sz = Number(dv.getBigUint64(p + 8)); hs = 16; } else if (sz === 0) sz = e - p; if (sz < 8) break; out.push({ ty, s: p + hs, e: p + sz }); p += sz; } return out; };
  const find = (u, s, e, path) => { let cur = [{ s, e }]; for (const t of path) { const next = []; for (const b of cur) for (const k of kids(u, b.s, b.e)) if (k.ty === t) next.push(k); cur = next; if (!cur.length) return []; } return cur; };
  const dv = new DataView(moov.buffer);
  for (const trak of find(moov, 0, moov.length, ['trak'])) {
    const hdlr = find(moov, trak.s, trak.e, ['mdia', 'hdlr'])[0]; if (!hdlr) continue;
    if (String.fromCharCode(...moov.subarray(hdlr.s + 8, hdlr.s + 12)) !== 'vide') continue;
    const mdhd = find(moov, trak.s, trak.e, ['mdia', 'mdhd'])[0], v1 = moov[mdhd.s] === 1, ts = dv.getUint32(mdhd.s + (v1 ? 20 : 12));
    const stbl = find(moov, trak.s, trak.e, ['mdia', 'minf', 'stbl'])[0]; if (!stbl) return null;
    const box = t => find(moov, stbl.s, stbl.e, [t])[0];
    const stsd = box('stsd'), entry = kids(moov, stsd.s + 8, stsd.e)[0]; if (!entry) return null;
    const fmt = entry.ty, ew = dv.getUint16(entry.s + 24), eh = dv.getUint16(entry.s + 26), cfgs = kids(moov, entry.s + 78, entry.e);
    let codec = null, desc = null;
    const hx = v => v.toString(16).padStart(2, '0');
    if (fmt === 'avc1' || fmt === 'avc3') { const c = cfgs.find(k => k.ty === 'avcC'); if (c) { desc = moov.slice(c.s, c.e); codec = 'avc1.' + hx(desc[1]) + hx(desc[2]) + hx(desc[3]); } }
    else if (fmt === 'hvc1' || fmt === 'hev1') { const c = cfgs.find(k => k.ty === 'hvcC'); if (c) { desc = moov.slice(c.s, c.e); const b1 = desc[1], sp = b1 >> 6, tier = (b1 >> 5) & 1, idc = b1 & 31; let comp = (desc[2] << 24 | desc[3] << 16 | desc[4] << 8 | desc[5]) >>> 0, rev = 0; for (let i = 0; i < 32; i++) { rev = (rev << 1) | (comp & 1); comp >>>= 1; } const cons = Array.from(desc.subarray(6, 12)); while (cons.length && !cons[cons.length - 1]) cons.pop(); codec = fmt + '.' + ['', 'A', 'B', 'C'][sp] + idc + '.' + (rev >>> 0).toString(16) + '.' + (tier ? 'H' : 'L') + desc[12] + cons.map(b => '.' + b.toString(16)).join(''); } }
    else if (fmt === 'vp09') { const c = cfgs.find(k => k.ty === 'vpcC'); if (c) { const q = moov.subarray(c.s + 4, c.e); codec = 'vp09.' + String(q[0]).padStart(2, '0') + '.' + String(q[1]).padStart(2, '0') + '.' + String(q[2] >> 4).padStart(2, '0'); } }
    if (!codec) return null;
    // rotation from the track header matrix
    const tkhd = find(moov, trak.s, trak.e, ['tkhd'])[0], mo = tkhd.s + (moov[tkhd.s] === 1 ? 52 : 40), ma = dv.getInt32(mo), mb = dv.getInt32(mo + 4);
    const rot = ma === 0 && mb > 0 ? 90 : ma === 0 && mb < 0 ? 270 : ma < 0 ? 180 : 0;
    // edit list start
    let shift = 0; const elst = find(moov, trak.s, trak.e, ['edts', 'elst'])[0];
    if (elst) { const ev1 = moov[elst.s] === 1, n = dv.getUint32(elst.s + 4); let p = elst.s + 8; for (let i = 0; i < n; i++) { const mt = ev1 ? Number(dv.getBigInt64(p + 8)) : dv.getInt32(p + 4); if (mt >= 0) { shift = mt; break; } p += ev1 ? 20 : 12; } }
    const rdT = (b, f) => { if (!b) return; const n = dv.getUint32(b.s + 4); for (let i = 0; i < n; i++) f(b.s + 8 + i * 8); };
    const sizes = []; { const sz = box('stsz'), fixed = dv.getUint32(sz.s + 4), n = dv.getUint32(sz.s + 8); for (let i = 0; i < n; i++) sizes.push(fixed || dv.getUint32(sz.s + 12 + i * 4)); }
    const N = sizes.length, dts = new Float64Array(N), cts = new Float64Array(N), off = new Float64Array(N), key = new Uint8Array(N);
    { let i = 0, t = 0; rdT(box('stts'), p => { const c = dv.getUint32(p), d = dv.getUint32(p + 4); for (let k = 0; k < c && i < N; k++) { dts[i++] = t; t += d; } }); }
    { const b = box('ctts'); if (b) { const v1c = moov[b.s] === 1; let i = 0; rdT(b, p => { const c = dv.getUint32(p), o = v1c ? dv.getInt32(p + 4) : dv.getUint32(p + 4); for (let k = 0; k < c && i < N; k++) cts[i++] = o; }); } }
    { const ss = box('stss'); if (ss) { const n = dv.getUint32(ss.s + 4); for (let i = 0; i < n; i++) key[dv.getUint32(ss.s + 8 + i * 4) - 1] = 1; } else key.fill(1); }
    { const co = box('stco') || box('co64'), big = !box('stco'), nc = dv.getUint32(co.s + 4), chunk = i => big ? Number(dv.getBigUint64(co.s + 8 + i * 8)) : dv.getUint32(co.s + 8 + i * 4);
      const sc = box('stsc'), ne = dv.getUint32(sc.s + 4), ents = []; for (let i = 0; i < ne; i++) ents.push([dv.getUint32(sc.s + 8 + i * 12) - 1, dv.getUint32(sc.s + 12 + i * 12)]);
      let s = 0; for (let e = 0; e < ents.length; e++) { const last = e + 1 < ents.length ? ents[e + 1][0] : nc; for (let ch = ents[e][0]; ch < last && s < N; ch++) { let o = chunk(ch); for (let k = 0; k < ents[e][1] && s < N; k++) { off[s] = o; o += sizes[s]; s++; } } } }
    const pts = new Float64Array(N); for (let i = 0; i < N; i++) pts[i] = (dts[i] + cts[i] - shift) / ts;
    return { codec, desc, w: ew, h: eh, rot, N, pts, off, sizes, key, blob };
  }
  return null;
}
class ClipDecoder {
  static async make(m) {
    if (!('VideoDecoder' in window)) return null;
    const ext = (m.name.split('.').pop() || '').toLowerCase(); if (!['mp4', 'mov', 'm4v', '3gp'].includes(ext) && !/mp4|quicktime/.test(m.blob.type)) return null;
    let ix; try { ix = await mp4Index(m.blob); } catch (e) { return null; } if (!ix) return null;
    const cfg = { codec: ix.codec, codedWidth: ix.w, codedHeight: ix.h, hardwareAcceleration: 'no-preference' }; if (ix.desc) cfg.description = ix.desc;
    try { const s = await VideoDecoder.isConfigSupported(cfg); if (!s.supported) return null; } catch (e) { return null; }
    return new ClipDecoder(ix, cfg);
  }
  constructor(ix, cfg) {
    this.ix = ix; this.cfg = cfg; this.buf = []; this.next = 0; this.maxOut = -1e9; this.ended = false; this.wait = null; this.err = null;
    const sw = ix.rot % 180 ? ix.h : ix.w, sh = ix.rot % 180 ? ix.w : ix.h; this.cv = document.createElement('canvas'); this.cv.width = sw; this.cv.height = sh; this.shown = null;
    this.fd = ix.N > 1 ? Math.max(1 / 240, (ix.pts[ix.N - 1] - ix.pts[0]) / (ix.N - 1)) : 1 / 30;
    this.win = { o: -1, d: null };
  }
  newDecoder() {
    if (this.dec) try { this.dec.close(); } catch (e) { }
    this.dec = new VideoDecoder({ output: f => { const t = f.timestamp / 1e6; this.buf.push({ t, f }); if (t > this.maxOut) this.maxOut = t; if (this.wait) { const w = this.wait; this.wait = null; w(); } }, error: e => { this.err = e; if (this.wait) { const w = this.wait; this.wait = null; w(); } } });
    this.dec.configure(this.cfg);
  }
  async bytes(i) { const { off, sizes, blob } = this.ix, o = off[i], n = sizes[i], W = this.win; if (!(W.d && o >= W.o && o + n <= W.o + W.d.length)) { const len = Math.max(n, 4 << 20); W.o = o; W.d = new Uint8Array(await blob.slice(o, o + len).arrayBuffer()); } return W.d.subarray(o - W.o, o - W.o + n); }
  seek(t) {
    const { pts, key, N } = this.ix; let k = 0;
    for (let i = 0; i < N; i++) if (key[i] && pts[i] <= t + 1e-4) k = i;
    for (const b of this.buf) b.f.close(); this.buf = []; this.maxOut = -1e9; this.ended = false; this.next = k; this.newDecoder(); this.pos = t;
  }
  async frameAt(t) {
    if (this.err) throw this.err;
    if (this.pos == null || t < this.pos - 1e-6 || t > this.pos + 3) this.seek(t);
    this.pos = t;
    const need = t + this.fd * 2.5;
    while (!this.ended && this.maxOut < need) {
      while (this.next < this.ix.N && this.dec.decodeQueueSize < 6) {
        const i = this.next++; const data = await this.bytes(i);
        this.dec.decode(new EncodedVideoChunk({ type: this.ix.key[i] ? 'key' : 'delta', timestamp: Math.round(this.ix.pts[i] * 1e6), data }));
      }
      if (this.next >= this.ix.N) { await this.dec.flush(); this.ended = true; break; }
      await new Promise(r => { this.wait = r; setTimeout(r, 2000); });
      if (this.err) throw this.err;
    }
    this.buf.sort((a, b) => a.t - b.t);
    let best = null; for (const b of this.buf) if (b.t <= t + 1e-3) best = b;
    if (!best) best = this.buf[0];
    if (!best) return null;
    // drop frames that can no longer be shown
    this.buf = this.buf.filter(b => { if (b.t < best.t) { b.f.close(); return false; } return true; });
    if (this.shown !== best) {
      const x = this.cv.getContext('2d'), f = best.f, r = this.ix.rot;
      x.setTransform(1, 0, 0, 1, 0, 0);
      if (r) { x.translate(this.cv.width / 2, this.cv.height / 2); x.rotate(r * Math.PI / 180); x.drawImage(f, -f.displayWidth / 2, -f.displayHeight / 2); }
      else x.drawImage(f, 0, 0, this.cv.width, this.cv.height);
      this.shown = best;
    }
    return this.cv;
  }
  close() { for (const b of this.buf) try { b.f.close(); } catch (e) { } this.buf = []; try { this.dec && this.dec.close(); } catch (e) { } }
}
// exact frame for every video on screen at time t: decoder when possible, seeking otherwise
async function prepFrameFast(t, decs) {
  EXPORT_FRAMES.clear();
  const slow = [];
  for (const v of visibleAt(t)) {
    if (v.c.type !== 'video') continue;
    const m = MEDIA[v.c.media]; if (!m) continue;
    const target = clamp(v.c.in + v.lt * (v.c.speed || 1), 0, Math.max(0, (m.dur || 0) - 0.001));
    let d = decs.get(v.c.id);
    if (d === undefined) { d = await ClipDecoder.make(m); decs.set(v.c.id, d); }
    if (d) { try { const cv = await d.frameAt(target); if (cv) { EXPORT_FRAMES.set(v.c.id, cv); continue; } } catch (e) { console.warn('decoder fallback', e); d.close(); decs.set(v.c.id, null); } }
    slow.push(v);
  }
  if (slow.length) await prepFrame(t);
}
