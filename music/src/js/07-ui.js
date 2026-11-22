/* ================= app frame: icons, top bar, panel tabs, menus ================= */
const ICONS = {
  menu: 'M4 7h16M4 12h16M4 17h16', undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  play: '<path class="f" d="M7 4.5v15l13-7.5z"/>', stop: '<path class="f" d="M6 6h12v12H6z"/>', rec: '<circle class="f" cx="12" cy="12" r="6.5"/>',
  start: '<path class="f" d="M18 5v14L8 12zM6 5h2v14H6z"/>', loop: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  metro: 'M9 3h6l4 18H5zM12 17l5-11M8 14h8', export: 'M12 3v12M7 10l5 5 5-5M4 20h16', plus: 'M12 5v14M5 12h14',
  cut: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12',
  dup: 'M8 8h12v12H8zM4 16V4h12', copy: 'M8 8h12v12H8zM4 16V4h12', paste: 'M9 4h6v3H9zM7 5H5v16h14V5h-2', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  zin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6M11 8v6', zout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  max: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', min: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3', sel: 'M4 4h4M12 4h4M20 4v4M20 12v4M20 20h-4M12 20H8M4 20v-4M4 12V8', erase: 'M15 4l5 5-10 10H6l-3-3zM9 10l5 5M11 20h9', hand: 'M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7c-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L8 13',
  keys: 'M3 5h18v14H3zM8 5v9M12 5v9M16 5v9M7 14h2M11 14h2M15 14h2', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M8 21h8',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16', wave: 'M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2', sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', drum: 'M4 8c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3zM4 8v8c0 2 3.6 3 8 3s8-1 8-3V8M3 3l6 6M21 3l-6 6',
  mix: 'M6 4v16M12 4v16M18 4v16M4 14h4M10 8h4M16 16h4', fx: 'M4 18c4 0 4-12 8-12s4 12 8 12', inst: 'M5 3h14v18H5zM9 3v10M15 3v10M9 13h6',
  close: 'M6 6l12 12M18 6 6 18', check: 'M5 12l5 5 9-10', chord: 'M6 6h4v4H6zM6 14h4v4H6zM14 10h4v4h-4z', quant: 'M4 4v16M10 4v16M16 4v16M20 8l-4 4 4 4',
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', reverse: 'M20 7H6l4-4M6 7l4 4M4 17h14l-4-4M18 17l-4 4', speaker: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11', folder: 'M3 6h6l2 2h10v11H3z', save: 'M5 3h12l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7', file: 'M6 3h9l4 4v14H6zM14 3v5h5'
};
function icon(n, cls = 'i') { const d = ICONS[n] || ''; return `<svg class="${cls}" viewBox="0 0 24 24">${d.startsWith('<') ? d : `<path d="${d}"/>`}</svg>`; }
function fillIcons(root = document) { for (const e of $$('[data-i]', root)) { if (e.dataset.iDone) continue; e.dataset.iDone = 1; e.insertAdjacentHTML('afterbegin', icon(e.dataset.i)); } }
function tbtn(i, title, onclick, label, cls = 'tb') { const b = h('button', { class: cls, title, onclick }); b.innerHTML = icon(i) + (label ? `<span>${label}</span>` : ''); return b; }
function msgBox(title, text) { modal(title, h('div', { class: 'note', style: { color: 'var(--tx)', fontSize: '13px' } }, text), [{ l: 'OK', pri: 1 }]); }
function menu(anchor, items) {
  const list = h('div');
  for (const it of items) {
    if (it === '-') { list.append(h('hr')); continue; }
    if (it.g) { list.append(h('div', { class: 'gh' }, it.g)); continue; }
    list.append(h('div', { class: 'opt' + (it.dis ? ' dis' : '') + (it.on ? ' on' : ''), onclick: () => { closePop(); it.f(); } }, it.l, it.k ? h('small', null, it.k) : null));
  }
  openPop(anchor, list);
}

