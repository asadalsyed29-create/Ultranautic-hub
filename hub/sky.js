// UltraNautic Hub background: deep space with slow-drifting stars, soft nebula clouds and the odd shooting star.
(() => {
  const c = document.getElementById('sky'); if (!c) return;
  const x = c.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, D = 1, stars = [], neb = null, shoot = null, last = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // nebula drawn once to its own canvas: layered soft clouds in teal, blue and violet, with dust lanes
  function paintNebula() {
    neb = document.createElement('canvas'); neb.width = Math.ceil(W / 2); neb.height = Math.ceil(H / 2);
    const n = neb.getContext('2d'), w = neb.width, h = neb.height;
    const g = n.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#030b1a'); g.addColorStop(.55, '#06203a'); g.addColorStop(1, '#0b3550');
    n.fillStyle = g; n.fillRect(0, 0, w, h);
    const cols = [[63, 214, 192], [70, 120, 255], [150, 90, 230], [40, 170, 230], [220, 110, 200]];
    n.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const [r, gg, b] = cols[i % cols.length], cx = w * (.15 + .7 * Math.random()), cy = h * (.1 + .55 * Math.random()), rad = Math.max(w, h) * rnd(.06, .26);
      const rg = n.createRadialGradient(cx, cy, 0, cx, cy, rad); const a = rnd(.015, .05);
      rg.addColorStop(0, `rgba(${r},${gg},${b},${a})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = rg; n.fillRect(0, 0, w, h);
    }
    n.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 18; i++) { // dark dust
      const cx = w * Math.random(), cy = h * rnd(.1, .7), rad = Math.max(w, h) * rnd(.04, .12), rg = n.createRadialGradient(cx, cy, 0, cx, cy, rad);
      rg.addColorStop(0, 'rgba(2,6,14,.28)'); rg.addColorStop(1, 'rgba(2,6,14,0)'); n.fillStyle = rg; n.fillRect(0, 0, w, h);
    }
  }
  function size() {
    D = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = W * D; c.height = H * D;
    stars = []; const N = Math.round(W * H / 1500);
    for (let i = 0; i < N; i++) { const z = Math.random(); stars.push({ x: Math.random() * W, y: Math.random() * H, z, r: .3 + z * z * z * 1.4, t: Math.random() * 6.3, s: rnd(.4, 1.6), hue: Math.random() < .15 ? (Math.random() < .5 ? '255,214,170' : '170,200,255') : '235,244,255' }); }
    paintNebula(); draw(0, true);
  }
  function draw(t, force) {
    x.setTransform(D, 0, 0, D, 0, 0); x.drawImage(neb, 0, 0, W, H);
    for (const s of stars) {
      if (!still) { s.y += s.z * .012 * (t - last || 0) / 16; if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; } }
      const tw = still ? .8 : .55 + .45 * Math.sin(t / 1000 * s.s + s.t), a = (.25 + .75 * s.z) * tw;
      x.fillStyle = `rgba(${s.hue},${a.toFixed(3)})`; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill();
      if (s.r > 1.2) { const g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4); g.addColorStop(0, `rgba(${s.hue},${(a * .35).toFixed(3)})`); g.addColorStop(1, `rgba(${s.hue},0)`); x.fillStyle = g; x.fillRect(s.x - s.r * 4, s.y - s.r * 4, s.r * 8, s.r * 8); }
    }
    if (!still) {
      if (!shoot && Math.random() < .0016) shoot = { x: rnd(W * .2, W), y: rnd(0, H * .4), vx: -rnd(5, 9), vy: rnd(2, 4), life: 1 };
      if (shoot) {
        const s = shoot, g = x.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
        g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.strokeStyle = g; x.lineWidth = 1.4; x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); x.stroke();
        s.x += s.vx; s.y += s.vy; s.life -= .018; if (s.life <= 0) shoot = null;
      }
    }
    last = t;
  }
  function loop(t) {
    const run = document.getElementById('run');
    if (!document.hidden && !(run && run.classList.contains('on'))) draw(t);
    if (!still) requestAnimationFrame(loop);
  }
  addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 150); });
  size(); if (!still) requestAnimationFrame(loop);
})();
