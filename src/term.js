import { wipeTo, wipeIn, fmt, countTo, getJSON } from './fx.js';
import * as W from './wallet.js';

wipeIn();
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isB58 = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s || '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let CFG = { mint: null, agent: null };

// ---------- console ----------
const logEl = $('#log');
function log(msg, cls = '') {
  const p = document.createElement('p');
  const t = new Date().toTimeString().slice(0, 8);
  p.innerHTML = `<span class="t">${t}</span><span class="${cls}">${msg}</span>`;
  logEl.appendChild(p); logEl.scrollTop = logEl.scrollHeight;
  while (logEl.children.length > 160) logEl.firstChild.remove();
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); }

// ---------- tabs ----------
const TABS = ['rig', 'wallet', 'private', 'pairs', 'agent', 'ring', 'spiral', 'holders', 'docs'];
function show(tab, push = true) {
  if (!TABS.includes(tab)) tab = 'rig';
  $$('.tabs button').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
  if (push) history.replaceState(null, '', '#' + tab);
  $('.panes').scrollTop = 0;
  if (tab === 'holders') loadHolders(); if (tab === 'agent') loadAgent(); if (tab === 'pairs') loadPairs(); if (tab === 'ring') loadRing(true); if (tab === 'wallet') refreshWallet();
}
$$('.tabs button').forEach(b => b.addEventListener('click', () => { show(b.dataset.tab); log(`open ${b.dataset.tab}`, 'me'); }));
$$('[data-go]').forEach(b => b.addEventListener('click', () => { if (b.dataset.go === 'wallet' && !W.state().address) openMenu(); else show(b.dataset.go); }));
$('[data-home]').addEventListener('click', e => { e.preventDefault(); wipeTo('/'); });

// ---------- live readings ----------
const set = (k, v, cls) => $$(`[data-live="${k}"]`).forEach(el => { el.textContent = v; el.classList.remove('ok', 'bad', 'idle'); if (cls) el.classList.add(cls); });
async function loadNet() {
  try {
    const n = await getJSON('/api/net');
    $$('[data-live="slot"]').forEach(el => n.slot ? countTo(el, n.slot, fmt.int, 900) : (el.textContent = '—'));
    set('tps', n.tps ? fmt.int(n.tps) : '—'); set('sol', n.sol ? fmt.usd(n.sol) : '—');
    if (n.epoch != null) { set('epoch', String(n.epoch)); const pct = n.slotsInEpoch ? n.slotIndex / n.slotsInEpoch * 100 : 0; set('epochpct', pct.toFixed(1) + '%'); $('#ebar').style.width = pct.toFixed(2) + '%'; }
    $$('.stat.load').forEach(s => s.classList.remove('load'));
    return n;
  } catch (e) { set('slot', '—'); set('tps', '—'); set('sol', '—'); log('network read failed: ' + esc(e.message), 'warn'); }
}
let ringBusy = false;
async function loadRing(verbose) {
  if (ringBusy) return; ringBusy = true;
  try {
    const r = await getJSON('/api/ring', 14000);
    for (const k of ['indexer', 'prover', 'dashboard']) {
      const x = r[k] || {};
      set(k, x.ok ? x.ms + ' ms' : 'down', x.ok ? 'ok' : 'bad');
      set(k + 'Note', x.ok ? `HTTP ${x.status}` : (x.error || 'no answer'));
    }
    const up = r.indexer && r.indexer.ok && r.prover && r.prover.ok;
    set('ringstate', up ? 'Up' : 'Degraded', up ? 'ok' : 'bad');
    if (verbose) log(`ring: indexer ${r.indexer && r.indexer.ok ? r.indexer.ms + 'ms' : 'down'} · prover ${r.prover && r.prover.ok ? r.prover.ms + 'ms' : 'down'}`, up ? 'ok' : 'warn');
  } catch (e) { set('ringstate', '—'); if (verbose) log('ring check failed: ' + esc(e.message), 'warn'); }
  ringBusy = false;
}
async function loadCfg() {
  try { CFG = await getJSON('/api/config'); } catch (e) {}
  set('agentstate', CFG.agent ? 'Live' : 'Not live yet', CFG.agent ? 'ok' : 'idle');
}
// next cycle: every hour on the hour (UTC), shown only once the agent is live
setInterval(() => {
  if (!CFG.agent) { $('#cycle').textContent = 'At launch'; return; }
  const now = new Date(), next = new Date(now); next.setUTCMinutes(60, 0, 0);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  $('#cycle').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}, 1000);

