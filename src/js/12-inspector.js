/* ================= right panel (inspector) ================= */
let RTAB = null;
const INS = { live: [] }; // controls that follow the playhead
function chg(final) { requestRender(); if (final) { commit(); scheduleTL(); } }
function grp(title, kids, opts = {}) {
  const g = h('div', { class: 'grp' });
  const hd = h('h4', null, title, opts.small ? h('small', null, opts.small) : null);
  if (opts.toggle) hd.append(checkBox('', opts.toggle.get(), v => { opts.toggle.set(v); chg(true); renderInspector(); }));
  g.append(hd, ...kids.filter(Boolean));
  return g;
}
function nrow(label, o) { return row(label, numField(o)); }
function srow(label, opts, val, on) { return row(label, selectBox({ options: opts, value: val, onChange: on })); }
function crow(label, obj, key, after) { return row(label, colorBtn({ value: obj[key], onInput: (v, f) => { obj[key] = v; after && after(); chg(f); } })); }
function rrow(label, obj, key, o) { return rangeRow(label, { min: o.min, max: o.max, step: o.step || 1, value: obj[key], def: o.def, center: o.center, suf: o.suf, dec: o.dec, onInput: (v, f) => { obj[key] = v; o.after && o.after(v); chg(f); } }); }
function tabsFor(c) {
  if (!c) return [['project', 'Project']];
  switch (c.type) {
    case 'video': return [['clip', 'Video'], ['anim', 'Animation'], ['adjust', 'Adjust'], ['mask', 'Mask'], ['effects', 'Effects'], ['audio', 'Audio']];
    case 'image': return [['clip', 'Picture'], ['anim', 'Animation'], ['adjust', 'Adjust'], ['mask', 'Mask'], ['effects', 'Effects']];
    case 'text': return [['text', 'Text'], ['clip', 'Transform'], ['anim', 'Animation'], ['effects', 'Effects']];
    case 'sticker': return [['sticker', 'Sticker'], ['clip', 'Transform'], ['anim', 'Animation'], ['effects', 'Effects']];
    case 'audio': return [['audio', 'Audio']];
    case 'effect': return [['layer', 'Effect']];
    case 'filter': return [['layer', 'Filter']];
    case 'adjust': return [['layer', 'Adjust']];
  }
  return [['project', 'Project']];
}
function showRight(tab) { RTAB = tab; renderInspector(); if (innerWidth < 1000 || innerHeight < 560) openSheet('right'); }
let lastInsKind = null;
function renderInspector() {
  const c = selClip(), tabs = tabsFor(c);
  const kind = c ? c.type : null;
  if (kind !== lastInsKind && !KEYJUMP) RTAB = tabs[0][0];
  lastInsKind = kind;
  if (!tabs.some(t => t[0] === RTAB)) RTAB = tabs[0][0];
  const nav = $('#rtabs'); nav.innerHTML = '';
  for (const [id, n] of tabs) nav.append(h('button', { class: id === RTAB ? 'on' : '', onclick: () => { RTAB = id; renderInspector(); } }, n));
  const b = $('#rbody'), st = b.scrollTop; b.innerHTML = ''; INS.live = [];
  const fn = { project: insProject, clip: insClip, anim: insAnim, adjust: insAdjust, mask: insMask, effects: insEffects, keys: insKeys, audio: insAudio, text: insText, sticker: insSticker, layer: insLayer }[RTAB];
  fn(b, c);
  b.scrollTop = st;
  if (KEYJUMP) { KEYJUMP = false; const k = $('#keysec'); if (k) requestAnimationFrame(() => k.scrollIntoView({ block: 'start' })); }
}
let KEYJUMP = false;
function refreshInspectorValues() { for (const f of INS.live) try { f(); } catch (e) { } }

