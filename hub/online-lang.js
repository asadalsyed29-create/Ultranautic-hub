// Mods for Nautic Online, written in NauticX-style code (#command = value).
// Easy: one line like "#gravity = 0.5". Advanced: variables, #if, #repeat, #forever, #every, events.
// A server's mods travel to everyone who joins, so they only change this game (no outside code ever runs).
const NMods = (() => {
  // the commands: name -> [what it does, example, kind]
  const CMDS = {
    gravity: ['how strong gravity is (1 = normal, 0.5 = half)', '#gravity = 0.5', 'num'],
    speed: ['how fast balls roll (1 = normal)', '#speed = 1.5', 'num'],
    jump: ['how high balls jump (1 = normal)', '#jump = 2', 'num'],
    giant: ['makes every ball giant', '#giant', 'none'],
    normal_size: ['balls go back to normal size', '#normal_size', 'none'],
    glow: ['makes every ball glow', '#glow', 'none'],
    day: ['makes it day', '#day', 'none'],
    night: ['makes it night', '#night', 'none'],
    sunset: ['makes it sunset', '#sunset', 'none'],
    sunrise: ['makes it sunrise', '#sunrise', 'none'],
    freeze_time: ['the sun stops moving', '#freeze_time', 'none'],
    unfreeze_time: ['the sun moves again', '#unfreeze_time', 'none'],
    weather: ['weather: clear, cloudy, rain or storm', '#weather = rain', 'text'],
    message: ['writes a message in the chat', '#message = Welcome to my server!', 'text'],
    toast: ['shows a short message in the middle of the screen', '#toast = Go!', 'text'],
    coins: ['gives you coins', '#coins = 5', 'num'],
    sound: ['plays a sound: coin, jump, quest, chest', '#sound = coin', 'text'],
    wait: ['waits (5s, 500ms, 2m)', '#wait = 5s', 'time'],
    set: ['makes a variable', '#set = score = 0', 'var'],
    add: ['adds to a variable', '#add = score = 1', 'var'],
    random: ['a random whole number between two numbers', '#random = n = 1, 10', 'var'],
    if: ['only runs the lines below when the check is true (… #else … #end)', '#if = {score} > 3', 'cond'],
    else: ['the other lines of an #if', '#else', 'none'],
    repeat: ['runs the lines below this many times (… #end)', '#repeat = 3', 'num'],
    forever: ['runs the lines below again and again (… #end)', '#forever', 'none'],
    every: ['runs the lines below every so often (… #end)', '#every = 10s', 'time'],
    on_start: ['runs when you join the world (… #end)', '#on_start', 'none'],
    on_jump: ['runs every time you jump (… #end)', '#on_jump', 'none'],
    on_join: ['runs when another player joins (… #end)', '#on_join', 'none'],
    end: ['ends an #if, #repeat, #forever, #every or event', '#end', 'none'],
  };
  const BLOCKS = new Set(['if', 'repeat', 'forever', 'every', 'on_start', 'on_jump', 'on_join']);
  const MAX_LINES = 400;

  // turns code into a tree of steps; errors list problems with their line numbers
  function compile(code) {
    const errs = [], root = { kind: 'root', body: [], events: { start: [], jump: [], join: [] } };
    const stack = [root];
    const lines = String(code || '').split('\n').slice(0, MAX_LINES);
    lines.forEach((raw, i) => {
      const line = raw.trim(), n = i + 1;
      if (!line || line.startsWith('--') || line.startsWith('//')) return;
      if (!line.startsWith('#')) { errs.push('line ' + n + ': a command starts with #'); return; }
      const parts = line.slice(1).split('=').map(s => s.trim());
      const name = parts[0].toLowerCase().replace(/\s+/g, '_'), args = parts.slice(1);
      const spec = CMDS[name];
      if (!spec) { errs.push('line ' + n + ': unknown command #' + name); return; }
      const top = stack[stack.length - 1];
      const body = top.kind === 'if' && top.inElse ? top.els : top.body;
      if (name === 'end') { if (stack.length < 2) errs.push('line ' + n + ': #end without anything to end'); else stack.pop(); return; }
      if (name === 'else') { if (top.kind !== 'if') errs.push('line ' + n + ': #else needs an #if above it'); else top.inElse = true; return; }
      if (spec[2] === 'num' && name !== 'repeat' && args.length && isNaN(parseFloat(args[0])) && !/\{/.test(args[0])) errs.push('line ' + n + ': #' + name + ' needs a number');
      if (spec[2] === 'num' && name === 'repeat' && !args.length) errs.push('line ' + n + ': #repeat needs a number');
      if (spec[2] === 'time' && (!args.length || timeMs(args[0]) == null)) errs.push('line ' + n + ': #' + name + ' needs a time like 5s');
      if (spec[2] === 'var' && (args.length < 2 || !/^[a-z_][a-z0-9_]*$/i.test(args[0]))) errs.push('line ' + n + ': write it like ' + spec[1]);
      if (spec[2] === 'cond' && !args.length) errs.push('line ' + n + ': #if needs a check, like #if = {score} > 3');
      if (spec[2] === 'text' && !args.length) errs.push('line ' + n + ': write it like ' + spec[1]);
      const step = { name, args, line: n, body: [], els: [] };
      if (name.startsWith('on_')) {
        if (stack.length > 1) { errs.push('line ' + n + ': events go at the top, not inside other blocks'); return; }
        step.kind = 'event'; root.events[name.slice(3)].push(step); stack.push(step); return;
      }
      body.push(step);
      if (BLOCKS.has(name)) { step.kind = name; stack.push(step); }
    });
    if (stack.length > 1) errs.push('a block is missing its #end (from line ' + stack[stack.length - 1].line + ')');
    return { root, errs };
  }

  function timeMs(t) {
    const m = String(t).trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m)?$/i); if (!m) return null;
    const v = parseFloat(m[1]), u = (m[2] || 's').toLowerCase();
    return u === 'ms' ? v : u === 'm' ? v * 60000 : v * 1000;
  }

  // ---------- running ----------
  // host = what the game lets mods change: { set(key, value), message, toast, coins, sound, weather, time(mode), players() }
  function start(mods, host) {
    const run = { alive: true, vars: {}, timers: new Set(), events: { jump: [], join: [] } };
    const fill = s => String(s).replace(/\{([a-z_][a-z0-9_]*)\}/gi, (_, k) => k === 'players' ? host.players() : k === 'name' ? host.name() : run.vars[k] != null ? run.vars[k] : 0);
    const num = s => { const v = parseFloat(fill(s)); return isFinite(v) ? v : 0; };
    const sleep = ms => new Promise(r => { const t = setTimeout(() => { run.timers.delete(t); r(); }, Math.max(16, ms)); run.timers.add(t); });
    const check = c => {
      const m = fill(c).match(/^(.*?)\s*(==|!=|>=|<=|>|<|=)\s*(.*)$/); if (!m) return !!parseFloat(fill(c));
      const a = m[1].trim(), b = m[3].trim(), x = parseFloat(a), y = parseFloat(b), nums = isFinite(x) && isFinite(y);
      switch (m[2]) { case '>': return nums && x > y; case '<': return nums && x < y; case '>=': return nums && x >= y; case '<=': return nums && x <= y; case '!=': return nums ? x !== y : a !== b; default: return nums ? x === y : a.toLowerCase() === b.toLowerCase(); }
    };
    let budget = 0; // keeps a mod from freezing the game with a loop that never waits
    async function steps(list) {
      for (const s of list) {
        if (!run.alive) return;
        if (++budget > 2000) { budget = 0; await sleep(16); }
        const a = s.args;
        switch (s.name) {
          case 'gravity': case 'speed': case 'jump': host.set(s.name, Math.max(0, Math.min(10, num(a[0] ?? 1)))); break;
          case 'giant': host.set('big', true); break;
          case 'normal_size': host.set('big', false); break;
          case 'glow': host.set('glow', true); break;
          case 'day': case 'night': case 'sunset': case 'sunrise': host.time(s.name); break;
          case 'freeze_time': host.set('freeze', true); break;
          case 'unfreeze_time': host.set('freeze', false); break;
          case 'weather': host.weather(fill(a[0]).toLowerCase()); break;
          case 'message': host.message(fill(a.join(' = ')).slice(0, 200)); break;
          case 'toast': host.toast(fill(a.join(' = ')).slice(0, 80)); break;
          case 'coins': host.coins(Math.max(0, Math.min(100, Math.round(num(a[0]))))); break;
          case 'sound': host.sound(fill(a[0]).toLowerCase()); break;
          case 'wait': await sleep(timeMs(fill(a[0])) || 1000); break;
          case 'set': run.vars[a[0]] = isFinite(parseFloat(fill(a[1]))) ? parseFloat(fill(a[1])) : fill(a[1]); break;
          case 'add': run.vars[a[0]] = (parseFloat(run.vars[a[0]]) || 0) + num(a[1]); break;
          case 'random': { const [lo, hi] = fill(a[1]).split(',').map(v => Math.round(parseFloat(v))); run.vars[a[0]] = isFinite(lo) && isFinite(hi) ? lo + Math.floor(Math.random() * (hi - lo + 1)) : 0; break; }
          case 'if': await steps(check(a.join(' = ')) ? s.body : s.els); break;
          case 'repeat': for (let i = 0, n = Math.min(10000, num(a[0])); i < n && run.alive; i++) await steps(s.body); break;
          case 'forever': while (run.alive) { await steps(s.body); await sleep(16); } break;
          case 'every': { const ms = Math.max(200, timeMs(fill(a[0])) || 1000); (async () => { while (run.alive) { await sleep(ms); await steps(s.body); } })(); break; }
        }
      }
    }
    for (const m of mods || []) {
      const { root } = compile(m.code);
      run.events.jump.push(...root.events.jump); run.events.join.push(...root.events.join);
      steps(root.body); for (const e of root.events.start) steps(e.body);
    }
    return {
      fire(ev) { for (const e of run.events[ev] || []) steps(e.body); },
      stop() { run.alive = false; for (const t of run.timers) clearTimeout(t); run.timers.clear(); },
    };
  }

  // the mods this device installed from UltraNautic Hub (same website, so the hub's list is shared)
  function installed() {
    try { const d = JSON.parse(localStorage.getItem('ultranautic.mods') || '{}'); return Object.values(d.installed || {}).filter(m => m && m.game === 'online' && typeof m.code === 'string'); } catch (e) { return []; }
  }
  // a mod that came from someone else's server: keep only the safe parts
  const clean = m => ({ id: String(m.id || '').slice(0, 40), name: String(m.name || 'Mod').slice(0, 40), code: String(m.code || '').slice(0, 20000) });

  return { CMDS, compile, start, installed, clean };
})();