// ---------- wallet connect ----------
const connBtn = $('#connBtn'), menu = $('#connMenu');
const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
function openMenu() {
  const st = W.state();
  menu.innerHTML = '';
  if (st.address) {
    menu.innerHTML = `<p>${esc(st.wallet.name)} · ${fmt.short(st.address)}</p>
      <button data-m="copy">Copy address</button><button data-m="wallet">Balances</button><button data-m="private">Go private</button>
      <a href="https://solscan.io/account/${st.address}" target="_blank" rel="noopener">View on Solscan ↗</a><button data-m="disc">Disconnect</button>`;
  } else {
    const found = W.list();
    menu.insertAdjacentHTML('beforeend', '<p>Connect a wallet</p>');
    for (const w of found) {
      const b = document.createElement('button'); b.dataset.w = w.name;
      b.innerHTML = `${w.icon ? `<img src="${esc(w.icon)}" alt="">` : `<span class="lt">${esc(w.name[0])}</span>`}${esc(w.name)}<small>detected</small>`;
      menu.appendChild(b);
    }
    for (const k of W.KNOWN) {
      if (found.some(w => w.name === k.name)) continue;
      const href = mobile && k.deep ? k.deep(location.href) : k.url;
      menu.insertAdjacentHTML('beforeend', `<a href="${esc(href)}" target="_blank" rel="noopener"><span class="lt">${k.name[0]}</span>${k.name}<small>${mobile && k.deep ? 'open in app' : 'install'}</small></a>`);
    }
  }
  menu.hidden = false;
}
connBtn.addEventListener('click', e => { e.stopPropagation(); menu.hidden ? openMenu() : (menu.hidden = true); });
document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.hidden = true; });
menu.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  menu.hidden = true;
  if (b.dataset.w) return doConnect(b.dataset.w);
  if (b.dataset.m === 'copy') { copy(W.state().address); }
  if (b.dataset.m === 'wallet') show('wallet');
  if (b.dataset.m === 'private') show('private');
  if (b.dataset.m === 'disc') { await W.disconnect(); log('wallet disconnected', 'warn'); }
});
async function doConnect(name) {
  log(`connect ${esc(name)}…`, 'me');
  try { const a = await W.connect(name); log(`connected ${fmt.short(a)} via ${esc(name)}`, 'ok'); toast('Wallet connected'); }
  catch (e) { log(`connect failed: ${esc(e.message || e)}`, 'bad'); toast('Connect cancelled'); }
}
function renderConn() {
  const st = W.state();
  if (st.address) connBtn.innerHTML = `${st.wallet.icon ? `<img src="${esc(st.wallet.icon)}" alt="">` : '<i class="g"></i>'}${fmt.short(st.address)}`;
  else connBtn.textContent = 'Connect wallet';
  $('#walletEmpty').hidden = !!st.address; $('#walletFull').hidden = !st.address;
  $('#ps1').classList.toggle('done', !!st.address);
  $('#ps1b').textContent = st.address ? fmt.short(st.address) + ' connected' : 'Connect wallet';
  $('#ps2').classList.toggle('locked', !st.address);
  $$('#youList li')[0].classList.toggle('ok', !!st.address);
  const pa = st.address && privOf(st.address);
  $('#pAddr').textContent = pa || '—'; $('#ps3').classList.toggle('done', !!pa); $('#ps2').classList.toggle('done', !!pa);
  $$('#youList li')[1].classList.toggle('ok', !!pa);
  if (st.address) refreshWallet();
}
W.onChange(renderConn);
$$('[data-act="connect"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (W.state().address) { toast('Already connected'); return; } openMenu(); }));
function copy(text) { if (!text || text === '—') return; navigator.clipboard.writeText(text).then(() => toast('Copied'), () => toast('Copy blocked by the browser')); }
$$('[data-copy]').forEach(b => b.addEventListener('click', () => copy($('#' + b.dataset.copy).textContent)));

// ---------- wallet panel + scan ----------
let walletBusy = false;
async function readWallet(addr) { return getJSON('/api/wallet?addr=' + encodeURIComponent(addr), 12000); }
async function refreshWallet() {
  const a = W.state().address; if (!a || walletBusy) return; walletBusy = true;
  $('#wAddr').textContent = a; $('#wScan').href = 'https://solscan.io/account/' + a;
  try {
    const w = await readWallet(a);
    countTo($('#wSol'), w.sol, fmt.sol, 700); $('#wTok').textContent = fmt.int(w.tokens);
    $('#wH3').textContent = w.h3lix == null ? '—' : fmt.big(w.h3lix);
    $('#wMul').textContent = w.h3lix == null ? '—' : (w.spiral ? w.spiral.toFixed(2) + '×' : '1.00×');
    $$('#youList li')[2].classList.toggle('ok', !!(w.h3lix && w.h3lix > 0));
    log(`wallet ${fmt.short(a)}: ${fmt.sol(w.sol)} SOL, ${w.tokens} tokens${w.h3lix == null ? ', $H3LIX not launched yet' : ', ' + fmt.big(w.h3lix) + ' $H3LIX'}`, 'ok');
  } catch (e) { log('wallet read failed: ' + esc(e.message), 'warn'); }
  walletBusy = false;
}
$('[data-act="refresh"]').addEventListener('click', () => { log('refresh wallet', 'me'); refreshWallet(); });
$('[data-act="disconnect"]').addEventListener('click', async () => { await W.disconnect(); log('wallet disconnected', 'warn'); });
async function scan(addr, out) {
  out.innerHTML = '<div>Reading…</div>';
  if (!isB58(addr)) { out.innerHTML = '<div class="warn">That is not a Solana address.</div>'; return; }
  try {
    const w = await readWallet(addr);
    out.innerHTML = `<div class="kv"><span>Address</span><b>${fmt.short(addr)}</b></div><div class="kv"><span>SOL</span><b>${fmt.sol(w.sol)}</b></div><div class="kv"><span>Tokens held</span><b>${fmt.int(w.tokens)}</b></div><div class="kv"><span>$H3LIX</span><b>${w.h3lix == null ? 'not launched yet' : fmt.big(w.h3lix)}</b></div><div class="kv"><span>Solscan</span><b><a href="https://solscan.io/account/${addr}" target="_blank" rel="noopener">open ↗</a></b></div>`;
    log(`scan ${fmt.short(addr)}: ${fmt.sol(w.sol)} SOL`, 'ok');
  } catch (e) { out.innerHTML = `<div class="warn">${esc(e.message)}</div>`; }
}
$('#scanForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#scanIn').value.trim(); log('scan ' + esc(v), 'me'); scan(v, $('#scanOut')); });