/* ---------- project ---------- */
function insProject(b) {
  b.append(h('div', { class: 'note', style: { marginBottom: '10px' } }, 'Nothing selected. Tap a clip in the timeline or on the picture to edit it.'));
  b.append(srow('Canvas', Object.keys(RATIOS).map(r => ({ v: r, l: r, small: RATIOS[r].join('×') })), P.ratio, v => setRatio(v)));
  b.append(srow('Background', [{ v: 'color', l: 'Color' }, { v: 'blur', l: 'Blurred video' }], P.bg.type, v => { P.bg.type = v; chg(true); renderInspector(); }));
  if (P.bg.type === 'color') b.append(crow('Color', P.bg, 'color'));
  else b.append(rrow('Blur', P.bg, 'blur', { min: 5, max: 120 }));
  b.append(srow('Frame rate', [24, 25, 30, 50, 60].map(f => ({ v: f, l: f + ' fps' })), P.fps, v => { P.fps = v; chg(true); renderTimeline(); }));
  b.append(h('div', { class: 'hint' }, 'Frame rate here sets the frame steps for editing. You pick the export frame rate when you export.'));
  b.append(grp('Project', [
    h('div', { class: 'note' }, `Length ${fmtTime(projDur(), P.fps)} · ${allClips().length} clips · ${Object.keys(MEDIA).length} files`),
    h('div', { style: { display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' } },
      h('button', { class: 'btn sm', onclick: newProjectAsk }, 'New project'),
      h('button', { class: 'btn sm', onclick: saveProjectFile }, 'Save project file'),
      h('button', { class: 'btn sm', onclick: () => $('#projIn').click() }, 'Open project file'))
  ]));
  b.append(grp('Shortcuts', [h('div', { class: 'note', style: { lineHeight: '1.7' } }, 'Space play/pause · S split · Del delete · Ctrl+D duplicate · Ctrl+Z / Ctrl+Shift+Z undo/redo · K keyframe · arrows move one frame · Shift+drag rotates in 15° steps · Alt+wheel on the picture rotates')]));
}
function setRatio(r) {
  const [w, hh] = RATIOS[r], ow = P.w, oh = P.h;
  P.ratio = r; P.w = w; P.h = hh;
  // keep things where they were relative to the frame
  for (const c of allClips()) { c.tf.x = c.tf.x / ow * w; c.tf.y = c.tf.y / oh * hh; for (const k of c.kf.x) k.v = k.v / ow * w; for (const k of c.kf.y) k.v = k.v / oh * hh; }
  $('#ratioLbl').textContent = r;
  commit(); layoutView(); renderInspector();
}

/* ---------- keyframable transform rows ---------- */
const PROP_UI = { x: { l: 'Position X', dec: 1 }, y: { l: 'Position Y', dec: 1 }, scale: { l: 'Scale', dec: 1, suf: '%', mul: 100, min: 1, max: 10000 }, rot: { l: 'Rotation', dec: 2, suf: '°', min: -MAX_ROT, max: MAX_ROT }, opacity: { l: 'Opacity', dec: 0, suf: '%', min: 0, max: 100 } };
function kfButtons(c, prop) {
  const lt = () => clamp(T - c.start, 0, c.dur);
  const prev = h('button', { class: 'kfnav', title: 'Previous keyframe', html: icon('chevl'), onclick: () => { const ks = c.kf[prop].filter(k => k.t < lt() - 1e-4); if (ks.length) { SELKF = { t: ks[ks.length - 1].t }; seek(c.start + SELKF.t); scheduleTL(); } } });
  const dia = h('button', { class: 'kfb', title: 'Add / remove keyframe', html: icon('key'), onclick: () => { if (T < c.start || T > c.start + c.dur) { toast('Put the playhead over the clip'); return; } const on = toggleKey(c, prop); SELKF = on ? { t: lt() } : null; chg(true); refreshAll(); } });
  const next = h('button', { class: 'kfnav', title: 'Next keyframe', html: icon('chevr'), onclick: () => { const ks = c.kf[prop].filter(k => k.t > lt() + 1e-4); if (ks.length) { SELKF = { t: ks[0].t }; seek(c.start + SELKF.t); scheduleTL(); } } });
  const upd = () => { const has = c.kf[prop].length > 0, at = keyAt(c, prop, lt()) >= 0; dia.classList.toggle('has', has); dia.classList.toggle('at', at); prev.style.visibility = next.style.visibility = has ? 'visible' : 'hidden'; };
  upd(); INS.live.push(upd);
  return [prev, dia, next];
}
function propRow(c, prop) {
  const u = PROP_UI[prop], mul = u.mul || 1, lt = () => clamp(T - c.start, 0, c.dur);
  const n = numField({ value: evalProp(c, prop, lt()) * mul, min: u.min, max: u.max, dec: u.dec, suf: u.suf, step: prop === 'scale' ? 1 : prop === 'rot' ? 1 : 1, onInput: (v, f) => { setProp(c, prop, v / mul); chg(f); if (f) refreshInspectorValues(); } });
  INS.live.push(() => n.set(evalProp(c, prop, lt()) * mul));
  const ctl = [n];
  if (prop === 'opacity' || prop === 'scale') {
    const s = slider({ min: prop === 'scale' ? 1 : 0, max: prop === 'scale' ? 400 : 100, step: 1, value: evalProp(c, prop, lt()) * mul, onInput: (v, f) => { n.set(v); setProp(c, prop, v / mul); chg(f); } });
    INS.live.push(() => s.set(evalProp(c, prop, lt()) * mul));
    ctl.unshift(s); n.style.flex = '0 0 72px';
  }
  return h('div', { class: 'row' }, h('label', null, u.l), h('div', { class: 'ctl' }, ...ctl), ...kfButtons(c, prop));
}
function rotationRows(c) {
  const lt = () => clamp(T - c.start, 0, c.dur);
  const turns = numField({ value: evalProp(c, 'rot', lt()) / 360, dec: 4, min: -99999, max: 99999, step: 0.01, suf: 'turns', onInput: (v, f) => { setProp(c, 'rot', clamp(v * 360, -MAX_ROT, MAX_ROT)); chg(f); if (f) refreshInspectorValues(); } });
  const info = h('div', { class: 'hint', style: { margin: '-2px 0 8px 100px' } });
  const upd = () => { const r = evalProp(c, 'rot', lt()); turns.set(r / 360); info.textContent = rotText(r) + ' · limit ±99,999 turns (±35,999,640°)'; };
  upd(); INS.live.push(upd);
  turns.querySelector('.num').style.paddingRight = '44px';
  const spinBtns = h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
    ...[[-360, '-1 turn'], [-90, '-90°'], [90, '+90°'], [360, '+1 turn']].map(([d, l]) => h('button', { class: 'btn sm', onclick: () => { setProp(c, 'rot', clamp(evalProp(c, 'rot', lt()) + d, -MAX_ROT, MAX_ROT)); chg(true); refreshInspectorValues(); } }, l)));
  return [propRow(c, 'rot'), row('Turns', turns), info, row('', spinBtns)];
}
function insClip(b, c) {
  // keyframes and the motion between them live in this same tab, at the top
  const ks = h('div', { id: 'keysec', class: 'grp' }, h('h4', null, 'Keyframes')); insKeys(ks, c); b.append(ks);
  b.append(h('div', { class: 'grp' }, h('h4', null, 'Transform')), propRow(c, 'x'), propRow(c, 'y'), propRow(c, 'scale'), ...rotationRows(c), propRow(c, 'opacity'));
  b.append(row('', h('button', { class: 'btn sm', onclick: () => { setProp(c, 'x', P.w / 2); setProp(c, 'y', P.h / 2); chg(true); refreshInspectorValues(); } }, 'Center'), h('button', { class: 'btn sm', onclick: () => { setProp(c, 'scale', 1); setProp(c, 'rot', 0); chg(true); refreshInspectorValues(); } }, 'Reset size and turn')));
  b.append(row('Flip', h('button', { class: 'btn sm' + (c.flipH ? ' pri' : ''), html: icon('flipH') + ' Mirror', onclick: () => { c.flipH = !c.flipH; chg(true); renderInspector(); } }), h('button', { class: 'btn sm' + (c.flipV ? ' pri' : ''), html: icon('flipV') + ' Upside down', onclick: () => { c.flipV = !c.flipV; chg(true); renderInspector(); } })));
  const BL = [['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['color-dodge', 'Color dodge'], ['color-burn', 'Color burn'], ['hard-light', 'Hard light'], ['soft-light', 'Soft light'], ['difference', 'Difference'], ['exclusion', 'Exclusion'], ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity'], ['lighter', 'Add']];
  b.append(srow('Blend', BL.map(([v, l]) => ({ v, l })), c.blend || 'source-over', v => { c.blend = v; chg(true); }));
  if (c.type === 'video' || c.type === 'image') {
    b.append(grp('Crop', [rrow('Left', c.crop, 'l', { min: 0, max: 95, suf: '%' }), rrow('Right', c.crop, 'r', { min: 0, max: 95, suf: '%' }), rrow('Top', c.crop, 't', { min: 0, max: 95, suf: '%' }), rrow('Bottom', c.crop, 'b', { min: 0, max: 95, suf: '%' })]));
  }
  if (c.type === 'video' || c.type === 'image') b.append(grp('Timing', [speedRow(c), nrow('Duration', { value: c.dur, min: 1 / P.fps, max: c.type === 'video' ? (mediaDur(c) - c.in) / (c.speed || 1) : 36000, dec: 2, suf: 's', step: 0.1, onInput: (v, f) => { if (!f) return; c.dur = v; if (trackOf(c).main && TL.magnet) packMain(); chg(true); refreshAll(); } })]));
}
function speedRow(c) {
  return nrow('Speed', {
    value: c.speed || 1, min: 0.05, max: 100, dec: 3, suf: 'x', step: 0.05, onInput: (v, f) => {
      if (!f) return;
      const old = c.speed || 1, srcLen = c.dur * old; c.speed = v;
      let nd = srcLen / v; const md = mediaDur(c); if (isFinite(md)) nd = Math.min(nd, (md - c.in) / v);
      const r = nd / c.dur; for (const p of KF_PROPS) for (const k of c.kf[p]) k.t *= r;
      c.dur = Math.max(1 / P.fps, nd);
      if (trackOf(c).main && TL.magnet) packMain();
      chg(true); refreshAll();
    }
  });
}

/* ---------- animation ---------- */
function animPair(lab, list, obj, after) {
  const opts = Object.keys(list).map(k => ({ v: k, l: typeof list[k] === 'string' ? list[k] : list[k].n }));
  return [srow(lab, opts, obj.id, v => { obj.id = v; after && after(); chg(true); renderInspector(); seekPreviewAnim(); }),
  obj.id !== 'none' ? nrow(lab.includes('Loop') ? 'Speed' : 'Duration', lab.includes('Loop') ? { value: obj.speed || 1, min: 0.05, max: 50, dec: 2, suf: 'x', step: .05, onInput: (v, f) => { obj.speed = v; chg(f); } } : { value: obj.dur, min: 0.05, max: 30, dec: 2, suf: 's', step: .05, onInput: (v, f) => { obj.dur = v; chg(f); } }) : null];
}
function seekPreviewAnim() { const c = selClip(); if (c && (T < c.start || T > c.start + c.dur)) seek(c.start); }
function insAnim(b, c) {
  if (c.type === 'text') {
    const tx = c.text;
    b.append(grp('Text animation', [
      ...animPair('In', TEXT_IN, tx.ain), ...animPair('Out', TEXT_OUT, tx.aout), ...animPair('Loop', TEXT_LOOP, tx.aloop),
      tx.aloop.id !== 'none' ? rrow('Strength', tx.aloop, 'amt', { min: 0, max: 3, step: .05, dec: 2 }) : null,
      tx.ain.id === 'typewriter' ? row('Cursor', checkBox('Blinking cursor while typing', tx.cursor, v => { tx.cursor = v; chg(true); })) : null
    ], { small: 'letters move' }));
  }
  b.append(grp(c.type === 'text' ? 'Whole layer' : 'Animation', [...animPair('In', IN_ANIMS, c.anim.in), ...animPair('Out', OUT_ANIMS, c.anim.out), ...animPair('Loop', LOOP_ANIMS, c.anim.loop)]));
  b.append(h('button', { class: 'btn sm', style: { marginTop: '10px' }, onclick: () => { seek(c.start); play(); } }, 'Play from clip start'));
}

/* ---------- adjust / filter / chroma ---------- */
const GRADE_UI = [['brightness', 'Brightness'], ['contrast', 'Contrast'], ['saturation', 'Saturation'], ['exposure', 'Exposure'], ['temperature', 'Temperature'], ['tint', 'Tint'], ['hue', 'Hue', -180, 180], ['highlights', 'Highlights'], ['shadows', 'Shadows'], ['fade', 'Fade', 0, 100], ['vignette', 'Vignette'], ['grain', 'Grain', 0, 100], ['sharpen', 'Sharpen', 0, 100]];
function gradeRows(c) {
  return GRADE_UI.map(([k, l, mn, mx]) => rrow(l, c.grade, k, { min: mn == null ? -100 : mn, max: mx == null ? 100 : mx, def: 0, center: mn === 0 ? null : 0 }));
}
function filterRows(c) {
  return [srow('Filter', Object.keys(FILTERS).map(k => ({ v: k, l: FILTERS[k].n })), c.filter.id, v => { c.filter.id = v; chg(true); renderInspector(); }),
  c.filter.id !== 'none' ? rrow('Intensity', c.filter, 'amount', { min: 0, max: 100, suf: '%' }) : null];
}
function insAdjust(b, c) {
  b.append(grp('Filter', filterRows(c)));
  b.append(grp('Adjust', [...gradeRows(c), h('button', { class: 'btn sm', onclick: () => { c.grade = defGrade(); chg(true); renderInspector(); } }, 'Reset adjustments')]));
  const k = c.chroma;
  b.append(grp('Chroma key', k.on ? [crow('Key color', k, 'color'), h('div', { class: 'hint' }, 'Pick the green or blue of the backdrop.'), rrow('Strength', k, 'sim', { min: 0, max: 100 }), rrow('Edge softness', k, 'smooth', { min: 0, max: 100 }), rrow('Spill removal', k, 'spill', { min: 0, max: 100 })] : [h('div', { class: 'hint' }, 'Removes a green or blue background.')], { toggle: { get: () => k.on, set: v => k.on = v } }));
}
function insMask(b, c) {
  const m = c.mask;
  b.append(row('Shape', selectBox({ options: Object.keys(MASKS).map(k => ({ v: k, l: MASKS[k] })), value: m.type, onChange: v => { m.type = v; chg(true); renderInspector(); } })));
  if (m.type === 'none') { b.append(h('div', { class: 'hint' }, 'Masks show only part of the clip.')); return; }
  b.append(rrow('Move X', m, 'x', { min: -1, max: 1, step: .01, dec: 2, center: 0 }), rrow('Move Y', m, 'y', { min: -1, max: 1, step: .01, dec: 2, center: 0 }));
  if (m.type !== 'linear') { b.append(rrow('Width', m, 'w', { min: .01, max: 2, step: .01, dec: 2 })); if (m.type !== 'band') {} b.append(rrow(m.type === 'band' ? 'Band size' : 'Height', m, 'h', { min: .01, max: 2, step: .01, dec: 2 })); }
  b.append(rrow('Rotate', m, 'rot', { min: -180, max: 180, center: 0, suf: '°' }), rrow('Feather', m, 'feather', { min: 0, max: 100 }));
  if (m.type === 'rect') b.append(rrow('Round corners', m, 'round', { min: 0, max: 100 }));
  b.append(row('Invert', checkBox('Show the outside instead', m.invert, v => { m.invert = v; chg(true); })));
}
function effectList(b, c) {
  if (!c.effects.length) b.append(h('div', { class: 'hint' }, 'No effects yet.'));
  c.effects.forEach((e, i) => {
    const hd = h('h4', null, EFFECTS[e.id].n);
    const off = checkBox('', !e.off, v => { e.off = !v; chg(true); });
    const del = h('button', { class: 'tb', title: 'Remove', html: icon('trash'), onclick: () => { c.effects.splice(i, 1); chg(true); renderInspector(); } });
    off.style.marginLeft = 'auto'; hd.append(off, del);
    const g = h('div', { class: 'grp' }, hd, rrow('Amount', e, 'amt', { min: 0, max: 100, suf: '%' }), rrow('Speed', e, 'speed', { min: .1, max: 10, step: .1, dec: 1, suf: 'x' }));
    b.append(g);
  });
  b.append(h('div', { class: 'row', style: { marginTop: '10px' } }, h('label', null, 'Add effect'), h('div', { class: 'ctl' }, selectBox({ options: Object.keys(EFFECTS).map(k => ({ v: k, l: EFFECTS[k].n })), value: null, placeholder: 'Choose…', onChange: v => { c.effects.push({ id: v, amt: 60, speed: 1 }); chg(true); renderInspector(); } }))));
}
function insEffects(b, c) { effectList(b, c); }
function insLayer(b, c) {
  b.append(propRow(c, 'opacity'));
  b.append(h('div', { class: 'hint' }, 'Opacity sets how strongly this layer changes the picture. It can be keyframed.'));
  if (c.type === 'effect') effectList(b, c);
  if (c.type === 'filter') b.append(grp('Filter', filterRows(c)));
  if (c.type === 'adjust' || c.type === 'filter') b.append(grp('Adjust', gradeRows(c)));
}

/* ---------- audio ---------- */
function insAudio(b, c) {
  b.append(rrow('Volume', c, 'vol', { min: 0, max: 400, suf: '%', def: 100 }));
  b.append(row('Mute', checkBox('Mute this clip', c.muted, v => { c.muted = v; chg(true); renderTimeline(); })));
  b.append(rrow('Fade in', c, 'fadeIn', { min: 0, max: Math.min(10, c.dur), step: .05, dec: 2, suf: 's', after: scheduleTL }));
  b.append(rrow('Fade out', c, 'fadeOut', { min: 0, max: Math.min(10, c.dur), step: .05, dec: 2, suf: 's', after: scheduleTL }));
  if (c.type === 'audio') b.append(speedRow(c));
  const m = MEDIA[c.media]; if (c.type === 'video' && m && !m.hasAudio) b.append(h('div', { class: 'hint' }, 'This video has no sound.'));
}

/* ---------- text ---------- */
function insText(b, c) {
  const tx = c.text;
  const ta = h('textarea', { class: 'txt', spellcheck: 'false' }); ta.value = tx.txt;
  ta.addEventListener('input', () => { tx.txt = ta.value; chg(false); });
  ta.addEventListener('change', () => chg(true)); ta.addEventListener('keydown', e => e.stopPropagation());
  b.append(ta, h('div', { style: { height: '8px' } }));
  b.append(row('Font', selectBox({ options: fontOptions(), value: tx.font, onChange: v => { tx.font = v; chg(true); } })));
  b.append(row('', h('button', { class: 'btn sm', onclick: () => $('#fontIn').click() }, 'Import font'), window.queryLocalFonts ? h('button', { class: 'btn sm', onclick: async () => { await useLocalFonts(); renderInspector(); } }, 'Computer fonts') : null));
  b.append(srow('Weight', [[300, 'Light'], [400, 'Regular'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold'], [900, 'Black']].map(([v, l]) => ({ v, l })), tx.weight, v => { tx.weight = v; chg(true); }));
  b.append(row('Style', checkBox('Italic', tx.italic, v => { tx.italic = v; chg(true); }), checkBox('CAPS', tx.upper, v => { tx.upper = v; chg(true); })));
  b.append(rrow('Size', tx, 'size', { min: 8, max: 600 }), rrow('Letter space', tx, 'ls', { min: -30, max: 120 }), rrow('Line height', tx, 'lh', { min: .6, max: 3, step: .05, dec: 2 }));
  b.append(row('Align', segBox({ options: [{ v: 'left', l: 'Left' }, { v: 'center', l: 'Center' }, { v: 'right', l: 'Right' }], value: tx.align, onChange: v => { tx.align = v; chg(true); } })));
  b.append(rrow('Curve', tx, 'curve', { min: -100, max: 100, center: 0, def: 0 }));
  b.append(grp('Fill', [
    row('Type', segBox({ options: [{ v: 'solid', l: 'Color' }, { v: 'gradient', l: 'Gradient' }], value: tx.fillType, onChange: v => { tx.fillType = v; chg(true); renderInspector(); } })),
    ...(tx.fillType === 'solid' ? [crow('Color', tx, 'color')] : [crow('From', tx, 'g1'), crow('To', tx, 'g2'), rrow('Angle', tx, 'gAng', { min: 0, max: 360, suf: '°' })])
  ]));
  b.append(grp('Outline', tx.stroke.on ? [crow('Color', tx.stroke, 'color'), rrow('Width', tx.stroke, 'w', { min: 1, max: 60 })] : [], { toggle: { get: () => tx.stroke.on, set: v => tx.stroke.on = v } }));
  b.append(grp('Shadow', tx.shadow.on ? [crow('Color', tx.shadow, 'color'), rrow('Blur', tx.shadow, 'blur', { min: 0, max: 100 }), rrow('Offset X', tx.shadow, 'x', { min: -80, max: 80, center: 0 }), rrow('Offset Y', tx.shadow, 'y', { min: -80, max: 80, center: 0 })] : [], { toggle: { get: () => tx.shadow.on, set: v => tx.shadow.on = v } }));
  b.append(grp('Glow', tx.glow.on ? [crow('Color', tx.glow, 'color'), rrow('Size', tx.glow, 'size', { min: 1, max: 120 }), rrow('Strength', tx.glow, 'str', { min: 1, max: 5 })] : [], { toggle: { get: () => tx.glow.on, set: v => tx.glow.on = v } }));
  b.append(grp('Background box', tx.box.on ? [crow('Color', tx.box, 'color'), rrow('Padding', tx.box, 'pad', { min: 0, max: 120 }), rrow('Round corners', tx.box, 'round', { min: 0, max: 120 })] : [], { toggle: { get: () => tx.box.on, set: v => tx.box.on = v } }));
}
/* ---------- sticker ---------- */
function insSticker(b, c) {
  const s = c.sticker, d = STK_BY[s.id] || {};
  b.append(crow('Line color', s, 'c1'), crow(d.cat === 'Shapes' ? 'Fill color' : 'Second color', s, 'c2'));
  if (d.cat === 'Shapes') b.append(row('Fill', checkBox('Fill the shape', s.fill, v => { s.fill = v; chg(true); })));
  b.append(rrow('Line width', s, 'sw', { min: 2, max: 60 }));
  if (d.txt != null) {
    const ta = h('textarea', { class: 'txt', style: { height: '54px' } }); ta.value = s.txt || '';
    ta.addEventListener('input', () => { s.txt = ta.value; chg(false); }); ta.addEventListener('change', () => chg(true)); ta.addEventListener('keydown', e => e.stopPropagation());
    b.append(row('Label', ta), crow('Label color', s, 'tc'), row('Label font', selectBox({ options: fontOptions(), value: s.font || 'system-ui, sans-serif', onChange: v => { s.font = v; chg(true); } })));
  }
  if (!d.anim) b.append(rrow('Draw-on time', s, 'drawOn', { min: 0, max: 5, step: .05, dec: 2, suf: 's' }), h('div', { class: 'hint' }, 'How long the line takes to draw itself. 0 shows it at once.'));
  else b.append(rrow('Speed', s, 'speed', { min: .1, max: 5, step: .1, dec: 1, suf: 'x' }));
  b.append(row('Hand-drawn', h('button', { class: 'btn sm', onclick: () => { s.seed = (Math.random() * 1000) | 0; chg(true); } }, 'Redraw the line')));
}

/* ---------- keyframes + curve editor + speed multiplier ---------- */
const KP_LABEL = { all: 'All properties', x: 'Position X', y: 'Position Y', scale: 'Scale', rot: 'Rotation', opacity: 'Opacity' };
let KPROP = 'all';
function openKeyPanel(show) { RTAB = 'clip'; KEYJUMP = true; renderInspector(); if (show && isMob()) openSheet('right'); }
function currentKeyTime(c) {
  const lt = clamp(T - c.start, 0, c.dur);
  if (SELKF && clipKeyTimes(c).some(t => Math.abs(t - SELKF.t) < 1e-4)) return SELKF.t;
  const ts = clipKeyTimes(c), tt = ts.find(t => Math.abs(t - lt) <= 0.5 / P.fps);
  if (tt != null) return tt;
  // between two keyframes: show the settings for that gap (they live on the keyframe before it)
  const prev = ts.filter(t => t < lt).pop();
  return prev != null && ts.some(t => t > lt) ? prev : null;
}
function keysAtTime(c, t) {
  const out = [];
  for (const p of KPROP === 'all' ? KF_PROPS : [KPROP]) { const i = (c.kf[p] || []).findIndex(k => Math.abs(k.t - t) < 1e-4); if (i >= 0) out.push({ p, k: c.kf[p][i], i, last: i === c.kf[p].length - 1 }); }
  return out;
}
function insKeys(b, c) {
  const times = clipKeyTimes(c);
  b.append(h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } },
    h('button', { class: 'btn sm', html: icon('chevl'), title: 'Previous keyframe', onclick: () => { const lt = T - c.start; const p = times.filter(t => t < lt - 1e-4).pop(); if (p != null) { SELKF = { t: p }; seek(c.start + p); refreshAll(); } } }),
    h('button', { class: 'btn sm pri', html: icon('key') + ' Keyframe here', onclick: opKey }),
    h('button', { class: 'btn sm', html: icon('chevr'), title: 'Next keyframe', onclick: () => { const lt = T - c.start; const p = times.find(t => t > lt + 1e-4); if (p != null) { SELKF = { t: p }; seek(c.start + p); refreshAll(); } } })));
  if (!times.length) { b.append(h('div', { class: 'note' }, 'No keyframes yet. Move the playhead, then tap “Keyframe here”, or tap the diamond next to Position, Scale, Rotation or Opacity above. Change the value at another time and a new keyframe is made for you.')); return; }
  const kt = currentKeyTime(c);
  b.append(h('div', { class: 'note', style: { marginBottom: '8px' } }, `${times.length} keyframe time${times.length > 1 ? 's' : ''} on this clip.` + (kt == null ? ' Move the playhead onto a keyframe (or tap a diamond on the clip) to edit it.' : '')));
  if (kt == null) return;
  SELKF = { t: kt };
  b.append(srow('Edit', Object.keys(KP_LABEL).filter(p => p === 'all' || (c.kf[p] && c.kf[p].length)).map(p => ({ v: p, l: KP_LABEL[p] })), KPROP, v => { KPROP = v; renderInspector(); }));
  const ks = keysAtTime(c, kt);
  if (!ks.length) { b.append(h('div', { class: 'hint' }, 'That property has no keyframe at this time.')); return; }
  b.append(h('div', { class: 'hint' }, `Keyframe at ${fmtTime(kt, P.fps)} (clip time ${round(kt, 3)}s)`));
  // values
  const valBox = h('div');
  for (const { p, k } of ks) {
    const u = PROP_UI[p], mul = u.mul || 1;
    valBox.append(row(u.l, numField({ value: k.v * mul, min: u.min, max: u.max, dec: u.dec, suf: u.suf, onInput: (v, f) => { k.v = p === 'rot' ? clamp(v / mul, -MAX_ROT, MAX_ROT) : v / mul; chg(f); if (f) refreshInspectorValues(); } })));
    if (p === 'rot') valBox.append(row('Turns', numField({ value: k.v / 360, dec: 4, min: -99999, max: 99999, suf: 'turns', onInput: (v, f) => { k.v = clamp(v * 360, -MAX_ROT, MAX_ROT); chg(f); if (f) renderInspector(); } })));
  }
  // motion settings always show: on the last keyframe they are the ones for the stretch coming into it
  let seg = ks.filter(x => !x.last), into = false;
  if (!seg.length) { seg = ks.filter(x => x.i > 0).map(x => ({ p: x.p, k: c.kf[x.p][x.i - 1], i: x.i - 1, last: false })); into = true; }
  if (!seg.length) { b.append(h('div', { class: 'note', style: { marginTop: '10px' } }, 'Add a second keyframe and the motion settings (Regular / Smooth / Choppy, speed, Loop) show here.')); }
  else {
    const k0 = seg[0].k;
    const all = fn => { for (const x of seg) fn(x.k); };
    const nextT = Math.min(...seg.map(x => c.kf[x.p][x.i + 1].t)), segT = seg[0].k.t;
    b.append(h('div', { class: 'hint', style: { marginTop: '12px' } }, into ? `This is the last keyframe. Settings below shape the motion coming into it from the keyframe before (${round(nextT - segT, 3)}s).` : `Settings below shape the motion from this keyframe to the next one (${round(nextT - kt, 3)}s later).`));
    const g = h('div', { class: 'grp' }, h('h4', null, 'Interpolation'));
    g.append(row('Mode', segBox({ options: [{ v: 'linear', l: 'Regular' }, { v: 'smooth', l: 'Smooth' }, { v: 'hold', l: 'Choppy' }], value: k0.mode, onChange: v => { all(k => k.mode = v); chg(true); renderInspector(); } })));
    { const sk = spKey(k0.mode); k0.sp = k0.sp || {}; if (!k0.sp[sk]) k0.sp[sk] = JSON.parse(JSON.stringify(SP_DEFAULT[sk]));
      g.append(speedEditor(k0.sp[sk], k0.mode === 'smooth', (pts, f) => { all(k => { k.sp = k.sp || {}; k.sp[sk] = JSON.parse(JSON.stringify(pts)); }); chg(f); drawMotion(); })); }
    if (k0.mode === 'hold') g.append(nrow('Steps', { value: k0.steps || 1, min: 1, max: 240, dec: 0, onInput: (v, f) => { all(k => k.steps = Math.round(v)); chg(f); drawMotion(); } }), h('div', { class: 'hint' }, '1 holds the value, then jumps at the next keyframe. More steps give a choppy, stepped move.'));
    b.append(g);
    // fixed-window speed multiplier
    const g2 = h('div', { class: 'grp' }, h('h4', null, 'Animation speed', h('small', null, ' keyframes stay where they are')));
    const spd = numField({ value: k0.speed == null ? 1 : k0.speed, min: 0, max: 99999, dec: 4, suf: 'x', step: 0.1, onInput: (v, f) => { all(k => k.speed = v); chg(f); drawMotion(); } });
    g2.append(row('Multiplier', spd));
    g2.append(h('div', { class: 'presets' }, ...[0, 0.25, 0.5, 1, 2, 4, 10, 100, 99999].map(v => h('button', { onclick: () => { all(k => k.speed = v); spd.set(v); chg(true); drawMotion(); } }, v.toLocaleString() + 'x'))));
    g2.append(row('When it ends', segBox({ options: [{ v: 'clamp', l: 'Clamp' }, { v: 'loop', l: 'Loop' }, { v: 'pingpong', l: 'Ping-Pong' }], value: k0.over || 'clamp', onChange: v => { all(k => k.over = v); chg(true); drawMotion(); } })));
    g2.append(h('div', { class: 'hint' }, '0x freezes on this keyframe. 0.5x gets halfway. Above 1x the move finishes early, then Clamp holds the end, Loop starts again, and Ping-Pong goes back and forth, all inside the same time window.'));
    const mot = h('canvas', { class: 'motion' }); g2.append(mot);
    const drawMotion = () => drawMotionGraph(mot, k0, segT, nextT);
    requestAnimationFrame(drawMotion);
    b.append(g2);
  }
  b.append(grp('Keyframe value', [valBox]));
  b.append(h('div', { style: { display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' } },
    h('button', { class: 'btn sm', html: icon('trash') + ' Delete keyframe', onclick: () => { for (const x of ks) { const v = x.k.v; c.kf[x.p].splice(c.kf[x.p].indexOf(x.k), 1); if (!c.kf[x.p].length) c.tf[x.p] = v; } SELKF = null; chg(true); refreshAll(); } }),
    seg.length ? h('button', { class: 'btn sm', onclick: () => { const src = seg[0].k; for (const p of KF_PROPS) for (const k of c.kf[p]) { copySeg(k, src); } chg(true); toast('Copied to every keyframe on this clip'); } }, 'Use for all keyframes') : null));
}
function curveEditor(k, onChange, bf = 'bez') {
  const box = h('div', { class: 'curve' }), cv = h('canvas'); box.append(cv);
  const wrap = h('div', null, box);
  const pre = h('div', { class: 'presets' });
  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-3);
  const mkPre = () => { pre.innerHTML = ''; for (const e of EASE_PRESETS) pre.append(h('button', { class: same(e.b, k[bf]) ? 'on' : '', onclick: () => { k[bf] = e.b.slice(); onChange(k[bf], true); draw(); mkPre(); } }, e.n)); };
  mkPre();
  const fields = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '6px' } });
  const nfs = [0, 1, 2, 3].map(i => numField({ value: k[bf][i], dec: 3, min: i % 2 ? -2 : 0, max: i % 2 ? 3 : 1, step: .01, onInput: (v, f) => { k[bf][i] = v; onChange(k[bf], f); draw(); if (f) mkPre(); } }));
  fields.append(...nfs);
  wrap.append(fields, pre);
  const Y0 = -0.6, Y1 = 1.6, M = 14;
  let W = 0, H = 0, dpr = 1;
  const toPx = (x, y) => [M + x * (W - 2 * M), H - M - (y - Y0) / (Y1 - Y0) * (H - 2 * M)];
  const fromPx = (px, py) => [clamp((px - M) / (W - 2 * M), 0, 1), clamp(Y0 + (H - M - py) / (H - 2 * M) * (Y1 - Y0), -2, 3)];
  function draw() {
    const r = box.getBoundingClientRect(); if (!r.width) return;
    dpr = devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, W, H);
    x.strokeStyle = '#2b2d33'; x.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const [gx] = toPx(i / 4, 0); x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (const yv of [0, .25, .5, .75, 1]) { const [, gy] = toPx(0, yv); x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    x.strokeStyle = '#4a4d55'; const [ax, ay] = toPx(0, 0), [bx, by] = toPx(1, 1);
    x.setLineDash([4, 4]); x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); x.setLineDash([]);
    const [p1x, p1y] = toPx(k[bf][0], k[bf][1]), [p2x, p2y] = toPx(k[bf][2], k[bf][3]);
    x.strokeStyle = '#8d919a'; x.beginPath(); x.moveTo(ax, ay); x.lineTo(p1x, p1y); x.moveTo(bx, by); x.lineTo(p2x, p2y); x.stroke();
    x.strokeStyle = '#3fd6c0'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(ax, ay); x.bezierCurveTo(p1x, p1y, p2x, p2y, bx, by); x.stroke();
    for (const [px, py] of [[p1x, p1y], [p2x, p2y]]) { x.fillStyle = '#e4e5e8'; x.fillRect(px - 5, py - 5, 10, 10); x.strokeStyle = '#000'; x.lineWidth = 1; x.strokeRect(px - 5, py - 5, 10, 10); }
    x.fillStyle = '#62666e'; x.font = '10px system-ui'; x.fillText('time →', W - 46, H - 3); x.save(); x.translate(10, 40); x.rotate(-Math.PI / 2); x.fillText('value →', -30, 0); x.restore();
    nfs.forEach((n, i) => n.set(k[bf][i]));
  }
  box.addEventListener('pointerdown', e => {
    e.preventDefault(); box.setPointerCapture(e.pointerId);
    const r = box.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const [p1x, p1y] = toPx(k[bf][0], k[bf][1]), [p2x, p2y] = toPx(k[bf][2], k[bf][3]);
    const which = Math.hypot(px - p1x, py - p1y) < Math.hypot(px - p2x, py - p2y) ? 0 : 2;
    const mv = ev => { const [vx, vy] = fromPx(ev.clientX - r.left, ev.clientY - r.top); k[bf][which] = round(vx, 3); k[bf][which + 1] = round(vy, 3); onChange(k[bf], false); draw(); };
    mv(e);
    const up = () => { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); onChange(k[bf], true); mkPre(); };
    box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up);
  });
  requestAnimationFrame(draw);
  new ResizeObserver(draw).observe(box);
  return wrap;
}
/* speed graph: time left to right, speed up and down. The dashed line is normal (1x). Three points: start, middle (moves both ways), end. */
const SP_MAX = 5;
const SP_PRESETS = [{ n: 'Normal', p: [[0, 1], [0.5, 1], [1, 1]] }, { n: 'Speed up', p: [[0, 0], [0.5, 1], [1, 2]] }, { n: 'Slow down', p: [[0, 2], [0.5, 1], [1, 0]] }, { n: 'Slow - fast - slow', p: [[0, 0], [0.5, 2], [1, 0]] }, { n: 'Fast - slow - fast', p: [[0, 2], [0.5, 0], [1, 2]] }];
function speedEditor(pts, smooth, onChange) {
  const box = h('div', { class: 'curve speedg' }), cv = h('canvas'); box.append(cv);
  const info = h('div', { class: 'hint' });
  const pre = h('div', { class: 'presets' });
  const same = a => a.every((q, i) => Math.abs(q[0] - pts[i][0]) < 1e-3 && Math.abs(q[1] - pts[i][1]) < 1e-3);
  const mkPre = () => { pre.innerHTML = ''; for (const e of SP_PRESETS) pre.append(h('button', { class: same(e.p) ? 'on' : '', onclick: () => { e.p.forEach((q, i) => { pts[i][0] = q[0]; pts[i][1] = q[1]; }); onChange(pts, true); draw(); mkPre(); } }, e.n)); };
  const wrap = h('div', null, box, info, pre);
  const M = 16, ML = 34; let W = 0, H = 0;
  const toPx = (x, y) => [ML + x * (W - ML - M), H - M - y / SP_MAX * (H - 2 * M)];
  const fromPx = (px, py) => [clamp((px - ML) / (W - ML - M), 0, 1), clamp((H - M - py) / (H - 2 * M) * SP_MAX, 0, SP_MAX)];
  function draw() {
    const r = box.getBoundingClientRect(); if (!r.width) return;
    const dpr = devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, W, H);
    x.font = '11px system-ui'; x.textBaseline = 'middle';
    for (let s = 0; s <= SP_MAX; s++) { const [, gy] = toPx(0, s); x.strokeStyle = '#2b2d33'; x.lineWidth = 1; x.beginPath(); x.moveTo(ML, gy); x.lineTo(W - M, gy); x.stroke(); x.fillStyle = s === 1 ? '#c9ccd2' : '#62666e'; x.fillText(s + 'x', 6, gy); }
    const [, ny] = toPx(0, 1); x.strokeStyle = '#8d919a'; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(ML, ny); x.lineTo(W - M, ny); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#8d919a'; x.fillText('normal', W - M - 40, ny - 9);
    // area under the line (how far it gets)
    x.beginPath(); const N = 160; for (let i = 0; i <= N; i++) { const [px, py] = toPx(i / N, spVal(pts, smooth, i / N)); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    const path = new Path2D(); for (let i = 0; i <= N; i++) { const [px, py] = toPx(i / N, spVal(pts, smooth, i / N)); i ? path.lineTo(px, py) : path.moveTo(px, py); }
    const fill = new Path2D(path); const [ex, ey0] = toPx(1, 0), [sx] = toPx(0, 0); fill.lineTo(ex, ey0); fill.lineTo(sx, ey0); fill.closePath();
    x.fillStyle = 'rgba(63,214,192,.12)'; x.fill(fill);
    x.strokeStyle = '#3fd6c0'; x.lineWidth = 2.4; x.stroke(path);
    pts.forEach((q, i) => { const [px, py] = toPx(q[0], q[1]); x.fillStyle = i === 1 ? '#3fd6c0' : '#e4e5e8'; x.fillRect(px - 7, py - 7, 14, 14); x.strokeStyle = '#000'; x.lineWidth = 1; x.strokeRect(px - 7, py - 7, 14, 14); x.fillStyle = '#e4e5e8'; x.fillText(round(q[1], 2) + 'x', clamp(px - 12, ML, W - 40), py < 24 ? py + 18 : py - 16); });
    x.fillStyle = '#62666e'; x.fillText('time →', W - M - 42, H - 7);
    info.textContent = 'Up = faster, down = slower. It always lands exactly on the next keyframe.';
  }
  box.addEventListener('pointerdown', e => {
    e.preventDefault(); box.setPointerCapture(e.pointerId);
    const r = box.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let which = 0, best = 1e9; pts.forEach((q, i) => { const [qx, qy] = toPx(q[0], q[1]); const d = Math.hypot(px - qx, py - qy); if (d < best) { best = d; which = i; } });
    const mv = ev => { const [vx, vy] = fromPx(ev.clientX - r.left, ev.clientY - r.top); pts[which][1] = round(vy, 2); if (which === 1) pts[1][0] = round(clamp(vx, 0.05, 0.95), 3); onChange(pts, false); draw(); };
    mv(e);
    const up = () => { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); onChange(pts, true); mkPre(); };
    box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up);
  });
  mkPre();
  new ResizeObserver(() => draw()).observe(box); requestAnimationFrame(draw);
  return wrap;
}
function drawMotionGraph(cv, k, t0, t1) {
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  const dpr = devicePixelRatio || 1, W = r.width, H = r.height; cv.width = W * dpr; cv.height = H * dpr;
  const x = cv.getContext('2d'); x.scale(dpr, dpr);
  x.fillStyle = '#62666e'; x.font = '10px system-ui'; x.fillText('motion between the two keyframes', 6, 12);
  const M = 8, top = 18, bot = H - 8;
  let lo = 0, hi = 1; const N = Math.min(2000, Math.floor(W * 2));
  const vals = []; for (let i = 0; i <= N; i++) { const v = segProgress(k, i / N); vals.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const Y = v => bot - (v - lo) / Math.max(1e-6, hi - lo) * (bot - top);
  x.strokeStyle = '#2b2d33'; x.beginPath(); x.moveTo(M, Y(0)); x.lineTo(W - M, Y(0)); x.moveTo(M, Y(1)); x.lineTo(W - M, Y(1)); x.stroke();
  x.strokeStyle = '#3fd6c0'; x.lineWidth = 1.6; x.beginPath();
  vals.forEach((v, i) => { const px = M + i / N * (W - 2 * M); i ? x.lineTo(px, Y(v)) : x.moveTo(px, Y(v)); }); x.stroke();
  // playhead position inside the window
  const c = selClip(); if (c) { const lt = T - c.start; if (lt >= t0 && lt <= t1) { const px = M + (lt - t0) / (t1 - t0) * (W - 2 * M); x.strokeStyle = '#fff'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, top); x.lineTo(px, bot); x.stroke(); } }
}
