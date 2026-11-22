// Reads one pump.fun coin and says whether it quotes in $H3LIX.
const { fetchT, send, cfg, isAddr } = require('./_lib');
module.exports = async (req, res) => {
  const m = new URL(req.url, 'http://x').searchParams.get('mint');
  if (!isAddr(m)) return send(res, 400, { error: 'not a coin address' });
  try {
    const r = await fetchT('https://frontend-api-v3.pump.fun/coins/' + m);
    if (r.status === 404) return send(res, 404, { error: 'pump.fun does not know this coin' });
    const c = await r.json();
    const quote = c.quote_mint || c.quoteMint || null; const { mint } = cfg();
    send(res, 200, { name: c.name, symbol: c.symbol, quote: quote ? (quote === mint ? '$H3LIX' : quote) : 'SOL', paired: !!(mint && quote === mint) });
  } catch (e) { send(res, 502, { error: 'pump.fun did not answer, try again' }); }
};
