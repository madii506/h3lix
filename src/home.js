import { startWorld } from './world.js';
import { wipeTo, wipeIn, fmt, countTo, getJSON } from './fx.js';
import * as W from './wallet.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
wipeIn();

// ---------- the world ----------
const canvas = $('#world');
let world = null, windowOn = true, entered = false;
try {
  if (/[?&]noworld/.test(location.search)) throw new Error('off');
  world = startWorld(canvas, { startShot: 'gate', active: () => (!entered || windowOn ? 1 : 0.3) });
} catch (e) { canvas.style.background = 'radial-gradient(circle at 70% 45%,#3a1a2a,#07060f 60%)'; }

// ---------- scroll-scrubbed camera: each section names a shot, the camera glides between them ----------
let anchors = [];
function measure() {
  anchors = $$('[data-cam]').map(el => {
    const r = el.getBoundingClientRect(), top = r.top + scrollY;
    return { y: top + Math.min(r.height, innerHeight * 1.6) / 2 - innerHeight / 2, shot: el.dataset.cam, win: el.hasAttribute('data-window') || el.classList.contains('words') };
  }).sort((a, b) => a.y - b.y);
}
const ease = t => t * t * (3 - 2 * t);
function camByScroll() {
  if (!world || !entered || !anchors.length) return;
  const y = scrollY; let i = 0;
  while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
  const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
  const t = B === A ? 0 : ease(clamp((y - A.y) / (B.y - A.y)));
  const sa = world.shots[A.shot], sb = world.shots[B.shot];
  const mix = (p, q) => p.map((v, k) => v + (q[k] - v) * t);
  world.setTarget(mix(sa.pos, sb.pos), mix(sa.look, sb.look));
  windowOn = (t < 0.5 ? A : B).win;
}
addEventListener('resize', () => { measure(); camByScroll(); });

// ---------- the gate: H3LIX, Connect, Enter ----------
const gate = $('#gate'), flash = $('#flash');
function openSite(instant) {
  entered = true;
  document.body.classList.remove('locked', 'entering');
  gate.classList.add('out');
  setTimeout(() => gate.classList.add('gone'), instant ? 0 : 1300);
  try { sessionStorage.setItem('h3lix:in', '1'); } catch (e) {}
  if (!location.hash) scrollTo(0, 0);
  measure(); camByScroll(); scenes();
  revealCheck();
}
function enter() {
  if (entered) return;
  document.body.classList.add('entering');
  gate.classList.add('out');
  if (!world) { openSite(); return; }
  world.flyIn({
    dur: 2.5,
    onFlash: () => { flash.classList.add('on'); },
    onDone: () => { openSite(); setTimeout(() => flash.classList.remove('on'), 60); },
  });
  setTimeout(() => { if (!entered) { openSite(); flash.classList.remove('on'); } }, 4200);
}
$('#gEnter').addEventListener('click', enter);
addEventListener('keydown', e => { if (!entered && e.key === 'Enter' && document.activeElement === document.body) enter(); });

