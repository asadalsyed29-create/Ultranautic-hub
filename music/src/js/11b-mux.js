/* ================= MP4 writer (same as Nautic Editor's), used for MP4 / M4A sound ================= */
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
      fbox('hdlr', 0, 0, x => { x.u32(0); x.str(isV ? 'vide' : 'soun'); x.zeros(12); x.str(isV ? 'Nautic video' : 'Nautic Music'); x.u8(0); }), minf));
    const tdur = Math.round(mediaDur / ts * 1000);
    movieDur.v = Math.max(movieDur.v, tdur);
    return box('trak', b => kids(b,
      fbox('tkhd', 0, 3, x => { x.u32(0); x.u32(0); x.u32(id); x.u32(0); x.u32(tdur); x.zeros(8); x.u16(0); x.u16(0); x.u16(isV ? 0 : 0x0100); x.u16(0); MATRIX(x); x.u32(isV ? tr.w * 65536 : 0); x.u32(isV ? tr.h * 65536 : 0); }), mdia));
  }
  function build(tracks, m4a) {
    // interleave samples by time in mdat
    const all = []; tracks.forEach((tr, ti) => tr.samples.forEach((s, si) => all.push({ ti, si, ts: s.ts, s })));
    all.sort((a, b) => a.ts - b.ts || a.ti - b.ti);
    const rel = tracks.map(tr => new Array(tr.samples.length)); let off = 0;
    for (const e of all) { rel[e.ti][e.si] = off; off += e.s.data.length; }
    const ftyp = m4a ? box('ftyp', b => { b.str('M4A '); b.u32(512); b.str('M4A '); b.str('isom'); b.str('iso2'); b.str('mp41'); }) : box('ftyp', b => { b.str('isom'); b.u32(512); b.str('isom'); b.str('iso2'); b.str('mp41'); });
    const mk = offs => { const md = { v: 0 }; const traks = tracks.map((tr, i) => trak(tr, i + 1, offs && offs[i], md)); return box('moov', b => kids(b, fbox('mvhd', 0, 0, x => { x.u32(0); x.u32(0); x.u32(1000); x.u32(md.v); x.u32(0x00010000); x.u16(0x0100); x.zeros(10); MATRIX(x); x.zeros(24); x.u32(tracks.length + 1); }), ...traks)); };
    const moov0 = mk(null);
    const base = ftyp.length + moov0.length + 16;
    const moov = mk(rel.map(r => r.map(o => o + base)));
    const mh = new Uint8Array(16); const dv = new DataView(mh.buffer); dv.setUint32(0, 1); mh.set([109, 100, 97, 116], 4); const sz = 16 + off; dv.setUint32(8, Math.floor(sz / 4294967296)); dv.setUint32(12, sz >>> 0);
    return new Blob([ftyp, moov, mh, ...all.map(e => e.s.data)], { type: m4a ? 'audio/mp4' : 'video/mp4' });
  }
  return { build };
})();

