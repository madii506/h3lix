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
let world = null, windowOn = true, entered = false, winCount = 1;
try {
  if (/[?&]noworld/.test(location.search)) throw new Error('off');
  world = startWorld(canvas, { startShot: 'gate', active: () => (!entered || winCount > 0 ? 1 : 0) });
} catch (e) { canvas.style.background = 'radial-gradient(circle at 70% 45%,#3a1a2a,#07060f 60%)'; }
window.__h3 = () => world && world.info();

// ---------- scroll-scrubbed camera: each section names a shot, the camera glides between them ----------
let anchors = [];
function measure() {
  if (typeof measureScenes === 'function' && entered) measureScenes();
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

const winIO = new IntersectionObserver(es => { for (const e of es) e.target.__on = e.isIntersecting; winCount = $$('[data-window], #about, #follow').filter(el => el.__on).length; }, { rootMargin: '10% 0px 10% 0px' });
$$('[data-window], #about, #follow').forEach(el => winIO.observe(el));

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
bindMenu($('#gConnect'), $('#gMenu')); bindMenu($('#nConnect'), $('#nMenu')); bindMenu($('#cardConnect'), $('#cMenu'));
document.addEventListener('click', e => $$('.menu').forEach(m => { if (!m.hidden && !m.contains(e.target)) m.hidden = true; }));
addEventListener('keydown', e => { if (e.key === 'Escape') $$('.menu').forEach(m => { m.hidden = true; }); });
function renderConn() {
  const a = W.state().address;
  $('#gConnect').innerHTML = a ? `<i class="g"></i>${fmt.short(a)}` : 'Connect';
  $('#nConnect').innerHTML = a ? `<i class="g"></i>${fmt.short(a)}` : 'Connect';
  $('#cardConnect').innerHTML = a ? `<i class="g"></i>${fmt.short(a)}` : 'Connect wallet';
  drawCard(a);
}
W.onChange(renderConn); renderConn(); W.reconnect();

// ---------- nav, progress, chapters ----------
const nav = $('#nav'), links = $$('.links a'), chaps = $$('.chapters a');
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return; scrollQueued = true;
  requestAnimationFrame(() => { scrollQueued = false; nav.classList.toggle('solid', scrollY > 40); camByScroll(); scenes(); });
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
  const t0 = performance.now(), dur = 360 + total * 6;
  const tick = now => {
    const k = (now - t0) / dur; let idx = 0;
    for (const it of items) { let out = ''; for (const ch of it.txt) { const at = idx++ / total; out += ch === ' ' ? ' ' : (k > at * 0.8 + 0.2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]); } it.n.textContent = out; }
    if (k < 1) requestAnimationFrame(tick); else items.forEach(it => { it.n.textContent = it.txt; });
  };
  requestAnimationFrame(tick);
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && entered) { e.target.classList.add('vis'); if (e.target.classList.contains('scr')) scramble(e.target); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('main section').forEach(sec => sec.querySelectorAll('.rv, .scr').forEach((el, i) => { el.style.setProperty('--d', (i * 0.04).toFixed(2) + 's'); io.observe(el); }));
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
let lastEncK = -1, dialSet = false;
function animDial(to) { const el = $('#dring'); const t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - k, 3); el.style.setProperty('--dp', (to * e).toFixed(2)); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
// section geometry is measured once (and on resize), never inside the scroll frame
const geo = {};
function measureScenes() {
  for (const id of ['about', 'loop', 'follow', 'ring', 'roll', 'wheel']) {
    const el = document.getElementById(id); if (!el) continue;
    const r = el.getBoundingClientRect(); geo[id] = { top: r.top + scrollY, h: r.height };
  }
  geo.maxX = Math.max(0, track.scrollWidth - innerWidth);
}
addEventListener('resize', measureScenes);
const pin = id => { const g = geo[id]; return g ? clamp((scrollY - g.top) / Math.max(1, g.h - innerHeight)) : 0; };
const near = id => { const g = geo[id]; return g && scrollY + innerHeight * 1.5 > g.top && scrollY - innerHeight * 0.5 < g.top + g.h; };
const last = {};
const put = (key, v, fn) => { if (last[key] !== v) { last[key] = v; fn(v); } };
function scenes() {
  if (!entered) return;
  if (!geo.about) measureScenes();
  // follow one fee
  if (near('follow')) {
    const g = geo.follow, inStory = scrollY >= g.top - 1 && scrollY <= g.top + g.h - innerHeight + 1, kf = pin('follow');
    if (world) world.setStory(inStory ? kf : null);
    const step = inStory ? Math.min(3, Math.floor(kf * 4)) : -1;
    put('step', step, v => { $$('.s4').forEach((el, i) => el.classList.toggle('on', i === v)); $$('.sdots i').forEach((el, i) => el.classList.toggle('on', v >= 0 && i <= v)); });
  } else if (last.storyOff !== true) { last.storyOff = true; if (world) world.setStory(null); }
  if (near('follow')) last.storyOff = false;
  // the statement lights up word by word
  if (near('about')) put('words', Math.round(pin('about') * 1.15 * words.length), n => words.forEach((w, i) => w.classList.toggle('on', i < n)));
  // the loop slides sideways
  if (near('loop')) {
    const k2 = pin('loop');
    track.style.transform = `translate3d(${(-k2 * geo.maxX).toFixed(1)}px,0,0)`;
    $('#hsbar').style.transform = `scaleX(${k2.toFixed(4)})`;
    put('panel', Math.round(k2 * (panels.length - 1)), a => panels.forEach((p, i) => p.classList.toggle('on', i === a)));
  }
  // a payment encrypts itself
  if (near('ring')) {
    const k3 = pin('ring');
    if (Math.abs(k3 - lastEncK) > 0.006) {
      lastEncK = k3;
      encRows.forEach((el, i) => {
        const plain = el.dataset.plain, kk = clamp((k3 - 0.15 - i * 0.12) / 0.45);
        const cut = Math.floor(kk * plain.length); let s = '';
        for (let c = 0; c < plain.length; c++) s += c < cut ? HEX[(Math.random() * 16) | 0] : plain[c];
        el.textContent = kk >= 1 ? '0x' + s.slice(0, 22) : s;
        put('t' + i, kk >= 1 ? 2 : kk > 0 ? 1 : 0, v => { encTs[i].textContent = ['plain', 'encrypting…', 'encrypted'][v]; encTs[i].classList.toggle('enc-on', v > 0); });
      });
      $('#encbar').style.transform = `scaleX(${k3.toFixed(4)})`;
      const kp = clamp((k3 - 0.08) / 0.84), pv = $('#passvis');
      pv.style.setProperty('--k', kp.toFixed(4)); pv.style.setProperty('--flare', Math.max(0, 1 - Math.abs(kp - 0.5) / 0.12).toFixed(3));
      put('penc', kp > 0.5, v => $('#pcube').classList.toggle('enc', v));
      if (kp > 0.5) $('#pcl').textContent = '0x' + [...Array(8)].map(() => HEX[(Math.random() * 16) | 0]).join(''); else put('pcl', 1, () => { $('#pcl').textContent = 'your share'; });
      if (kp > 0.5) last.pcl = 0;
      put('encstate', k3 < 0.15 ? 0 : k3 < 0.85 ? 1 : 2, v => { $('#encstate').textContent = ['before the Ring', 'inside the Ring', 'what the chain sees'][v]; });
    }
  }
  // the rollout line fills, the dial turns once
  if (near('roll')) {
    const g = geo.roll, top = g.top - scrollY;
    if (top < innerHeight * 0.85 && !dialSet) { dialSet = true; const done = $$('#roll li.done').length, all = $$('#roll li').length; animDial(done / all * 100); $('#dnum').textContent = done + '/' + all; }
    roll.style.setProperty('--fill', (clamp((innerHeight * 0.7 - top) / g.h) * 100).toFixed(1) + '%');
  }
  if (near('wheel')) $('#wheel').style.rotate = (((geo.wheel.top - scrollY) / innerHeight) * -40).toFixed(1) + 'deg';
}

// ---------- the wordmark assembles from coral pixels ----------
(async function mark() {
  const h = $('#mark'), txt = h.querySelector('.mark-txt'), cv = h.querySelector('.mark-px');
  try { await document.fonts.load('700 100px Pix'); await document.fonts.load('600 100px Disp'); } catch (e) {}
  const r = txt.getBoundingClientRect(), hr = h.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1), Wd = Math.ceil(r.width + 40), Hd = Math.ceil(hr.height + 20);
  cv.width = Wd * dpr; cv.height = Hd * dpr; cv.style.width = Wd + 'px'; cv.style.height = Hd + 'px';
  cv.style.left = (txt.offsetLeft - 20) + 'px';
  const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; const oc = off.getContext('2d');
  const cs = getComputedStyle(h);
  oc.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; oc.textBaseline = 'alphabetic'; oc.fillStyle = '#fff'; oc.letterSpacing = cs.letterSpacing;
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

// the gate title glitches through cipher glyphs now and then
(function titleGlitch() {
  if (RM) return;
  const h = $('#mark'), t = h.querySelector('.mark-txt'), word = 'H3LIX', G = '█▓▒░#$%&@01';
  setInterval(() => {
    if (entered || document.hidden || !h.classList.contains('done')) return;
    let n = 0; h.classList.add('glitch');
    const id = setInterval(() => {
      n++; t.textContent = word.split('').map((c, i) => (Math.random() < 0.45 - n * 0.06 ? G[(Math.random() * G.length) | 0] : c)).join('');
      if (n >= 7) { clearInterval(id); t.textContent = word; h.classList.remove('glitch'); }
    }, 55);
  }, 1700);
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
    const Wd = cv.width, Hd = cv.height, cx = Wd / 2, cy = Hd / 2, cell = Wd / 40;
    c.clearRect(0, 0, Wd, Hd);
    const turns = 0.6 + shown / 45 * 3.4, n = Math.floor(90 + shown * 11);
    for (let i = 0; i < n; i++) {
      const u = i / n, th = u * turns * Math.PI * 2 - t * 0.6, r = (0.06 + u * 0.42) * Wd;
      const gx = Math.round((cx + Math.cos(th) * r) / cell) * cell, gy = Math.round((cy + Math.sin(th) * r * 0.92) / cell) * cell, s = cell * (0.62 + 0.38 * u);
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
  el.innerHTML = '<div><span class="p">h3lix&gt; </span><span>help</span></div><div class="o">' + script[0][1] + '</div>';
  new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; run(); } }, { threshold: 0.3 }).observe(el);
  const wait = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  async function run() {
    for (;;) {
      for (const [cmd, out] of script.slice(1).concat([script[0]])) {
        while (el.children.length > 9) el.firstChild.remove();
        const line = document.createElement('div'); line.innerHTML = '<span class="p">h3lix&gt; </span><span class="t"></span><span class="c"></span>'; el.appendChild(line);
        const t = line.querySelector('.t');
        for (const ch of cmd) { t.textContent += ch; await wait(45 + Math.random() * 60); }
        await wait(260); line.querySelector('.c').remove();
        const o = document.createElement('div'); o.className = 'o'; o.textContent = out; el.appendChild(o);
        await wait(900);
      }
      await wait(1800);
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
  let drew = false;
  const tick = () => { requestAnimationFrame(tick); const alive = pts.some(p => p.a > 0); if (!alive && !drew) return; drew = alive; c.clearRect(0, 0, cv.width, cv.height); for (const p of pts) { p.a -= 0.035; if (p.a <= 0) continue; const s = 8 * p.a; c.globalAlpha = p.a * 0.85; c.fillStyle = '#ff5a32'; c.fillRect(p.x - s / 2, p.y - s / 2, s, s); } c.globalAlpha = 1; };
  tick();
}

// tilt
if (!RM && matchMedia('(pointer:fine)').matches) $$('.card, .tile, .cardwrap, .calc-out, .typer').forEach(el => {
  el.classList.add('tilt');
  el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`; });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

// ---------- live readings ----------
const set = (k, v, cls) => $$(`[data-live="${k}"]`).forEach(el => {
  const before = el.dataset.last; el.dataset.last = String(v);
  if (before !== undefined && before !== String(v)) { const t = el.closest('.tile'); if (t) { t.classList.add('tick'); setTimeout(() => t.classList.remove('tick'), 900); } }
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

// ---------- holder card: drawn in the browser for the connected wallet ----------
function drawDrill(c, ox, oy, cell, col) {
  const R2 = Math.SQRT2;
  for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) {
    const x = i + 0.5, y = j + 0.5, p = (-x + y) / R2, q = (x + y) / R2;
    let w; if (p < -8) w = Math.max(0, 2.6 * (p + 11.2) / 3.2); else if (p < 3) w = 2.6; else if (p < 13.5) w = 1.5; else continue;
    if (p < -11.2 || Math.abs(q) > w) continue;
    if (p > -9.3 && p < 2.6 && (j + Math.floor(i / 3)) % 3 === 0) continue;
    let f = 1; if (p > 3.2) { const u = (p - 3.2) / 10.3; if (u < 0.34) f = 0.78; else if (u < 0.67) { if ((i + j) % 2) continue; f = 0.66; } else { if ((i + j) % 2 || ((i * 7 + j * 13) % 10) / 10 < (u - 0.67) * 2.2) continue; f = 0.5; } }
    const s = cell * f; c.fillStyle = col; c.fillRect(ox + i * cell + (cell - s) / 2, oy + j * cell + (cell - s) / 2, s, s);
  }
}
async function drawCard(addr) {
  const cv = $('#cardc'); if (!cv) return; const c = cv.getContext('2d'); const Wc = 1200, Hc = 675;
  try { await document.fonts.load('600 100px Disp'); await document.fonts.load('500 20px Mono'); } catch (e) {}
  c.fillStyle = '#07060f'; c.fillRect(0, 0, Wc, Hc);
  const g = c.createRadialGradient(360, 330, 10, 360, 330, 520); g.addColorStop(0, 'rgba(255,90,50,.22)'); g.addColorStop(1, 'rgba(255,90,50,0)'); c.fillStyle = g; c.fillRect(0, 0, Wc, Hc);
  for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(238,236,255,${(0.15 + ((i * 37) % 60) / 100).toFixed(2)})`; c.fillRect((i * 263) % Wc, (i * 151) % Hc, 2, 2); }
  c.strokeStyle = 'rgba(255,176,138,.85)'; c.lineWidth = 6; c.beginPath(); c.ellipse(360, 330, 210, 250, -0.35, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(255,90,50,.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(360, 330, 236, 276, -0.35, 0, Math.PI * 2); c.stroke();
  drawDrill(c, 360, 300, 16, '#ff5a32');
  c.fillStyle = '#f3f2fa'; c.font = '600 104px Disp'; c.fillText('H3LIX', 650, 250);
  c.fillStyle = '#ff5a32'; c.font = '600 44px Disp'; c.fillText('Paid out in private.', 655, 315);
  c.fillStyle = 'rgba(232,230,250,.5)'; c.font = '500 20px Mono'; c.fillText(addr ? 'HOLDER' : 'YOUR WALLET HERE', 657, 405);
  c.fillStyle = '#f3f2fa'; c.font = '500 40px Mono'; c.fillText(addr ? addr.slice(0, 6) + '…' + addr.slice(-6) : '— connect —', 655, 455);
  c.fillStyle = 'rgba(232,230,250,.45)'; c.font = '500 18px Mono'; c.fillText(new Date().toISOString().slice(0, 10) + '  ·  h3lix.vercel.app', 657, 600);
  const dl = $('#cardDl'), x = $('#cardX');
  dl.disabled = !addr; x.setAttribute('aria-disabled', addr ? 'false' : 'true');
  x.href = 'https://x.com/intent/post?text=' + encodeURIComponent('I hold $H3LIX.\nPaid out in private.\n\nh3lix.vercel.app');
}
$('#cardDl').addEventListener('click', () => { const cv = $('#cardc'); cv.toBlob(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'h3lix-card.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }, 'image/png'); });
drawCard(W.state().address);
