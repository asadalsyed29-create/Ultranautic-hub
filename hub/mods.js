// UltraNautic Hub: the Mods tab. Mods add new things to Nautic Online: blocks, gadgets, skins, items and creatures.
// They are saved on this device in 'ultranautic.mods' (the game reads the same list) and picked when you make a server.
const HubMods = (() => {
  const KEY = 'ultranautic.mods';
  const CATS = ['Blocks', 'Gadgets', 'Skins', 'Items', 'Creatures'];
  const KIND_CAT = { block: 'Blocks', gadget: 'Gadgets', skin: 'Skins', item: 'Items', creature: 'Creatures' };
  const GAMES = { online: 'Nautic Online' };
  const OLD = ['nx-moon-walk', 'nx-speed-runner', 'nx-double-jump', 'nx-day-night', 'nx-coin-shower', 'on-low-gravity', 'on-turbo-roll', 'on-giant-balls', 'on-forever-night', 'on-coin-rain'];
  const BUILT_IN = [
    { id: 'on-lava-ice', name: 'Lava and Ice', desc: 'Three new blocks: glowing lava that sends you back to spawn, slippery ice, and a trampoline.',
      code: '#block = Lava Block\n#about = Too hot! Sends you back to spawn\n#color = #ff5a1f\n#glow\n#hot\n#end\n\n#block = Ice Block\n#about = Slide across it\n#color = #bfe6ff\n#slippery\n#end\n\n#block = Trampoline\n#about = Boing! Throws you up high\n#color = #3fd6c0\n#launch = 24\n#end' },
    { id: 'on-rocket-boots', name: 'Rocket Boots', desc: 'Two new gadgets in the wardrobe: Rocket Boots for huge jumps and speed, and the Cloud Umbrella to float down slowly.',
      code: '#gadget = Rocket Boots\n#about = Jump twice as high and roll faster\n#looks_like = jets\n#jump = 2.2\n#speed = 1.3\n#end\n\n#gadget = Cloud Umbrella\n#about = Hold jump to float down slowly\n#looks_like = balloon\n#float\n#end' },
    { id: 'on-space-skins', name: 'Space Skins', desc: 'Three new ball skins: Deep Space, Lava Lamp and Mint Swirl.',
      code: '#skin = Deep Space\n#pattern = galaxy\n#colors = #120a2e, #7a5cff\n#end\n\n#skin = Lava Lamp\n#pattern = lava\n#colors = #2a0a12, #ff6a2a\n#end\n\n#skin = Mint Swirl\n#pattern = swirl\n#colors = #1fb59a, #e8fff6\n#end' },
    { id: 'on-power-finds', name: 'Power Finds', desc: 'Four new items lie around the world. Pick them up and use them from your bag.',
      code: '#item = Blue Pepper\n#about = Super speed for 20 seconds\n#looks_like = pepper\n#color = #3a8cff\n#gives = fast\n#time = 20s\n#find = 10\n#end\n\n#item = Moon Crystal\n#about = Super jump for 30 seconds\n#looks_like = crystal\n#color = #b48cff\n#gives = super_jump\n#time = 30s\n#find = 8\n#end\n\n#item = Sun Gem\n#about = Glow for 2 minutes\n#looks_like = gem\n#color = #ffb020\n#gives = glow\n#time = 2m\n#find = 8\n#end\n\n#item = Sky Feather\n#about = Float down slowly for 40 seconds\n#looks_like = feather\n#color = #ffe27a\n#gives = float\n#time = 40s\n#find = 8\n#end' },
    { id: 'on-wild-creatures', name: 'Wild Creatures', desc: 'Three new creatures: Ember Foxes in the desert, Frost Goats in the snow and mountains, and Giant Frogs in swamps and forests.',
      code: '#creature = Ember Fox\n#like = fox\n#color = #ff6a2a\n#where = desert\n#end\n\n#creature = Frost Goat\n#like = goat\n#color = #dfeeff\n#where = snow, mountains\n#end\n\n#creature = Giant Frog\n#like = frog\n#color = #4fd66a\n#size = 2.2\n#where = swamp, forest\n#end' },
  ].map(m => Object.assign(m, { game: 'online', builtIn: true }));
  // what a mod adds decides where it is sorted
  function catOf(code) { const ks = [...new Set(NMods.compile(code).things.map(t => KIND_CAT[t.kind]))]; return ks.length === 1 ? ks[0] : ks.length ? 'Mixed' : 'Mixed'; }
  BUILT_IN.forEach(m => m.cat = catOf(m.code));
  const TEMPLATES = {
    block: '#block = My Block\n#about = What it does\n#color = #ff5a1f\n#glow\n#end',
    gadget: '#gadget = My Gadget\n#about = What it does\n#looks_like = jets\n#jump = 2\n#speed = 1.3\n#end',
    skin: '#skin = My Skin\n#pattern = swirl\n#colors = #1a1040, #7a5cff\n#end',
    item: '#item = My Item\n#about = What it does\n#looks_like = gem\n#color = #ffb020\n#gives = super_jump\n#time = 30s\n#find = 10\n#end',
    creature: '#creature = My Creature\n#like = fox\n#color = #ff6a2a\n#size = 1.5\n#where = forest\n#end',
  };
  const $ = id => document.getElementById(id);
  const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const read = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; d.installed = d.installed || {}; d.mine = d.mine || {}; return d; } catch (e) { return { installed: {}, mine: {} }; } };
  const write = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  let cat = 'All', editing = null, lastPos = null;

  // mods from before (NauticX mods and the old Nautic Online ones) are gone
  (function tidy() { const d = read(); let ch = false;
    for (const k of Object.keys(d.installed)) if (d.installed[k].game !== 'online' || OLD.includes(k) || NMods.compile(d.installed[k].code).errs.length) { delete d.installed[k]; ch = true; }
    for (const k of Object.keys(d.mine)) if (d.mine[k].game !== 'online' || NMods.compile(d.mine[k].code).errs.length) { delete d.mine[k]; ch = true; }
    if (d.enabled) { delete d.enabled; ch = true; }
    if (ch) write(d); })();

  const all = () => BUILT_IN.concat(Object.values(read().mine));
  function install(m) { const d = read(); d.installed[m.id] = { id: m.id, name: m.name, game: 'online', cat: m.cat, desc: m.desc, code: m.code, builtIn: !!m.builtIn }; write(d); }
  function uninstall(id) { const d = read(); delete d.installed[id]; write(d); }

  // ---------- the list ----------
  function render() {
    const box = $('modsList'); if (!box) return;
    const chips = $('modCats'); chips.textContent = '';
    for (const c of ['All', ...CATS, 'Mixed', 'Made by you']) { const b = el('button', c === cat ? 'chip on' : 'chip', c); b.onclick = () => { cat = c; render(); }; chips.appendChild(b); }
    const d = read(), list = all().filter(m => cat === 'All' || (cat === 'Made by you' ? !!d.mine[m.id] : m.cat === cat));
    box.textContent = '';
    if (!list.length) box.appendChild(el('p', 'note', cat === 'Made by you' ? 'You have not made a mod yet. Tap "Make a mod".' : 'No mods here yet.'));
    for (const m of list) {
      const inst = !!d.installed[m.id], mine = !!d.mine[m.id];
      const c = el('section', 'mod');
      const t = el('div', 't'); t.append(el('div', 'kind', m.cat + (mine ? ' · Made by you' : '')), el('h3', '', m.name), el('p', '', m.desc || ''));
      const code = el('pre', 'code', m.code);
      const row = el('div', 'row');
      if (inst) row.appendChild(el('span', 'ok', 'Installed'));
      const b = el('button', inst ? '' : 'pri', inst ? 'Remove' : 'Install');
      b.onclick = () => { if (inst) uninstall(m.id); else install(m); render(); };
      row.appendChild(b);
      if (mine) { const e = el('button', '', 'Edit'); e.onclick = () => openEditor(m); row.appendChild(e); }
      const s = el('button', '', 'Share'); s.onclick = () => share(m); row.appendChild(s);
      c.append(t, code, row); box.appendChild(c);
    }
  }

  // ---------- sharing ----------
  const enc = o => 'MOD-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function dec(t) { const m = String(t || '').trim().match(/MOD-([A-Za-z0-9_-]+)/); if (!m) return null; try { const o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); if (!o || typeof o.c !== 'string' || NMods.compile(o.c).errs.length) return null; return { name: String(o.n || 'Mod').slice(0, 40), desc: String(o.d || '').slice(0, 200), code: o.c.slice(0, 20000) }; } catch (e) { return null; } }
  function share(m) {
    const code = enc({ n: m.name, d: m.desc, c: m.code });
    const done = () => panelMsg('Mod code copied', 'Send it to a friend. They paste it in the hub with "Add a mod code".', code);
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
  }
  function panelMsg(title, text, code) { $('dlgT').textContent = title; $('dlgP').textContent = text; const pre = $('dlgCode'); pre.textContent = code || ''; pre.style.display = code ? 'block' : 'none'; $('dlg').classList.add('on'); }
  function openImport() { $('impText').value = ''; $('impMsg').textContent = ''; $('modImport').classList.add('on'); }
  function doImport() {
    const m = dec($('impText').value);
    if (!m) { $('impMsg').textContent = 'That is not a mod code. A mod code starts with MOD-'; return; }
    const d = read(); m.id = 'my-' + Date.now().toString(36); m.game = 'online'; m.cat = catOf(m.code); d.mine[m.id] = m; write(d); install(m);
    $('modImport').classList.remove('on'); cat = 'Made by you'; render();
  }

  // ---------- making a mod ----------
  function openEditor(m) {
    editing = m ? Object.assign({}, m) : { id: null, name: '', desc: '', code: '' };
    lastPos = null; $('edName').value = editing.name; $('edDesc').value = editing.desc; $('edCode').value = editing.code;
    $('edDel').style.display = editing.id ? '' : 'none';
    $('edTitle').textContent = editing.id ? 'Edit mod' : 'Make a mod';
    edRender(); $('modEditor').classList.add('on'); $('modEditor').querySelector('.bd').scrollTop = 0; check();
  }
  function edRender() {
    const th = $('edThings'); th.textContent = '';
    for (const k in NMods.KINDS) { const b = el('button', 'line'); b.append(el('b', '', 'New ' + k), el('span', '', NMods.KINDS[k])); b.onclick = () => addLine(TEMPLATES[k], true); th.appendChild(b); }
    const h = $('edHelp'); h.textContent = '';
    for (const [k, v] of Object.entries(NMods.PROPS)) { const b = el('button', 'line'); b.append(el('b', '', v[1]), el('span', '', v[0] + ' (' + v[3].join(', ') + ')')); b.onclick = () => addLine(v[1]); h.appendChild(b); }
  }
  function addLine(t, block) {
    const ta = $('edCode'), v = ta.value;
    let at = document.activeElement === ta ? ta.selectionStart : lastPos != null ? Math.min(lastPos, v.length) : v.length;
    if (block) at = v.length; // a whole new thing goes at the end
    else { // a line goes inside the thing you are in: just before its #end
      const endAt = v.indexOf('#end', at); const nextThing = v.slice(at).search(/#(block|gadget|skin|item|creature)\b/);
      if (endAt >= 0 && (nextThing < 0 || at + nextThing > endAt)) at = v.lastIndexOf('\n', endAt - 1) + 1;
      else if (endAt < 0 && v.lastIndexOf('#end') >= 0) { const e = v.lastIndexOf('#end'); at = v.lastIndexOf('\n', e - 1) + 1; }
    }
    const before = v.slice(0, at), after = v.slice(at), pre = before && !before.endsWith('\n') ? '\n' : '';
    const ins = (block && before.trim() ? '\n' : '') + t;
    ta.value = before + pre + ins + (after && !after.startsWith('\n') ? '\n' : '') + after; lastPos = (before + pre + ins).length + 1; check();
  }
  // checks the code as you type
  function check() {
    const code = $('edCode').value, msg = $('edCheck');
    if (!code.trim()) { msg.className = 'check'; msg.textContent = 'Tap a "New …" button below to start, then change the name and the lines.'; return []; }
    const r = NMods.compile(code), errs = r.errs.slice();
    if (!errs.length && !r.things.length) errs.push('Add a block, gadget, skin, item or creature.');
    msg.className = errs.length ? 'check bad' : 'check good';
    msg.textContent = errs.length ? errs.slice(0, 4).join('\n') : 'Looks good. This mod adds ' + r.things.map(t => t.name).join(', ') + '.';
    return errs;
  }
  function save() {
    const name = $('edName').value.trim().replace(/[<>]/g, '').slice(0, 40), code = $('edCode').value.slice(0, 20000);
    if (!name) { $('edCheck').className = 'check bad'; $('edCheck').textContent = 'Give your mod a name.'; $('edName').focus(); return; }
    if (check().length) return;
    const d = read(), id = editing.id || 'my-' + Date.now().toString(36);
    const m = { id, name, game: 'online', cat: catOf(code), desc: $('edDesc').value.trim().slice(0, 200), code };
    d.mine[id] = m; write(d); install(m);
    $('modEditor').classList.remove('on'); cat = 'Made by you'; render();
  }
  function del() { if (!editing || !editing.id) return; const d = read(); delete d.mine[editing.id]; write(d); uninstall(editing.id); $('modEditor').classList.remove('on'); render(); }

  function init() {
    $('modMake').onclick = () => openEditor(null);
    $('modAdd').onclick = openImport;
    $('impOk').onclick = doImport; $('impCancel').onclick = () => $('modImport').classList.remove('on');
    $('edSave').onclick = save; $('edCancel').onclick = () => $('modEditor').classList.remove('on'); $('edDel').onclick = del;
    $('edCode').onblur = () => { lastPos = $('edCode').selectionStart; };
    let t = 0; $('edCode').oninput = () => { clearTimeout(t); t = setTimeout(check, 250); };
    render();
  }
  return { init, render, setGame() { render(); }, BUILT_IN };
})();
