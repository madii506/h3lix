import { startWorld } from './world.js';
import { wipeTo, wipeIn, fmt, countTo, getJSON } from './fx.js';

wipeIn();
// the world
const canvas = document.getElementById('world');
let world = null, windowOn = true;
try {
  if (/[?&]noworld/.test(location.search)) throw new Error('off');
  world = startWorld(canvas, { active: () => (windowOn ? 1 : 0.25) });
} catch (e) { canvas.style.background = 'radial-gradient(circle at 70% 45%,#3a1a2a,#07060f 60%)'; }
// each section names a camera shot; the world flies there while you scroll
const shotIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  if (world) world.setShot(e.target.dataset.shot);
  windowOn = e.target.hasAttribute('data-window');
}), { rootMargin: '-40% 0px -55% 0px' });
const pinned = (location.search.match(/[?&]shot=(\w+)/) || [])[1];
if (pinned && world) world.setShot(pinned, true); else document.querySelectorAll('[data-shot]').forEach(s => shotIO.observe(s));

// nav: solid after the hero, active section underlined
const nav = document.getElementById('nav');
const links = [...document.querySelectorAll('.links a')];
const onScroll = () => {
  nav.classList.toggle('solid', scrollY > innerHeight * 0.6);
  document.querySelector('.shade').style.opacity = String(Math.max(0.35, 1 - scrollY / innerHeight));
  const max = document.documentElement.scrollHeight - innerHeight;
  document.getElementById('prog').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const secIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => secIO.observe(s));

// reveal with a stagger inside each section
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); if (e.target.classList.contains('scr')) scramble(e.target); io.unobserve(e.target); } }), { threshold: 0.12 });
// headings decrypt themselves: each letter runs through cipher glyphs before it settles
const GLYPHS = '█▓▒░#$%&*+=?@01ABCDEFGHJKLMNPQRSTUVWXYZ';
function scramble(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || el.dataset.scr) return;
  el.dataset.scr = '1';
  const nodes = []; const walk = n => { for (const c of [...n.childNodes]) { if (c.nodeType === 3 && c.textContent.trim()) nodes.push(c); else if (c.nodeType === 1) walk(c); } };
  walk(el);
  const items = nodes.map(n => ({ n, txt: n.textContent }));
  const total = items.reduce((a, i) => a + i.txt.length, 0); const t0 = performance.now(), dur = 650 + total * 12;
  const tick = now => {
    const k = (now - t0) / dur; let idx = 0;
    for (const it of items) {
      let out = '';
      for (const ch of it.txt) { const at = idx++ / total; out += ch === ' ' ? ' ' : (k > at * 0.8 + 0.2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]); }
      it.n.textContent = out;
    }
    if (k < 1) requestAnimationFrame(tick); else items.forEach(it => { it.n.textContent = it.txt; });
  };
  requestAnimationFrame(tick);
}
document.querySelectorAll('section').forEach(sec => sec.querySelectorAll('.rv').forEach((el, i) => { el.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); io.observe(el); }));
setTimeout(() => document.querySelectorAll('.rv').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('vis'); }), 2500);

// enter: pixel wipe into the terminal
document.querySelectorAll('[data-enter]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); wipeTo(a.getAttribute('href')); }));
// smooth anchors
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault();
  t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));

// the wordmark assembles from coral pixels, then the crisp type takes over
(async function mark() {
  const h = document.getElementById('mark'), txt = h.querySelector('.mark-txt'), cv = h.querySelector('.mark-px');
  try { await document.fonts.load('600 100px Disp'); } catch (e) {}
  const r = txt.getBoundingClientRect(), hr = h.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.ceil(r.width + 40), H = Math.ceil(hr.height + 20);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d');
  const cs = getComputedStyle(h);
  oc.font = `${cs.fontWeight} ${cs.fontSize} Disp`; oc.textBaseline = 'alphabetic'; oc.fillStyle = '#fff';
  oc.letterSpacing = cs.letterSpacing;
  const m = oc.measureText('H3LIX');
  const base = (H - 20 + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 + 6;
  oc.fillText('H3LIX', txt.offsetLeft, base);
  const cell = Math.max(5, Math.round(parseFloat(cs.fontSize) / 26));
  const data = oc.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) if (data[((y + (cell >> 1)) * W + x + (cell >> 1)) * 4 + 3] > 128) pts.push({ x, y, sx: x - 260 - Math.random() * 380, sy: y + 160 + Math.random() * 260, d: Math.random() * 0.5 + (1 - x / W) * 0.35 });
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = reduce ? 1 : 1500, t0 = performance.now();
  const draw = now => {
    const k = (now - t0) / T; c.clearRect(0, 0, W, H);
    for (const p of pts) {
      const u = Math.max(0, Math.min(1, (k - p.d * 0.6) / 0.55)), e = 1 - Math.pow(1 - u, 3);
      const x = p.sx + (p.x - p.sx) * e, y = p.sy + (p.y - p.sy) * e, s = cell * (0.45 + 0.55 * e);
      c.globalAlpha = Math.min(1, u * 3);
      c.fillStyle = u < 1 ? '#ff5a32' : '#f3f2fa';
      c.fillRect(x + (cell - s) / 2, y + (cell - s) / 2, s - 0.6, s - 0.6);
    }
    if (k < 1.25) requestAnimationFrame(draw); else h.classList.add('done');
  };
  requestAnimationFrame(draw);
  setTimeout(() => h.classList.add('done'), T + 1200);
})();

