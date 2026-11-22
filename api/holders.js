// The 20 largest $H3LIX token accounts with their owners and share of supply.
const { rpc, send, cfg } = require('./_lib');
module.exports = async (req, res) => {
  const { mint } = cfg();
  if (!mint) return send(res, 200, { mint: null, holders: [] }, 's-maxage=30');
  try {
    const [big, sup] = await Promise.all([rpc('getTokenLargestAccounts', [mint]), rpc('getTokenSupply', [mint])]);
    const accts = big.value.slice(0, 20);
    const info = accts.length ? await rpc('getMultipleAccounts', [accts.map(a => a.address), { encoding: 'jsonParsed' }]) : { value: [] };
    const supply = +sup.value.uiAmount || 0;
    const holders = accts.map((a, i) => { const v = info.value[i]; const owner = v && v.data && v.data.parsed ? v.data.parsed.info.owner : null; const amt = +a.uiAmount || 0; return { account: a.address, owner, amount: amt, share: supply ? amt / supply : null }; });
    send(res, 200, { mint, supply, holders }, 's-maxage=20');
  } catch (e) { send(res, 502, { error: 'Solana RPC did not answer, try again' }); }
};
