/* ================= wiring ================= */
let zoomSlider = null, EXPORTING = false;
function refreshAll() {
  if (SEL && !findClip(SEL)) { SEL = null; SELKF = null; }
  renderTimeline(); renderInspector(); updToolState(); requestRender();
  if (['trans', 'adjust', 'effects', 'filters'].includes(LTAB)) renderLeft();
}
function isMob() { return innerWidth <= 1000 || innerHeight <= 560; }
function openSheet(which) {
  $('#left').classList.toggle('open', which === 'left'); $('#right').classList.toggle('open', which === 'right');
  updMobBar();
}
function closeSheets() { $('#left').classList.remove('open'); $('#right').classList.remove('open'); updMobBar(); }
const MOB = [['media', 'Media', 'media'], ['audio', 'Audio', 'audio'], ['text', 'Text', 'text'], ['stickers', 'Stickers', 'sticker'], ['effects', 'Effects', 'effect'], ['trans', 'Transitions', 'transition'], ['filters', 'Filters', 'filter'], ['adjust', 'Adjust', 'adjust'], ['edit', 'Edit', 'edit']];
function renderMobBar() {
  const b = $('#mobbar'); b.innerHTML = '';
  for (const [id, n, i] of MOB) b.append(h('button', { 'data-m': id, html: icon(i), onclick: () => {
    if (id === 'edit') { if ($('#right').classList.contains('open')) closeSheets(); else { renderInspector(); openSheet('right'); } return; }
    if ($('#left').classList.contains('open') && LTAB === id) { closeSheets(); return; }
    LTAB = id; renderLeftTabs(); renderLeft(); openSheet('left');
  } }, n));
  updMobBar();
}
function updMobBar() {
  const lo = $('#left').classList.contains('open'), ro = $('#right').classList.contains('open');
  for (const b of $$('#mobbar button')) b.classList.toggle('on', b.dataset.m === 'edit' ? ro : (lo && b.dataset.m === LTAB));
}
async function restore0() {
  try {
    await restoreFonts();
    const lib = JSON.parse((await dbGet('kv', 'library')) || '[]');
    const pj = await dbGet('kv', 'project');
    if (pj) { P = JSON.parse(pj); }
    const keys = await dbKeys('media');
    for (const id of keys) {
      const r = await dbGet('media', id); if (!r) continue;
      try { await addMedia(r.blob, r.name, r.id, true); } catch (e) { console.warn('restore media', e); }
    }
    if (P) { $('#pname').value = P.name || 'Untitled project'; $('#ratioLbl').textContent = P.ratio; }
  } catch (e) { console.warn('restore', e); }
}
function bindUI() {
  fillIcons();
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bExport').onclick = openExport;
  $('#bProject').onclick = () => { SEL = null; refreshAll(); RTAB = 'project'; renderInspector(); if (isMob()) openSheet('right'); };
  $('#bFile').onclick = () => {
    const list = h('div');
    const it = (l, f) => list.append(h('div', { class: 'opt', onclick: () => { closePop(); f(); } }, l));
    it('New project', newProjectAsk); it('Open project file (.fwproj)', () => $('#projIn').click()); it('Save project file (.fwproj)', saveProjectFile); it('Import media', () => { $('#fileIn').accept = 'video/*,image/*,audio/*,.svg,.gif,.webp'; $('#fileIn').click(); }); it('Export video', openExport); it('Install app', installApp);
    openPop($('#bFile'), list);
  };
  $('#pname').addEventListener('change', () => { P.name = $('#pname').value; commit(); });
  $('#pname').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); });
  $('#playBtn').onclick = togglePlay;
  $('#bStart').onclick = () => seek(0); $('#bEnd').onclick = () => seek(projDur());
  $('#bPrevF').onclick = () => seek(Math.round(T * P.fps - 1) / P.fps); $('#bNextF').onclick = () => seek(Math.round(T * P.fps + 1) / P.fps);
  $('#bSnap').onclick = snapshotPNG;
  $('#bFull').onclick = () => { const s = $('#center'); if (document.fullscreenElement) document.exitFullscreen(); else (s.requestFullscreen || s.webkitRequestFullscreen).call(s); };
  document.addEventListener('fullscreenchange', () => setTimeout(layoutView, 60));
  $('#tSplit').onclick = opSplit; $('#tDel').onclick = opDelete; $('#tDup').onclick = opDuplicate; $('#tFreeze').onclick = opFreeze; $('#tDetach').onclick = opDetach;
  $('#tFront').onclick = () => moveLayer('front'); $('#tFwd').onclick = () => moveLayer(1); $('#tBack').onclick = () => moveLayer(-1); $('#tBottom').onclick = () => moveLayer('bottom');
  $('#tKey').onclick = opKey; $('#tMagnet').onclick = () => { TL.snap = !TL.snap; updToolState(); toast(TL.snap ? 'Snapping on' : 'Snapping off'); };
  $('#tRec').onclick = opRecord;
  $('#tZin').onclick = () => setZoom(TL.pps * 1.5); $('#tZout').onclick = () => setZoom(TL.pps / 1.5); $('#tFit').onclick = fitZoom;
  zoomSlider = slider({ min: Math.log(2), max: Math.log(1200), step: 0.01, value: Math.log(TL.pps), onInput: v => setZoom(Math.exp(v)) });
  $('#zoomr').replaceWith(zoomSlider); zoomSlider.id = 'zoomr';
  for (const b of $$('.sheetx')) b.onclick = closeSheets;
  $('#fileIn').addEventListener('change', async e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) { toast('Opening ' + f.length + ' file' + (f.length > 1 ? 's' : '') + '…', 6000); const ms = await importFiles(f); if (ms.length) toast(ms.length + ' file' + (ms.length > 1 ? 's' : '') + ' ready'); } });
  $('#fontIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const v = await loadFontFile(f); const c = selClip(); if (c && c.type === 'text') { c.text.font = v; chg(true); } renderInspector(); toast('Font added'); } catch (x) { toast('Could not read that font'); } });
  $('#projIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) openProjectFile(f); });
  // drop files anywhere; drop library items on the timeline
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', async e => {
    e.preventDefault();
    const mid = e.dataTransfer.getData('text/fw-media');
    if (mid && MEDIA[mid]) {
      const r = $('#tlin').getBoundingClientRect(); const inTL = $('#tl').contains(e.target);
      if (inTL) { const m = MEDIA[mid]; const t = Math.max(0, (e.clientX - r.left - TL.hw) / TL.pps); const old = T; T = t; if (m.kind === 'audio') addAudioClip(m); else { const tr = laneTrackAt(e.clientY, 'visual'); addMediaClip(m, !(tr && tr.main)); } T = old; requestRender(); }
      return;
    }
    if (e.dataTransfer.files.length) { const ms = await importFiles([...e.dataTransfer.files]); if (ms.length && $('#tl').contains(e.target)) for (const m of ms) m.kind === 'audio' ? addAudioClip(m) : addMediaClip(m, false); }
  });
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (k === ' ') { e.preventDefault(); togglePlay(); }
    else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k === 'y') { e.preventDefault(); redo(); }
    else if (mod && k === 'd') { e.preventDefault(); opDuplicate(); }
    else if (mod && k === 's') { e.preventDefault(); saveProjectFile(); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); opDelete(); }
    else if (k === 's' && !mod) opSplit();
    else if (k === 'k' && !mod) opKey();
    else if (k === 'arrowleft') { e.preventDefault(); seek(Math.round(T * P.fps - (e.shiftKey ? P.fps : 1)) / P.fps); }
    else if (k === 'arrowright') { e.preventDefault(); seek(Math.round(T * P.fps + (e.shiftKey ? P.fps : 1)) / P.fps); }
    else if (k === 'home') seek(0); else if (k === 'end') seek(projDur());
    else if (k === 'escape') { closePop(); closeSheets(); }
    else if ((k === '=' || k === '+') && !mod) setZoom(TL.pps * 1.4);
    else if (k === '-' && !mod) setZoom(TL.pps / 1.4);
  });
  new ResizeObserver(() => layoutView()).observe($('#stage'));
  addEventListener('resize', () => { renderTimeline(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && PLAY.on) pause(); });
}
async function main() {
  VIEW.cv = $('#view'); VIEW.x = VIEW.cv.getContext('2d'); VIEW.ov = $('#overlay'); VIEW.ox = VIEW.ov.getContext('2d');
  bindUI();
  await restore0();
  if (!P) P = newProject();
  if (!P.tracks.some(t => t.main)) { const v = visualTracks()[0]; if (v) v.main = true; else P.tracks.unshift({ id: uid(), kind: 'visual', main: true, clips: [] }); }
  cleanTracks();
  renderLeftTabs(); renderLeft(); renderMobBar();
  initTimelineEvents(); initStageEvents();
  commit(); layoutView(); refreshAll();
  if (allClips().length) setTimeout(fitZoom, 50);
  $('#playBtn').innerHTML = icon('play');
}
/* installable app (when opened from a website, e.g. GitHub Pages) */
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
addEventListener('appinstalled', () => { installEvt = null; toast('Framewright is installed'); });
async function installApp() {
  if (matchMedia('(display-mode: standalone)').matches) { toast('You are already using the installed app'); return; }
  if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; if (r.outcome === 'accepted') toast('Installing…'); return; }
  modal('Install Framewright', h('div', { class: 'note', style: { color: 'var(--tx)', lineHeight: '1.6' } },
    location.protocol.startsWith('http') ? 'Open your browser menu (the ⋮ button in Chrome) and tap “Install app” or “Add to Home screen”.' : 'Installing works when the editor is opened from its web link (for example your GitHub Pages link), not from a downloaded file.'), [{ l: 'OK', pri: 1 }]);
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // pick up new versions: check when the app comes back to the screen, and reload once the new version takes over
  const hadCtl = !!navigator.serviceWorker.controller; let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtl || reloading || EXPORTING) return; reloading = true; location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => { }); });
  }).catch(() => { }));
}
main();
