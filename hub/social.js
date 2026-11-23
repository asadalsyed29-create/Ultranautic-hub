// UltraNautic Hub social: profile picture + menu, Feed, Users, Make a post, profiles, Galaxy (like) and Multiverse (subscribe).
// Data lives in Firebase Firestore (see accounts.js): users/{uid}, posts/{id} (+ galaxies/{uid}), builds/{postId}, follows/{from_to}.
const HubSocial = (() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ICON = {
    galaxy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 12c0-2 2-3 3.5-2.2 2 1 1.8 4.2-.6 5.4-3 1.5-6.6-.6-6.8-4C7.9 7.3 11 4.6 14.6 5c4.3.5 6.6 5 5 9"/><path d="M12 12c0 2-2 3-3.5 2.2-2-1-1.8-4.2.6-5.4 3-1.5 6.6.6 6.8 4 .2 3.9-2.9 6.6-6.5 6.2-4.3-.5-6.6-5-5-9"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    multiverse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/><circle cx="12" cy="7" r="3" stroke-width="1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/></svg>',
    post: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16M4 12h16M4 19h10"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>'
  };
  let me = null, user = null, db = null, FS = null;
  const people = new Map(); // uid -> profile
  const following = new Set();
  let followLoaded = false;

  const okImg = u => typeof u === 'string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) || /^https:\/\/lh\d\.googleusercontent\.com\/[^\s"'()<>]+$/.test(u));
  function toast(t) { const d = el('div', 'toast', t); document.body.append(d); setTimeout(() => d.remove(), 2600); }
  function ago(ts) {
    const t = ts && ts.toMillis ? ts.toMillis() : Date.now(), s = Math.max(1, (Date.now() - t) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago'; return new Date(t).toLocaleDateString();
  }
  const HUES = [200, 170, 260, 320, 20, 45, 140, 290];
  function avatar(p, size) {
    const a = el('div', 'av'); a.style.width = a.style.height = size + 'px'; a.style.fontSize = Math.round(size * .42) + 'px';
    if (p && okImg(p.photo)) { const i = el('img'); i.alt = ''; i.referrerPolicy = 'no-referrer'; i.src = p.photo; a.append(i); }
    else { const n = (p && (p.shown || p.name)) || '?'; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; a.style.background = 'hsl(' + HUES[h % HUES.length] + ' 55% 32%)'; a.textContent = n[0].toUpperCase(); }
    return a;
  }
  async function person(uid) {
    if (people.has(uid)) return people.get(uid);
    const d = await db.collection('users').doc(uid).get(); const p = d.exists ? Object.assign({ uid }, d.data()) : { uid, shown: 'Someone', name: '' };
    people.set(uid, p); return p;
  }
  const isAdmin = () => me && me.name === 'outernautica';
  const offline = e => { console.warn('[social]', e); toast(navigator.onLine ? 'Something went wrong. Try again.' : 'No internet. Connect and try again.'); };

  // ---------- profile picture in the corner + the curved menu around it ----------
  function paintMe() {
    const b = $('me'); b.innerHTML = '';
    const a = HubAccount.get(); if (!a) { b.style.display = 'none'; return; }
    b.style.display = ''; const p = people.get(a.uid) || { shown: a.name, photo: a.photo };
    const av = avatar(p, 48); av.style.border = '0'; b.append(av);
  }
  const MENU = [['My profile', 'user', () => openProfile(user.uid)], ['Make a post', 'post', () => goTab('post')], ['My multiverse', 'multiverse', () => { goTab('feed'); setFeed('mv'); }], ['Settings', 'gear', openSettings], ['Sign out', 'out', () => HubAccount.signOut()]];
  function buildMenu() {
    const m = $('meMenu'); m.innerHTML = '';
    MENU.forEach(([t, ic, fn], i) => {
      const b = el('button'); b.innerHTML = ICON[ic]; b.append(el('span', '', t));
      b.style.transitionDelay = (i * 35) + 'ms';
      b.onclick = () => { closeMenu(); fn(); }; m.append(b);
    });
  }
  // the menu curves round the picture: from its left side down to below it
  function placeMenu(open) {
    const n = MENU.length;
    $('meMenu').querySelectorAll('button').forEach((b, i) => {
      const a = i / (n - 1) * Math.PI / 2, x = -34 - Math.cos(a) * 40, y = 4 + Math.sin(a) * 40 + i * 40;
      b.style.transform = open ? `translate(${x.toFixed(1)}px, calc(${y.toFixed(1)}px - 50%))` : 'translate(50%,-50%) scale(.4)';
    });
  }
  function openMenu() { if (!HubAccount.get()) return; $('meMenu').classList.add('on'); $('meShade').classList.add('on'); $('me').classList.add('open'); placeMenu(true); }
  function closeMenu() { $('meMenu').classList.remove('on'); $('meShade').classList.remove('on'); $('me').classList.remove('open'); placeMenu(false); }

  // ---------- Galaxy (like) and Multiverse (subscribe) ----------
  async function loadFollowing() {
    if (followLoaded || !user) return; followLoaded = true;
    try { const q = await db.collection('follows').where('from', '==', user.uid).limit(500).get(); q.forEach(d => following.add(d.data().to)); } catch (e) { followLoaded = false; }
  }
  function mvButton(uid) {
    const b = el('button', 'mv'); if (!user || uid === user.uid) { b.style.display = 'none'; return b; }
    const paint = () => { const on = following.has(uid); b.classList.toggle('on', on); b.innerHTML = ICON.multiverse; b.append(el('span', '', on ? 'In multiverse' : 'Multiverse')); };
    paint(); b.dataset.mv = uid;
    b.onclick = async () => {
      const on = following.has(uid), ref = db.collection('follows').doc(user.uid + '_' + uid), u = db.collection('users').doc(uid), batch = db.batch();
      if (on) { batch.delete(ref); batch.update(u, { followers: FS.FieldValue.increment(-1) }); } else { batch.set(ref, { from: user.uid, to: uid, at: FS.FieldValue.serverTimestamp() }); batch.update(u, { followers: FS.FieldValue.increment(1) }); }
      batch.update(db.collection('users').doc(user.uid), { following: FS.FieldValue.increment(on ? -1 : 1) });
      b.disabled = true;
      try { await batch.commit(); on ? following.delete(uid) : following.add(uid); const p = people.get(uid); if (p) p.followers = (p.followers || 0) + (on ? -1 : 1); document.querySelectorAll('[data-mv="' + uid + '"]').forEach(x => x.refresh && x.refresh()); if (!on) toast('You multiversed ' + ((p && p.shown) || 'them') + '.'); }
      catch (e) { offline(e); }
      b.disabled = false; paint();
    };
    b.refresh = paint; return b;
  }
  async function galaxyButton(post) {
    const b = el('button', 'gal'); let on = false, n = post.galaxies || 0;
    const paint = () => { b.classList.toggle('on', on); b.innerHTML = ICON.galaxy; b.append(el('span', '', n + (n === 1 ? ' galaxy' : ' galaxies'))); b.title = on ? 'Take your galaxy back' : 'Galaxy this post'; };
    paint();
    if (user && n > 0) db.collection('posts').doc(post.id).collection('galaxies').doc(user.uid).get().then(d => { on = d.exists; paint(); }).catch(() => { });
    b.onclick = async () => {
      if (!user) return; const ref = db.collection('posts').doc(post.id), g = ref.collection('galaxies').doc(user.uid), batch = db.batch();
      if (on) { batch.delete(g); batch.update(ref, { galaxies: FS.FieldValue.increment(-1) }); } else { batch.set(g, { at: FS.FieldValue.serverTimestamp() }); batch.update(ref, { galaxies: FS.FieldValue.increment(1) }); }
      on = !on; n += on ? 1 : -1; paint(); b.disabled = true;
      try { await batch.commit(); } catch (e) { on = !on; n += on ? 1 : -1; paint(); offline(e); }
      b.disabled = false;
    };
    return b;
  }

  // ---------- one post ----------
  async function card(post) {
    const p = await person(post.uid), c = el('article', 'post');
    const ph = el('div', 'ph'), who = el('button', 'who'); who.append(el('b', '', p.shown || p.name), el('span', '', ago(post.at)));
    who.onclick = () => openProfile(post.uid); const av = avatar(p, 40); av.style.cursor = 'pointer'; av.onclick = who.onclick;
    ph.append(av, who, mvButton(post.uid)); c.append(ph);
    if (okImg(post.img)) { const i = el('img', 'pimg'); i.alt = ''; i.loading = 'lazy'; i.src = post.img; c.append(i); }
    if (post.build && post.build.name) {
      const bb = el('div', 'buildbar'), t = el('span'); t.append('NauticX build: ', el('b', '', post.build.name));
      const o = el('button', 'pri', 'Open in NauticX'); o.onclick = () => openBuild(post, o); bb.append(t, o); c.append(bb);
    }
    if (post.text) c.append(el('div', 'ptxt', post.text));
    const act = el('div', 'pact'); act.append(await galaxyButton(post));
    if (user && (post.uid === user.uid || isAdmin())) {
      const d = el('button', '', 'Delete'); d.style.marginLeft = 'auto';
      d.onclick = async () => { if (!confirmBox) return; if (!(await confirmBox('Delete this post?'))) return; try { const b = db.batch(); b.delete(db.collection('posts').doc(post.id)); if (post.build) b.delete(db.collection('builds').doc(post.id)); await b.commit(); c.remove(); toast('Post deleted.'); } catch (e) { offline(e); } };
      act.append(d);
    }
    c.append(act); return c;
  }
  // a NauticX build from a post goes into My Games, then NauticX opens on My Games
  async function openBuild(post, btn) {
    btn.disabled = true; btn.textContent = 'Getting it…';
    try {
      const d = await db.collection('builds').doc(post.id).get(); if (!d.exists) throw new Error('gone');
      const b = d.data(), id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), p = people.get(post.uid);
      const name = (b.name || 'Build') + ' by ' + ((p && p.shown) || 'someone');
      let data = b.data; try { const j = JSON.parse(data); if (j && j.S) { j.S.gameId = id; j.S.gameName = name; data = JSON.stringify(j); } } catch (e) { }
      let L = []; try { L = JSON.parse(localStorage.getItem('buildx-library') || '[]'); } catch (e) { }
      L.unshift({ id, name, date: Date.now(), thumb: okImg(b.thumb) ? b.thumb : '', data, parts: b.parts || 0, bots: b.bots || 0 });
      try { localStorage.setItem('buildx-library', JSON.stringify(L)); } catch (e) { toast('Not enough space. Delete an old game in NauticX My Games first.'); throw 0; }
      openApp('nauticx/index.html?library=1');
    } catch (e) { if (e) offline(e); }
    btn.disabled = false; btn.textContent = 'Open in NauticX';
  }

  // ---------- Feed ----------
  let feedMode = 'all', feedLast = null, feedBusy = false, feedDone = false;
  function setFeed(m) { feedMode = m; document.querySelectorAll('#feedSeg button').forEach(b => b.classList.toggle('on', b.dataset.f === m)); loadFeed(true); }
  async function loadFeed(fresh) {
    if (feedBusy) return; const box = $('feedList');
    if (fresh) { box.innerHTML = ''; feedLast = null; feedDone = false; $('feedMore').style.display = 'none'; }
    if (feedDone) return; feedBusy = true; if (!(await ready())) { feedBusy = false; return; }
    try {
      let posts = [];
      if (feedMode === 'mv') {
        await loadFollowing(); const ids = [...following];
        if (!ids.length) { box.append(el('div', 'empty', 'Your multiverse is empty. Tap Multiverse on someone\'s post or in Users to see their posts here.')); feedDone = true; feedBusy = false; return; }
        for (let i = 0; i < ids.length; i += 30) { const q = await db.collection('posts').where('uid', 'in', ids.slice(i, i + 30)).limit(60).get(); q.forEach(d => posts.push(Object.assign({ id: d.id }, d.data()))); }
        posts.sort((a, b) => ((b.at && b.at.toMillis()) || 0) - ((a.at && a.at.toMillis()) || 0)); feedDone = true;
      } else {
        let q = db.collection('posts').orderBy('at', 'desc').limit(6); if (feedLast) q = q.startAfter(feedLast);
        const r = await q.get(); r.forEach(d => posts.push(Object.assign({ id: d.id }, d.data()))); feedLast = r.docs[r.docs.length - 1] || feedLast; if (r.size < 6) feedDone = true;
      }
      if (fresh && !posts.length) box.append(el('div', 'empty', 'No posts yet. Be the first: tap Post.'));
      for (const p of posts) box.append(await card(p));
      $('feedMore').style.display = feedDone ? 'none' : '';
    } catch (e) { offline(e); }
    feedBusy = false;
  }

  // ---------- Users ----------
  let usersLast = null, usersDone = false, usersBusy = false;
  async function userRow(p) {
    const r = el('div', 'urow'), who = el('button', 'who'); who.append(el('b', '', p.shown || p.name), el('span', '', p.bio || ((p.followers || 0) + ' in their multiverse')));
    who.onclick = () => openProfile(p.uid); const av = avatar(p, 44); av.onclick = who.onclick; av.style.cursor = 'pointer';
    r.append(av, who, mvButton(p.uid)); return r;
  }
  async function loadUsers(fresh) {
    if (usersBusy) return; usersBusy = true; try { await loadUsers2(fresh); } finally { usersBusy = false; }
  }
  async function loadUsers2(fresh) {
    const box = $('usersList'), q0 = $('userSearch').value.trim().toLowerCase();
    if (fresh) { box.innerHTML = ''; usersLast = null; usersDone = false; }
    if (usersDone || !(await ready())) return;
    try {
      await loadFollowing();
      let q = db.collection('users');
      q = q0 ? q.where('name', '>=', q0).where('name', '<', q0 + '').orderBy('name').limit(30) : q.orderBy('at', 'desc').limit(30);
      if (usersLast) q = q.startAfter(usersLast);
      const r = await q.get(); usersLast = r.docs[r.docs.length - 1] || usersLast; if (r.size < 30) usersDone = true;
      if (fresh && !r.size) box.append(el('div', 'empty', q0 ? 'Nobody has that name.' : 'No users yet.'));
      for (const d of r.docs) { const p = Object.assign({ uid: d.id }, d.data()); people.set(d.id, p); box.append(await userRow(p)); }
      $('usersMore').style.display = usersDone ? 'none' : '';
    } catch (e) { offline(e); }
  }

  // ---------- Make a post ----------
  let postImg = '', postBuild = null;
  function fileToJpeg(file, max, maxBytes) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => {
        URL.revokeObjectURL(u); let w = i.naturalWidth, h = i.naturalHeight, k = Math.min(1, max / Math.max(w, h)), q = .8, out = '';
        for (let tries = 0; tries < 8; tries++) {
          const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height);
          const wp = c.toDataURL('image/webp', q); out = wp.startsWith('data:image/webp') ? wp : c.toDataURL('image/jpeg', q); if (out.length <= maxBytes) break; if (q > .55) q -= .1; else k *= .8;
        }
        res(out);
      };
      i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That picture could not be opened.')); }; i.src = u;
    });
  }
  function squareJpeg(file, size) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); const c = document.createElement('canvas'); c.width = c.height = size; const s = Math.min(i.naturalWidth, i.naturalHeight); c.getContext('2d').drawImage(i, (i.naturalWidth - s) / 2, (i.naturalHeight - s) / 2, s, s, 0, 0, size, size); res(c.toDataURL('image/jpeg', .85)); };
      i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('bad')); }; i.src = u;
    });
  }
  function myGames() { try { return JSON.parse(localStorage.getItem('buildx-library') || '[]'); } catch (e) { return []; } }
  function paintGames() {
    const box = $('mkGames'); box.innerHTML = ''; const L = myGames();
    if (!L.length) { box.append(el('p', 'note', 'No NauticX games saved yet. In NauticX, use File > Save to My Games first.')); return; }
    const g0 = el('div', 'games'); box.append(g0);
    for (const g of L) {
      const b = el('button'); const t = el('div'); if (okImg(g.thumb)) t.style.backgroundImage = 'url("' + g.thumb + '")'; b.append(t, el('span', '', g.name));
      b.classList.toggle('on', !!postBuild && postBuild.id === g.id);
      b.onclick = () => { postBuild = postBuild && postBuild.id === g.id ? null : g; paintGames(); }; g0.append(b);
    }
  }
  function resetPost() { postImg = ''; postBuild = null; $('mkText').value = ''; $('mkPrev').style.display = 'none'; $('mkPrev').removeAttribute('src'); $('mkGamesWrap').style.display = 'none'; $('mkMsg').textContent = ''; }
  async function sendPost() {
    const text = $('mkText').value.trim().slice(0, 1000), msg = $('mkMsg');
    if (!postImg && !postBuild) { msg.textContent = 'Add a picture or a NauticX build.'; return; }
    if (postBuild && postBuild.data && postBuild.data.length > 950000) { msg.textContent = 'That build is too big to share (over 950 KB).'; return; }
    if (!(await ready())) return;
    const btn = $('mkSend'); btn.disabled = true; btn.textContent = 'Posting…'; msg.textContent = '';
    try {
      const ref = db.collection('posts').doc(), batch = db.batch();
      const img = postImg || (postBuild && okImg(postBuild.thumb) ? postBuild.thumb : '');
      const post = { uid: user.uid, text, img, galaxies: 0, at: FS.FieldValue.serverTimestamp() };
      if (postBuild) { post.build = { name: String(postBuild.name || 'My Game').slice(0, 60) }; batch.set(db.collection('builds').doc(ref.id), { uid: user.uid, name: post.build.name, data: postBuild.data, thumb: okImg(postBuild.thumb) ? postBuild.thumb : '', parts: postBuild.parts || 0, bots: postBuild.bots || 0 }); }
      batch.set(ref, post); await batch.commit();
      resetPost(); toast('Posted!'); goTab('feed'); setFeed('all');
    } catch (e) { offline(e); }
    btn.disabled = false; btn.textContent = 'Post';
  }

  // ---------- profile page ----------
  async function openProfile(uid) {
    if (!(await ready())) return;
    const ov = $('profOv'), bd = $('profBody'); bd.innerHTML = ''; ov.classList.add('on'); history.pushState({ ov: 'prof' }, '');
    try {
      people.delete(uid); const p = await person(uid); await loadFollowing();
      $('profTitle').textContent = p.shown || p.name;
      const top = el('div', 'prof'); top.append(avatar(p, 104), el('h2', '', p.shown || p.name)); if (p.bio) top.append(el('p', 'bio', p.bio));
      const q = await db.collection('posts').where('uid', '==', uid).limit(30).get();
      const posts = q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => ((b.at && b.at.toMillis()) || 0) - ((a.at && a.at.toMillis()) || 0));
      const nums = el('div', 'nums'); [[posts.length, 'posts'], [p.followers || 0, 'in their multiverse'], [p.following || 0, 'multiverses']].forEach(([n, t]) => { const d = el('div'); d.append(el('b', '', String(Math.max(0, n))), t); nums.append(d); });
      top.append(nums);
      if (user && uid === user.uid) { const e = el('button', '', 'Edit profile'); e.onclick = openSettings; top.append(e); } else top.append(mvButton(uid));
      bd.append(top);
      const g = el('div', 'grid'); if (!posts.length) bd.append(el('div', 'empty', 'No posts yet.'));
      for (const po of posts) { const b = el('button'); if (okImg(po.img)) b.style.backgroundImage = 'url("' + po.img + '")'; else b.textContent = po.text.slice(0, 60); b.onclick = async () => { bd.innerHTML = ''; bd.append(await card(po)); }; g.append(b); }
      bd.append(g);
    } catch (e) { offline(e); }
  }
  function closeOv(id) { $(id).classList.remove('on'); }

  // ---------- settings ----------
  let newPhoto = null;
  async function openSettings() {
    if (!(await ready())) return;
    const p = await person(user.uid); newPhoto = null;
    $('setPic').innerHTML = ''; $('setPic').append(avatar(p, 96)); $('setBio').value = p.bio || ''; $('setMsg').textContent = '';
    $('setGoogle').style.display = /^https:\/\/lh\d\.googleusercontent\.com\//.test(user.photoURL || '') ? '' : 'none';
    $('setOv').classList.add('on'); history.pushState({ ov: 'set' }, '');
  }
  async function saveSettings() {
    const btn = $('setSave'); btn.disabled = true;
    try {
      const ch = { bio: $('setBio').value.trim().slice(0, 150) }; if (newPhoto !== null) ch.photo = newPhoto;
      await db.collection('users').doc(user.uid).update(ch); const p = Object.assign(people.get(user.uid) || {}, ch); people.set(user.uid, p);
      HubAccount.rename({ photo: okImg(p.photo) && p.photo.length < 30000 ? p.photo : '' }); paintMe(); history.back(); toast('Saved.');
    } catch (e) { offline(e); }
    btn.disabled = false;
  }

  // ---------- start ----------
  let readyP = null;
  function ready() {
    if (!readyP) readyP = (async () => {
      if (!navigator.onLine) { toast('No internet. Connect to see posts and users.'); readyP = null; return false; }
      try {
        user = await HubAccount.user(); if (!user) { HubAccount.needSignIn(); readyP = null; return false; }
        db = HubAccount.db; FS = HubAccount.fs; me = await person(user.uid); people.set(user.uid, me); paintMe(); return true;
      } catch (e) { offline(e); readyP = null; return false; }
    })();
    return readyP;
  }
  let confirmBox = null, goTab = () => { }, openApp = () => { };
  function init(o) {
    confirmBox = o.confirm; goTab = o.tab; openApp = o.openApp;
    buildMenu(); placeMenu(false); paintMe();
    addEventListener('hubaccount', paintMe);
    $('me').onclick = () => $('meMenu').classList.contains('on') ? closeMenu() : openMenu();
    $('meShade').onclick = closeMenu;
    document.querySelectorAll('#feedSeg button').forEach(b => b.onclick = () => setFeed(b.dataset.f));
    $('feedMore').onclick = () => loadFeed(false);
    $('usersMore').onclick = () => loadUsers(false);
    let t = 0; $('userSearch').oninput = () => { clearTimeout(t); t = setTimeout(() => loadUsers(true), 300); };
    $('mkPickImg').onclick = () => $('mkFile').click();
    $('mkFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { postImg = await fileToJpeg(f, 1080, 220000); $('mkPrev').src = postImg; $('mkPrev').style.display = 'block'; } catch (er) { $('mkMsg').textContent = 'That picture could not be opened.'; } };
    $('mkPickBuild').onclick = () => { const w = $('mkGamesWrap'); w.style.display = w.style.display === 'none' ? '' : 'none'; paintGames(); };
    $('mkSend').onclick = sendPost;
    $('profBack').onclick = () => history.back();
    $('setBack').onclick = () => history.back();
    $('setSave').onclick = saveSettings;
    $('setUpload').onclick = () => $('setFile').click();
    $('setFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { newPhoto = await squareJpeg(f, 192); $('setPic').innerHTML = ''; $('setPic').append(avatar({ photo: newPhoto }, 96)); } catch (er) { $('setMsg').textContent = 'That picture could not be opened.'; } };
    $('setGoogle').onclick = () => { newPhoto = user.photoURL; $('setPic').innerHTML = ''; $('setPic').append(avatar({ photo: newPhoto }, 96)); };
    $('setNone').onclick = () => { newPhoto = ''; $('setPic').innerHTML = ''; $('setPic').append(avatar({ shown: me && me.shown }, 96)); };
    $('setOut').onclick = () => HubAccount.signOut();
    addEventListener('popstate', () => { closeOv('profOv'); closeOv('setOv'); closeMenu(); });
    // load more feed when scrolled near the bottom
    addEventListener('scroll', () => { if ($('p-feed').classList.contains('on') && !feedDone && innerHeight + scrollY > document.body.scrollHeight - 600) loadFeed(false); }, { passive: true });
  }
  function shown(tab) {
    if (tab === 'feed' && !$('feedList').childElementCount) loadFeed(true);
    if (tab === 'users' && !$('usersList').childElementCount) loadUsers(true);
    if (tab === 'post') { ready(); if ($('mkGamesWrap').style.display !== 'none') paintGames(); }
  }
  return { init, shown, openProfile, ready };
})();
