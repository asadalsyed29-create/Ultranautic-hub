/* ================= start-up ================= */
const APP_VER = 1;
function starterSong() {
  song = newSong();
  song.tracks.push(newTrack('inst', 'piano.0'), newTrack('drum', 'drums.0'), newTrack('inst', 'bass.0'));
  return song;
}
function loadSong(s) {
  if (T.playing) stop(false);
  song = s;
  for (const t of song.tracks) { t.fx = Object.assign(defFx(), t.fx || {}); }
  song.fx = Object.assign({ revType: 'hall', revLvl: 1, delTime: '1/8.', delFb: 0.35, glue: true }, song.fx || {});
  Sel.track = song.tracks[0] && song.tracks[0].id; Sel.clip = null; Sel.notes.clear();
  T.pos = 0; Ed.sx = 0; Ed.sy = 0;
  if (AC) { const bus = BUS.get(AC); for (const [, st] of bus.strips) try { st.mute.disconnect(); } catch (e) { } bus.strips.clear(); }
  afterSongChange(); resetHistory(); saveNow();
  if (AC) preloadSong();
}
const KEYMAP = 'awsedftgyhujkolp;\''; // computer keys as piano keys, from C
function keys() {
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); dupClip(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); return; }
    if (k === 'delete' || k === 'backspace') { const c = selClip(); if (c && c.notes && Sel.notes.size && Ed.tab === 'edit') { c.notes = c.notes.filter(n => !Sel.notes.has(n)); Sel.notes.clear(); commit(); drawAll(); } else delClip(); return; }
    if (k === 'z') { KB.oct = Math.max(0, KB.oct - 1); if (KB.draw) KB.draw(); return; }
    if (k === 'x') { KB.oct = Math.min(8, KB.oct + 1); if (KB.draw) KB.draw(); return; }
    const i = KEYMAP.indexOf(k);
    if (i >= 0 && !e.repeat) { const tr = selTrack(); if (!tr) return; const m = tr.kind === 'drum' ? DRUM_NOTES[i % DRUM_NOTES.length] : (KB.oct + 1) * 12 + i; liveOn(m, Ed.vel, 'ck' + k); }
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (KEYMAP.includes(k)) liveOff('ck' + k); });
}
async function init() {
  buildTop(); buildArr(); buildTabs();
  let s = null;
  try { const last = await DB.get('meta', 'last'); if (last) s = await DB.get('songs', last); } catch (e) { }
  await Sounds.loadAll();
  song = s || starterSong();
  loadSong(song);
  sizeTimeline(); drawAll();
  keys(); initMidi();
  $('#fileIn').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) await importFiles(fs); });
  $('#projIn').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) openProjectFile(f); });
  // drop files onto the app
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', async e => { e.preventDefault(); const fs = [...e.dataTransfer.files]; if (fs.some(f => f.name.endsWith('.nmusic'))) openProjectFile(fs.find(f => f.name.endsWith('.nmusic'))); else if (fs.length) { const s = await importFiles(fs); if (s) addSoundToSong(s); } });
  // sound can only start after a touch
  addEventListener('pointerdown', () => { ensureAudio(); preloadSong(); }, { once: true, capture: true });
  addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
init();
