const { rpc, send, isAddr, cfg } = require('./_lib');
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
module.exports = async (req, res) => {
  const addr = new URL(req.url, 'http://x').searchParams.get('addr');
  if (!isAddr(addr)) return send(res, 400, { error: 'not a Solana address' });
  try {
    const { mint } = cfg();
    const [bal, a, b] = await Promise.all([
      rpc('getBalance', [addr, { commitment: 'confirmed' }]),
      rpc('getTokenAccountsByOwner', [addr, { programId: TOKEN }, { encoding: 'jsonParsed' }]).catch(() => ({ value: [] })),
      rpc('getTokenAccountsByOwner', [addr, { programId: T22 }, { encoding: 'jsonParsed' }]).catch(() => ({ value: [] })),
    ]);
    const accts = [...a.value, ...b.value].map(x => x.account.data.parsed.info);
    const held = accts.filter(i => +i.tokenAmount.amount > 0);
    let h3lix = null;
    if (mint) h3lix = held.filter(i => i.mint === mint).reduce((s, i) => s + (+i.tokenAmount.uiAmount || 0), 0);
    send(res, 200, { sol: bal.value / 1e9, tokens: held.length, h3lix, spiral: null });
  } catch (e) { send(res, 502, { error: 'Solana RPC did not answer, try again' }); }
};