// ---------- private wallet (Privacy Rings key derivation, in this tab) ----------
const privOf = a => { try { return localStorage.getItem('h3lix:pw:' + a); } catch (e) { return null; } };
let rings = null;
async function derive() {
  const a = W.state().address, err = $('#ps2e'); err.textContent = '';
  if (!a) { openMenu(); err.textContent = 'Connect a wallet first.'; return; }
  const btn = $('#ps2b'); btn.disabled = true; btn.textContent = 'Loading Ring keys…';
  try {
    rings = rings || await import('/assets/js/rings.js');
    btn.textContent = 'Check your wallet…'; log('sign TSPP/derive/v1 in your wallet', 'acc');
    const sig = await W.signMessage(rings.derivationMessage(a));
    btn.textContent = 'Deriving…';
    const pw = await rings.derivePrivateWallet(a, new Uint8Array(sig));
    try { localStorage.setItem('h3lix:pw:' + a, pw); } catch (e) {}
    log(`private wallet derived: ${pw.slice(0, 10)}…${pw.slice(-6)}`, 'ok'); toast('Private wallet ready');
    renderConn();
  } catch (e) {
    const m = String(e && e.message || e);
    err.textContent = /reject|denied|cancel/i.test(m) ? 'You cancelled the signature.' : `Your wallet could not sign this message (${m}). Some wallets refuse Solana off-chain messages; Solflare and Backpack sign them.`;
    log('derive failed: ' + esc(m), 'bad');
  }
  btn.disabled = false; btn.textContent = 'Sign and derive';
}
$('[data-act="derive"]').addEventListener('click', derive);
$('[data-act="register"]').addEventListener('click', async () => {
  const a = W.state().address, err = $('#ps4e'); err.textContent = '';
  if (!a) { err.textContent = 'Connect a wallet first.'; return; }
  try {
    const r = await getJSON('/api/register?owner=' + encodeURIComponent(a));
    err.textContent = r.registered ? 'Registered. Ring payouts can reach you.' : (r.reason || 'Not registered yet.');
    log('registration: ' + esc(err.textContent), r.registered ? 'ok' : 'warn');
  } catch (e) { err.textContent = e.message; }
});