// spiral calculator: weight = bag x (1 + min(days,30)/15)
const amt = document.getElementById('cAmt'), day = document.getElementById('cDay');
const bagOf = v => v <= 0 ? 0 : Math.round(Math.pow(10, 3 + v / 100 * 5));        // 1K .. 100M
const mul = d => 1 + Math.min(d, 30) / 15;
function calc() {
  const bag = bagOf(+amt.value), d = +day.value, m = mul(d);
  amt.style.setProperty('--p', amt.value + '%'); day.style.setProperty('--p', (day.value / 45 * 100) + '%');
  document.getElementById('cAmtO').textContent = bag.toLocaleString('en-US');
  document.getElementById('cDayO').textContent = d;
  document.getElementById('cMul').textContent = m.toFixed(2) + '×';
  document.getElementById('cW').textContent = fmt.big(bag * m);
  spiralDays = d;
}
let spiralDays = 10;
amt.addEventListener('input', calc); day.addEventListener('input', calc); calc();

// the spiral drawing: pixels laid along a helix seen from above; it grows with the days held
(function spiral() {
  const cv = document.getElementById('spiralc'), c = cv.getContext('2d');
  let shown = 0, t = 0, vis = false;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(cv);
  const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; };
  fit(); addEventListener('resize', fit);
  const loop = () => {
    requestAnimationFrame(loop); if (!vis) return;
    t += 0.016; shown += (spiralDays - shown) * 0.08;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, cell = W / 52;
    c.clearRect(0, 0, W, H);
    const turns = 0.6 + shown / 45 * 3.4, n = Math.floor(70 + shown * 9);
    for (let i = 0; i < n; i++) {
      const u = i / n, th = u * turns * Math.PI * 2 - t * 0.6, r = (0.06 + u * 0.42) * W;
      const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r * 0.92;
      const gx = Math.round(x / cell) * cell, gy = Math.round(y / cell) * cell, s = cell * (0.5 + 0.5 * u);
      c.fillStyle = u > 0.985 ? '#fff' : `rgba(255,${Math.round(90 + 80 * (1 - u))},${Math.round(50 + 60 * (1 - u))},${(0.25 + 0.75 * u).toFixed(2)})`;
      c.fillRect(gx - s / 2, gy - s / 2, s, s);
    }
    c.fillStyle = '#ff5a32'; c.fillRect(cx - cell, cy - cell, cell * 2, cell * 2);
  };
  loop();
})();

// live readings
const set = (k, v, cls) => document.querySelectorAll(`[data-live="${k}"]`).forEach(el => {
  if (typeof v === 'number' && el.hasAttribute('data-count')) countTo(el, v, fmt.int); else el.textContent = v;
  el.classList.remove('ok', 'bad', 'idle'); if (cls) el.classList.add(cls);
});
async function live() {
  try {
    const n = await getJSON('/api/net');
    if (n.slot) set('slot', n.slot); if (n.tps) set('tps', n.tps); if (n.sol) set('sol', fmt.usd(n.sol));
  } catch (e) { set('slot', '—'); }
  try {
    const r = await getJSON('/api/ring');
    const s = x => x && x.ok ? [x.ms + ' ms', 'ok'] : ['down', 'bad'];
    const [a, ac] = s(r.indexer), [b, bc] = s(r.prover);
    set('indexer', a, ac); set('prover', b, bc);
    set('ringstate', r.indexer && r.indexer.ok && r.prover && r.prover.ok ? 'UP' : 'CHECKING');
  } catch (e) { set('ringstate', '—'); }
  try {
    const a = await getJSON('/api/agent');
    if (!a.configured) set('agent', 'Not live yet', 'idle');
    else set('agent', fmt.sol(a.sol) + ' SOL', 'ok');
  } catch (e) { set('agent', '—'); }
}
live(); setInterval(() => { if (!document.hidden) live(); }, 15000);

// ---------- v2 motion ----------
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
// spiral progress bar under the calculator
const cBar = document.getElementById('cBar');
const upBar = () => { cBar.style.width = (Math.min(+document.getElementById('cDay').value, 30) / 30 * 100) + '%'; };
document.getElementById('cDay').addEventListener('input', upBar); upBar();

