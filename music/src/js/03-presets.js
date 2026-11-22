/* ================= the 20 instrument families, 25 styles each (500 sounds) =================
   e: engine. Rendered in the background: piano, ep, ks (plucked), modal (struck), sus (bowed/blown/sung, looped), drum.
   Played live: syn (oscillators, filter, envelopes; organs too).
   Common: rel = release seconds, vf = how much soft notes darken (0..1), zs = semitones between rendered notes,
   tfx = the track effect the sound is made for (only set when you pick it). */
const FAMILIES = [];
const PRESETS = {};
function fam(id, name, list, base) {
  const f = { id, name, items: [] };
  list.forEach((x, i) => {
    const [nm, e, p, ex] = x;
    const pr = Object.assign({ id: id + '.' + i, name: nm, fam: id, e, p: p || {}, rel: 0.3, vf: 0.6, gain: 1 }, base && base[e] || {}, ex || {});
    if (id === 'bass') pr.tfx = Object.assign({ rev: 0 }, pr.tfx); // bass stays clean: no hall wash under it
    PRESETS[pr.id] = pr; f.items.push(pr);
  });
  FAMILIES.push(f);
}
// helpers
const PIANO = (n, p, ex) => [n, 'piano', p, Object.assign({ rel: 0.32, zs: 3, vf: 0.75 }, ex)];
const EP = (n, p, ex) => [n, 'ep', p, Object.assign({ rel: 0.25, zs: 3, vf: 0.7 }, ex)];
const KS = (n, p, ex) => [n, 'ks', p, Object.assign({ rel: 0.18, zs: 3, vf: 0.6 }, ex)];
const MOD = (n, p, ex) => [n, 'modal', p, Object.assign({ rel: 1.2, zs: 4, vf: 0.6 }, ex)];
const SUS = (n, p, ex) => [n, 'sus', p, Object.assign({ rel: 0.35, zs: 4, vf: 0.7, a: 0.01 }, ex)];
const SYN = (n, p, ex) => [n, 'syn', p, Object.assign({ rel: 0.3, vf: 0.5 }, ex)];
// drawbars (16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1') -> harmonic list for a wave at half pitch
function bars(s) { const H = [1, 3, 2, 4, 6, 8, 10, 12, 16], a = new Array(17).fill(0); for (let i = 0; i < 9; i++) { const b = +s[i]; if (b) a[H[i]] += Math.pow(10, (b - 8) * 3 / 20); } return a; }
const ORG = (n, d, ex = {}) => SYN(n, { o: [{ w: { h: bars(d) }, t: -12, g: 0.55 }].concat(ex.perc ? [{ w: 'sine', t: ex.perc === 3 ? 19 : 12, g: 0.35, env: [0.001, ex.pd || 0.35, 0, 0.05] }] : []), a: [ex.att || 0.004, 0.05, 1, ex.r || 0.06], click: ex.click != null ? ex.click : 0.25, lfo: ex.les ? [ex.les, 5, 0, 0.18, 0] : null, drv: ex.drv || 0, chiff: ex.chiff || 0, f: ex.f || ['lp', 9000, 0.5] }, { rel: ex.r || 0.06, vf: 0, gain: 0.8, tfx: ex.tfx });
const VIOLIN_BODY = [['pk', 280, 4, 5], ['pk', 460, 3, 4], ['pk', 1500, 2, -3], ['pk', 2800, 1.3, 4], ['hp', 180, 0.7]];
const VIOLA_BODY = [['pk', 230, 4, 5], ['pk', 380, 3, 4], ['pk', 1300, 2, -3], ['pk', 2400, 1.3, 3], ['hp', 120, 0.7]];
const CELLO_BODY = [['pk', 110, 3, 5], ['pk', 210, 3, 4], ['pk', 1000, 2, -2], ['pk', 1700, 1.3, 3], ['hp', 50, 0.7]];
const BASS_BODY = [['pk', 60, 3, 5], ['pk', 120, 3, 4], ['pk', 900, 1.5, 2], ['hp', 30, 0.7]];
const STR = (n, p, ex) => SUS(n, Object.assign({ voices: 8, spread: 9, slope: 1.05, body: VIOLIN_BODY, cut: 6000, noise: 0.035, noiseF: [['bp', 2500, 0.6], ['hp', 800, 0.7]], att: 0.22, vib: 5.4, vibD: 9 }, p), Object.assign({ rel: 0.45, a: 0.02 }, ex));
const BRS = (n, p, ex) => SUS(n, Object.assign({ voices: 1, slope: 0.72, form: [[1200, 6, 900]], cut: 7000, brightAtt: 1, att: 0.06, scoop: 22, vib: 5, vibD: 4, vibDel: 0.6, noise: 0.015, noiseF: [['bp', 1500, 1]] }, p), Object.assign({ rel: 0.18, vf: 0.9 }, ex));
const WW = (n, p, ex) => SUS(n, Object.assign({ voices: 1, att: 0.05, vib: 5, vibD: 6, vibDel: 0.5 }, p), Object.assign({ rel: 0.15, vf: 0.6 }, ex));
const CH = (n, p, ex) => SUS(n, Object.assign({ voices: 6, spread: 12, slope: 1.1, vowel: 'a', vib: 5.2, vibD: 16, jit: 5, noise: 0.03, noiseF: [['bp', 1500, 0.8], ['hp', 400, 0.7]], att: 0.3, cut: 7000 }, p), Object.assign({ rel: 0.6, a: 0.02, vf: 0.5 }, ex));
const REED = (n, p, ex) => SUS(n, Object.assign({ voices: 2, spread: 14, slope: 0.85, odd: 0.7, form: [[1100, 3, 700], [2400, 2, 900]], cut: 6500, att: 0.03, vibD: 0, jit: 1.5, noise: 0.02, noiseF: [['bp', 2500, 1]] }, p), Object.assign({ rel: 0.1 }, ex));
const DRK = (n, k, ex) => [n, 'drum', k, Object.assign({ rel: 0.05, vf: 0.3 }, ex)];