// ---------- pairs ----------
async function loadPairs() {
  const el = $('#pairsList');
  try {
    const r = await getJSON('/api/pairs');
    set('paircount', String(r.pairs.length));
    if (!r.pairs.length) { el.innerHTML = `<div class="empty"><p>${r.mint ? 'No coins quote in $H3LIX yet. The first pair could be yours.' : 'Pairs open when $H3LIX launches. A paired coin needs $H3LIX to exist first.'}</p></div>`; return; }
    el.innerHTML = '<div class="plist">' + r.pairs.map(p => `<div class="prow"><img src="${esc(p.image || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><b>${esc(p.name)}</b><small>$${esc(p.symbol)} · ${fmt.short(p.mint)}</small></div><span class="mono x">${p.mcap ? '$' + fmt.big(p.mcap) : '—'}</span><a class="mini mono" href="https://pump.fun/coin/${esc(p.mint)}" target="_blank" rel="noopener">Open ↗</a></div>`).join('') + '</div>';
  } catch (e) { el.innerHTML = `<div class="empty"><p>Could not read pairs (${esc(e.message)}).</p><button class="btn sm ghost" id="pairsRetry">Retry</button></div>`; $('#pairsRetry').onclick = loadPairs; }
}
$('#pairForm').addEventListener('submit', async e => {
  e.preventDefault(); const v = $('#pairIn').value.trim(), out = $('#pairOut');
  log('check coin ' + esc(v), 'me');
  if (!isB58(v)) { out.innerHTML = '<div class="warn">That is not a coin address.</div>'; return; }
  out.innerHTML = '<div>Reading…</div>';
  try {
    const c = await getJSON('/api/coin?mint=' + encodeURIComponent(v), 12000);
    out.innerHTML = `<div class="kv"><span>Coin</span><b>${esc(c.name || '—')} ${c.symbol ? '($' + esc(c.symbol) + ')' : ''}</b></div><div class="kv"><span>Quote</span><b>${esc(c.quote || 'SOL')}</b></div><div class="kv"><span>Paired to $H3LIX</span><b>${c.paired ? 'yes' : 'no'}</b></div>`;
  } catch (err) { out.innerHTML = `<div class="warn">${esc(err.message)}</div>`; }
});