// the cycle: the wheel and the list walk through the five steps; a real UTC clock beside it
(function cycle() {
  const spans = [...document.querySelectorAll('#wheel span')], lis = [...document.querySelectorAll('#clist li')], hand = document.querySelector('#wheel .hand');
  let i = 0;
  const step = () => { spans.forEach((s, k) => s.classList.toggle('on', k === i)); lis.forEach((l, k) => l.classList.toggle('on', k === (i === 2 ? 2 : i === 4 ? 4 : i))); hand.style.setProperty('--h', (180 + i * 72) + 'deg'); i = (i + 1) % 5; };
  step(); setInterval(step, RM ? 4000 : 1700);
  const utc = document.getElementById('utc'), nc = document.getElementById('nextc');
  const clock = () => { const d = new Date(); utc.textContent = d.toISOString().slice(11, 19); nc.textContent = String((d.getUTCHours() + 1) % 24).padStart(2, '0') + ':00'; };
  clock(); setInterval(clock, 1000);
})();

// the cipher rows keep churning, the way the amount looks to anyone reading the chain
(function cipher() {
  const els = [...document.querySelectorAll('.crow .enc')], G = '0123456789abcdef';
  const tick = () => { for (const e of els) { let s = ''; for (let k = 0; k < 16; k++) s += G[(Math.random() * 16) | 0]; e.textContent = '0x' + s; } };
  tick(); if (!RM) setInterval(tick, 140);
})();

// a typed tour of the terminal (commands and what they do, no numbers)
(function typer() {
  const el = document.getElementById('typer'); if (!el) return;
  const script = [
    ['h3lix> ', 'help', 'connect · wallet · scan · private · pairs · agent · ring · spiral'],
    ['h3lix> ', 'connect', 'wallet connected'],
    ['h3lix> ', 'private', 'sign TSPP/derive/v1 in your wallet… private wallet derived ✓'],
    ['h3lix> ', 'ring', 'indexer up · prover up'],
    ['h3lix> ', 'spiral 1000000 30', 'spiral 3.00× → weight 3.00M'],
  ];
  let started = false;
  new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; run(); } }, { threshold: 0.3 }).observe(el);
  const wait = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  async function run() {
    for (;;) {
      el.innerHTML = '';
      for (const [p, cmd, out] of script) {
        const line = document.createElement('div'); line.innerHTML = `<span class="p">${p}</span><span class="t"></span><span class="c"></span>`; el.appendChild(line);
        const t = line.querySelector('.t');
        for (const ch of cmd) { t.textContent += ch; await wait(45 + Math.random() * 60); }
        await wait(260); line.querySelector('.c').remove();
        const o = document.createElement('div'); o.className = 'o'; o.textContent = out; el.appendChild(o);
        await wait(700);
      }
      await wait(2600);
    }
  }
})();

// magnetic buttons
if (!RM && matchMedia('(pointer:fine)').matches) document.querySelectorAll('.mag').forEach(b => {
  b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`; });
  b.addEventListener('pointerleave', () => { b.style.transform = ''; });
});

// a short trail of coral pixels behind the cursor
(function trail() {
  if (RM || !matchMedia('(pointer:fine)').matches) return;
  const cv = document.getElementById('trail'), c = cv.getContext('2d'); const pts = [];
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; }; fit(); addEventListener('resize', fit);
  let lx = 0, ly = 0;
  addEventListener('pointermove', e => { const d = Math.hypot(e.clientX - lx, e.clientY - ly); if (d > 14) { lx = e.clientX; ly = e.clientY; pts.push({ x: Math.round(lx / 8) * 8, y: Math.round(ly / 8) * 8, a: 1 }); if (pts.length > 26) pts.shift(); } }, { passive: true });
  const tick = () => {
    requestAnimationFrame(tick); c.clearRect(0, 0, cv.width, cv.height);
    for (const p of pts) { p.a -= 0.035; if (p.a <= 0) continue; const s = 8 * p.a; c.globalAlpha = p.a * 0.85; c.fillStyle = '#ff5a32'; c.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
    c.globalAlpha = 1;
  };
  tick();
})();

// epoch from the same live read
(async function epoch() {
  try {
    const n = await getJSON('/api/net');
    if (n.epoch != null) {
      document.querySelectorAll('[data-live="epoch"]').forEach(e => { e.textContent = String(n.epoch); });
      const pct = n.slotsInEpoch ? n.slotIndex / n.slotsInEpoch * 100 : null;
      if (pct != null) { document.querySelectorAll('[data-live="epochpct"]').forEach(e => { e.textContent = pct.toFixed(1) + '% through'; }); setTimeout(() => { document.getElementById('ebar').style.width = pct.toFixed(2) + '%'; }, 400); }
    }
  } catch (e) {}
})();
