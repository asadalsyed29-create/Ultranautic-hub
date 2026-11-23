// UltraNautic Hub accounts: pick a username nobody else has + a password, or sign in with Google.
// Runs on Firebase (Auth + Firestore). Paste the project's firebaseConfig below.
// The signed-in name is saved in localStorage 'ultranautic.account' so every app in the hub can read it.
const HubAccount = (() => {
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBXwHJ1hwndeNrAb4xEKImqFcFcyo_duZo',
    authDomain: 'ultranautic-a5f48.firebaseapp.com',
    projectId: 'ultranautic-a5f48',
    storageBucket: 'ultranautic-a5f48.firebasestorage.app',
    messagingSenderId: '204998280679',
    appId: '1:204998280679:web:e084e8e19e2301ee722942'
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const KEY = 'ultranautic.account';
  const MAILDOMAIN = '@users.ultranautic.app'; // usernames sign in as name@users.ultranautic.app (no real email)
  const $ = id => document.getElementById(id);
  let fb = null, auth = null, db = null, onReady = null, busy = false;

  const saved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = a => { try { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); } catch (e) { } };

  // names that look like Outernautica are blocked (only the exact name can be taken, by its owner)
  function lookalike(n) {
    const s = n.toLowerCase().replace(/[_\s.-]/g, '').replace(/0/g, 'o').replace(/[1!|]/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/vv/g, 'w').replace(/u/g, 'v').replace(/i/g, 'l');
    const t = 'ovternavtlca';
    if (n.toLowerCase() === 'outernautica') return false;
    if (s.includes(t)) return true;
    // close spellings (one or two letters changed, added or missing)
    const d = (a, b) => { const m = []; for (let i = 0; i <= a.length; i++) { m[i] = [i]; for (let j = 1; j <= b.length; j++) m[i][j] = i ? Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; } return m[a.length][b.length]; };
    return d(s, t) <= 2;
  }
  function checkName(n) {
    if (!n) return 'Type a username.';
    if (n.length < 3) return 'Usernames need at least 3 letters.';
    if (n.length > 20) return 'Usernames can have up to 20 letters.';
    if (!/^[A-Za-z0-9_]+$/.test(n)) return 'Use only letters, numbers and _ in your username.';
    if (lookalike(n)) return 'That username is taken.';
    return '';
  }

  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = SDK + src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function start() {
    if (fb) return true;
    if (!FIREBASE_CONFIG) return false;
    await load('firebase-app-compat.js'); await load('firebase-auth-compat.js'); await load('firebase-firestore-compat.js');
    fb = firebase.initializeApp(FIREBASE_CONFIG); auth = firebase.auth(); db = firebase.firestore();
    return true;
  }

  function msg(t, good) { const m = $('acMsg'); m.textContent = t || ''; m.className = 'check ' + (good ? 'good' : 'bad'); }
  function lock(on) { busy = on; document.querySelectorAll('#acct button, #acct input').forEach(b => b.disabled = on); }
  function view(v) { ['acMain', 'acPick'].forEach(id => $(id).style.display = id === v ? '' : 'none'); msg(''); }
  function done(a) { save(a); $('acct').classList.remove('on'); paintBar(); if (onReady) { const f = onReady; onReady = null; f(a); } }
  function paintBar() { dispatchEvent(new CustomEvent('hubaccount', { detail: saved() })); }

  // write users/{uid} and usernames/{name} together; fails if the name is already someone's
  async function claim(user, name) {
    const low = name.toLowerCase();
    const ref = db.collection('usernames').doc(low);
    await db.runTransaction(async tx => {
      const got = await tx.get(ref);
      if (got.exists && got.data().uid !== user.uid) throw { code: 'taken' };
      tx.set(db.collection('users').doc(user.uid), { name: low, shown: name, photo: /^https:\/\/lh\d\.googleusercontent\.com\//.test(user.photoURL || '') ? user.photoURL : '', bio: '', at: firebase.firestore.FieldValue.serverTimestamp() });
      tx.set(ref, { uid: user.uid });
    });
    return { uid: user.uid, name };
  }
  async function nameOf(user) { const d = await db.collection('users').doc(user.uid).get(); return d.exists ? (d.data().shown || d.data().name) : null; }

  function why(e) {
    const c = (e && e.code) || '';
    if (c === 'taken' || c === 'auth/email-already-in-use' || c === 'permission-denied') return 'That username is taken.';
    if (c === 'auth/weak-password') return 'Passwords need at least 6 letters or numbers.';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Wrong username or password.';
    if (c === 'auth/too-many-requests') return 'Too many tries. Wait a minute and try again.';
    if (c === 'auth/network-request-failed' || c === 'unavailable') return 'No internet. Connect and try again.';
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
    if (c === 'not-set-up') return 'Accounts are not connected yet.';
    return 'Something went wrong. Try again.';
  }
  async function run(fn) { if (busy) return; lock(true); msg(''); try { if (!(await start())) throw { code: 'not-set-up' }; await fn(); } catch (e) { console.warn('[account]', e); msg(why(e)); } lock(false); }

  async function signUp() {
    const n = $('acName').value.trim(), p = $('acPass').value, bad = checkName(n);
    if (bad) return msg(bad);
    if (p.length < 6) return msg('Passwords need at least 6 letters or numbers.');
    await run(async () => {
      const taken = await db.collection('usernames').doc(n.toLowerCase()).get();
      if (taken.exists) throw { code: 'taken' };
      const cred = await auth.createUserWithEmailAndPassword(n.toLowerCase() + MAILDOMAIN, p);
      try { done(await claim(cred.user, n)); } catch (e) { await cred.user.delete().catch(() => { }); throw e; }
    });
  }
  async function logIn() {
    const n = $('acName').value.trim(), p = $('acPass').value;
    if (!n || !p) return msg('Type your username and password.');
    await run(async () => {
      const cred = await auth.signInWithEmailAndPassword(n.toLowerCase() + MAILDOMAIN, p);
      done({ uid: cred.user.uid, name: (await nameOf(cred.user)) || n });
    });
  }
  async function google() {
    await run(async () => {
      const pr = new firebase.auth.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
      let cred;
      try { cred = await auth.signInWithPopup(pr); } catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await auth.signInWithRedirect(pr); return; } throw e; }
      await afterGoogle(cred.user);
    });
  }
  // a Google sign-in with no username yet picks one first
  async function afterGoogle(user) { const n = await nameOf(user); if (n) done({ uid: user.uid, name: n }); else { view('acPick'); $('acPickName').focus(); } }
  async function pick() {
    const n = $('acPickName').value.trim(), bad = checkName(n);
    if (bad) return msg(bad);
    await run(async () => { done(await claim(auth.currentUser, n)); });
  }
  async function signOut() { save(null); try { if (await start()) await auth.signOut(); } catch (e) { } location.reload(); }

  // shows the sign-in screen unless already signed in; calls ready(account) once signed in
  async function init(ready) {
    paintBar();
    $('acSignUp').onclick = signUp; $('acLogIn').onclick = logIn; $('acGoogle').onclick = google; $('acPickOk').onclick = pick;
    $('acPickBack').onclick = () => { if (auth) auth.signOut(); view('acMain'); };
    $('acPass').onkeydown = e => { if (e.key === 'Enter') logIn(); };
    $('acPickName').onkeydown = e => { if (e.key === 'Enter') pick(); };
    const a = saved();
    if (a) { ready(a); return; } // signed in before: open right away, even offline
    onReady = ready; view('acMain'); $('acct').classList.add('on');
    // coming back from a Google redirect
    try { if (await start()) { const r = await auth.getRedirectResult(); if (r && r.user) { lock(true); await afterGoogle(r.user); lock(false); } } } catch (e) { lock(false); msg(why(e)); }
  }
  // the signed-in Firebase user (waits for Firebase to wake up); null if the sign-in ran out
  async function user() {
    if (!(await start())) return null;
    if (auth.currentUser) return auth.currentUser;
    return new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
  }
  // the hub saved an account but Firebase forgot it: sign in again
  async function needSignIn() { save(null); paintBar(); onReady = () => location.reload(); view('acMain'); $('acct').classList.add('on'); }
  function rename(a) { save(Object.assign(saved() || {}, a)); paintBar(); }
  return { init, get: saved, signOut, checkName, user, needSignIn, rename, start, get db() { return db; }, get fs() { return firebase.firestore; } };
})();
