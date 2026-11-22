// Paired coins: mints listed in PAIRS (comma separated), each read from pump.fun so name, image and mcap are live.
const { fetchT, send, cfg, isAddr } = require('./_lib');
module.exports = async (req, res) => {
  const { mint } = cfg();
  const list = String(process.env.PAIRS || '').split(',').map(s => s.trim()).filter(isAddr).slice(0, 40);
  const pairs = (await Promise.all(list.map(m => fetchT('https://frontend-api-v3.pump.fun/coins/' + m).then(r => r.ok ? r.json() : null).catch(() => null))))
    .filter(Boolean).map(c => ({ mint: c.mint, name: c.name, symbol: c.symbol, image: c.image_uri, mcap: c.usd_market_cap || null }));
  send(res, 200, { mint, pairs }, 's-maxage=20');
};