// ---------- agent ----------
async function loadAgent() {
  const el = $('#agentBox');
  try {
    const a = await getJSON('/api/agent', 12000);
    if (!a.configured) { el.innerHTML = '<div class="empty"><p>The agent is not live yet. Its wallet is published here at launch, and every move it makes shows up below.</p></div>'; return; }
    el.innerHTML = `<div class="addr mono"><span>${esc(a.address)}</span><a class="mini mono" href="https://solscan.io/account/${esc(a.address)}" target="_blank" rel="noopener">Solscan ↗</a></div>
      <div class="grid3"><div class="stat"><span class="mono">SOL</span><strong>${fmt.sol(a.sol)}</strong></div><div class="stat"><span class="mono">Recent moves</span><strong>${a.txs.length}</strong></div><div class="stat"><span class="mono">Last move</span><strong>${a.txs[0] && a.txs[0].time ? new Date(a.txs[0].time * 1000).toLocaleTimeString() : '—'}</strong></div></div>
      <table class="tbl mono"><thead><tr><th>Signature</th><th>Slot</th><th>Status</th></tr></thead><tbody>${a.txs.map(t => `<tr><td><a href="https://solscan.io/tx/${esc(t.sig)}" target="_blank" rel="noopener">${esc(t.sig.slice(0, 16))}…</a></td><td>${fmt.int(t.slot)}</td><td>${t.err ? 'failed' : 'ok'}</td></tr>`).join('') || '<tr><td colspan="3">No moves yet.</td></tr>'}</tbody></table>`;
  } catch (e) { el.innerHTML = `<div class="empty"><p>Could not read the agent (${esc(e.message)}).</p></div>`; }
}

// ---------- holders ----------
async function loadHolders() {
  const el = $('#holdersBox');
  try {
    const r = await getJSON('/api/holders', 14000);
    if (!r.mint) { el.innerHTML = '<div class="empty"><p>Holders show up here the minute $H3LIX launches.</p></div>'; return; }
    if (!r.holders.length) { el.innerHTML = '<div class="empty"><p>No holders yet.</p></div>'; return; }
    const top = r.holders[0].share || 1;
    el.innerHTML = `<table class="tbl mono"><thead><tr><th>#</th><th>Owner</th><th>Amount</th><th>Share</th><th></th></tr></thead><tbody>${r.holders.map((h, i) => `<tr><td>${i + 1}</td><td><a href="https://solscan.io/account/${esc(h.owner || h.account)}" target="_blank" rel="noopener">${fmt.short(h.owner || h.account)}</a></td><td>${fmt.big(h.amount)}</td><td>${h.share == null ? '—' : (h.share * 100).toFixed(2) + '%'}</td><td><div class="hbar"><i style="width:${h.share == null ? 0 : (h.share / top * 100).toFixed(1)}%"></i></div></td></tr>`).join('')}</tbody></table>`;
    log(`holders: top ${r.holders.length} read`, 'ok');
  } catch (e) { el.innerHTML = `<div class="empty"><p>Could not read holders (${esc(e.message)}).</p></div>`; }
}

// ---------- spiral ----------
const mul = d => 1 + Math.min(Math.max(d, 0), 30) / 15;
function spiral(bag, days) {
  $('#spMul').textContent = mul(days).toFixed(2) + '×'; $('#spW').textContent = fmt.big(bag * mul(days)); $('#spW30').textContent = fmt.big(bag * 3);
  return mul(days);
}
$('#spTable').innerHTML = [0, 1, 3, 7, 14, 21, 30].map(d => `<tr><td>${d}</td><td>${mul(d).toFixed(2)}×</td></tr>`).join('');
$('#spForm').addEventListener('submit', e => {
  e.preventDefault();
  const bag = Math.max(0, +String($('#spBag').value).replace(/[^\d.]/g, '') || 0), days = Math.max(0, +String($('#spDays').value).replace(/[^\d.]/g, '') || 0);
  const m = spiral(bag, days); log(`spiral ${fmt.big(bag)} × ${days}d = ${m.toFixed(2)}× → weight ${fmt.big(bag * m)}`, 'ok');
});
spiral(1000000, 10);