// ---------- wallet: connect from the gate or the nav ----------
const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
function menuHTML() {
  const st = W.state();
  if (st.address) return `<p>${esc(st.wallet.name)} · ${fmt.short(st.address)}</p><button data-m="copy">Copy address</button><a href="/terminal#wallet" data-m="term">Open in terminal</a><a href="https://solscan.io/account/${st.address}" target="_blank" rel="noopener">View on Solscan ↗</a><button data-m="disc">Disconnect</button>`;
  const found = W.list(); let h = '<p>Connect a wallet</p>';
  for (const w of found) h += `<button data-w="${esc(w.name)}">${w.icon ? `<img src="${esc(w.icon)}" alt="">` : `<span class="lt">${esc(w.name[0])}</span>`}${esc(w.name)}<small>detected</small></button>`;
  for (const k of W.KNOWN) if (!found.some(w => w.name === k.name)) { const href = mobile && k.deep ? k.deep(location.href) : k.url; h += `<a href="${esc(href)}" target="_blank" rel="noopener"><span class="lt">${k.name[0]}</span>${k.name}<small>${mobile && k.deep ? 'open in app' : 'install'}</small></a>`; }
  return h;
}
function bindMenu(btn, menu) {
  btn.addEventListener('click', e => { e.stopPropagation(); if (!menu.hidden) { menu.hidden = true; return; } $$('.menu').forEach(m => { m.hidden = true; }); menu.innerHTML = menuHTML(); menu.hidden = false; });
  menu.addEventListener('click', async e => {
    const b = e.target.closest('button,a'); if (!b) return;
    if (b.dataset.w) { menu.hidden = true; try { await W.connect(b.dataset.w); } catch (err) {} return; }
    if (b.dataset.m === 'copy') { navigator.clipboard.writeText(W.state().address).catch(() => {}); menu.hidden = true; }
    if (b.dataset.m === 'disc') { menu.hidden = true; await W.disconnect(); }
    if (b.dataset.m === 'term') { e.preventDefault(); menu.hidden = true; wipeTo('/terminal#wallet'); }
  });
}
bindMenu($('#gConnect'), $('#gMenu')); bindMenu($('#nConnect'), $('#nMenu'));
document.addEventListener('click', e => $$('.menu').forEach(m => { if (!m.hidden && !m.contains(e.target)) m.hidden = true; }));
addEventListener('keydown', e => { if (e.key === 'Escape') $$('.menu').forEach(m => { m.hidden = true; }); });
function renderConn() {
  const a = W.state().address;
  $('#gConnect').innerHTML = a ? `<i class="g"></i>${fmt.short(a)}` : 'Connect';
  $('#nConnect').innerHTML = a ? `<i class="g"></i>${fmt.short(a)}` : 'Connect';
}
W.onChange(renderConn); renderConn(); W.reconnect();

// ---------- nav, progress, chapters ----------
const nav = $('#nav'), links = $$('.links a'), chaps = $$('.chapters a');
function onScroll() {
  nav.classList.toggle('solid', scrollY > 40);
  camByScroll(); scenes();
}
addEventListener('scroll', onScroll, { passive: true });
const secIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const id = '#' + e.target.id;
  links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === id));
  chaps.forEach(a => a.classList.toggle('on', a.getAttribute('href') === id));
}), { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach(s => secIO.observe(s));
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault();
  if (!entered) openSite(true);
  t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
}));
$$('[data-enter]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); wipeTo(a.getAttribute('href')); }));

// ---------- reveal + decrypting headings ----------
const GLYPHS = '█▓▒░#$%&*+=?@01ABCDEFGHJKLMNPQRSTUVWXYZ';
function scramble(el) {
  if (RM || el.dataset.scr) return; el.dataset.scr = '1';
  const nodes = []; const walk = n => { for (const c of [...n.childNodes]) { if (c.nodeType === 3 && c.textContent.trim()) nodes.push(c); else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c); } };
  walk(el);
  const items = nodes.map(n => ({ n, txt: n.textContent })); const total = items.reduce((a, i) => a + i.txt.length, 0) || 1;
  const t0 = performance.now(), dur = 650 + total * 12;
  const tick = now => {
    const k = (now - t0) / dur; let idx = 0;
    for (const it of items) { let out = ''; for (const ch of it.txt) { const at = idx++ / total; out += ch === ' ' ? ' ' : (k > at * 0.8 + 0.2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]); } it.n.textContent = out; }
    if (k < 1) requestAnimationFrame(tick); else items.forEach(it => { it.n.textContent = it.txt; });
  };
  requestAnimationFrame(tick);
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && entered) { e.target.classList.add('vis'); if (e.target.classList.contains('scr')) scramble(e.target); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('main section').forEach(sec => sec.querySelectorAll('.rv, .scr').forEach((el, i) => { el.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); io.observe(el); }));
function revealCheck() { setTimeout(() => $$('.rv, .scr').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('vis'); if (el.classList.contains('scr')) scramble(el); } }), 200); }

