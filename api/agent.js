const { rpc, send, cfg } = require('./_lib');
module.exports = async (req, res) => {
  const { agent } = cfg();
  if (!agent) return send(res, 200, { configured: false }, 's-maxage=30');
  try {
    const [bal, sigs] = await Promise.all([rpc('getBalance', [agent]), rpc('getSignaturesForAddress', [agent, { limit: 12 }])]);
    send(res, 200, { configured: true, address: agent, sol: bal.value / 1e9, txs: sigs.map(s => ({ sig: s.signature, slot: s.slot, time: s.blockTime, err: !!s.err })) }, 's-maxage=10');
  } catch (e) { send(res, 502, { error: 'Solana RPC did not answer, try again' }); }
};
