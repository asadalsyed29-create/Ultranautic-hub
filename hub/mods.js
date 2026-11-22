// UltraNautic Hub: the Mods tab. Mods are saved on this device in 'ultranautic.mods' and every app on this website reads them.
// NauticX turns installed mods on or off in its Mods button; Nautic Online picks them when you make a server.
const HubMods = (() => {
  const KEY = 'ultranautic.mods';
  const CATS = ['Movement', 'World', 'Abilities', 'Fun', 'Visual'];
  const GAMES = { nauticx: 'NauticX', online: 'Nautic Online' };
  const BUILT_IN = [
    { id: 'nx-moon-walk', game: 'nauticx', cat: 'Movement', name: 'Moon Walk', desc: 'Gravity like on the moon. Jump high and fall slowly.', code: '#gravity_moon' },
    { id: 'nx-speed-runner', game: 'nauticx', cat: 'Movement', name: 'Speed Runner', desc: 'Walk and run much faster.', code: '#walk_speed = 40' },
    { id: 'nx-double-jump', game: 'nauticx', cat: 'Abilities', name: 'Double Jump', desc: 'Jump again while you are in the air.', code: '#double_jump' },
    { id: 'nx-day-night', game: 'nauticx', cat: 'World', name: 'Day and Night', desc: 'The sun goes round. One full day takes 2 minutes.', code: '#day_cycle = 120' },
    { id: 'nx-coin-shower', game: 'nauticx', cat: 'Fun', name: 'Coin Shower', desc: 'Get 5 coins every 15 seconds.', code: '#forever\n#wait = 15s\n#coins = 5\n#message = Coin Shower: +5 coins\n#end' },
    { id: 'on-low-gravity', game: 'online', cat: 'Movement', name: 'Low Gravity', desc: 'Balls float down slowly and jump much higher.', code: '#gravity = 0.4\n#message = Low Gravity is on. Jump around!' },
    { id: 'on-turbo-roll', game: 'online', cat: 'Movement', name: 'Turbo Roll', desc: 'Every ball rolls almost twice as fast.', code: '#speed = 1.8' },
    { id: 'on-giant-balls', game: 'online', cat: 'Visual', name: 'Giant Balls', desc: 'Every ball in the server is giant.', code: '#giant' },
    { id: 'on-forever-night', game: 'online', cat: 'World', name: 'Forever Night', desc: 'It is always night, with the stars out.', code: '#night\n#freeze_time' },
    { id: 'on-coin-rain', game: 'online', cat: 'Fun', name: 'Coin Rain', desc: 'Everyone gets 2 coins every 20 seconds.', code: '#every = 20s\n#coins = 2\n#toast = Coin Rain +2\n#sound = coin\n#end' },
  ];
  const HELP_LINES = {
    nauticx: [['gravity_moon', 'Moon gravity'], ['walk_speed = 40', 'Faster walking'], ['double_jump', 'Double jump'], ['day_cycle = 120', 'Day and night'], ['coins = 5', 'Give coins'], ['message = Hello!', 'Chat message'], ['wait = 5s', 'Wait'], ['forever', 'Repeat forever'], ['end', 'End a block'], ['rainbow', 'Rainbow'], ['trail', 'Trail'], ['snow', 'Snow']],
    online: null, // filled from the Nautic Online command list
  };
  let nxNames = null; // NauticX command names, loaded when needed
  const $ = id => document.getElementById(id);
  const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const read = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; d.installed = d.installed || {}; d.enabled = d.enabled || {}; d.mine = d.mine || {}; return d; } catch (e) { return { installed: {}, enabled: {}, mine: {} }; } };
  const write = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  let game = 'nauticx', cat = 'All', editing = null;

  function all() { const d = read(); return BUILT_IN.concat(Object.values(d.mine)); }
  function install(m) { const d = read(); d.installed[m.id] = { id: m.id, name: m.name, game: m.game, cat: m.cat, desc: m.desc, code: m.code, builtIn: !!m.builtIn || BUILT_IN.some(b => b.id === m.id) }; if (m.game === 'nauticx') { d.enabled.nauticx = d.enabled.nauticx || {}; d.enabled.nauticx[m.id] = true; } write(d); }
  function uninstall(id) { const d = read(); delete d.installed[id]; if (d.enabled.nauticx) delete d.enabled.nauticx[id]; write(d); }

  // ---------- the list ----------
  function render() {
    const box = $('modsList'); if (!box) return;
    document.querySelectorAll('#modGame button').forEach(b => b.classList.toggle('on', b.dataset.g === game));
    const chips = $('modCats'); chips.textContent = '';
    for (const c of ['All', ...CATS, 'Made by you']) { const b = el('button', c === cat ? 'chip on' : 'chip', c); b.onclick = () => { cat = c; render(); }; chips.appendChild(b); }
    const d = read(), list = all().filter(m => m.game === game && (cat === 'All' || (cat === 'Made by you' ? !!d.mine[m.id] : m.cat === cat)));
    box.textContent = '';
    if (!list.length) box.appendChild(el('p', 'note', cat === 'Made by you' ? 'You have not made a mod for ' + GAMES[game] + ' yet. Tap "Make a mod".' : 'No mods here yet.'));
    for (const m of list) {
      const inst = !!d.installed[m.id], mine = !!d.mine[m.id];
      const c = el('section', 'mod');
      const t = el('div', 't'); t.append(el('div', 'kind', m.cat + (mine ? ' · Made by you' : '')), el('h3', '', m.name), el('p', '', m.desc || ''));
      const code = el('pre', 'code', m.code);
      const row = el('div', 'row');
      const b = el('button', inst ? '' : 'pri', inst ? 'Remove' : 'Install');
      b.onclick = () => { if (inst) uninstall(m.id); else install(m); render(); };
      row.appendChild(b);
      if (inst) row.prepend(el('span', 'ok', 'Installed'));
      if (mine) { const e = el('button', '', 'Edit'); e.onclick = () => openEditor(m); row.appendChild(e); }
      const s = el('button', '', 'Share'); s.onclick = () => share(m); row.appendChild(s);
      c.append(t, code, row); box.appendChild(c);
    }
    $('modWhere').textContent = game === 'nauticx' ? 'Installed NauticX mods are switched on right away. Turn them on or off in NauticX with the Mods button at the top.' : 'Installed Nautic Online mods show up when you make a server. Pick the ones you want for that server.';
  }

  // ---------- sharing ----------
  const enc = o => 'MOD-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function dec(t) { const m = String(t || '').trim().match(/MOD-([A-Za-z0-9_-]+)/); if (!m) return null; try { const o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); if (!o || !GAMES[o.g] || typeof o.c !== 'string') return null; return { name: String(o.n || 'Mod').slice(0, 40), game: o.g, cat: CATS.includes(o.k) ? o.k : 'Fun', desc: String(o.d || '').slice(0, 200), code: o.c.slice(0, 20000) }; } catch (e) { return null; } }
  function share(m) {
    const code = enc({ n: m.name, g: m.game, k: m.cat, d: m.desc, c: m.code });
    const done = () => panelMsg('Mod code copied', 'Send it to a friend. They paste it in the hub with "Add a mod code".', code);
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
  }
  function panelMsg(title, text, code) { $('dlgT').textContent = title; $('dlgP').textContent = text; const pre = $('dlgCode'); pre.textContent = code || ''; pre.style.display = code ? 'block' : 'none'; $('dlg').classList.add('on'); }
  function openImport() {
    $('impText').value = ''; $('impMsg').textContent = ''; $('modImport').classList.add('on');
  }
  function doImport() {
    const m = dec($('impText').value);
    if (!m) { $('impMsg').textContent = 'That is not a mod code. A mod code starts with MOD-'; return; }
    const d = read(); m.id = 'my-' + Date.now().toString(36); d.mine[m.id] = m; write(d); install(m);
    $('modImport').classList.remove('on'); game = m.game; cat = 'Made by you'; render();
  }

  // ---------- making a mod ----------
  function openEditor(m) {
    editing = m ? Object.assign({}, m) : { id: null, name: '', game, cat: 'Fun', desc: '', code: '' };
    $('edName').value = editing.name; $('edDesc').value = editing.desc; $('edCode').value = editing.code;
    $('edDel').style.display = editing.id ? '' : 'none';
    $('edTitle').textContent = editing.id ? 'Edit mod' : 'Make a mod';
    edRender(); $('modEditor').classList.add('on'); $('modEditor').querySelector('.bd').scrollTop = 0; check();
  }
  function edRender() {
    document.querySelectorAll('#edGame button').forEach(b => b.classList.toggle('on', b.dataset.g === editing.game));
    const cats = $('edCats'); cats.textContent = '';
    for (const c of CATS) { const b = el('button', c === editing.cat ? 'chip on' : 'chip', c); b.onclick = () => { editing.cat = c; edRender(); }; cats.appendChild(b); }
    const h = $('edHelp'); h.textContent = '';
    const lines = editing.game === 'online' ? Object.entries(NMods.CMDS).map(([k, v]) => [v[1].slice(1), v[0]]) : HELP_LINES.nauticx;
    for (const [code, what] of lines) { const b = el('button', 'line'); b.append(el('b', '', '#' + code), el('span', '', what)); b.onclick = () => addLine('#' + code); h.appendChild(b); }
    $('edFind').style.display = editing.game === 'nauticx' ? '' : 'none'; $('edFound').textContent = '';
    $('edFind').value = '';
  }
  function addLine(t) {
    const ta = $('edCode'), v = ta.value, at = ta.selectionStart != null && document.activeElement === ta ? ta.selectionStart : v.length;
    const before = v.slice(0, at), after = v.slice(at), pre = before && !before.endsWith('\n') ? '\n' : '';
    ta.value = before + pre + t + (after && !after.startsWith('\n') ? '\n' : '') + after; check();
  }
  async function nxList() { if (nxNames) return nxNames; try { const r = await fetch('hub/nauticx-cmds.txt'); nxNames = new Set((await r.text()).split('\n')); } catch (e) { nxNames = new Set(); } return nxNames; }
  async function find() {
    const q = $('edFind').value.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '_'), out = $('edFound'); out.textContent = '';
    if (q.length < 2) return;
    const hits = [...await nxList()].filter(n => n.includes(q)).sort((a, b) => (a.startsWith(q) ? 0 : 1) - (b.startsWith(q) ? 0 : 1) || a.length - b.length).slice(0, 30);
    if (!hits.length) out.appendChild(el('span', 'note', 'No command has that in its name.'));
    for (const n of hits) { const b = el('button', 'chip', '#' + n); b.onclick = () => addLine('#' + n); out.appendChild(b); }
  }
  // checks the code as you type
  async function check() {
    const code = $('edCode').value, msg = $('edCheck'); let errs = [];
    if (!code.trim()) { msg.className = 'check'; msg.textContent = 'Write your mod here. Tap a line below to add it.'; return []; }
    if (editing.game === 'online') errs = NMods.compile(code).errs;
    else {
      const names = await nxList();
      code.split('\n').forEach((raw, i) => {
        const l = raw.trim(); if (!l || l.startsWith('--') || l.startsWith('//')) return;
        if (!l.startsWith('#')) { errs.push('line ' + (i + 1) + ': a command starts with #'); return; }
        const n = l.slice(1).split(/\s*=|\s/)[0].toLowerCase();
        if (names.size && !names.has(n) && !/^line\d+$/.test(n)) errs.push('line ' + (i + 1) + ': NauticX has no command #' + n);
      });
    }
    msg.className = errs.length ? 'check bad' : 'check good';
    msg.textContent = errs.length ? errs.slice(0, 4).join('\n') : 'Looks good.';
    return errs;
  }
  async function save() {
    const name = $('edName').value.trim().replace(/[<>]/g, '').slice(0, 40), code = $('edCode').value.slice(0, 20000);
    if (!name) { $('edCheck').className = 'check bad'; $('edCheck').textContent = 'Give your mod a name.'; $('edName').focus(); return; }
    const errs = await check(); if (errs.length) return;
    const d = read(), id = editing.id || 'my-' + Date.now().toString(36);
    const m = { id, name, game: editing.game, cat: editing.cat, desc: $('edDesc').value.trim().slice(0, 200), code };
    d.mine[id] = m; write(d); install(m);
    $('modEditor').classList.remove('on'); game = m.game; cat = 'Made by you'; render();
  }
  function del() { if (!editing || !editing.id) return; const d = read(); delete d.mine[editing.id]; write(d); uninstall(editing.id); $('modEditor').classList.remove('on'); render(); }

  function init() {
    document.querySelectorAll('#modGame button').forEach(b => b.onclick = () => { game = b.dataset.g; render(); });
    document.querySelectorAll('#edGame button').forEach(b => b.onclick = () => { editing.game = b.dataset.g; edRender(); check(); });
    $('modMake').onclick = () => openEditor(null);
    $('modAdd').onclick = openImport;
    $('impOk').onclick = doImport; $('impCancel').onclick = () => $('modImport').classList.remove('on');
    $('edSave').onclick = save; $('edCancel').onclick = () => $('modEditor').classList.remove('on'); $('edDel').onclick = del;
    let t = 0; $('edCode').oninput = () => { clearTimeout(t); t = setTimeout(check, 250); };
    let f = 0; $('edFind').oninput = () => { clearTimeout(f); f = setTimeout(find, 200); };
    render();
  }
  return { init, render, setGame(g) { if (GAMES[g]) { game = g; cat = 'All'; render(); } }, BUILT_IN };
})();
