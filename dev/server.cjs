// local dev server: static files + /api. MOCK=1 answers /api from fixtures (the sandbox cannot reach Solana).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 8833, MOCK = process.env.MOCK === '1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.otf': 'font/otf', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };
const FIX = {
  config: () => ({ mint: null, agent: null }),
  net: () => ({ slot: 377412988 + Math.floor((Date.now() / 400) % 100000), tps: 3912, sol: 141.37, epoch: 873, slotIndex: 251400, slotsInEpoch: 432000 }),
  ring: () => ({ indexer: { ok: true, status: 404, ms: 88 }, prover: { ok: true, status: 404, ms: 131 }, dashboard: { ok: true, status: 200, ms: 64 }, network: 'devnet' }),
  wallet: () => ({ sol: 1.2345, tokens: 7, h3lix: null, spiral: null }),
  agent: () => ({ configured: false }),
  pairs: () => ({ mint: null, pairs: [] }),
  coin: () => ({ name: 'Example', symbol: 'EX', quote: 'SOL', paired: false }),
  holders: () => ({ mint: null, holders: [] }),
  register: () => ({ registered: false, reason: 'Registration opens when the agent goes live. Your private wallet is saved in this browser until then.' }),
};
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    const name = u.pathname.slice(5).replace(/\/$/, '');
    if (MOCK && FIX[name]) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(FIX[name]())); }
    try { return require(path.join(ROOT, 'api', name + '.js'))(req, res); } catch (e) { res.statusCode = 404; return res.end('{}'); }
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname === '/terminal' ? '/terminal.html' : u.pathname;
  const f = path.join(ROOT, decodeURIComponent(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('dev on', PORT, MOCK ? '(mock api)' : ''));
