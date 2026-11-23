// UltraNautic Hub: your profile picture in the corner, the curved menu around it, and Settings (change your picture).
// The picture is saved on your account in Firebase (users/{uid}.photo, see accounts.js).
const HubSocial = (() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ICON = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16M4 12h16M4 19h10"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.8.7-.8 1.3v.8"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>'
  };
  let user = null, db = null, me = null;
  const okImg = u => typeof u === 'string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) || /^https:\/\/lh\d\.googleusercontent\.com\/[^\s"'()<>]+$/.test(u));
  function toast(t) { const d = el('div', 'toast', t); document.body.append(d); setTimeout(() => d.remove(), 2600); }
  const HUES = [200, 170, 260, 320, 20, 45, 140, 290];
  function avatar(p, size) {
    const a = el('div', 'av'); a.style.width = a.style.height = size + 'px'; a.style.fontSize = Math.round(size * .42) + 'px';
    if (p && okImg(p.photo)) { const i = el('img'); i.alt = ''; i.referrerPolicy = 'no-referrer'; i.src = p.photo; a.append(i); }
    else { const n = (p && (p.shown || p.name)) || '?'; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; a.style.background = 'hsl(' + HUES[h % HUES.length] + ' 55% 32%)'; a.textContent = n[0].toUpperCase(); }
    return a;
  }

  // ---------- profile picture in the corner + the curved menu around it ----------
  function paintMe() {
    const b = $('me'); b.innerHTML = '';
    const a = HubAccount.get(); if (!a) { b.style.display = 'none'; return; }
    b.style.display = ''; const av = avatar(me || { shown: a.name, photo: a.photo }, 48); av.style.border = '0'; b.append(av);
  }
  let goTab = () => { };
  const MENU = [['Settings', 'gear', () => openSettings()], ['Updates', 'news', () => goTab('updates')], ['Help', 'help', () => goTab('help')], ['Sign out', 'out', () => HubAccount.signOut()]];
  function buildMenu() {
    const m = $('meMenu'); m.innerHTML = '';
    MENU.forEach(([t, ic, fn], i) => { const b = el('button'); b.innerHTML = ICON[ic]; b.append(el('span', '', t)); b.style.transitionDelay = (i * 35) + 'ms'; b.onclick = () => { closeMenu(); fn(); }; m.append(b); });
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

  // ---------- settings: your picture ----------
  function squareJpeg(file, size) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); const c = document.createElement('canvas'); c.width = c.height = size; const s = Math.min(i.naturalWidth, i.naturalHeight); c.getContext('2d').drawImage(i, (i.naturalWidth - s) / 2, (i.naturalHeight - s) / 2, s, s, 0, 0, size, size); res(c.toDataURL('image/jpeg', .85)); };
      i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('bad')); }; i.src = u;
    });
  }
  let newPhoto = null;
  function showPic(p) { $('setPic').innerHTML = ''; $('setPic').append(avatar(p, 96)); }
  async function openSettings() {
    if (!(await ready())) return;
    newPhoto = null; showPic(me); $('setMsg').textContent = '';
    $('setGoogle').style.display = /^https:\/\/lh\d\.googleusercontent\.com\//.test(user.photoURL || '') ? '' : 'none';
    $('setOv').classList.add('on'); history.pushState({ ov: 'set' }, '');
  }
  async function saveSettings() {
    const btn = $('setSave'); btn.disabled = true;
    try {
      if (newPhoto !== null) { await db.collection('users').doc(user.uid).update({ photo: newPhoto }); me.photo = newPhoto; HubAccount.rename({ photo: okImg(newPhoto) && newPhoto.length < 30000 ? newPhoto : '' }); }
      paintMe(); history.back(); toast('Saved.');
    } catch (e) { console.warn('[settings]', e); $('setMsg').textContent = navigator.onLine ? 'Something went wrong. Try again.' : 'No internet. Connect and try again.'; }
    btn.disabled = false;
  }

  // ---------- start ----------
  let readyP = null;
  function ready() {
    if (!readyP) readyP = (async () => {
      if (!navigator.onLine) { toast('No internet. Connect to change your picture.'); readyP = null; return false; }
      try {
        user = await HubAccount.user(); if (!user) { HubAccount.needSignIn(); readyP = null; return false; }
        db = HubAccount.db; const d = await db.collection('users').doc(user.uid).get(); me = Object.assign({ uid: user.uid }, d.exists ? d.data() : {}); paintMe(); return true;
      } catch (e) { console.warn('[settings]', e); readyP = null; return false; }
    })();
    return readyP;
  }
  function init(o) {
    goTab = o.tab;
    buildMenu(); placeMenu(false); paintMe();
    addEventListener('hubaccount', paintMe);
    $('me').onclick = () => $('meMenu').classList.contains('on') ? closeMenu() : openMenu();
    $('meShade').onclick = closeMenu;
    $('setBack').onclick = () => history.back();
    $('setSave').onclick = saveSettings;
    $('setUpload').onclick = () => $('setFile').click();
    $('setFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { newPhoto = await squareJpeg(f, 192); showPic({ photo: newPhoto }); } catch (er) { $('setMsg').textContent = 'That picture could not be opened.'; } };
    $('setGoogle').onclick = () => { newPhoto = user.photoURL; showPic({ photo: newPhoto }); };
    $('setNone').onclick = () => { newPhoto = ''; showPic({ shown: me && me.shown }); };
    $('setOut').onclick = () => HubAccount.signOut();
    addEventListener('popstate', () => { $('setOv').classList.remove('on'); closeMenu(); });
    // the saved account's picture shows straight away; fetch the newest one once online
    if (HubAccount.get() && navigator.onLine) setTimeout(() => ready(), 1500);
  }
  return { init, shown() { } };
})();