/* ---------- editor (shared settings) ---------- */
const Ed = { snap: 0.25, tab: 'edit', max: false, kbd: false, tool: 'draw', len: 0.5, vel: 0.8, chord: 'none', arrSnap: 1, zoom: 48, sx: 0, sy: 0 };

/* ---------- top bar ---------- */
let bpmField;
function buildTop() {
  fillIcons($('#top'));
  $('#bMenu').onclick = e => fileMenu(e.currentTarget);
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bPlay').onclick = toggle;
  $('#bStart').onclick = () => seek(song.loop.on ? song.loop.a : 0);
  $('#bRec').onclick = () => {
    const tr = selTrack();
    if (Mic.on) { Mic.stop(); stop(false); return; }
    if (T.rec) { flushRec(); return; }
    if (tr && tr.kind === 'audio') { Mic.start(); return; }
    T.rec = true; if (!T.playing) play(); updTransport();
    if (!Ed.kbd && tr) { Ed.kbd = true; if (Ed.tab !== 'edit') setTab('edit'); else renderPanel(); }
  };
  $('#bLoop').onclick = () => { song.loop.on = !song.loop.on; if (song.loop.b <= song.loop.a) song.loop.b = song.loop.a + song.sig * 4; commit(); updTransport(); drawAll(); };
  $('#bMetro').onclick = () => { song.metro = !song.metro; commit(); updTransport(); };
  bpmField = numField({ value: 120, min: 30, max: 300, step: 1, dec: 1, onInput: (v, f) => { song.bpm = v; if (AC) updateBus(AC, song); drawAll(); if (f) commit(); } });
  $('#bpmBox').append(bpmField);
  $('#pname').addEventListener('change', e => { song.name = e.target.value.trim() || 'My song'; commit(); });
  $('#pname').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); });
  $('#bExport').onclick = exportDialog;
  // panel resize
  const sp = $('#split');
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId);
    const H = $('#app').clientHeight;
    const mv = ev => { const r = $('#app').getBoundingClientRect(); const ph = clamp(r.bottom - ev.clientY, 120, H - 140); document.documentElement.style.setProperty('--ed', ph + 'px'); resizeAll(); };
    const up = () => { sp.removeEventListener('pointermove', mv); sp.removeEventListener('pointerup', up); };
    sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up);
  });
}
function updTransport() {
  $('#bPlay').innerHTML = icon(T.playing ? 'stop' : 'play');
  $('#bRec').classList.toggle('on', T.rec || Mic.on);
  $('#bLoop').classList.toggle('on', song.loop.on);
  $('#bMetro').classList.toggle('on', song.metro);
}
function fmtPos(b) { const bar = Math.floor(b / song.sig) + 1, beat = Math.floor(b % song.sig) + 1, six = Math.floor((b % 1) * 4) + 1; return bar + '.' + beat + '.' + six; }
let lastClock = '';
function frame() {
  const b = AC ? beatNow() : T.pos;
  const s = fmtPos(b); if (s !== lastClock) { $('#clock').textContent = s; lastClock = s; }
  if (T.playing) { followPlayhead(b); drawTimeline(); drawEditorHead && drawEditorHead(); }
  if (Ed.tab === 'mixer') meters();
  requestAnimationFrame(frame);
}