// ---------- pinned scenes, driven by scroll ----------
const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
const big = $('#bigtxt'); const HOT = new Set(['agent.', 'Privacy', 'Ring', 'private.', 'pays.']);
big.innerHTML = big.textContent.split(' ').map(w => `<span class="w${HOT.has(w) ? ' hot' : ''}">${esc(w)}</span>`).join(' ');
const words = $$('#bigtxt .w');
const hsSec = $('#loop'), track = $('#hstrack'), panels = $$('.hpanel');
const encSec = $('#ring'), encRows = $$('#cipher .enc'), encTs = $$('#cipher [data-t]');
const HEX = '0123456789abcdef';
const roll = $('#roll');
let lastEncK = -1;
function scenes() {
  if (!entered) return;
  const k1 = prog($('#about'));
  const n = Math.round(k1 * 1.15 * words.length);
  words.forEach((w, i) => w.classList.toggle('on', i < n));
  const k2 = prog(hsSec);
  const maxX = Math.max(0, track.scrollWidth - innerWidth);
  track.style.transform = `translate3d(${(-k2 * maxX).toFixed(1)}px,0,0)`;
  $('#hsbar').style.width = (k2 * 100) + '%';
  const center = innerWidth / 2; panels.forEach(p => { const r = p.getBoundingClientRect(); p.classList.toggle('on', r.left < center && r.right > center); });
  const k3 = prog(encSec);
  if (Math.abs(k3 - lastEncK) > 0.004) {
    lastEncK = k3;
    encRows.forEach((el, i) => {
      const plain = el.dataset.plain, kk = clamp((k3 - 0.15 - i * 0.12) / 0.45);
      const cut = Math.floor(kk * plain.length); let s = '';
      for (let c = 0; c < plain.length; c++) s += c < cut ? HEX[(Math.random() * 16) | 0] : plain[c];
      el.textContent = kk >= 1 ? '0x' + s.slice(0, 22) : s;
      encTs[i].textContent = kk >= 1 ? 'encrypted' : kk > 0 ? 'encrypting…' : 'plain'; encTs[i].classList.toggle('enc-on', kk > 0);
    });
    $('#encbar').style.width = (k3 * 100) + '%';
    $('#encstate').textContent = k3 < 0.15 ? 'before the Ring' : k3 < 0.85 ? 'inside the Ring' : 'what the chain sees';
  }
  const rr = roll.getBoundingClientRect();
  roll.style.setProperty('--fill', (clamp((innerHeight * 0.7 - rr.top) / rr.height) * 100) + '%');
  const wh = $('#wheel'); const wr = wh.getBoundingClientRect();
  if (wr.bottom > 0 && wr.top < innerHeight) wh.style.rotate = ((wr.top / innerHeight) * -40).toFixed(1) + 'deg';
}

// ---------- the wordmark assembles from coral pixels ----------
(async function mark() {
  const h = $('#mark'), txt = h.querySelector('.mark-txt'), cv = h.querySelector('.mark-px');
  try { await document.fonts.load('600 100px Disp'); } catch (e) {}
  const r = txt.getBoundingClientRect(), hr = h.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1), Wd = Math.ceil(r.width + 40), Hd = Math.ceil(hr.height + 20);
  cv.width = Wd * dpr; cv.height = Hd * dpr; cv.style.width = Wd + 'px'; cv.style.height = Hd + 'px';
  cv.style.left = (txt.offsetLeft - 20) + 'px';
  const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; const oc = off.getContext('2d');
  const cs = getComputedStyle(h);
  oc.font = `${cs.fontWeight} ${cs.fontSize} Disp`; oc.textBaseline = 'alphabetic'; oc.fillStyle = '#fff'; oc.letterSpacing = cs.letterSpacing;
  const m = oc.measureText('H3LIX');
  const base = (Hd - 20 + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 + 6;
  oc.fillText('H3LIX', 20, base);
  const cell = Math.max(5, Math.round(parseFloat(cs.fontSize) / 26));
  const data = oc.getImageData(0, 0, Wd, Hd).data, pts = [];
  for (let y = 0; y < Hd; y += cell) for (let x = 0; x < Wd; x += cell) if (data[((y + (cell >> 1)) * Wd + x + (cell >> 1)) * 4 + 3] > 128) pts.push({ x, y, sx: x - 260 - Math.random() * 380, sy: y + 160 + Math.random() * 260, d: Math.random() * 0.5 + (1 - x / Wd) * 0.35 });
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const T = RM ? 1 : 1500, t0 = performance.now();
  const draw = now => {
    const k = (now - t0) / T; c.clearRect(0, 0, Wd, Hd);
    for (const p of pts) {
      const u = clamp((k - p.d * 0.6) / 0.55), e = 1 - Math.pow(1 - u, 3);
      const x = p.sx + (p.x - p.sx) * e, y = p.sy + (p.y - p.sy) * e, s = cell * (0.45 + 0.55 * e);
      c.globalAlpha = Math.min(1, u * 3); c.fillStyle = u < 1 ? '#ff5a32' : '#f3f2fa';
      c.fillRect(x + (cell - s) / 2, y + (cell - s) / 2, s - 0.6, s - 0.6);
    }
    if (k < 1.25) requestAnimationFrame(draw); else h.classList.add('done');
  };
  requestAnimationFrame(draw);
  setTimeout(() => h.classList.add('done'), T + 1200);
})();

