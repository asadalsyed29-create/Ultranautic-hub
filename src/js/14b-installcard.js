/* opened from the UltraNautic Hub's Install button (link ends in ?install=1): offer to put the app on the home screen right away */
(function () {
  if (!/[?&#]install=1/.test(location.search + location.hash)) return;
  var NAME = 'Nautic Editor', ICON = 'icons/nautic10-192.png';
  var evt = null, card = null, txt = null, btn = null, done = false;
  var standalone = (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); evt = e; upd(); });
  addEventListener('appinstalled', function () { done = true; evt = null; upd(); });
  function el(t, css, html) { var e = document.createElement(t); if (css) e.style.cssText = css; if (html != null) e.textContent = html; return e; }
  function upd() {
    if (!card) return;
    btn.style.display = 'none';
    if (done) txt.textContent = NAME + ' is installed. Open it from your home screen.';
    else if (standalone) txt.textContent = 'You are already using the installed ' + NAME + '.';
    else if (evt) { txt.textContent = 'Put ' + NAME + ' on your home screen. It opens like an app and works offline.'; btn.style.display = ''; }
    else if (ios) txt.textContent = 'In Safari, tap the Share button, then “Add to Home Screen”.';
    else txt.textContent = 'Getting ready…';
  }
  function build() {
    card = el('div', 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647;width:min(420px,calc(100% - 24px));background:#16181c;color:#e8e9ec;border:1px solid #33363d;padding:14px;font:14px/1.45 system-ui,sans-serif;box-sizing:border-box');
    var top = el('div', 'display:flex;align-items:center;gap:12px;margin-bottom:10px');
    var im = el('img', 'width:44px;height:44px;flex:none'); im.src = ICON; im.alt = '';
    top.appendChild(im); top.appendChild(el('div', 'font-weight:700;font-size:16px', 'Install ' + NAME));
    txt = el('div', 'color:#b9bcc4');
    var row = el('div', 'display:flex;gap:8px;margin-top:12px;justify-content:flex-end');
    btn = el('button', 'background:#3fd6c0;color:#04201b;border:0;padding:9px 16px;font:600 14px system-ui,sans-serif;cursor:pointer', 'Install');
    var no = el('button', 'background:transparent;color:#e8e9ec;border:1px solid #33363d;padding:9px 16px;font:14px system-ui,sans-serif;cursor:pointer', 'Close');
    btn.onclick = function () { if (!evt) return; var e = evt; evt = null; e.prompt(); e.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { done = true; } upd(); }).catch(upd); };
    no.onclick = function () { card.remove(); };
    row.appendChild(no); row.appendChild(btn);
    card.appendChild(top); card.appendChild(txt); card.appendChild(row);
    document.body.appendChild(card); upd();
    setTimeout(function () { if (!evt && !done && !standalone && !ios) txt.textContent = 'Open your browser menu (the ⋮ button in Chrome) and tap “Install app” or “Add to Home screen”.'; }, 4000);
  }
  if (document.body) build(); else addEventListener('DOMContentLoaded', build);
})();