/* ---------- File menu ---------- */
function fileMenu(a) {
  menu(a, [
    { l: 'New song', f: async () => { if (!(await confirmBox('Start a new song? This one stays saved on this device.'))) return; await saveNow(); loadSong(starterSong()); } },
    { l: 'Open song…', f: openSongs },
    { l: 'Duplicate song', f: () => { const s = JSON.parse(JSON.stringify(song)); s.id = uid(); s.name = song.name + ' copy'; loadSong(s); toast('Made a copy'); } },
    '-',
    { l: 'Song settings…', f: songSettings },
    '-',
    { l: 'Export audio…', f: exportDialog },
    { l: 'Save song file (.nmusic)', f: saveProjectFile },
    { l: 'Open song file…', f: () => $('#projIn').click() },
    '-',
    { l: 'Import sound…', f: () => $('#fileIn').click() }
  ]);
}
async function openSongs() {
  await saveNow();
  let all = []; try { all = await DB.all('songs'); } catch (e) { }
  all.sort((a, b) => b.updated - a.updated);
  const list = h('div', { class: 'slist' });
  const m = modal('Your songs', list, [], { width: 460 });
  for (const s of all) {
    const del = tbtn('trash', 'Delete', async e => { e.stopPropagation(); if (s.id === song.id) { toast('This song is open'); return; } if (!(await confirmBox('Delete "' + s.name + '"? This cannot be undone.', 'Delete'))) return; await DB.del('songs', s.id); it.remove(); });
    const it = h('div', { class: 'si', style: { cursor: 'pointer' }, onclick: () => { m.close(); loadSong(s); } }, h('div', { class: 'inf' }, h('b', null, s.name + (s.id === song.id ? '  (open)' : '')), h('small', null, new Date(s.updated).toLocaleString() + ' · ' + s.tracks.length + ' tracks')), del);
    list.append(it);
  }
  if (!all.length) list.append(h('div', { class: 'note' }, 'No saved songs yet.'));
}
function songSettings() {
  const b = h('div');
  b.append(row('Name', h('input', { class: 'txt', value: song.name, onchange: e => { song.name = e.target.value || 'My song'; $('#pname').value = song.name; commit(); }, onkeydown: e => e.stopPropagation() })));
  b.append(row('Beats per bar', segBox({ value: song.sig, options: [2, 3, 4, 5, 6, 7].map(v => ({ v, l: String(v) })), onChange: v => { song.sig = v; commit(); drawAll(); } })));
  b.append(row('Key', selectBox({ value: song.key, options: NOTE_NAMES.map((n, i) => ({ v: i, l: n })), onChange: v => { song.key = v; commit(); drawAll(); } })));
  b.append(row('Scale', selectBox({ value: song.scale, options: Object.keys(SCALES).map(k => ({ v: k, l: SCALES[k].n })), onChange: v => { song.scale = v; commit(); drawAll(); } })));
  b.append(h('div', { class: 'note', style: { marginTop: '6px' } }, 'The key and scale light up the right notes in the piano roll.'));
  modal('Song settings', b, [{ l: 'Done', pri: 1 }]);
}
const SCALES = {
  none: { n: 'Any notes', s: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, major: { n: 'Major', s: [0, 2, 4, 5, 7, 9, 11] }, minor: { n: 'Minor', s: [0, 2, 3, 5, 7, 8, 10] },
  harm: { n: 'Harmonic minor', s: [0, 2, 3, 5, 7, 8, 11] }, dorian: { n: 'Dorian', s: [0, 2, 3, 5, 7, 9, 10] }, mixo: { n: 'Mixolydian', s: [0, 2, 4, 5, 7, 9, 10] },
  phryg: { n: 'Phrygian', s: [0, 1, 3, 5, 7, 8, 10] }, lyd: { n: 'Lydian', s: [0, 2, 4, 6, 7, 9, 11] }, pmaj: { n: 'Major pentatonic', s: [0, 2, 4, 7, 9] },
  pmin: { n: 'Minor pentatonic', s: [0, 3, 5, 7, 10] }, blues: { n: 'Blues', s: [0, 3, 5, 6, 7, 10] }, hijaz: { n: 'Hijaz', s: [0, 1, 4, 5, 7, 8, 10] }
};
const inScale = m => SCALES[song.scale || 'none'].s.includes(((m - song.key) % 12 + 12) % 12);

/* ---------- panel tabs ---------- */
const TABS = [['edit', 'Edit', 'pen'], ['inst', 'Instrument', 'inst'], ['fx', 'Track effects', 'fx'], ['mixer', 'Mixer', 'mix'], ['sounds', 'Sounds', 'wave']];
function buildTabs() {
  const pt = $('#ptabs'); pt.innerHTML = '';
  for (const [id, l, i] of TABS) { const b = h('button', { onclick: () => setTab(id) }); b.innerHTML = icon(i) + `<span>${l}</span>`; b.dataset.t = id; pt.append(b); }
  pt.append(h('div', { class: 'sp' }));
  const mx = h('button', { id: 'maxBtn', title: 'Bigger editor', onclick: () => setMax(!Ed.max) }); mx.innerHTML = icon(Ed.max ? 'min' : 'max');
  pt.append(mx);
}
function setTab(t) { Ed.tab = t; renderPanel(); }
function setMax(v) { Ed.max = v; $('#app').classList.toggle('max', v); const mx = $('#maxBtn'); if (mx) mx.innerHTML = icon(v ? 'min' : 'max'); resizeAll(); }
/* on a phone the note editor turns the screen sideways and fills it, so all the keys fit */
const isPhone = () => Math.min(innerWidth, innerHeight) <= 520 && matchMedia('(pointer:coarse)').matches;
let landOn = false, landFs = false;
function noteLand(on) {
  if (on === landOn) return; landOn = on;
  if (on) {
    R.kh = Math.min(R.kh, 11); setMax(true);
    const de = document.documentElement, fs = document.fullscreenElement ? Promise.resolve() : de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }).then(() => { landFs = true; }) : Promise.reject();
    fs.then(() => screen.orientation.lock('landscape')).catch(() => { }).then(() => setTimeout(() => { if (landOn && innerHeight > innerWidth) toast('Turn your phone sideways to see more keys'); }, 700));
  } else {
    setMax(false); try { screen.orientation.unlock(); } catch (e) { }
    if (landFs && document.fullscreenElement) document.exitFullscreen().catch(() => { }); landFs = false;
  }
}
function renderPanel() {
  $$('#ptabs button[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === Ed.tab));
  const c = selClip(), tr = selTrack();
  const lab = $('#ptabs button[data-t=edit] span'); if (lab) lab.textContent = c ? (c.sid ? 'Audio' : tr && tr.kind === 'drum' ? 'Drums' : 'Notes') : 'Edit';
  const pb = $('#pbody'); pb.innerHTML = ''; drawEditorHead = null;
  if (Ed.tab === 'edit') { if (c && c.sid) audioEditor(pb, c); else if (c) noteEditor(pb, c); else pb.append(h('div', { class: 'empty' }, h('div', null, tr ? (tr.kind === 'audio' ? 'Pick an audio clip to cut and edit it, or record or add a sound.' : 'Pick a clip to edit its notes, or make a new one.') : 'Add a track to begin.'), tr && tr.kind !== 'audio' ? h('button', { class: 'btn pri', onclick: () => newClip() }, 'New clip') : null, tr && tr.kind !== 'audio' ? h('button', { class: 'btn', onclick: () => { Ed.kbd = !Ed.kbd; renderPanel(); } }, Ed.kbd ? 'Hide keyboard' : 'Play the keyboard') : null), ); if (tr && tr.kind !== 'audio' && Ed.kbd) pb.append(keyboardEl());
  }
  else if (Ed.tab === 'inst') instPanel(pb);
  else if (Ed.tab === 'fx') fxPanel(pb);
  else if (Ed.tab === 'mixer') mixerPanel(pb);
  else if (Ed.tab === 'sounds') soundsPanel(pb);
  if (isPhone()) noteLand(!!(Ed.tab === 'edit' && c && !c.sid));
}
let drawEditorHead = null;
function resizeAll() { sizeTimeline(); drawAll(); if (typeof resizeEditor === 'function') resizeEditor(); }
function drawAll() { renderHeads(); drawTimeline(); if (typeof redrawEditor === 'function') redrawEditor(); }
function afterSongChange() {
  $('#pname').value = song.name; bpmField.set(song.bpm);
  if (AC) { updateBus(AC, song); for (const t of song.tracks) { strip(AC, t); updateStrip(AC, t); } }
  updTransport(); renderPanel(); drawAll();
}