// ---------- spiral calculator ----------
const amt = $('#cAmt'), day = $('#cDay');
const bagOf = v => v <= 0 ? 0 : Math.round(Math.pow(10, 3 + v / 100 * 5));
const mul = d => 1 + Math.min(d, 30) / 15;
let spiralDays = 10;
function calc() {
  const bag = bagOf(+amt.value), d = +day.value, m = mul(d);
  amt.style.setProperty('--p', amt.value + '%'); day.style.setProperty('--p', (day.value / 45 * 100) + '%');
  $('#cAmtO').textContent = bag.toLocaleString('en-US'); $('#cDayO').textContent = d;
  $('#cMul').textContent = m.toFixed(2) + '×'; $('#cW').textContent = fmt.big(bag * m);
  $('#cBar').style.width = (Math.min(d, 30) / 30 * 100) + '%';
  spiralDays = d;
}
amt.addEventListener('input', calc); day.addEventListener('input', calc); calc();
(function spiral() {
  const cv = $('#spiralc'), c = cv.getContext('2d'); let shown = 0, t = 0, vis = false;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(cv);
  const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; };
  fit(); addEventListener('resize', fit);
  const loop = () => {
    requestAnimationFrame(loop); if (!vis) return;
    t += 0.016; shown += (spiralDays - shown) * 0.08;
    const Wd = cv.width, Hd = cv.height, cx = Wd / 2, cy = Hd / 2, cell = Wd / 52;
    c.clearRect(0, 0, Wd, Hd);
    const turns = 0.6 + shown / 45 * 3.4, n = Math.floor(70 + shown * 9);
    for (let i = 0; i < n; i++) {
      const u = i / n, th = u * turns * Math.PI * 2 - t * 0.6, r = (0.06 + u * 0.42) * Wd;
      const gx = Math.round((cx + Math.cos(th) * r) / cell) * cell, gy = Math.round((cy + Math.sin(th) * r * 0.92) / cell) * cell, s = cell * (0.5 + 0.5 * u);
      c.fillStyle = u > 0.985 ? '#fff' : `rgba(255,${Math.round(90 + 80 * (1 - u))},${Math.round(50 + 60 * (1 - u))},${(0.25 + 0.75 * u).toFixed(2)})`;
      c.fillRect(gx - s / 2, gy - s / 2, s, s);
    }
    c.fillStyle = '#ff5a32'; c.fillRect(cx - cell, cy - cell, cell * 2, cell * 2);
  };
  loop();
})();

// ---------- the cycle: wheel + list + a real UTC clock ----------
(function cycle() {
  const spans = $$('#wheel span'), lis = $$('#clist li'), hand = $('#wheel .hand'); let i = 0;
  const step = () => { spans.forEach((s, k) => s.classList.toggle('on', k === i)); lis.forEach((l, k) => l.classList.toggle('on', k === i)); hand.style.setProperty('--h', (180 + i * 72) + 'deg'); i = (i + 1) % 5; };
  step(); setInterval(step, RM ? 4000 : 1700);
  const utc = $('#utc'), nc = $('#nextc');
  const clock = () => { const d = new Date(); utc.textContent = d.toISOString().slice(11, 19); nc.textContent = String((d.getUTCHours() + 1) % 24).padStart(2, '0') + ':00'; };
  clock(); setInterval(clock, 1000);
})();