// ---------- command line ----------
const HELP = [
  ['help', 'this list'], ['connect', 'connect a wallet'], ['disconnect', 'disconnect'], ['wallet', 'your balances'], ['scan <address>', 'read any wallet'],
  ['private', 'derive your private wallet'], ['pairs', 'paired coins'], ['agent', 'the agent wallet'], ['ring', 'measure Privacy Rings'],
  ['net', 'Solana slot, TPS, SOL'], ['holders', 'top $H3LIX holders'], ['man', 'the docs'], ['spiral <bag> <days>', 'your multiplier'], ['clear', 'clear the console'], ['home', 'back to the home page'],
];
const history_ = []; let hi = 0;
$('#cmdForm').addEventListener('submit', async e => {
  e.preventDefault(); const raw = $('#cmd').value.trim(); $('#cmd').value = ''; if (!raw) return;
  history_.push(raw); hi = history_.length; log('h3lix> ' + esc(raw), 'me');
  const [c, ...args] = raw.split(/\s+/); const cmd = c.toLowerCase();
  switch (cmd) {
    case 'help': HELP.forEach(([k, v]) => log(`<span class="acc">${esc(k)}</span>  ${esc(v)}`)); break;
    case 'connect': openMenu(); break;
    case 'disconnect': await W.disconnect(); log('wallet disconnected', 'warn'); break;
    case 'wallet': show('wallet'); break;
    case 'scan': show('wallet'); $('#scanIn').value = args[0] || ''; scan(args[0] || '', $('#scanOut')); break;
    case 'private': show('private'); break;
    case 'pairs': show('pairs'); break;
    case 'agent': show('agent'); break;
    case 'ring': show('ring'); break;
    case 'rig': show('rig'); break;
    case 'holders': show('holders'); break;
    case 'man': case 'docs': show('docs'); break;
    case 'net': { const n = await loadNet(); if (n) log(`slot ${fmt.int(n.slot)} · ${fmt.int(n.tps)} tx/s · SOL ${fmt.usd(n.sol)}`, 'ok'); break; }
    case 'spiral': { show('spiral'); const bag = +(args[0] || 1e6), d = +(args[1] || 0); $('#spBag').value = bag; $('#spDays').value = d; const m = spiral(bag, d); log(`spiral ${m.toFixed(2)}× → weight ${fmt.big(bag * m)}`, 'ok'); break; }
    case 'clear': logEl.innerHTML = ''; break;
    case 'home': wipeTo('/'); break;
    default: log(`unknown command: ${esc(cmd)}. Type help.`, 'warn');
  }
});
$('#cmd').addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' && hi > 0) { hi--; $('#cmd').value = history_[hi]; e.preventDefault(); }
  if (e.key === 'ArrowDown') { hi = Math.min(history_.length, hi + 1); $('#cmd').value = history_[hi] || ''; e.preventDefault(); }
});
$('[data-act="clear"]').addEventListener('click', () => { logEl.innerHTML = ''; });
$('[data-act="ringcheck"]').addEventListener('click', () => { log('measure ring', 'me'); loadRing(true); });

// ---------- the spinning pixel drill on the rig ----------
(function drill() {
  const cv = $('#drillc'), c = cv.getContext('2d'); let t = 0, vis = true;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(cv);
  const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); };
  fit(); addEventListener('resize', fit);
  const loose = Array.from({ length: 40 }, () => ({ p: Math.random(), q: (Math.random() - 0.5) * 2, v: 0.04 + Math.random() * 0.05 }));
  let last = performance.now();
  const loop = now => {
    requestAnimationFrame(loop); if (!vis || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const Wd = cv.width, Hd = cv.height; c.clearRect(0, 0, Wd, Hd);
    const meta = 64 * Math.min(2, devicePixelRatio || 1), cell = Math.max(3, Math.floor(Math.min(Wd * 0.8, Hd - meta) / 23)), cx = Wd * 0.5 + cell * 1.5, cy = (Hd - meta) * 0.5 - cell * 1.2;
    const R2 = Math.SQRT2, ph = reduce ? 0 : t * 3.2;
    for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) {
      const x = i + 0.5, y = j + 0.5, p = (-x + y) / R2, q = (x + y) / R2;
      let w; if (p < -8) w = Math.max(0, 2.6 * (p + 11.2) / 3.2); else if (p < 3) w = 2.6; else if (p < 9) w = 1.5; else continue;
      if (p < -11.2 || Math.abs(q) > w) continue;
      let f = 1;
      if (p > -9.3 && p < 2.6 && (((j + Math.floor(i / 3) + Math.floor(ph)) % 3) + 3) % 3 === 0) continue;   // turning flutes
      if (p > 3.2) { const u = (p - 3.2) / 5.8; if ((i + j) % 2 && u > 0.3) continue; f = 0.8 - u * 0.4; }
      c.fillStyle = '#ff5a32';
      const s = cell * f, X = cx + i * cell + (cell - s) / 2, Y = cy + j * cell + (cell - s) / 2;
      c.fillRect(X, Y, s - 1, s - 1);
    }
    for (const l of loose) {
      if (!reduce) l.p += dt * l.v; if (l.p > 1) { l.p = 0; l.q = (Math.random() - 0.5) * 2; }
      const p = 9 + l.p * 7, q = l.q * (1.2 + l.p * 2);
      const i = (p * -1 + q) / R2 * -1, j = (p + q) / R2;  // back to grid space
      const x = (q - p) / R2, y = (q + p) / R2, s = cell * (0.55 - l.p * 0.35);
      c.globalAlpha = 1 - l.p; c.fillStyle = '#ff5a32'; c.fillRect(cx + x * cell - s / 2, cy + y * cell - s / 2, s, s); c.globalAlpha = 1;
    }
  };
  requestAnimationFrame(loop);
})();