/* 1 Piano */
fam('piano', 'Piano', [
  PIANO('Concert Grand', { hard: 0.62 }), PIANO('Bright Grand', { hard: 0.85, presence: 3, air: 0 }), PIANO('Warm Grand', { hard: 0.45, warm: 2, air: -6 }),
  PIANO('Studio Grand', { hard: 0.7, presence: 1.5 }), PIANO('Ballad Piano', { hard: 0.5, sus: 1.2, warm: 1.5, det: 0.5 }), PIANO('Jazz Club Piano', { hard: 0.58, air: -4, warm: 1 }),
  PIANO('Upright', { B: 2.2, sus: 0.75, hard: 0.6, det: 1.1 }), PIANO('Old Upright', { B: 2.6, sus: 0.6, det: 2.2, hard: 0.55, air: -7 }), PIANO('Honky-Tonk', { honky: 14, B: 2.2, sus: 0.7, hard: 0.75 }),
  PIANO('Felt Piano', { felt: 1, hard: 0.3, sus: 0.8, knock: 2.5 }), PIANO('Soft Felt Night', { felt: 1, hard: 0.2, sus: 0.7, warm: 3, knock: 2 }), PIANO('Pop Piano', { hard: 0.9, presence: 4, air: 1 }),
  PIANO('Rock Piano', { hard: 1, presence: 5, air: 2, sus: 0.8 }), PIANO('Baby Grand', { B: 1.4, sus: 0.85, hard: 0.6 }), PIANO('Hall Grand', { sus: 1.4, hard: 0.62, det: 0.6 }, { tfx: { rev: 0.4 } }),
  PIANO('Dark Piano', { hard: 0.35, air: -10, warm: 3 }), PIANO('Glass Piano', { hard: 0.95, B: 0.6, air: 3, presence: 2, sus: 1.3 }), PIANO('Toy Piano', { toy: 1, sus: 0.4 }, { rel: 0.4 }),
  PIANO('Lo-fi Piano', { hard: 0.5, air: -12, det: 3, honky: 6, sus: 0.7 }), PIANO('Detuned Saloon', { honky: 22, B: 2.8, det: 3 }), PIANO('Practice Room', { B: 2, sus: 0.6, hard: 0.55, air: -5 }),
  PIANO('Muted Piano', { sus: 0.3, hard: 0.5, felt: 1 }), PIANO('Cinematic Grand', { sus: 1.6, hard: 0.55, warm: 2, det: 0.4 }, { tfx: { rev: 0.5 } }), PIANO('Classical Grand', { hard: 0.66, sus: 1.2 }),
  PIANO('Thin Piano', { warm: -6, presence: 3, thump: 0.3 })
]);
/* 2 Electric Piano */
fam('ep', 'Electric Piano', [
  EP('Tine Classic', {}), EP('Tine Bright', { idx: 2.3, bell: 0.25, tone: 9000 }), EP('Tine Mellow', { idx: 1.1, asym: 0.2, tone: 3500 }),
  EP('Suitcase Tremolo', { idx: 1.7 }, { tfx: { trem: 0.5 } }), EP('Stage Bark', { idx: 2.6, asym: 0.6, drive: 0.6 }), EP('Reed Keys', { mr: 1, idx: 2.8, idxT: 0.12, asym: 0.65, drive: 0.7, sus: 0.6, tone: 5000 }),
  EP('Soft Reed Keys', { idx: 1.6, asym: 0.5, drive: 0.4, sus: 0.6, tone: 3200 }), EP('Driven Reed', { idx: 3, asym: 0.7, drive: 1.2, sus: 0.6 }, { tfx: { drive: 0.25 } }), EP('FM Tines', { mr: 1, bell: 0.6, bellR: 14, idx: 1.4, asym: 0.05, drive: 0.05, tone: 12000 }),
  EP('Crystal Keys', { bell: 0.9, bellR: 14, idx: 0.9, asym: 0, drive: 0, tone: 14000 }), EP('Glass Keys', { mr: 3, idx: 0.8, bell: 0.4, asym: 0, drive: 0.1 }), EP('Lo-fi Keys', { idx: 1.2, tone: 2200, asym: 0.4 }, { tfx: { chorus: 0.4 } }),
  EP('Neo Soul Keys', { idx: 1.5, tone: 4500 }, { tfx: { chorus: 0.5 } }), EP('Phased Tines', { idx: 1.8 }, { tfx: { chorus: 0.7 } }), EP('Bright Stage', { idx: 2.4, bell: 0.35, asym: 0.45, tone: 10000 }),
  KS('Clavi Funk', { body: 'elec', pick: 0.15, dark: 0.12, sus: 0.35, pos: 0.08, pickup: 6 }, { rel: 0.06 }), KS('Clavi Muted', { body: 'elec', pick: 0.3, dark: 0.3, sus: 0.12, pos: 0.1 }, { rel: 0.05 }),
  PIANO('Electric Grand', { hard: 0.9, B: 3, sus: 0.6, presence: 5, det: 2.5, air: 2 }, { tfx: { chorus: 0.3 } }), EP('Toy Keys', { mr: 4, idx: 0.7, sus: 0.4, tone: 9000 }),
  EP('Velvet Keys', { idx: 0.8, asym: 0.25, tone: 2600, sus: 1.2 }), EP('Bell Keys', { bell: 0.7, bellR: 7.1, idx: 1.3 }), EP('Dusty Keys', { idx: 1.3, tone: 1800, asym: 0.5, drive: 0.4 }, { tfx: { chorus: 0.25 } }),
  EP('Hard Tines', { idx: 3.2, idxT: 0.18, asym: 0.5, bell: 0.3 }), EP('Ballad Keys', { idx: 1.2, sus: 1.3, tone: 4000 }, { tfx: { rev: 0.35, chorus: 0.3 } }), EP('Wide Keys', { idx: 1.6 }, { tfx: { chorus: 0.8 } })
]);
/* 3 Organ */
fam('organ', 'Organ', [
  ORG('Full Drawbars', '888888888', { les: 0.8 }), ORG('Jazz Organ', '888000000', { perc: 3, les: 0.8 }), ORG('Gospel Organ', '888800000', { perc: 2, les: 6.2, drv: 0.25 }),
  ORG('Rock Organ', '888600000', { les: 6.2, drv: 0.7, tfx: { drive: 0.3 } }), ORG('Ballad Organ', '808000004', { les: 0.8 }), ORG('Soft Organ', '006000000', { les: 0.8, click: 0.05 }),
  ORG('Whistle Organ', '800000008', { les: 0.8 }), ORG('Lounge Organ', '868000000', { perc: 3, pd: 0.2, les: 0.8 }), ORG('Blues Organ', '888500030', { les: 6.2, drv: 0.4 }),
  ORG('Fast Spin Organ', '886000000', { les: 6.6 }), ORG('Slow Spin Organ', '886000000', { les: 0.7 }), ORG('Pop Percussion', '808000000', { perc: 3, pd: 0.18 }),
  ORG('Church Pipe Organ', '888888600', { att: 0.06, chiff: 0.25, click: 0, r: 0.5, tfx: { rev: 0.55 } }), ORG('Church Flute Stop', '008000000', { att: 0.05, chiff: 0.35, click: 0, r: 0.4, tfx: { rev: 0.5 } }),
  ORG('Principal 8 and 4', '008800000', { att: 0.05, chiff: 0.2, click: 0, r: 0.45, tfx: { rev: 0.5 } }), ORG('Cathedral Plenum', '888888888', { att: 0.08, chiff: 0.15, click: 0, r: 1.2, tfx: { rev: 0.75 } }),
  ORG('Baroque Positive', '008080800', { att: 0.04, chiff: 0.4, click: 0, r: 0.3, tfx: { rev: 0.4 } }), ORG('Theater Organ', '868868000', { les: 6, att: 0.02, click: 0.05, tfx: { rev: 0.35 } }),
  SYN('Combo Organ', { o: [{ w: 'p25', g: 0.35 }, { w: 'square', t: 12, g: 0.15 }], f: ['lp', 4500, 0.7], a: [0.003, 0.05, 1, 0.05], lfo: [6, 12, 0, 0, 0.1] }, { rel: 0.05, vf: 0, gain: 0.7 }),
  SYN('Combo Bright', { o: [{ w: 'saw', g: 0.3 }, { w: 'p25', t: 12, g: 0.2 }], f: ['lp', 7000, 0.7], a: [0.003, 0.05, 1, 0.05], lfo: [6.5, 10, 0, 0, 0.1] }, { rel: 0.05, vf: 0, gain: 0.7 }),
  ORG('Reed Stop', '008000000', { att: 0.03, chiff: 0.1, click: 0, r: 0.3, f: ['bp', 1400, 0.6], tfx: { rev: 0.4 } }), ORG('Mellow Tibia', '808000000', { les: 6, click: 0, att: 0.02 }),
  ORG('Bright Mixture', '008888888', { les: 0.8 }), ORG('Dark Drawbars', '884000000', { les: 0.8 }), ORG('Clicky Drawbars', '888400000', { click: 0.8, les: 6.2 })
]);
/* 4 Guitar */
fam('guitar', 'Guitar', [
  KS('Steel Acoustic', { body: 'guitar', pick: 0.4, dark: 0.3 }), KS('Nylon Classical', { body: 'nylon', pick: 0.75, dark: 0.42, sus: 0.85 }), KS('Bright Steel', { body: 'guitar', pick: 0.15, dark: 0.18 }),
  KS('Fingerpicked', { body: 'guitar', pick: 0.7, dark: 0.36, pos: 0.25 }), KS('Twelve String', { body: 'guitar', pick: 0.3, dark: 0.25, course: 2, oct: 1 }), KS('Jazz Archtop', { body: 'nylon', pick: 0.6, dark: 0.45, sus: 0.7 }),
  KS('Clean Electric', { body: 'elec', pick: 0.4, dark: 0.28, sus: 1.2 }), KS('Bright Clean', { body: 'elec', pick: 0.2, dark: 0.15, pos: 0.1, sus: 1.2 }), KS('Neck Pickup', { body: 'elec', pick: 0.55, dark: 0.4, pickup: 1, pos: 0.25, sus: 1.2 }),
  KS('Muted Electric', { body: 'elec', pick: 0.4, dark: 0.4, sus: 0.12 }, { rel: 0.06 }), KS('Palm Mute Drive', { body: 'elec', pick: 0.3, dark: 0.35, sus: 0.15 }, { rel: 0.06, tfx: { drive: 0.75 } }), KS('Crunch', { body: 'elec', pick: 0.3, dark: 0.3, sus: 1.3 }, { tfx: { drive: 0.45 } }),
  KS('Overdrive', { body: 'elec', pick: 0.3, dark: 0.3, sus: 1.5 }, { tfx: { drive: 0.65 } }), KS('Heavy Distortion', { body: 'elec', pick: 0.25, dark: 0.3, sus: 1.8 }, { tfx: { drive: 0.9 } }), KS('Fuzz', { body: 'elec', pick: 0.4, dark: 0.35, sus: 1.8 }, { tfx: { drive: 1 } }),
  KS('Funk Chicken', { body: 'elec', pick: 0.15, dark: 0.15, sus: 0.25, pos: 0.08 }, { rel: 0.05 }), KS('Chorus Clean', { body: 'elec', pick: 0.4, dark: 0.3, sus: 1.2 }, { tfx: { chorus: 0.6 } }), KS('Surf Twang', { body: 'elec', pick: 0.2, dark: 0.2, sus: 1.1, pos: 0.1 }, { tfx: { rev: 0.6 } }),
  KS('Spanish Guitar', { body: 'nylon', pick: 0.55, dark: 0.35, sus: 0.8, pos: 0.15 }), KS('Harmonics', { body: 'elec', pick: 0.8, dark: 0.4, pos: 0.5, sus: 1.5 }, { tfx: { rev: 0.4 } }), KS('Lo-fi Guitar', { body: 'guitar', pick: 0.6, dark: 0.45, sus: 0.6 }, { tfx: { chorus: 0.3 } }),
  KS('Ambient Swell', { body: 'elec', pick: 0.6, dark: 0.35, sus: 1.6 }, { a: 0.35, tfx: { rev: 0.6, delay: 0.35 } }), KS('Resonator', { body: 'banjo', pick: 0.25, dark: 0.22, buzz: 0.12, sus: 1.1 }), KS('Baritone', { body: 'guitar', pick: 0.45, dark: 0.38, sus: 1.3 }),
  KS('Parlor Guitar', { body: 'guitar', pick: 0.5, dark: 0.33, sus: 0.7 })
]);
/* 5 Bass */
const SBASS = (n, p, ex) => SYN(n, Object.assign({ a: [0.003, 0.3, 0.8, 0.08] }, p), Object.assign({ rel: 0.08, vf: 0.5 }, ex));
fam('bass', 'Bass', [
  KS('Finger Bass', { body: 'bass', pick: 0.65, dark: 0.42, sus: 1.1, tone: 2400, pos: 0.2 }, { rel: 0.09 }), KS('Pick Bass', { body: 'bass', pick: 0.2, dark: 0.3, tone: 4500, mid: 3, click: 0.6 }, { rel: 0.08 }),
  KS('Slap Bass', { body: 'bass', pick: 0.05, dark: 0.15, tone: 7000, slap: 0.9, mid: -4 }, { rel: 0.08 }), KS('Fretless', { body: 'bass', pick: 0.75, dark: 0.3, pos: 0.32, tone: 2000, sus: 1.4 }, { rel: 0.12 }),
  KS('Upright Jazz', { body: 'upright', pick: 0.8, dark: 0.4, pos: 0.3, sus: 0.7 }, { rel: 0.1 }), KS('Upright Pluck', { body: 'upright', pick: 0.55, dark: 0.35, sus: 0.5, click: 0.5 }, { rel: 0.08 }),
  KS('Muted Bass', { body: 'bass', pick: 0.7, dark: 0.45, sus: 0.25, tone: 1500 }, { rel: 0.05 }), KS('Rock Bass', { body: 'bass', pick: 0.25, dark: 0.3, tone: 3500, mid: 4 }, { rel: 0.08, tfx: { drive: 0.35 } }),
  KS('Bright Round Bass', { body: 'bass', pick: 0.15, dark: 0.12, tone: 8000, mid: -3 }, { rel: 0.08 }),
  SBASS('Deep Sub', { o: [{ w: 'sine', g: 0.8 }, { w: 'tri', g: 0.15 }], f: ['lp', 1200, 0.5] }), SBASS('Analog Bass', { o: [{ w: 'saw', g: 0.5 }, { w: 'square', t: -12, g: 0.3 }], f: ['lp', 500, 2], fe: [2.6, 0.001, 0.25, 0, 0.1] }),
  SBASS('Square Bass', { o: [{ w: 'square', g: 0.5 }, { w: 'sine', t: -12, g: 0.4 }], f: ['lp', 900, 1], fe: [1.5, 0.001, 0.3, 0.2, 0.1] }), SBASS('Acid Bass', { o: [{ w: 'saw', g: 0.6 }], f: ['lp', 300, 14], fe: [3.6, 0.001, 0.18, 0, 0.05], drv: 0.4, glide: 0.06 }),
  SBASS('Reese Bass', { o: [{ w: 'saw', g: 0.4, u: 2, s: 18 }, { w: 'saw', t: -12, g: 0.25 }], f: ['lp', 700, 1.5], a: [0.005, 0.2, 1, 0.1], drv: 0.25 }), SBASS('Wobble Bass', { o: [{ w: 'saw', g: 0.45, u: 2, s: 10 }, { w: 'square', t: -12, g: 0.3 }], f: ['lp', 300, 8], lfo: [3, 0, 3.2, 0, 0, 'sync'], drv: 0.5, a: [0.005, 0.2, 1, 0.1] }),
  EP('FM Bass', { mr: 1, idx: 3.5, idxT: 0.12, idxS: 0.3, asym: 0.1, drive: 0.4, tone: 3000, sus: 1.2 }, { rel: 0.08 }), SBASS('Eight-O-Eight', { o: [{ w: 'sine', g: 0.9 }], pe: [12, 0.05], a: [0.002, 1.6, 0, 0.3], drv: 0.35 }, { rel: 0.3 }),
  SBASS('Pluck Bass', { o: [{ w: 'saw', g: 0.5 }, { w: 'square', g: 0.25 }], f: ['lp', 250, 3], fe: [4, 0.001, 0.12, 0, 0.05], a: [0.002, 0.4, 0, 0.1] }), SBASS('Ladder Bass', { o: [{ w: 'saw', g: 0.4 }, { w: 'saw', d: 7, g: 0.4 }, { w: 'square', t: -12, g: 0.3 }], f: ['lp', 400, 5], fe: [2.2, 0.002, 0.3, 0.2, 0.1], drv: 0.3 }),
  SBASS('Dub Bass', { o: [{ w: 'sine', g: 0.8 }, { w: 'tri', t: 12, g: 0.1 }], f: ['lp', 600, 0.6], a: [0.008, 0.4, 0.8, 0.1] }), SBASS('Rubber Bass', { o: [{ w: 'square', g: 0.5 }], f: ['lp', 220, 9], fe: [2.4, 0.001, 0.2, 0.1, 0.05], pe: [-3, 0.03] }),
  SBASS('Funk Synth Bass', { o: [{ w: 'p25', g: 0.5 }, { w: 'sine', t: -12, g: 0.4 }], f: ['lp', 350, 6], fe: [3, 0.001, 0.15, 0.1, 0.05] }), SBASS('Growl Bass', { o: [{ w: 'saw', g: 0.4, u: 3, s: 14 }, { w: 'square', t: -12, g: 0.3 }], f: ['bp', 600, 4], lfo: [6, 0, 1.5, 0, 0], drv: 0.7 }),
  SBASS('Hollow Bass', { o: [{ w: 'tri', g: 0.6 }, { w: 'square', t: 12, g: 0.08 }], f: ['lp', 1500, 0.7] }), SBASS('Fat Saw Bass', { o: [{ w: 'saw', g: 0.4, u: 3, s: 8 }, { w: 'sine', t: -12, g: 0.5 }], f: ['lp', 900, 1.2], fe: [1.5, 0.002, 0.35, 0.3, 0.1] })
]);
/* 6 Strings */
fam('strings', 'Strings', [
  STR('String Ensemble', {}), STR('Chamber Strings', { voices: 4, spread: 7 }), STR('Solo Violin', { voices: 1, vib: 5.8, vibD: 18, noise: 0.05, att: 0.12 }, { rel: 0.3 }),
  STR('Solo Viola', { voices: 1, body: VIOLA_BODY, vib: 5.5, vibD: 16, noise: 0.05, att: 0.14 }, { rel: 0.3 }), STR('Solo Cello', { voices: 1, body: CELLO_BODY, vib: 5.2, vibD: 15, cut: 4500, noise: 0.05, att: 0.15 }, { rel: 0.35 }),
  STR('Contrabass Section', { voices: 4, body: BASS_BODY, cut: 2500, vibD: 6, att: 0.25 }), STR('Warm Strings', { cut: 3600, slope: 1.2 }), STR('Bright Strings', { cut: 9000, slope: 0.95, noise: 0.05 }),
  STR('Slow Strings', { att: 0.8 }, { a: 0.35, rel: 0.9 }), STR('Fast Strings', { att: 0.04, brightAtt: 1 }, { rel: 0.25 }), STR('Tremolo Strings', { noise: 0.06 }, { trem: [11, 0.6] }),
  KS('Pizzicato', { body: 'violin', pick: 0.8, dark: 0.45, sus: 0.35, course: 2, cdet: 6 }, { rel: 0.12, tfx: { rev: 0.35 } }), KS('Cello Pizzicato', { body: 'cello', pick: 0.8, dark: 0.42, sus: 0.45 }, { rel: 0.12, tfx: { rev: 0.3 } }),
  STR('Marcato Strings', { att: 0.025, brightAtt: 1, noise: 0.06 }, { rel: 0.2 }), STR('Soft Bowing', { cut: 2400, slope: 1.3, noise: 0.05 }, { a: 0.12 }), STR('Near the Bridge', { cut: 11000, slope: 0.8, noise: 0.08, noiseF: [['hp', 3000, 0.7]], vibD: 3 }),
  STR('Orchestra Strings', { voices: 12, spread: 11 }, { tfx: { rev: 0.45 } }), STR('Film Strings', { voices: 12, spread: 12, cut: 4500, att: 0.5 }, { a: 0.2, rel: 0.8, tfx: { rev: 0.6 } }), STR('Low Strings', { voices: 8, body: CELLO_BODY, cut: 3800 }),
  STR('High Strings', { voices: 8, cut: 8000, slope: 1, spread: 8 }), STR('Viola Section', { body: VIOLA_BODY, voices: 6 }), STR('Cello Section', { body: CELLO_BODY, voices: 6, cut: 4500 }),
  STR('Fiddle', { voices: 1, scoop: 30, vib: 6.5, vibD: 10, noise: 0.07, cut: 8000, att: 0.06 }, { rel: 0.2 }), STR('Whisper Strings', { cut: 1800, slope: 1.5, noise: 0.12 }, { a: 0.3, rel: 1 }), STR('Quartet', { voices: 4, spread: 6, vibD: 13 })
]);
/* 7 Brass */
fam('brass', 'Brass', [
  BRS('Trumpet', {}), BRS('Muted Trumpet', { form: [[1700, 14, 500]], cut: 4000, slope: 0.6 }), BRS('Trombone', { form: [[550, 6, 500]], cut: 5000, slope: 0.8 }),
  BRS('French Horn', { form: [[400, 8, 400]], cut: 2200, slope: 1, scoop: 10, att: 0.09 }, { rel: 0.3 }), BRS('Tuba', { form: [[230, 8, 250]], cut: 1500, slope: 1, att: 0.08 }), BRS('Flugelhorn', { form: [[800, 6, 600]], cut: 3500, slope: 0.95, noise: 0.03 }),
  BRS('Brass Section', { voices: 4, spread: 10 }, { tfx: { rev: 0.3 } }), BRS('Brass Stab', { voices: 4, spread: 10, att: 0.02, vibD: 0 }, { rel: 0.1 }), BRS('Soft Brass', { voices: 3, spread: 8, cut: 2500, slope: 0.95, att: 0.18 }),
  BRS('Horn Section', { voices: 4, spread: 9, form: [[420, 8, 450]], cut: 2400, slope: 1, att: 0.15 }, { rel: 0.4, tfx: { rev: 0.4 } }), BRS('Cornet', { form: [[1000, 6, 800]], cut: 5500, slope: 0.78 }), BRS('Euphonium', { form: [[450, 7, 400]], cut: 2600, slope: 0.95 }),
  BRS('Bass Trombone', { form: [[350, 7, 400]], cut: 3500, slope: 0.85 }), BRS('Fanfare', { voices: 3, spread: 7, cut: 9000, slope: 0.65, att: 0.03 }, { tfx: { rev: 0.4 } }), BRS('Big Band Brass', { voices: 5, spread: 12, form: [[1000, 5, 900], [500, 3, 400]] }),
  BRS('Mariachi Trumpet', { voices: 2, spread: 8, vib: 6.5, vibD: 14, vibDel: 0.25 }), SYN('Synth Brass', { o: [{ w: 'saw', g: 0.35, u: 2, s: 10 }, { w: 'saw', t: 0, d: -6, g: 0.3 }], f: ['lp', 600, 1.2], fe: [2.2, 0.06, 0.4, 0.5, 0.2], a: [0.04, 0.3, 0.9, 0.2] }, { rel: 0.2, vf: 0.7 }),
  SYN('Eighties Brass Stab', { o: [{ w: 'saw', g: 0.35, u: 3, s: 12 }], f: ['lp', 800, 1.5], fe: [2.8, 0.02, 0.25, 0.3, 0.1], a: [0.01, 0.2, 0.7, 0.15] }, { rel: 0.15 }),
  BRS('Bugle', { cut: 6000, slope: 0.7, vibD: 0, scoop: 30 }), BRS('Alto Horn', { form: [[650, 6, 500]], cut: 3000, slope: 0.9 }), BRS('Muted Trombone', { form: [[1100, 12, 400]], cut: 2800, slope: 0.7 }),
  BRS('Distant Horns', { voices: 4, spread: 10, form: [[400, 8, 400]], cut: 1500, slope: 1.1, att: 0.25 }, { rel: 0.6, tfx: { rev: 0.7 } }), BRS('Cinematic Brass', { voices: 6, spread: 12, form: [[350, 8, 400], [1100, 4, 800]], cut: 4000, slope: 0.85 }, { tfx: { rev: 0.5 } }),
  BRS('Low Horns', { voices: 4, spread: 8, form: [[300, 8, 300]], cut: 1600, slope: 1.05, att: 0.15 }, { rel: 0.5 }), BRS('Bright Trumpet', { cut: 10000, slope: 0.55, form: [[1500, 8, 1200]] })
]);
/* 8 Woodwinds */
const FL = { slope: 2.2, cut: 5000, noise: 0.12, noiseF: [['bp', '*2', 1.5], ['hp', 300, 0.7]], vib: 5, vibD: 9, chiff: 0.3 };
fam('winds', 'Woodwinds', [
  WW('Flute', FL), WW('Alto Flute', Object.assign({}, FL, { cut: 3500, slope: 2.5, noise: 0.15 })), WW('Piccolo', Object.assign({}, FL, { slope: 2.4, noise: 0.08 })),
  WW('Breathy Flute', Object.assign({}, FL, { noise: 0.3 })), WW('Flute Ensemble', Object.assign({}, FL, { voices: 4, spread: 8, noise: 0.1 }), { tfx: { rev: 0.35 } }), WW('Recorder', { slope: 2.6, cut: 4000, noise: 0.06, noiseF: [['bp', '*3', 2]], vibD: 2, chiff: 0.6 }),
  WW('Ocarina', { slope: 3.2, cut: 2500, noise: 0.08, noiseF: [['bp', '*1', 3]], vibD: 6 }), WW('Tin Whistle', { slope: 2.2, cut: 7000, noise: 0.1, noiseF: [['bp', '*2', 2]], vibD: 8, chiff: 0.4 }), WW('Pan Flute', { slope: 2.8, cut: 3500, noise: 0.35, noiseF: [['bp', '*1', 2], ['hp', 400, 0.7]], vibD: 5, chiff: 0.8 }),
  WW('Clarinet', { slope: 1, odd: 0.08, oddTo: 1800, cut: 5000, form: [[1500, 2, 900]], noise: 0.02, vibD: 0 }), WW('Bass Clarinet', { slope: 1, odd: 0.1, oddTo: 1000, cut: 2500, noise: 0.02, vibD: 0 }), WW('Clarinet Choir', { voices: 4, spread: 8, slope: 1, odd: 0.1, cut: 4500, vibD: 0 }, { tfx: { rev: 0.35 } }),
  WW('Oboe', { slope: 0.7, form: [[1100, 12, 500], [2900, 8, 700]], cut: 6000, noise: 0.02, vibD: 10 }), WW('English Horn', { slope: 0.75, form: [[950, 12, 450], [2300, 6, 700]], cut: 4800, vibD: 8 }),
  WW('Bassoon', { slope: 0.8, form: [[480, 12, 300], [1200, 5, 600]], cut: 3500, vibD: 4 }), WW('Contrabassoon', { slope: 0.85, form: [[250, 10, 200], [700, 4, 400]], cut: 2000, vibD: 2 }),
  WW('Soprano Sax', { slope: 0.75, form: [[900, 6, 600], [2500, 5, 900]], cut: 7000, noise: 0.04, vibD: 12 }), WW('Alto Sax', { slope: 0.8, form: [[650, 8, 500], [1800, 6, 800]], cut: 6000, noise: 0.05, noiseF: [['bp', 2500, 0.8]], vibD: 12 }),
  WW('Tenor Sax', { slope: 0.82, form: [[500, 8, 400], [1500, 6, 700]], cut: 5000, noise: 0.06, noiseF: [['bp', 2000, 0.8]], vibD: 13 }), WW('Baritone Sax', { slope: 0.85, form: [[330, 8, 300], [1100, 6, 600]], cut: 4000, noise: 0.05, vibD: 8 }),
  WW('Smooth Sax', { slope: 0.95, form: [[600, 8, 500]], cut: 3500, noise: 0.1, noiseF: [['bp', 1800, 0.8]], vibD: 14 }, { tfx: { rev: 0.35 } }), WW('Growl Sax', { slope: 0.7, form: [[550, 8, 500], [1700, 6, 800]], cut: 7000, noise: 0.12, drive: 0.6, vibD: 10 }),
  WW('Woodwind Section', { voices: 4, spread: 10, slope: 1.2, odd: 0.5, form: [[900, 6, 700]], cut: 4500, noise: 0.05 }, { tfx: { rev: 0.35 } }), WW('Low Whistle', Object.assign({}, FL, { cut: 3000, slope: 2.6, noise: 0.18 })),
  WW('Wooden Flute', Object.assign({}, FL, { cut: 3000, slope: 2.4, noise: 0.22, vibD: 4 }))
]);
/* 9 Choir & Voices */
fam('choir', 'Choir & Voices', [
  CH('Choir Aah', {}), CH('Choir Ooh', { vowel: 'u' }), CH('Choir Mmm', { vowel: 'm', noise: 0.01 }), CH('Choir Ee', { vowel: 'i' }), CH('Choir Oh', { vowel: 'o' }),
  CH('High Voices Aah', { vowel: 'a', voices: 6, spread: 9, slope: 1.25, cut: 9000 }), CH('Female Aah', { vowel: 'a', voices: 6, spread: 10, vibD: 18 }), CH('Male Ooh', { vowel: 'o', voices: 6, spread: 12, vibD: 12 }),
  CH('Solo Soprano', { voices: 1, vibD: 28, vib: 5.6, noise: 0.02 }, { rel: 0.4 }), CH('Solo Tenor', { voices: 1, vowel: 'o', vibD: 22, vib: 5.2, noise: 0.02 }, { rel: 0.4 }), CH('Whisper Choir', { noise: 0.5, cut: 9000 }),
  CH('Breathy Voice', { voices: 2, spread: 6, noise: 0.2, vibD: 10 }), CH('Chamber Choir', { voices: 4, spread: 9 }), CH('Big Choir', { voices: 12, spread: 14 }, { tfx: { rev: 0.55 } }),
  CH('Chant', { vowel: 'o', voices: 6, spread: 6, vibD: 3, jit: 2 }, { tfx: { rev: 0.6 } }), CH('Angel Voices', { vowel: 'a', voices: 8, spread: 12, cut: 6000, att: 0.6 }, { a: 0.3, rel: 1.2, tfx: { rev: 0.7 } }), CH('Dark Choir', { vowel: 'o', cut: 2500, slope: 1.3 }),
  CH('Bright Choir', { cut: 11000, slope: 0.95 }), CH('Vocal Pad', { vowel: 'u', voices: 8, spread: 16, cut: 3000, att: 0.6 }, { a: 0.4, rel: 1.5 }), CH('Hum', { vowel: 'm', voices: 4, spread: 8, noise: 0 }),
  CH('Gospel Aah', { voices: 8, spread: 10, vibD: 20, vib: 5.8 }), CH('Kids Ooh', { vowel: 'u', voices: 6, spread: 10, vibD: 8, slope: 1.3 }), CH('Distant Choir', { cut: 2200 }, { a: 0.2, rel: 1.2, tfx: { rev: 0.8 } }),
  CH('Vox Lead', { voices: 1, vibD: 8, jit: 0.5, noise: 0, slope: 0.8 }, { rel: 0.2 }), CH('Eh Choir', { vowel: 'e' })
]);
/* 10 Bells & Chimes */
const B = (n, modes, ex = {}, ex2 = {}) => MOD(n, Object.assign({ modes, hard: 0.7, strike: 0.25 }, ex), ex2);
const CHURCH = [[0.5, 0.55, 9, 1.5], [1, 1, 6, 1], [1.19, 0.7, 5], [1.5, 0.35, 4], [2, 0.9, 3.5, 0.8], [2.5, 0.35, 2], [2.66, 0.3, 2], [3.01, 0.25, 1.6], [4.1, 0.15, 1.1], [5.2, 0.08, 0.8]];
fam('bells', 'Bells & Chimes', [
  B('Tubular Bells', [[1, 1, 6], [2.76, 0.6, 4], [5.4, 0.45, 3], [8.93, 0.3, 2], [13.34, 0.15, 1.4]], { strike: 0.4 }, { tfx: { rev: 0.4 } }), B('Church Bell', CHURCH, { strike: 0.3, dk: 0.3 }, { rel: 3, tfx: { rev: 0.55 } }),
  B('Carillon', CHURCH.map(([r, a, t, d]) => [r, a, t * 0.6, d]), { strike: 0.4 }, { rel: 2 }), B('Handbell', [[1, 1, 4], [3, 0.4, 2], [4.2, 0.2, 1.2], [5.8, 0.1, 0.8]], { hard: 0.5 }), B('Hand Chime', [[1, 1, 5], [3, 0.15, 2]], { hard: 0.3, strike: 0.1 }),
  B('Glockenspiel', [[1, 1, 2.5], [2.71, 0.35, 1], [5.15, 0.2, 0.6], [8.93, 0.1, 0.35]], { hard: 0.9, strike: 0.4, dk: 0.3 }, { zs: 3 }), B('Music Box', [[1, 1, 1.8], [5.4, 0.3, 0.4], [11.1, 0.12, 0.15]], { hard: 0.9, strike: 0.2 }, { tfx: { rev: 0.35 } }),
  B('Celesta', [[1, 1, 1.6], [2, 0.25, 0.6], [3.95, 0.15, 0.3], [8.1, 0.06, 0.2]], { hard: 0.4, strike: 0.15 }), B('Crotales', [[1, 1, 5], [2.92, 0.4, 2.5], [5.45, 0.3, 1.5], [8.6, 0.2, 1]], { hard: 0.8, strike: 0.25 }),
  B('Singing Bowl', [[1, 1, 12, 1.2], [2.71, 0.5, 8, 1.8], [5.1, 0.25, 5, 2], [8.2, 0.1, 3]], { hard: 0.2, strike: 0.05, dk: 0.2 }, { rel: 4 }), B('Temple Bell', [[1, 1, 8, 0.8], [1.58, 0.4, 5], [2.4, 0.5, 4, 1], [3.4, 0.2, 2.5], [4.9, 0.12, 1.5]], { hard: 0.4, dk: 0.25 }, { rel: 3 }),
  B('Gamelan Bonang', [[1, 1, 3, 3], [1.52, 0.3, 1.5], [2.03, 0.35, 1.2], [3.94, 0.2, 0.6]], { hard: 0.6 }), B('Gamelan Gender', [[1, 1, 4, 4], [2.74, 0.3, 1.5], [5.25, 0.12, 0.6]], { hard: 0.5, trem: 0 }),
  B('Wind Chime', [[1, 1, 6], [2.76, 0.4, 3], [5.4, 0.2, 1.5]], { hard: 0.95, strike: 0.1 }, { tfx: { rev: 0.5 } }), B('Crystal Bell', [[1, 1, 5], [3.3, 0.3, 2], [6.1, 0.2, 1], [9.7, 0.1, 0.5]], { hard: 0.8, strike: 0.15 }),
  B('Glass Bell', [[1, 1, 3], [2.32, 0.4, 1.5], [4.25, 0.25, 0.8], [6.63, 0.12, 0.4]], { hard: 0.85, strike: 0.2 }), B('Fairy Bells', [[1, 1, 2], [4, 0.5, 1], [9, 0.2, 0.4]], { hard: 0.9, strike: 0.1 }, { tfx: { rev: 0.5, delay: 0.3 } }),
  B('Toy Bell', [[1, 1, 1.2], [2.6, 0.6, 0.5], [4.9, 0.3, 0.25]], { hard: 0.9, strike: 0.3 }), B('Small Brass Bell', [[1, 1, 3, 2], [2.1, 0.5, 2], [3.3, 0.35, 1.3], [4.6, 0.2, 0.8]], { hard: 0.7 }),
  B('Deep Bell', CHURCH, { hard: 0.4, strike: 0.15, dk: 0.2, sus: 1.4 }, { rel: 4, tfx: { rev: 0.6 } }), B('Ship Bell', [[1, 1, 4, 2], [2.4, 0.6, 2.5], [3.9, 0.3, 1.5], [5.6, 0.15, 1]], { hard: 0.8, strike: 0.4 }),
  EP('Electric Bell', { mr: 3.5, idx: 2.2, idxT: 0.4, bell: 0.5, bellR: 7.5, asym: 0, drive: 0, sus: 1.5, tone: 12000 }, { rel: 1 }), B('Bell Pad', [[1, 1, 10, 2], [2, 0.5, 8, 2], [3, 0.3, 6], [4.2, 0.15, 3]], { hard: 0.2, strike: 0, sus: 1.4 }, { a: 0.3, rel: 3, tfx: { rev: 0.6 } }),
  B('Tingsha', [[1, 1, 8, 4], [2.72, 0.6, 5, 3], [4.9, 0.3, 3]], { hard: 0.95, strike: 0.2 }, { rel: 3 }), B('Bell Choir', [[1, 1, 4, 1.5], [3, 0.4, 2], [4.2, 0.25, 1.4], [5.8, 0.15, 0.9]], { hard: 0.5 }, { tfx: { rev: 0.5 } })
]);
/* 11 Mallets */
const M = (n, modes, ex = {}, ex2 = {}) => MOD(n, Object.assign({ modes, hard: 0.5, strike: 0.35 }, ex), Object.assign({ rel: 0.4 }, ex2));
const MARIMBA = [[1, 1, 1.4], [3.93, 0.35, 0.35], [9.42, 0.12, 0.12]];
fam('mallets', 'Mallets', [
  M('Marimba', MARIMBA), M('Soft Marimba', MARIMBA, { hard: 0.2, strike: 0.15 }), M('Bass Marimba', [[1, 1, 2], [3.93, 0.25, 0.4], [9.42, 0.06, 0.1]], { hard: 0.3 }),
  M('Xylophone', [[1, 1, 0.6], [3, 0.45, 0.3], [6, 0.2, 0.15], [9.7, 0.1, 0.08]], { hard: 0.9, strike: 0.5 }), M('Vibraphone', [[1, 1, 4], [4, 0.3, 1.2], [10, 0.08, 0.4]], { hard: 0.55, trem: 5.2, tremD: 0.45 }, { rel: 0.6 }),
  M('Vibes Still', [[1, 1, 4], [4, 0.3, 1.2], [10, 0.08, 0.4]], { hard: 0.55 }, { rel: 0.6 }), M('Soft Vibes', [[1, 1, 4.5], [4, 0.15, 1.2]], { hard: 0.2, strike: 0.1, trem: 3.5, tremD: 0.3 }, { rel: 0.8 }),
  M('Kalimba', [[1, 1, 1.6], [5.9, 0.25, 0.3], [11.5, 0.06, 0.1]], { hard: 0.6, strike: 0.3, f: [['pk', 400, 1, 4]] }), M('Mbira', [[1, 1, 1.8], [5.9, 0.3, 0.3]], { hard: 0.7, strike: 0.4, f: [['pk', 300, 1, 4]] }),
  M('Steel Drum', [[1, 1, 1.6, 3], [2, 0.6, 1.2, 2], [3, 0.3, 0.8], [4, 0.15, 0.5], [5.02, 0.1, 0.4]], { hard: 0.6, strike: 0.2 }), M('Bass Steel Pan', [[1, 1, 2.2, 3], [2, 0.5, 1.4], [3, 0.2, 0.8]], { hard: 0.4 }),
  M('Balafon', [[1, 1, 0.8], [3.9, 0.3, 0.25], [9.2, 0.1, 0.1]], { hard: 0.7, strike: 0.6, f: [['pk', 700, 2, 6]] }), M('Log Drum', [[1, 1, 0.5], [2.4, 0.3, 0.2], [4.3, 0.1, 0.1]], { hard: 0.6, strike: 0.5 }),
  M('Hang Drum', [[1, 1, 3, 1.5], [2, 0.5, 2], [2.9, 0.3, 1.2]], { hard: 0.25, strike: 0.15 }, { rel: 1 }), M('Tongue Drum', [[1, 1, 2.5], [2.6, 0.3, 1], [4.8, 0.12, 0.4]], { hard: 0.3, strike: 0.2 }, { rel: 1 }),
  M('Slit Drum', [[1, 1, 0.7], [2.2, 0.35, 0.3], [3.6, 0.15, 0.15]], { hard: 0.5, strike: 0.5 }), M('Glass Marimba', [[1, 1, 2], [3.93, 0.4, 0.8], [9.42, 0.2, 0.3]], { hard: 0.9, strike: 0.2 }),
  M('Rubber Mallet Marimba', MARIMBA, { hard: 0.05, strike: 0.08 }), M('Orchestral Xylophone', [[1, 1, 0.8], [3, 0.4, 0.4], [6, 0.18, 0.2]], { hard: 0.8, strike: 0.4 }, { tfx: { rev: 0.4 } }),
  M('Bamboo Marimba', [[1, 1, 0.9], [2.9, 0.4, 0.3], [5.8, 0.15, 0.15]], { hard: 0.6, strike: 0.5, f: [['pk', 600, 2, 4]] }), M('Thumb Piano', [[1, 1, 1.4], [5.9, 0.2, 0.25]], { hard: 0.5, strike: 0.5, f: [['pk', 250, 1.5, 6]] }),
  M('Bright Kalimba', [[1, 1, 1.6], [5.9, 0.45, 0.4], [11.5, 0.15, 0.15]], { hard: 0.85, strike: 0.3 }), M('Wood Pluck', [[1, 1, 0.4], [2.7, 0.4, 0.15]], { hard: 0.6, strike: 0.5 }),
  M('Vibe Bells', [[1, 1, 3], [4, 0.45, 1.4], [10, 0.2, 0.6]], { hard: 0.8, trem: 6, tremD: 0.3 }, { rel: 0.6 }), M('Deep Marimba', MARIMBA, { hard: 0.35, sus: 1.6 })
]);
/* 12 Plucked */
fam('plucked', 'Plucked', [
  KS('Concert Harp', { body: 'harp', pick: 0.8, dark: 0.4, pos: 0.3, sus: 1.3, pluckShape: 1 }, { rel: 1, tfx: { rev: 0.4 } }), KS('Celtic Harp', { body: 'harp', pick: 0.55, dark: 0.3, pos: 0.25, sus: 1, pluckShape: 1 }, { rel: 0.8 }),
  KS('Harpsichord', { body: 'harpsi', pick: 0.05, dark: 0.12, pos: 0.07, sus: 0.8, course: 2, cdet: 3 }, { rel: 0.12, vf: 0 }), KS('Harpsichord Lute Stop', { body: 'harpsi', pick: 0.3, dark: 0.25, pos: 0.07, sus: 0.4 }, { rel: 0.1, vf: 0 }),
  KS('Mandolin', { body: 'guitar', pick: 0.1, dark: 0.18, pos: 0.12, course: 2, cdet: 5, sus: 0.6 }), KS('Banjo', { body: 'banjo', pick: 0.1, dark: 0.15, pos: 0.1, sus: 0.5 }), KS('Ukulele', { body: 'nylon', pick: 0.65, dark: 0.35, sus: 0.45 }),
  KS('Lute', { body: 'oud', pick: 0.6, dark: 0.33, course: 2, cdet: 2, sus: 0.7 }), KS('Zither', { body: 'koto', pick: 0.3, dark: 0.22, sus: 1.4 }, { rel: 0.6 }), KS('Hammered Dulcimer', { body: 'harpsi', pick: 0.5, dark: 0.15, course: 2, cdet: 4, sus: 1.4, pluckShape: 1 }, { rel: 0.8 }),
  KS('Autoharp', { body: 'harp', pick: 0.4, dark: 0.25, course: 2, cdet: 3, sus: 1.2 }, { rel: 0.7 }), KS('Bouzouki', { body: 'oud', pick: 0.15, dark: 0.18, course: 2, oct: 1, sus: 0.9 }), KS('Clavichord', { body: 'harpsi', pick: 0.4, dark: 0.3, pos: 0.15, sus: 0.5 }, { rel: 0.05 }),
  KS('Lyre', { body: 'harp', pick: 0.7, dark: 0.32, sus: 1 }, { rel: 0.8 }), KS('Cimbalom', { body: 'harpsi', pick: 0.45, dark: 0.14, course: 3, cdet: 5, sus: 1.3, pluckShape: 1 }, { rel: 0.5 }), KS('Soft Harp', { body: 'harp', pick: 0.95, dark: 0.45, pluckShape: 1, sus: 1.2 }, { rel: 1 }),
  KS('Psaltery', { body: 'koto', pick: 0.2, dark: 0.2, sus: 1.5 }, { rel: 0.9 }), KS('Spinet', { body: 'harpsi', pick: 0.1, dark: 0.18, pos: 0.09, sus: 0.6 }, { rel: 0.1, vf: 0 }), KS('Cuatro', { body: 'nylon', pick: 0.4, dark: 0.3, course: 2, oct: 1, sus: 0.6 }),
  KS('Balalaika', { body: 'guitar', pick: 0.2, dark: 0.22, sus: 0.5 }), KS('Charango', { body: 'nylon', pick: 0.3, dark: 0.25, course: 2, cdet: 4, sus: 0.5 }), KS('Classical Lute', { body: 'oud', pick: 0.75, dark: 0.4, course: 2, cdet: 1.5, sus: 0.8 }),
  KS('Bright Harp', { body: 'harp', pick: 0.3, dark: 0.2, sus: 1.2, pluckShape: 1 }, { rel: 0.9 }), KS('Music Wire', { body: 'koto', pick: 0.1, dark: 0.1, sus: 2 }, { rel: 1 }), KS('Pluck Strings', { body: 'violin', pick: 0.7, dark: 0.4, course: 3, cdet: 8, sus: 0.5 }, { rel: 0.15 })
]);
/* 13 Synth Lead */
const LEAD = (n, p, ex) => SYN(n, Object.assign({ a: [0.005, 0.2, 0.85, 0.15], f: ['lp', 3500, 1], lfo: [5.5, 10, 0, 0, 0.4] }, p), Object.assign({ rel: 0.15, mono: 1 }, ex));
fam('lead', 'Synth Lead', [
  LEAD('Saw Lead', { o: [{ w: 'saw', g: 0.5 }, { w: 'saw', d: 8, g: 0.35 }] }), LEAD('Square Lead', { o: [{ w: 'square', g: 0.45 }, { w: 'square', t: -12, g: 0.15 }] }), LEAD('Sine Lead', { o: [{ w: 'sine', g: 0.8 }, { w: 'sine', t: 12, g: 0.08 }], f: ['lp', 8000, 0.5] }),
  LEAD('Supersaw Lead', { o: [{ w: 'saw', g: 0.32, u: 7, s: 25 }], f: ['lp', 6000, 0.7] }, { tfx: { rev: 0.35, delay: 0.25 } }), LEAD('Sync Sweep Lead', { o: [{ w: 'saw', g: 0.4 }, { w: 'square', t: 7, g: 0.2 }], pe: [12, 0.12], f: ['lp', 5000, 2] }),
  LEAD('Mono Glide Lead', { o: [{ w: 'saw', g: 0.45 }, { w: 'square', d: -5, g: 0.3 }], glide: 0.08, f: ['lp', 2800, 3] }), LEAD('Whistle Lead', { o: [{ w: 'sine', g: 0.8 }], nz: 0.03, lfo: [6, 14, 0, 0, 0.3] }),
  LEAD('Fifths Lead', { o: [{ w: 'saw', g: 0.4 }, { w: 'saw', t: 7, g: 0.3 }] }), LEAD('Detuned Lead', { o: [{ w: 'saw', g: 0.35, u: 3, s: 14 }, { w: 'square', t: -12, g: 0.2 }] }),
  LEAD('Pulse Lead', { o: [{ w: 'p25', g: 0.4 }, { w: 'p12', d: 6, g: 0.3 }] }), LEAD('Screamer', { o: [{ w: 'saw', g: 0.5 }, { w: 'square', d: 9, g: 0.3 }], drv: 0.9, f: ['lp', 4000, 4] }),
  LEAD('Soft Lead', { o: [{ w: 'tri', g: 0.6 }, { w: 'sine', t: 12, g: 0.1 }], a: [0.04, 0.2, 0.9, 0.25], f: ['lp', 3000, 0.6] }), LEAD('Brass Lead', { o: [{ w: 'saw', g: 0.4, u: 2, s: 8 }], f: ['lp', 900, 1.5], fe: [2.4, 0.06, 0.3, 0.5, 0.2] }),
  LEAD('Glide Square', { o: [{ w: 'square', g: 0.45 }], glide: 0.12, f: ['lp', 3000, 2] }), LEAD('Acid Lead', { o: [{ w: 'saw', g: 0.5 }], f: ['lp', 500, 12], fe: [3.2, 0.002, 0.25, 0.1, 0.1], drv: 0.3, glide: 0.05 }),
  LEAD('Bright Pluck Lead', { o: [{ w: 'saw', g: 0.45 }, { w: 'square', t: 12, g: 0.15 }], f: ['lp', 1200, 3], fe: [3, 0.002, 0.2, 0.3, 0.2] }), LEAD('Laser Lead', { o: [{ w: 'square', g: 0.4 }, { w: 'saw', t: 12, g: 0.2 }], pe: [-12, 0.06] }),
  LEAD('Funk Lead', { o: [{ w: 'p25', g: 0.45 }], f: ['lp', 600, 6], fe: [2.5, 0.005, 0.15, 0.4, 0.1], glide: 0.03 }), LEAD('Trance Lead', { o: [{ w: 'saw', g: 0.3, u: 5, s: 18 }, { w: 'saw', t: 12, g: 0.15, u: 3, s: 12 }], f: ['lp', 7000, 0.7] }, { tfx: { delay: 0.35, rev: 0.4 } }),
  LEAD('Eighties Lead', { o: [{ w: 'square', g: 0.35, u: 2, s: 10 }, { w: 'saw', t: -12, g: 0.2 }] }, { tfx: { chorus: 0.5, delay: 0.25 } }), LEAD('Hollow Lead', { o: [{ w: 'tri', g: 0.5 }, { w: 'square', t: 12, g: 0.12 }], f: ['bp', 1500, 1.5] }),
  LEAD('Wide Lead', { o: [{ w: 'saw', g: 0.3, u: 4, s: 22 }], f: ['lp', 5000, 0.8] }, { tfx: { chorus: 0.6 } }), LEAD('Talking Lead', { o: [{ w: 'saw', g: 0.5 }], f: ['bp', 900, 6], lfo: [3, 0, 1.4, 0, 0] }, { gain: 2 }),
  LEAD('Chip Lead', { o: [{ w: 'p12', g: 0.45 }], f: ['lp', 12000, 0.5], lfo: [6, 25, 0, 0, 0.2] }), LEAD('Warm Mono Lead', { o: [{ w: 'saw', g: 0.4 }, { w: 'tri', t: -12, g: 0.3 }], glide: 0.06, f: ['lp', 1800, 1.5] })
]);
/* 14 Synth Pad */
const PAD = (n, p, ex) => SYN(n, Object.assign({ a: [0.6, 1, 0.85, 1.4], f: ['lp', 2200, 0.8] }, p), Object.assign({ rel: 1.4, vf: 0.3, gain: 1.15 }, ex));
fam('pad', 'Synth Pad', [
  PAD('Warm Pad', { o: [{ w: 'saw', g: 0.25, u: 3, s: 12 }, { w: 'tri', t: -12, g: 0.25 }], f: ['lp', 1500, 0.7] }), PAD('Saw Pad', { o: [{ w: 'saw', g: 0.25, u: 5, s: 18 }] }),
  PAD('Super Pad', { o: [{ w: 'saw', g: 0.2, u: 7, s: 28 }, { w: 'saw', t: 12, g: 0.1, u: 3, s: 20 }], f: ['lp', 4000, 0.7] }, { tfx: { rev: 0.5 } }), PAD('Glass Pad', { o: [{ w: 'sine', g: 0.4 }, { w: 'tri', t: 19, g: 0.15 }, { w: 'sine', t: 24, g: 0.1 }], f: ['lp', 9000, 0.5] }, { tfx: { rev: 0.5 } }),
  PAD('Choir Pad', { o: [{ w: 'saw', g: 0.25, u: 3, s: 10 }], f: ['bp', 900, 1.6], lfo: [0.3, 6, 0.3, 0, 0] }, { gain: 2.4 }), PAD('String Machine', { o: [{ w: 'saw', g: 0.25, u: 4, s: 16 }, { w: 'saw', t: 12, g: 0.12, u: 2, s: 12 }], f: ['lp', 3000, 0.6], a: [0.25, 0.5, 0.9, 0.8] }, { tfx: { chorus: 0.6 } }),
  PAD('Slow Sweep', { o: [{ w: 'saw', g: 0.3, u: 3, s: 14 }], f: ['lp', 700, 3], lfo: [0.12, 0, 2.2, 0, 0] }), PAD('Dark Pad', { o: [{ w: 'saw', g: 0.3, u: 3, s: 10 }, { w: 'sine', t: -12, g: 0.3 }], f: ['lp', 600, 1] }),
  PAD('Air Pad', { o: [{ w: 'sine', g: 0.35 }, { w: 'tri', t: 12, g: 0.1 }], nz: 0.06, f: ['lp', 7000, 0.5] }), PAD('Halo Pad', { o: [{ w: 'tri', g: 0.3, u: 3, s: 10 }, { w: 'sine', t: 12, g: 0.15 }], f: ['lp', 4000, 0.6] }, { tfx: { rev: 0.6 } }),
  PAD('Pulse Pad', { o: [{ w: 'p25', g: 0.25, u: 3, s: 14 }, { w: 'p12', d: 5, g: 0.15 }], f: ['lp', 2500, 0.8], lfo: [0.4, 8, 0, 0, 0] }), PAD('Soft Sine Pad', { o: [{ w: 'sine', g: 0.5, u: 2, s: 6 }], f: ['lp', 5000, 0.5] }),
  PAD('Analog Brass Pad', { o: [{ w: 'saw', g: 0.25, u: 3, s: 12 }], f: ['lp', 700, 1.2], fe: [2, 0.8, 1.5, 0.4, 1] }), PAD('Dreamy Pad', { o: [{ w: 'tri', g: 0.3, u: 4, s: 16 }, { w: 'sine', t: 12, g: 0.12 }], f: ['lp', 3000, 0.6] }, { tfx: { rev: 0.6, delay: 0.3 } }),
  PAD('Shimmer Pad', { o: [{ w: 'saw', g: 0.2, u: 3, s: 12 }, { w: 'sine', t: 24, g: 0.12 }, { w: 'tri', t: 12, g: 0.15 }], f: ['lp', 6000, 0.6] }, { tfx: { rev: 0.7 } }), PAD('Evolving Pad', { o: [{ w: 'saw', g: 0.25, u: 3, s: 12 }, { w: 'square', t: 7, g: 0.12 }], f: ['lp', 900, 2], lfo: [0.07, 4, 1.8, 0.15, 0] }),
  PAD('Ice Pad', { o: [{ w: 'p12', g: 0.2, u: 3, s: 10 }, { w: 'sine', t: 24, g: 0.1 }], f: ['hp', 500, 0.7] }), PAD('Space Pad', { o: [{ w: 'saw', g: 0.2, u: 5, s: 22 }], nz: 0.03, f: ['lp', 1800, 2], lfo: [0.15, 0, 1, 0, 0] }, { tfx: { rev: 0.8, delay: 0.3 } }),
  PAD('Warm Fifths Pad', { o: [{ w: 'saw', g: 0.22, u: 3, s: 10 }, { w: 'saw', t: 7, g: 0.18, u: 3, s: 10 }], f: ['lp', 1600, 0.7] }), PAD('Lo-fi Pad', { o: [{ w: 'tri', g: 0.35, u: 2, s: 20 }], f: ['lp', 1100, 0.6], lfo: [0.5, 14, 0, 0, 0] }),
  PAD('Bowed Pad', { o: [{ w: 'saw', g: 0.25, u: 4, s: 12 }], nz: 0.04, f: ['bp', 1200, 0.9] }, { gain: 2.2 }), PAD('Cloud Pad', { o: [{ w: 'sine', g: 0.3, u: 5, s: 20 }, { w: 'tri', t: 12, g: 0.15, u: 3, s: 16 }], f: ['lp', 3000, 0.5], a: [1.5, 1, 0.9, 2.5] }, { rel: 2.5, tfx: { rev: 0.8 } }),
  PAD('Sunset Pad', { o: [{ w: 'saw', g: 0.25, u: 3, s: 14 }, { w: 'tri', t: -12, g: 0.25 }], f: ['lp', 1200, 1.4], lfo: [0.2, 0, 0.6, 0, 0] }), PAD('Night Pad', { o: [{ w: 'tri', g: 0.35, u: 3, s: 10 }, { w: 'sine', t: -12, g: 0.25 }], f: ['lp', 900, 0.7] }, { tfx: { rev: 0.6 } }),
  PAD('Organ Pad', { o: [{ w: { h: bars('888000000') }, t: -12, g: 0.4, u: 3, s: 8 }], f: ['lp', 3500, 0.5] })
]);
/* 15 Synth Keys & Plucks */
const PL = (n, p, ex) => SYN(n, Object.assign({ a: [0.002, 0.5, 0, 0.3], f: ['lp', 800, 2], fe: [3.2, 0.001, 0.25, 0, 0.2] }, p), Object.assign({ rel: 0.3, vf: 0.6 }, ex));
fam('keys', 'Synth Keys & Plucks', [
  PL('Synth Pluck', { o: [{ w: 'saw', g: 0.4, u: 2, s: 10 }] }), PL('Bell Pluck', { o: [{ w: 'sine', g: 0.5 }, { w: 'sine', t: 31, g: 0.15, env: [0.001, 0.2, 0, 0.1] }], f: ['lp', 9000, 0.5], fe: [0, 0, 0, 0, 0] }, { tfx: { rev: 0.4 } }),
  PL('Saw Pluck', { o: [{ w: 'saw', g: 0.45 }] }), PL('Square Pluck', { o: [{ w: 'square', g: 0.4 }] }), SYN('House Organ', { o: [{ w: { h: [0, 1, 0.6, 0.3, 0.6, 0, 0.3] }, g: 0.5 }], a: [0.002, 0.25, 0.3, 0.1], f: ['lp', 4000, 0.7] }, { rel: 0.1 }),
  PL('Chord Stab', { o: [{ w: 'saw', g: 0.3, u: 4, s: 16 }], a: [0.002, 0.3, 0.1, 0.15], f: ['lp', 1500, 1.4] }, { tfx: { rev: 0.4 } }), SYN('Poly Synth', { o: [{ w: 'saw', g: 0.3, u: 2, s: 10 }, { w: 'p25', d: 5, g: 0.2 }], a: [0.005, 0.6, 0.6, 0.4], f: ['lp', 1800, 1], fe: [1.2, 0.005, 0.6, 0.3, 0.4] }, { rel: 0.4, tfx: { chorus: 0.4 } }),
  SYN('Poly Brass Keys', { o: [{ w: 'saw', g: 0.3, u: 3, s: 12 }], a: [0.03, 0.4, 0.8, 0.3], f: ['lp', 900, 1.2], fe: [1.8, 0.05, 0.4, 0.4, 0.3] }, { rel: 0.3 }), PL('Arp Pluck', { o: [{ w: 'saw', g: 0.4 }, { w: 'square', t: 12, g: 0.15 }], a: [0.002, 0.25, 0, 0.15] }, { tfx: { delay: 0.35 } }),
  PL('Mallet Synth', { o: [{ w: 'sine', g: 0.5 }, { w: 'tri', t: 24, g: 0.1, env: [0.001, 0.06, 0, 0.05] }], f: ['lp', 6000, 0.5] }), PL('Marimba Synth', { o: [{ w: 'sine', g: 0.6 }, { w: 'sine', t: 24, g: 0.15, env: [0.001, 0.05, 0, 0.05] }], a: [0.001, 0.4, 0, 0.2], f: ['lp', 5000, 0.5] }),
  PL('Glass Pluck', { o: [{ w: 'tri', g: 0.4 }, { w: 'sine', t: 24, g: 0.2 }], f: ['lp', 4000, 1], fe: [2, 0.001, 0.3, 0, 0.2] }, { tfx: { rev: 0.45 } }), PL('Bubble Pluck', { o: [{ w: 'sine', g: 0.6 }], pe: [7, 0.03], f: ['lp', 3000, 4], fe: [2, 0.001, 0.1, 0, 0.1] }),
  PL('Kalimba Synth', { o: [{ w: 'sine', g: 0.6 }, { w: 'sine', t: 28, g: 0.12, env: [0.001, 0.08, 0, 0.05] }], a: [0.001, 0.8, 0, 0.3], f: ['lp', 7000, 0.5] }), PL('Water Drop', { o: [{ w: 'sine', g: 0.7 }], pe: [12, 0.025], a: [0.001, 0.25, 0, 0.1], f: ['lp', 8000, 0.5], fe: [0, 0, 0, 0, 0] }, { tfx: { rev: 0.5 } }),
  SYN('Short Keys', { o: [{ w: 'square', g: 0.3 }, { w: 'saw', g: 0.2 }], a: [0.002, 0.2, 0.3, 0.1], f: ['lp', 2200, 1] }, { rel: 0.1 }), EP('FM Keys', { mr: 2, idx: 1.6, idxT: 0.3, asym: 0, drive: 0, tone: 9000, sus: 0.8 }),
  EP('Digital Piano', { mr: 1, idx: 1.2, bell: 0.3, bellR: 4, asym: 0.1, drive: 0.1, tone: 7000 }), SYN('Wobble Keys', { o: [{ w: 'saw', g: 0.35, u: 2, s: 8 }], a: [0.005, 0.3, 0.7, 0.2], f: ['lp', 900, 3], lfo: [4, 0, 1.3, 0, 0, 'sync'] }),
  PL('Future Pluck', { o: [{ w: 'saw', g: 0.3, u: 5, s: 20 }], f: ['lp', 1000, 3] }, { tfx: { rev: 0.45, delay: 0.3 } }), PL('Lo-fi Pluck', { o: [{ w: 'tri', g: 0.5 }, { w: 'square', g: 0.08 }], f: ['lp', 1400, 1] }),
  PL('Clicky Pluck', { o: [{ w: 'p12', g: 0.4 }], a: [0.001, 0.15, 0, 0.08] }, { gain: 1.5 }), PL('Harp Synth', { o: [{ w: 'tri', g: 0.45 }, { w: 'saw', g: 0.15 }], a: [0.001, 1.2, 0, 0.6], f: ['lp', 2500, 0.8] }, { tfx: { rev: 0.4 } }),
  PL('Soft Pluck', { o: [{ w: 'tri', g: 0.6 }], f: ['lp', 1600, 0.8], fe: [1.5, 0.002, 0.3, 0, 0.2] }), PL('Wide Pluck', { o: [{ w: 'saw', g: 0.25, u: 6, s: 30 }] }, { tfx: { chorus: 0.5 } })
]);
/* 16 Chiptune */
const CHIP = (n, p, ex) => SYN(n, Object.assign({ a: [0.001, 0.1, 0.9, 0.03], f: ['lp', 16000, 0.5], crush: 4 }, p), Object.assign({ rel: 0.03, vf: 0, gain: 0.6 }, ex));
fam('chip', 'Chiptune', [
  CHIP('Square', { o: [{ w: 'square', g: 0.5 }] }), CHIP('Pulse 25', { o: [{ w: 'p25', g: 0.5 }] }), CHIP('Pulse 12', { o: [{ w: 'p12', g: 0.5 }] }), CHIP('Triangle Bass', { o: [{ w: 'tri4', g: 0.8 }] }),
  CHIP('Noise Hit', { o: [{ w: 'noise', g: 0.6 }], a: [0.001, 0.15, 0, 0.05] }), CHIP('Vibrato Square', { o: [{ w: 'square', g: 0.5 }], lfo: [6.5, 30, 0, 0, 0.15] }), CHIP('Echo Pulse', { o: [{ w: 'p25', g: 0.5 }] }, { tfx: { delay: 0.45 } }),
  CHIP('Slide Square', { o: [{ w: 'square', g: 0.5 }], pe: [-5, 0.06] }), CHIP('Coin Blip', { o: [{ w: 'square', g: 0.5 }], pe: [5, 0.06], a: [0.001, 0.3, 0, 0.05] }), CHIP('Soft Triangle', { o: [{ w: 'tri4', g: 0.7 }], lfo: [5, 15, 0, 0, 0.3] }),
  CHIP('Wave Channel', { o: [{ w: { h: [0, 1, 0.5, 0.33, 0.1, 0.2] }, g: 0.6 }], crush: 4 }), CHIP('Crushed Lead', { o: [{ w: 'saw', g: 0.5 }], crush: 3, drv: 0.4 }), CHIP('Chip Bass', { o: [{ w: 'p25', t: -12, g: 0.5 }, { w: 'tri4', t: -12, g: 0.4 }] }),
  CHIP('Chip Organ', { o: [{ w: 'square', g: 0.3 }, { w: 'square', t: 12, g: 0.2 }] }), CHIP('Chip Bell', { o: [{ w: 'square', g: 0.4 }, { w: 'p12', t: 24, g: 0.15 }], a: [0.001, 0.5, 0, 0.1] }), CHIP('Chip Pluck', { o: [{ w: 'p25', g: 0.5 }], a: [0.001, 0.12, 0, 0.03] }),
  CHIP('Chip Pad', { o: [{ w: 'p25', g: 0.3 }, { w: 'p12', d: 12, g: 0.2 }], a: [0.3, 0.5, 0.8, 0.4] }, { rel: 0.4 }), CHIP('Duty Sweep', { o: [{ w: 'p12', g: 0.35 }, { w: 'p25', d: 3, g: 0.35 }], lfo: [0.8, 0, 0, 0.2, 0] }),
  CHIP('Four-bit Wave', { o: [{ w: 'saw', g: 0.5 }], crush: 2 }), CHIP('Retro Brass', { o: [{ w: 'p25', g: 0.4 }, { w: 'square', d: 8, g: 0.2 }], a: [0.03, 0.2, 0.8, 0.05], lfo: [5.5, 12, 0, 0, 0.3] }),
  CHIP('Retro Flute', { o: [{ w: 'tri4', g: 0.7 }], lfo: [5.5, 18, 0, 0, 0.25], a: [0.02, 0.1, 0.9, 0.05] }), CHIP('Laser Chip', { o: [{ w: 'square', g: 0.5 }], pe: [24, 0.15], a: [0.001, 0.25, 0, 0.05] }),
  CHIP('Jump', { o: [{ w: 'square', g: 0.45 }], pe: [-12, 0.12], a: [0.001, 0.2, 0, 0.05] }), CHIP('Power Up', { o: [{ w: 'p25', g: 0.45 }], lfo: [16, 300, 0, 0, 0], pe: [-12, 0.5] }),
  CHIP('Arp Square', { o: [{ w: 'square', g: 0.45 }], a: [0.001, 0.08, 0.5, 0.02] })
]);
/* 17 Reeds & Accordion */
fam('reeds', 'Accordion & Reeds', [
  REED('Accordion Musette', { voices: 3, spread: 16 }), REED('Accordion Dry', { voices: 1 }), REED('Bandoneon', { voices: 2, spread: 4, form: [[700, 5, 500]], cut: 4000 }),
  REED('Harmonica', { voices: 1, slope: 0.75, odd: 0.4, form: [[1300, 8, 800], [2600, 4, 1000]], cut: 7000, noise: 0.05, vibD: 4, vib: 5.5 }), REED('Blues Harp', { voices: 1, slope: 0.7, odd: 0.4, form: [[1200, 10, 700]], cut: 6000, noise: 0.08, drive: 0.6, scoop: 40 }),
  REED('Chromatic Harmonica', { voices: 1, slope: 0.85, odd: 0.5, form: [[1100, 8, 700]], cut: 6000, noise: 0.04, vibD: 10 }), REED('Melodica', { voices: 1, slope: 0.95, odd: 0.6, form: [[900, 6, 700]], cut: 4500, noise: 0.05 }),
  REED('Harmonium', { voices: 2, spread: 6, cut: 4000, slope: 0.95 }, { a: 0.05, tfx: { rev: 0.35 } }), REED('Reed Organ', { voices: 2, spread: 5, cut: 3500, slope: 1 }, { a: 0.03 }), REED('Concertina', { voices: 2, spread: 8, form: [[1300, 5, 800]], cut: 5000 }),
  REED('Melodeon', { voices: 3, spread: 12, cut: 5500 }), REED('Tango Accordion', { voices: 2, spread: 5, form: [[800, 6, 500]], cut: 4500 }), REED('French Accordion', { voices: 3, spread: 22 }),
  REED('Cajun Accordion', { voices: 3, spread: 14, cut: 7500, slope: 0.75 }), REED('Pump Organ', { voices: 2, spread: 4, cut: 3000, slope: 1.05 }, { a: 0.06 }), REED('Bass Accordion', { voices: 2, spread: 5, cut: 2500, slope: 0.9 }),
  REED('Toy Accordion', { voices: 2, spread: 25, cut: 8000, slope: 0.7 }), REED('Soft Melodica', { voices: 1, slope: 1.2, odd: 0.6, cut: 3000, noise: 0.08 }), REED('Bending Harmonica', { voices: 1, slope: 0.75, odd: 0.4, form: [[1300, 8, 800]], cut: 6500, noise: 0.05, scoop: 60 }),
  REED('Sheng', { voices: 3, spread: 5, slope: 0.9, odd: 0.8, form: [[1500, 6, 1000]], cut: 6000 }), REED('Reed Pad', { voices: 4, spread: 14, cut: 2500, slope: 1.1 }, { a: 0.4, rel: 0.8 }), REED('Street Accordion', { voices: 3, spread: 18, cut: 6500, drive: 0.2 }),
  REED('Dark Bandoneon', { voices: 2, spread: 4, form: [[500, 6, 400]], cut: 2600 }), REED('Bright Reeds', { voices: 2, spread: 10, cut: 9000, slope: 0.65 }), REED('Jazz Harmonica', { voices: 1, slope: 0.85, odd: 0.5, form: [[1000, 6, 700]], cut: 5000, vibD: 14, vib: 6 })
]);
/* 18 World */
fam('world', 'World', [
  KS('Sitar', { body: 'sitar', pick: 0.1, dark: 0.12, buzz: 0.45, sus: 1.6 }, { rel: 0.5 }), SUS('Sarangi', { voices: 1, slope: 0.9, body: [['pk', 700, 3, 6], ['pk', 2200, 2, 4], ['hp', 150, 0.7]], cut: 6000, vib: 6, vibD: 22, noise: 0.05, att: 0.12, scoop: 25 }, { rel: 0.3 }),
  KS('Tanpura', { body: 'sitar', pick: 0.4, dark: 0.2, buzz: 0.5, sus: 3 }, { rel: 1.5 }), KS('Koto', { body: 'koto', pick: 0.25, dark: 0.2, pos: 0.15, sus: 1.1 }, { rel: 0.5 }), KS('Guzheng', { body: 'koto', pick: 0.15, dark: 0.15, sus: 1.4 }, { rel: 0.6 }),
  KS('Pipa', { body: 'oud', pick: 0.1, dark: 0.15, sus: 0.7 }), KS('Shamisen', { body: 'banjo', pick: 0.05, dark: 0.15, buzz: 0.25, sus: 0.6 }), KS('Oud', { body: 'oud', pick: 0.4, dark: 0.32, course: 2, cdet: 2, sus: 0.9 }),
  KS('Saz', { body: 'oud', pick: 0.15, dark: 0.18, course: 2, cdet: 3, buzz: 0.1 }), KS('Kora', { body: 'harp', pick: 0.6, dark: 0.3, sus: 1, pluckShape: 1 }, { rel: 0.6 }),
  SUS('Erhu', { voices: 1, slope: 0.95, body: [['pk', 500, 3, 6], ['pk', 1600, 2, 5], ['hp', 200, 0.7]], cut: 5500, vib: 6, vibD: 25, noise: 0.06, att: 0.1, scoop: 40 }, { rel: 0.25 }),
  WW('Duduk', { slope: 1.05, odd: 0.5, form: [[600, 10, 400], [1400, 4, 700]], cut: 3000, noise: 0.06, vibD: 10 }), WW('Ney', { slope: 2.3, cut: 3500, noise: 0.45, noiseF: [['bp', '*2', 1.2], ['hp', 250, 0.7]], vibD: 12, chiff: 0.4 }),
  WW('Shakuhachi', { slope: 2.2, cut: 4000, noise: 0.4, noiseF: [['bp', '*2', 1.3]], vibD: 16, scoop: 35, chiff: 0.7 }), WW('Dizi', { slope: 1.6, cut: 7000, noise: 0.15, noiseF: [['bp', '*3', 2]], vibD: 12, form: [[3000, 6, 1500]] }),
  REED('Bagpipe', { voices: 1, slope: 0.6, odd: 0.7, form: [[1200, 6, 900], [2800, 5, 1200]], cut: 9000, drive: 0.3, noise: 0.03 }), REED('Uilleann Pipes', { voices: 1, slope: 0.75, odd: 0.7, form: [[1000, 6, 800]], cut: 6000, noise: 0.03, vibD: 5 }),
  REED('Hulusi', { voices: 1, slope: 1.6, odd: 0.4, cut: 3500, noise: 0.12, vibD: 12 }), KS('Hawaiian Steel', { body: 'elec', pick: 0.5, dark: 0.3, sus: 2 }, { a: 0.02, tfx: { rev: 0.4 } }),
  MOD('Tabla', { modes: [[1, 1, 0.5], [2, 0.5, 0.35], [3, 0.35, 0.25], [4, 0.2, 0.2], [5, 0.12, 0.15]], hard: 0.6, strike: 0.5 }, { rel: 0.2 }),
  ['Talking Drum', 'syn', { o: [{ w: 'sine', g: 0.8 }, { w: 'tri', g: 0.15 }], pe: [5, 0.08], a: [0.001, 0.35, 0, 0.1], nz: 0.05, f: ['lp', 2000, 0.7] }, { rel: 0.12 }],
  KS('Santoor', { body: 'harpsi', pick: 0.45, dark: 0.12, course: 3, cdet: 4, sus: 1.4, pluckShape: 1 }, { rel: 0.6 }),
  SUS('Didgeridoo', { voices: 1, slope: 0.8, vowel: 'o', cut: 2500, vibD: 2, jit: 2, noise: 0.08, noiseF: [['lp', 800, 0.7]], drive: 0.3 }, { rel: 0.2 }),
  WW('Bansuri', { slope: 2.3, cut: 4500, noise: 0.25, noiseF: [['bp', '*2', 1.5]], vibD: 14, vib: 5.5, chiff: 0.3 }), KS('Gayageum', { body: 'koto', pick: 0.4, dark: 0.25, sus: 1.2 }, { rel: 0.5 })
]);
/* 19 Drum kits. Each kit lists its pieces (one row each in the drum editor). */
const DRUM_ROWS = ['Kick', 'Snare', 'Side Stick', 'Clap', 'Closed Hat', 'Open Hat', 'Low Tom', 'Mid Tom', 'High Tom', 'Crash', 'Ride', 'Cowbell', 'Shaker', 'Tambourine', 'Low Conga', 'High Conga'];
const DRUM_NOTES = [36, 38, 37, 39, 42, 46, 41, 45, 48, 49, 51, 56, 70, 54, 64, 63];
function acoustic(o = {}) {
  const t = o.tune || 1, d = o.dmp || 1;
  return [
    { t: 'mem', f: 52 * t, f0: 120 * t, sw: 0.025, d: 0.28 * d * (o.kd || 1), click: o.kclick != null ? o.kclick : 0.6, clickF: 3000, nz: 0.4, nzF: 600, nzD: 0.02, modes: [[1, 1], [1.6, 0.15]], drive: o.kdrive || 0.2 },
    { t: 'snare', tones: [[190 * t, 0.55, 0.07 * d], [330 * t, 0.3, 0.04 * d]], na: o.sna || 0.75, nd: 0.14 * d * (o.sd || 1), nhp: 1500, npk: 5000, nlp: 11000 },
    { t: 'mem', f: 380 * t, f0: 420 * t, sw: 0.01, d: 0.04, click: 0.9, clickF: 2500, modes: [[1, 1], [1.45, 0.6], [2.1, 0.3]] },
    { t: 'clap', f: 1300, q: 1.1, d: 0.12, n: 4 },
    { t: 'metal', lo: 3500, hi: 15000, d: 0.045 * (o.hd || 1), parts: 90, na: 0.6, nhp: 7000, f: [['hp', 3500, 0.7]] },
    { t: 'metal', lo: 3000, hi: 15000, d: 0.55 * (o.hd || 1), parts: 120, na: 0.6, nhp: 6000, f: [['hp', 3000, 0.7]] },
    { t: 'mem', f: 95 * t, f0: 130 * t, sw: 0.05, d: 0.35 * d, click: 0.4, nz: 0.2, nzD: 0.03, modes: [[1, 1], [1.59, 0.25], [2.14, 0.12]] },
    { t: 'mem', f: 135 * t, f0: 180 * t, sw: 0.05, d: 0.3 * d, click: 0.4, nz: 0.2, nzD: 0.03, modes: [[1, 1], [1.59, 0.25], [2.14, 0.12]] },
    { t: 'mem', f: 190 * t, f0: 250 * t, sw: 0.04, d: 0.25 * d, click: 0.4, nz: 0.2, nzD: 0.025, modes: [[1, 1], [1.59, 0.25], [2.14, 0.12]] },
    { t: 'metal', lo: 350, hi: 14000, d: 1.6, parts: 260, skew: 0.65, na: 1, nhp: 3000, a: 0.002, f: [['hp', 300, 0.7]] },
    { t: 'metal', lo: 600, hi: 12000, d: 1.4, parts: 160, skew: 0.7, na: 0.4, nhp: 6000, f: [['pk', 5000, 1.5, 4], ['hp', 400, 0.7]] },
    { t: 'metal', square: [1, 1.48], base: 560, d: 0.12, f: [['bp', 900, 1.6]] },
    { t: 'shaker', a: 0.03, d: 0.05, hp: 5000 },
    { t: 'shaker', a: 0.002, d: 0.08, hp: 6000, jingle: 1.2 },
    { t: 'mem', f: 190, f0: 230, sw: 0.02, d: 0.2, click: 0.5, clickF: 2000, modes: [[1, 1], [1.5, 0.3], [2.3, 0.15]] },
    { t: 'mem', f: 290, f0: 340, sw: 0.02, d: 0.15, click: 0.6, clickF: 2500, modes: [[1, 1], [1.5, 0.3], [2.3, 0.15]] }
  ];
}
function analog(o = {}) {
  const t = o.tune || 1, kd = o.kd || 1;
  const base = acoustic({ tune: t });
  return Object.assign(base, {
    0: { t: 'mem', f: 47 * t, f0: o.k0 || 150 * t, sw: o.ksw || 0.04, d: 0.45 * kd, click: o.kclick || 0.15, clickF: 1500, drive: o.kdrive || 0.1 },
    1: { t: 'snare', tones: [[180 * t, 0.6, 0.06], [330 * t, 0.4, 0.05]], na: o.sna || 0.6, nd: 0.12 * (o.sd || 1), nhp: 1800, npk: 6000, nlp: 12000, bend: 0.4 },
    2: { t: 'mem', f: 1650, f0: 1700, sw: 0.01, d: 0.01, click: 0.2, modes: [[1, 1], [0.45, 0.5]] },
    3: { t: 'clap', f: 1100, q: 1.4, d: 0.14 * (o.cd || 1), n: 4, gap: 0.009 },
    4: { t: 'metal', square: [2, 3, 4.16, 5.43, 6.79, 8.21], base: o.hat || 205, d: 0.04 * (o.hd || 1), f: [['bp', 10000, 1], ['hp', 7000, 0.7]] },
    5: { t: 'metal', square: [2, 3, 4.16, 5.43, 6.79, 8.21], base: o.hat || 205, d: 0.35 * (o.hd || 1), f: [['bp', 10000, 1], ['hp', 7000, 0.7]] },
    6: { t: 'mem', f: 90 * t, f0: 150 * t, sw: 0.08, d: 0.35, click: 0.05 },
    7: { t: 'mem', f: 130 * t, f0: 210 * t, sw: 0.07, d: 0.3, click: 0.05 },
    8: { t: 'mem', f: 190 * t, f0: 300 * t, sw: 0.06, d: 0.25, click: 0.05 },
    9: { t: 'metal', square: [2, 3, 4.16, 5.43, 6.79, 8.21], base: 300, d: 1.2, f: [['bp', 8000, 0.7], ['hp', 4000, 0.7]] },
    10: { t: 'metal', square: [2, 3, 4.16, 5.43, 6.79, 8.21], base: 350, d: 0.9, f: [['bp', 6000, 1], ['hp', 3000, 0.7]] },
    11: { t: 'metal', square: [1, 1.48], base: 540, d: 0.15, f: [['bp', 850, 2]] },
    12: { t: 'shaker', a: 0.005, d: 0.03, hp: 7000 },
    14: { t: 'mem', f: 170, f0: 175, sw: 0.02, d: 0.18, click: 0.2 },
    15: { t: 'mem', f: 250, f0: 255, sw: 0.02, d: 0.14, click: 0.2 }
  });
}
const KIT = (n, pieces, ex) => DRK(n, { kit: pieces }, ex);
const mod = (kit, ch) => { for (const k in ch) kit[k] = Object.assign({}, kit[k], ch[k]); return kit; };
fam('drums', 'Drum Kits', [
  KIT('Studio Kit', acoustic()), KIT('Rock Kit', acoustic({ tune: 0.9, kdrive: 0.4, sna: 0.85, dmp: 1.2 }), { tfx: { rev: 0.25 } }), KIT('Jazz Kit', acoustic({ tune: 1.25, kd: 0.8, sna: 0.6, hd: 1.4, kclick: 0.3 })),
  KIT('Funk Kit', acoustic({ tune: 1.1, dmp: 0.75, sna: 0.85 })), KIT('Pop Kit', mod(acoustic({ kdrive: 0.3 }), { 3: { d: 0.16 } })), KIT('Big Room Kit', acoustic({ tune: 0.9, dmp: 1.5, sd: 1.4 }), { tfx: { rev: 0.45 } }),
  KIT('Analog 808', analog({ kd: 3, k0: 110, ksw: 0.06, sd: 0.8 })), KIT('Analog 909', analog({ kd: 0.8, k0: 230, ksw: 0.02, kclick: 0.5, kdrive: 0.3, sna: 0.9, sd: 1.2, hat: 230 })), KIT('Analog 606', analog({ kd: 0.6, tune: 1.2, hat: 240, hd: 0.8 })),
  KIT('Trap Kit', mod(analog({ kd: 4, k0: 120, ksw: 0.06, kdrive: 0.4, sd: 0.6 }), { 4: { d: 0.025 } })), KIT('Lo-fi Kit', acoustic({ dmp: 0.7 }).map(q => Object.assign({}, q, { bit: 7, hold: 2, post: [['lp', 7000, 0.7]] }))),
  KIT('Boom Bap Kit', mod(acoustic({ tune: 0.95, kdrive: 0.5, sna: 0.9 }), { 0: { d: 0.35 }, 1: { drive: 0.3 } }).map(q => Object.assign({}, q, { post: [['lp', 9000, 0.7]] }))),
  KIT('House Kit', analog({ kd: 1, k0: 200, ksw: 0.025, kclick: 0.4, hat: 225 })), KIT('Techno Kit', analog({ kd: 1.2, k0: 220, ksw: 0.02, kdrive: 0.8, hat: 215, hd: 0.7 })),
  KIT('Electro Kit', analog({ kd: 1.6, k0: 180, tune: 1.1, sna: 0.5, cd: 1.3 })), KIT('Disco Kit', mod(acoustic({ tune: 1.05, dmp: 0.8 }), { 5: { d: 0.4 } })), KIT('Sixties Kit', acoustic({ tune: 1.15, dmp: 0.8, kclick: 0.25 }).map(q => Object.assign({}, q, { post: [['lp', 6000, 0.7], ['hp', 80, 0.7]] }))),
  KIT('Stadium Kit', acoustic({ tune: 0.85, dmp: 1.6, kdrive: 0.4, sd: 1.5 }), { tfx: { rev: 0.6 } }), KIT('Brush Kit', mod(acoustic({ tune: 1.2, kd: 0.7 }), { 1: { tones: [[200, 0.15, 0.05]], na: 0.8, nd: 0.25, nhp: 2500 } })),
  KIT('Eight-bit Kit', analog({ kd: 0.8 }).map(q => Object.assign({}, q, { bit: 4, hold: 3 }))), KIT('Industrial Kit', analog({ kd: 1.4, kdrive: 1, sna: 1 }).map(q => Object.assign({}, q, { drive: 0.7 }))),
  KIT('Reggae Kit', acoustic({ tune: 1.3, dmp: 0.7, sna: 0.6 })), KIT('Latin Percussion Kit', mod(acoustic({ tune: 1.1 }), { 14: { d: 0.3 }, 15: { d: 0.22 } })), KIT('Soft Kit', acoustic({ tune: 1.05, kclick: 0.2, sna: 0.55, kd: 0.8 }).map(q => Object.assign({}, q, { post: [['lp', 8000, 0.7]] }))),
  KIT('Orchestral Percussion', mod(acoustic({ tune: 0.7, dmp: 1.8 }), { 0: { f: 60, f0: 65, sw: 0.05, d: 1.5, click: 0.2, modes: [[1, 1], [1.5, 0.4], [1.98, 0.3], [2.44, 0.2]] }, 9: { d: 3 } }), { tfx: { rev: 0.6 } })
]);
/* 20 Sound FX (play them on any note: higher notes = higher pitch) */
const FX = (n, p, ex) => SYN(n, Object.assign({ a: [0.005, 0.5, 0.7, 0.4], f: ['lp', 8000, 0.7] }, p), Object.assign({ rel: 0.4, vf: 0 }, ex));
fam('fx', 'Sound FX', [
  FX('Riser', { o: [{ w: 'saw', g: 0.3, u: 3, s: 20 }], nz: 0.4, pe: [-24, 4, 'lin'], f: ['lp', 300, 4], fe: [5, 4, 0.1, 1, 0.5], a: [3.5, 0.5, 1, 0.5] }, { rel: 0.5 }),
  FX('Downlifter', { o: [{ w: 'saw', g: 0.3, u: 3, s: 20 }], nz: 0.3, pe: [24, 2.5, 'lin'], f: ['lp', 9000, 2], a: [0.01, 2.5, 0, 0.3] }), FX('Laser Zap', { o: [{ w: 'square', g: 0.4 }, { w: 'saw', d: 30, g: 0.2 }], pe: [36, 0.15], a: [0.001, 0.25, 0, 0.05] }),
  FX('Sci-fi Blip', { o: [{ w: 'sine', g: 0.6 }], pe: [-12, 0.05], a: [0.001, 0.12, 0, 0.05], lfo: [30, 200, 0, 0, 0] }), FX('Bubble', { o: [{ w: 'sine', g: 0.7 }], pe: [-7, 0.06], a: [0.001, 0.1, 0, 0.03] }),
  FX('Wind', { o: [{ w: 'noise', g: 0.6 }], f: ['bp', 0, 9], kt: 1, lfo: [0.25, 0, 0.8, 0.3, 0], a: [1.2, 0.5, 1, 1.5] }, { rel: 1.5, gain: 3.5 }), FX('Ocean Waves', { o: [{ w: 'noise', g: 0.6 }], f: ['lp', 900, 0.5], lfo: [0.12, 0, 2, 0.6, 0], a: [1.5, 0.5, 1, 2] }, { rel: 2 }),
  FX('Thunder Rumble', { o: [{ w: 'noise', g: 0.8 }], f: ['lp', 180, 1], lfo: [3, 0, 0.8, 0.5, 0], a: [0.05, 3, 0, 2], drv: 0.5 }, { rel: 2 }), FX('Siren', { o: [{ w: 'saw', g: 0.35 }, { w: 'square', g: 0.15 }], lfo: [0.6, 500, 0, 0, 0], f: ['lp', 3000, 1] }),
  FX('Alarm', { o: [{ w: 'square', g: 0.4 }], lfo: [4, 0, 0, 1, 0, 'sq'] }), FX('Robot Voice', { o: [{ w: 'saw', g: 0.5 }], f: ['bp', 1000, 8], lfo: [9, 0, 1.2, 0, 0, 'sq'] }, { gain: 2 }),
  FX('UFO', { o: [{ w: 'sine', g: 0.6 }, { w: 'tri', t: 7, g: 0.2 }], lfo: [7, 120, 0, 0, 0] }, { tfx: { rev: 0.5 } }), FX('Glitch', { o: [{ w: 'square', g: 0.4 }, { w: 'noise', g: 0.15 }], lfo: [16, 0, 0, 1, 0, 'sq'], crush: 3 }),
  FX('Radio Static', { o: [{ w: 'noise', g: 0.5 }, { w: 'sine', g: 0.2 }], f: ['bp', 2500, 1.2], crush: 5, lfo: [11, 0, 0, 0.5, 0, 'rnd'] }), FX('Heartbeat', { o: [{ w: 'sine', g: 0.9 }], pe: [7, 0.03], a: [0.002, 0.18, 0, 0.1], f: ['lp', 300, 0.7] }),
  FX('Impact Drop', { o: [{ w: 'sine', g: 0.8 }, { w: 'noise', g: 0.3 }], pe: [24, 0.4], a: [0.001, 1.5, 0, 0.5], f: ['lp', 2000, 0.7], drv: 0.4 }, { tfx: { rev: 0.5 } }),
  FX('Whoosh', { o: [{ w: 'noise', g: 0.7 }], f: ['bp', 0, 3], kt: 1, fe: [2.5, 0.4, 0.5, 0, 0.3], a: [0.4, 0.5, 0, 0.3] }), FX('Space Drone', { o: [{ w: 'saw', t: -12, g: 0.25, u: 4, s: 15 }, { w: 'sine', t: -24, g: 0.3 }], f: ['lp', 400, 3], lfo: [0.08, 0, 1.5, 0, 0], a: [2, 1, 1, 3] }, { rel: 3, tfx: { rev: 0.7 } }),
  FX('Magic Sparkle', { o: [{ w: 'sine', t: 24, g: 0.4 }, { w: 'tri', t: 31, g: 0.2 }], lfo: [18, 60, 0, 0.6, 0, 'rnd'], a: [0.01, 0.8, 0, 0.5] }, { tfx: { rev: 0.6, delay: 0.4 } }),
  FX('Coin', { o: [{ w: 'square', g: 0.4 }], pe: [-5, 0.07, 'step'], a: [0.001, 0.4, 0, 0.05], crush: 4 }), FX('Power Down', { o: [{ w: 'square', g: 0.4 }], pe: [24, 1.2, 'lin'], a: [0.001, 1.2, 0, 0.1], lfo: [14, 0, 0, 0.5, 0, 'sq'] }),
  FX('Explosion', { o: [{ w: 'noise', g: 0.9 }], f: ['lp', 3000, 0.7], fe: [-3, 0.001, 1.2, 0, 0.5], a: [0.001, 2, 0, 1], drv: 0.6 }, { rel: 1 }), FX('Rain', { o: [{ w: 'noise', g: 0.5 }], f: ['hp', 2500, 0.7], lfo: [23, 0, 0, 0.4, 0, 'rnd'], a: [0.8, 0.5, 1, 1] }, { rel: 1 }),
  FX('Bird Chirp', { o: [{ w: 'sine', t: 24, g: 0.5 }], pe: [-10, 0.06], lfo: [24, 150, 0, 0.5, 0], a: [0.005, 0.15, 0, 0.05] }), FX('Swell', { o: [{ w: 'saw', g: 0.25, u: 5, s: 25 }, { w: 'noise', g: 0.1 }], f: ['lp', 400, 1], fe: [4, 2, 0.5, 0.8, 1], a: [2, 0.5, 1, 1] }, { rel: 1, tfx: { rev: 0.6 } })
]);
const ALL_PRESETS = FAMILIES.flatMap(f => f.items);