// ---------- a typed tour of the terminal ----------
(function typer() {
  const el = $('#typer'); if (!el) return;
  const script = [
    ['help', 'connect · wallet · scan · private · pairs · agent · ring · holders · spiral'],
    ['connect', 'wallet connected'],
    ['private', 'sign TSPP/derive/v1 in your wallet… private wallet derived ✓'],
    ['ring', 'indexer up · prover up'],
    ['spiral 1000000 30', 'spiral 3.00× → weight 3.00M'],
  ];
  let started = false;
  new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; run(); } }, { threshold: 0.3 }).observe(el);
  const wait = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  async function run() {
    for (;;) {
      el.innerHTML = '';
      for (const [cmd, out] of script) {
        const line = document.createElement('div'); line.innerHTML = '<span class="p">h3lix&gt; </span><span class="t"></span><span class="c"></span>'; el.appendChild(line);
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

// ---------- magnetic buttons + cursor pixels ----------
if (!RM && matchMedia('(pointer:fine)').matches) {
  $$('.mag').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
  const cv = $('#trail'), c = cv.getContext('2d'); const pts = [];
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; }; fit(); addEventListener('resize', fit);
  let lx = 0, ly = 0;
  addEventListener('pointermove', e => { if (Math.hypot(e.clientX - lx, e.clientY - ly) > 14) { lx = e.clientX; ly = e.clientY; pts.push({ x: Math.round(lx / 8) * 8, y: Math.round(ly / 8) * 8, a: 1 }); if (pts.length > 26) pts.shift(); } }, { passive: true });
  const tick = () => { requestAnimationFrame(tick); c.clearRect(0, 0, cv.width, cv.height); for (const p of pts) { p.a -= 0.035; if (p.a <= 0) continue; const s = 8 * p.a; c.globalAlpha = p.a * 0.85; c.fillStyle = '#ff5a32'; c.fillRect(p.x - s / 2, p.y - s / 2, s, s); } c.globalAlpha = 1; };
  tick();
}

// ---------- live readings ----------
const set = (k, v, cls) => $$(`[data-live="${k}"]`).forEach(el => {
  if (typeof v === 'number' && el.hasAttribute('data-count')) countTo(el, v, fmt.int); else el.textContent = v;
  el.classList.remove('ok', 'bad', 'idle'); if (cls) el.classList.add(cls);
});
async function live() {
  try {
    const n = await getJSON('/api/net');
    if (n.slot) set('slot', n.slot); if (n.tps) set('tps', n.tps); if (n.sol) set('sol', fmt.usd(n.sol));
    if (n.epoch != null) {
      set('epoch', String(n.epoch));
      const pct = n.slotsInEpoch ? n.slotIndex / n.slotsInEpoch * 100 : null;
      if (pct != null) { set('epochpct', pct.toFixed(1) + '% through'); $('#ebar').style.width = pct.toFixed(2) + '%'; }
    }
  } catch (e) {}
  try {
    const r = await getJSON('/api/ring', 14000);
    const s = x => x && x.ok ? [x.ms + ' ms', 'ok'] : ['down', 'bad'];
    const [a, ac] = s(r.indexer), [b, bc] = s(r.prover);
    set('indexer', a, ac); set('prover', b, bc);
    set('ringstate', r.indexer && r.indexer.ok && r.prover && r.prover.ok ? 'UP' : 'DEGRADED');
  } catch (e) {}
  try { const a = await getJSON('/api/agent'); if (!a.configured) set('agent', 'Not live yet', 'idle'); else set('agent', fmt.sol(a.sol) + ' SOL', 'ok'); } catch (e) {}
}
live(); setInterval(() => { if (!document.hidden) live(); }, 15000);

// back from the terminal (or a deep link): skip the gate
let came = false; try { came = sessionStorage.getItem('h3lix:in') === '1'; } catch (e) {}
measure(); onScroll();
if (came || location.hash.length > 1 || /[?&]in\b/.test(location.search)) openSite(true);
addEventListener('load', () => { measure(); onScroll(); });
