// Measures the public Privacy Rings services (devnet alpha endpoints from the SDK README): reachability + latency.
const { fetchT, send } = require('./_lib');
const EP = { indexer: 'https://d21d98xh5lgv3b.cloudfront.net', prover: 'https://d1unet9hn0mci0.cloudfront.net', dashboard: 'https://djq45ljnl16bl.cloudfront.net' };
async function probe(url) {
  const t0 = Date.now();
  try { const r = await fetchT(url, { method: 'GET' }, 6000); return { ok: r.status < 500, status: r.status, ms: Date.now() - t0 }; }
  catch (e) { return { ok: false, error: e.name === 'AbortError' ? 'timeout' : 'unreachable', ms: Date.now() - t0 }; }
}
module.exports = async (req, res) => {
  const [indexer, prover, dashboard] = await Promise.all([probe(EP.indexer), probe(EP.prover), probe(EP.dashboard)]);
  send(res, 200, { indexer, prover, dashboard, network: 'devnet' }, 's-maxage=15');
};
