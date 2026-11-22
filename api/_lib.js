// shared helpers for the serverless functions (Vercel, Node 20+)
const RPCS = () => [process.env.RPC_URL, 'https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'].filter(Boolean);
async function fetchT(url, opts = {}, ms = 8000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}
async function rpc(method, params = []) {
  let last;
  for (const url of RPCS()) {
    try {
      const r = await fetchT(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'rpc error');
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('no rpc');
}
const isAddr = s => typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
function send(res, code, body, cache = 'no-store') {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', cache);
  res.end(JSON.stringify(body));
}
const cfg = () => ({ mint: isAddr(process.env.H3LIX_MINT) ? process.env.H3LIX_MINT : null, agent: isAddr(process.env.AGENT_ADDRESS) ? process.env.AGENT_ADDRESS : null });
module.exports = { rpc, fetchT, isAddr, send, cfg };