// ---------- background: faint coral pixel trails ----------
(function bg() {
  const cv = $('#bgpx'), c = cv.getContext('2d'); if (reduce) return;
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
  fit(); addEventListener('resize', fit);
  const G = 22, cols = () => Math.ceil(cv.width / G);
  let trails = [], last = 0;
  const tick = now => {
    requestAnimationFrame(tick); if (document.hidden || now - last < 42) return; last = now;
    c.fillStyle = 'rgba(7,6,15,.22)'; c.fillRect(0, 0, cv.width, cv.height);
    if (trails.length < 22 && Math.random() < 0.3) trails.push({ x: Math.floor(Math.random() * cols()), y: -2, v: 0.4 + Math.random() * 0.9 });
    trails = trails.filter(tr => tr.y * G < cv.height + 40);
    for (const tr of trails) {
      tr.y += tr.v;
      c.fillStyle = 'rgba(255,90,50,.55)'; c.fillRect(tr.x * G + 6, Math.floor(tr.y) * G + 6, G - 12, G - 12);
    }
    if (Math.random() < 0.5) { c.fillStyle = 'rgba(255,176,138,.35)'; c.fillRect(Math.floor(Math.random() * cols()) * G + 9, Math.floor(Math.random() * cv.height / G) * G + 9, 4, 4); }
  };
  requestAnimationFrame(tick);
})();

// ---------- boot ----------
log('<span class="acc">H3LIX terminal</span> · booting the rig', '');
$$('.grid4 .stat').forEach(s => { if (s.querySelector('strong').textContent === '—') s.classList.add('load'); });
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(250); log('reading Solana mainnet…');
  const n = await loadNet(); log(n && n.slot ? `solana: slot ${fmt.int(n.slot)} · ${fmt.int(n.tps || 0)} tx/s` : 'solana: no answer yet', n && n.slot ? 'ok' : 'warn');
  await wait(150); log('measuring Privacy Rings…'); await loadRing(true);
  await wait(150); log(CFG.agent ? 'agent: live' : 'agent: not live yet', CFG.agent ? 'ok' : 'warn');
  log('ready · type <span class="acc">help</span>', 'ok');
})();
show(location.hash.slice(1) || 'rig', false);
renderConn();
loadCfg().then(() => { loadPairs(); });
setInterval(() => { if (!document.hidden) { loadNet(); } }, 12000);
setInterval(() => { if (!document.hidden) loadRing(false); }, 30000);
W.reconnect().then(a => { if (a) log(`reconnected ${fmt.short(a)}`, 'ok'); });
log(W.list().length ? `${W.list().length} wallet(s) detected` : 'no wallet extension detected yet', W.list().length ? 'ok' : 'warn');
