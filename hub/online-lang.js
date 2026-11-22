// Mods for Nautic Online: they add new things to the game. New blocks to build with, new gadgets, new ball skins,
// new items to find around the world and new creatures. Written in NauticX-style code (#command = value):
//
//   #block = Lava Block      <- starts a new thing (block, gadget, skin, item or creature)
//   #color = #ff5a2a         <- what it is like
//   #glow
//   #hot
//   #end                     <- the thing is done
//
// A server's mods travel to everyone who joins, and only add things to this game (no outside code ever runs).
const NMods = (() => {
  const KINDS = {
    block: 'a new block you can build with (in the Mods tab of the build bar)',
    gadget: 'a new gadget for the wardrobe',
    skin: 'a new ball skin for the wardrobe',
    item: 'a new item that lies around the world for people to find',
    creature: 'a new creature that lives in the world',
  };
  const ITEM_LOOKS = ['shell', 'mushroom', 'feather', 'crystal', 'gem', 'relic', 'star', 'cloud', 'pepper', 'fossil', 'pearl', 'coin'];
  const GADGET_LOOKS = ['balloon', 'glider', 'spring', 'magnet', 'lantern', 'jets', 'snorkel'];
  const GIVES = { fast: 'fast', big: 'big', super_jump: 'superJump', glow: 'glow', float: 'float' };
  const PLACES = { ocean: 0, beach: 1, grassland: 2, forest: 3, desert: 4, snow: 5, mountains: 6, swamp: 7, glow_fields: 8, plaza: 9 };
  const CREATURE_LIKE = ['hopper', 'deer', 'fox', 'crab', 'turtle', 'lizard', 'penguin', 'slime', 'frog', 'moth', 'goat', 'butterfly', 'fish'];
  const PATTERNS = ['plain', 'band', 'stripes', 'dots', 'split', 'checker', 'swirl', 'star', 'zigzag', 'target', 'candy', 'flower', 'heart', 'paw', 'bolt', 'marble', 'galaxy', 'lava', 'ice', 'circuit', 'planet', 'moon', 'pixel'];
  const isColor = v => /^#[0-9a-f]{6}$/i.test(v);
  // what each thing can have: name -> [what it does, example, kind of value, which things]
  const PROPS = {
    about: ['a short line about it', '#about = Very hot, do not touch!', 'text', ['block', 'gadget', 'item', 'creature']],
    color: ['its colour', '#color = #ff5a2a', 'color', ['block', 'item', 'creature']],
    colors: ['the two colours of a skin', '#colors = #1a1040, #7a5cff', 'colors', ['skin']],
    pattern: ['the pattern of a skin: ' + PATTERNS.join(', '), '#pattern = swirl', 'pick:' + PATTERNS.join(','), ['skin']],
    glow: ['it glows', '#glow', 'none', ['block', 'gadget']],
    see_through: ['you can see through it, like glass', '#see_through', 'none', ['block']],
    bouncy: ['balls bounce off it', '#bouncy', 'none', ['block']],
    launch: ['throws balls up into the air (how strong)', '#launch = 20', 'num', ['block']],
    boost: ['speeds balls up the way they roll (how strong)', '#boost = 20', 'num', ['block']],
    slippery: ['balls slide on it like ice', '#slippery', 'none', ['block']],
    hot: ['touching it sends you back to spawn', '#hot', 'none', ['block']],
    looks_like: ['what it looks like (gadgets: ' + GADGET_LOOKS.join(', ') + '; items: ' + ITEM_LOOKS.join(', ') + ')', '#looks_like = spring', 'text', ['gadget', 'item']],
    jump: ['how high you jump with it (1 = normal)', '#jump = 2', 'num', ['gadget']],
    speed: ['how fast you roll with it (1 = normal)', '#speed = 1.5', 'num', ['gadget']],
    float: ['hold jump to float down slowly', '#float', 'none', ['gadget']],
    glide: ['hold jump in the air to glide', '#glide', 'none', ['gadget']],
    magnet: ['grab things from far away', '#magnet', 'none', ['gadget']],
    dive: ['dive and swim fast in water', '#dive', 'none', ['gadget']],
    cost: ['how many coins it costs (leave it out = free)', '#cost = 50', 'num', ['gadget', 'skin']],
    gives: ['what using it does: ' + Object.keys(GIVES).join(', '), '#gives = super_jump', 'pick:' + Object.keys(GIVES).join(','), ['item']],
    time: ['how long using it lasts', '#time = 30s', 'time', ['item']],
    find: ['how many lie around the world', '#find = 15', 'num', ['item']],
    like: ['which creature it is based on: ' + CREATURE_LIKE.join(', '), '#like = fox', 'pick:' + CREATURE_LIKE.join(','), ['creature']],
    size: ['how big it is (1 = normal)', '#size = 1.5', 'num', ['creature']],
    where: ['where it lives: ' + Object.keys(PLACES).join(', '), '#where = forest, snow', 'places', ['creature']],
  };
  const MAX_LINES = 400, MAX_THINGS = 30;

  function timeS(t) { const m = String(t).trim().match(/^(\d+(?:\.\d+)?)\s*(s|m)?$/i); if (!m) return null; return parseFloat(m[1]) * ((m[2] || 's').toLowerCase() === 'm' ? 60 : 1); }

  // code -> { things: [{ kind, name, props, line }], errs }
  function compile(code) {
    const errs = [], things = []; let cur = null;
    String(code || '').split('\n').slice(0, MAX_LINES).forEach((raw, i) => {
      const line = raw.trim(), n = i + 1;
      if (!line || line.startsWith('--') || line.startsWith('//')) return;
      if (!line.startsWith('#')) { errs.push('line ' + n + ': a command starts with #'); return; }
      const eq = line.indexOf('='), name = (eq < 0 ? line.slice(1) : line.slice(1, eq)).trim().toLowerCase().replace(/\s+/g, '_'), val = eq < 0 ? '' : line.slice(eq + 1).trim();
      if (KINDS[name]) {
        if (cur) errs.push('line ' + n + ': put #end after the ' + cur.kind + ' on line ' + cur.line + ' first');
        if (!val) { errs.push('line ' + n + ': give it a name, like #' + name + ' = My ' + name); cur = null; return; }
        if (things.length >= MAX_THINGS) { errs.push('line ' + n + ': a mod can have up to ' + MAX_THINGS + ' things'); return; }
        cur = { kind: name, name: val.replace(/[<>]/g, '').slice(0, 30), props: {}, line: n }; things.push(cur); return;
      }
      if (name === 'end') { if (!cur) errs.push('line ' + n + ': #end without a thing to end'); cur = null; return; }
      const P = PROPS[name];
      if (!P) { errs.push('line ' + n + ': unknown command #' + name); return; }
      if (!cur) { errs.push('line ' + n + ': #' + name + ' goes inside a thing, like #block = … #end'); return; }
      if (!P[3].includes(cur.kind)) { errs.push('line ' + n + ': a ' + cur.kind + ' can\'t have #' + name); return; }
      const t = P[2]; let v = true;
      if (t === 'text') { if (!val) { errs.push('line ' + n + ': write it like ' + P[1]); return; } v = val.replace(/[<>]/g, '').slice(0, 80); }
      else if (t === 'num') { v = parseFloat(val); if (!isFinite(v)) { errs.push('line ' + n + ': #' + name + ' needs a number, like ' + P[1]); return; } }
      else if (t === 'color') { if (!isColor(val)) { errs.push('line ' + n + ': a colour looks like #ff5a2a'); return; } v = val.toLowerCase(); }
      else if (t === 'colors') { v = val.split(',').map(s => s.trim().toLowerCase()); if (v.length !== 2 || !v.every(isColor)) { errs.push('line ' + n + ': write two colours, like ' + P[1]); return; } }
      else if (t === 'time') { v = timeS(val); if (v == null) { errs.push('line ' + n + ': #time needs a time like 30s'); return; } }
      else if (t === 'places') { v = val.toLowerCase().split(',').map(s => s.trim().replace(/\s+/g, '_')).filter(Boolean); const bad = v.find(p => !(p in PLACES)); if (!v.length || bad) { errs.push('line ' + n + ': places are ' + Object.keys(PLACES).join(', ')); return; } }
      else if (t.startsWith('pick:')) { const ok = t.slice(5).split(','); v = val.toLowerCase().replace(/\s+/g, '_'); if (!ok.includes(v)) { errs.push('line ' + n + ': #' + name + ' can be ' + ok.join(', ')); return; } }
      if (name === 'looks_like') { const ok = cur.kind === 'gadget' ? GADGET_LOOKS : ITEM_LOOKS; v = String(v).toLowerCase(); if (!ok.includes(v)) { errs.push('line ' + n + ': a ' + cur.kind + ' can look like ' + ok.join(', ')); return; } }
      cur.props[name] = v;
    });
    if (cur) errs.push('the ' + cur.kind + ' on line ' + cur.line + ' is missing its #end');
    for (const th of things) {
      if (th.kind === 'item' && !th.props.gives) errs.push('the item on line ' + th.line + ' needs #gives, like #gives = super_jump');
      if (th.kind === 'creature' && !th.props.like) errs.push('the creature on line ' + th.line + ' needs #like, like #like = fox');
    }
    return { things, errs };
  }

  // ---------- putting a server's mods into the game ----------
  const clamp = (v, a, b, d) => isFinite(v) ? Math.max(a, Math.min(b, v)) : d;
  let added = []; // [table, key] pairs to take back out when you leave the server
  function unregister() {
    for (const [T, k] of added) delete T[k];
    added = []; TOOL_CATS.mods = [];
  }
  // mods: the server's mod list, in order (so every player gets the same block numbers)
  function register(mods) {
    unregister();
    const put = (T, k, v) => { T[k] = v; added.push([T, k]); };
    let nextBlock = 200, slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'thing';
    const made = { block: [], gadget: [], skin: [], item: [], creature: [] };
    (mods || []).forEach((m, mi) => {
      const { things } = compile(m.code);
      for (const th of things) {
        const p = th.props, id = 'mod' + mi + '_' + slug(th.name);
        if (th.kind === 'block') {
          if (nextBlock > 299) continue;
          const k = nextBlock++;
          put(PARTS, k, { name: th.name, color: p.color || '#9aa3b5', cat: 'blocks', mod: true, glow: !!p.glow, glass: !!p.see_through, bouncy: !!p.bouncy, launch: p.launch ? clamp(p.launch, 1, 60, 17) : 0, boost: p.boost ? clamp(p.boost, 1, 60, 22) : 0, slippery: !!p.slippery, hot: !!p.hot, tip: p.about || '' });
          TOOL_CATS.mods.push(k); made.block.push(th.name);
        } else if (th.kind === 'gadget') {
          put(GADGETS, id, { name: th.name, desc: p.about || 'A gadget from a mod', cost: p.cost > 0 ? { coins: Math.round(clamp(p.cost, 1, 100000, 50)) } : {}, mod: true, free: !(p.cost > 0), like: p.looks_like || (p.glide ? 'glider' : p.float ? 'balloon' : p.magnet ? 'magnet' : p.dive ? 'snorkel' : p.glow ? 'lantern' : p.jump ? 'spring' : 'jets'),
            fx: { jump: p.jump ? clamp(p.jump, 0.2, 6, 1) : 1, speed: p.speed ? clamp(p.speed, 0.2, 4, 1) : 1, float: !!p.float, glide: !!p.glide, glow: !!p.glow, magnet: !!p.magnet, dive: !!p.dive } });
          made.gadget.push(th.name);
        } else if (th.kind === 'skin') {
          const base = SKINS[p.pattern || 'swirl'] || SKINS.swirl;
          put(SKINS, id, { n: base.n, name: th.name, cols: p.colors || null, lock: p.cost > 0 ? { coins: Math.round(clamp(p.cost, 1, 100000, 50)) } : undefined, mod: true });
          made.skin.push(th.name);
        } else if (th.kind === 'item') {
          put(ITEMS, id, { name: th.name, color: p.color || '#ffd24a', use: p.about || 'A thing from a mod', time: Math.round(clamp(p.time || 20, 2, 600, 20)), eff: GIVES[p.gives] || 'fast', like: p.looks_like || 'shell', find: Math.round(clamp(p.find || 12, 1, 60, 12)), mod: true });
          made.item.push(th.name);
        } else if (th.kind === 'creature') {
          const base = CREATURES[p.like]; if (!base) continue;
          put(CREATURES, id, Object.assign({}, base, { name: th.name, like: p.like, tint: p.color || null, size: clamp(p.size || 1, 0.3, 4, 1), biomes: p.where ? p.where.map(w => PLACES[w]) : base.biomes.slice(), mod: true }));
          made.creature.push(th.name);
        }
      }
    });
    return made;
  }
  // the mod items that should lie around the world: [{ type, find }]
  const findList = () => Object.entries(ITEMS).filter(([, it]) => it.mod).map(([type, it]) => ({ type, find: it.find }));

  // the mods this device installed from UltraNautic Hub (same website, so the hub's list is shared)
  function installed() {
    try { const d = JSON.parse(localStorage.getItem('ultranautic.mods') || '{}'); return Object.values(d.installed || {}).filter(m => m && m.game === 'online' && typeof m.code === 'string'); } catch (e) { return []; }
  }
  // a mod that came from someone else's server: keep only the safe parts
  const clean = m => ({ id: String(m.id || '').slice(0, 40), name: String(m.name || 'Mod').slice(0, 40), code: String(m.code || '').slice(0, 20000) });

  return { KINDS, PROPS, compile, register, unregister, findList, installed, clean };
})();
