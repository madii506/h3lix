const { rpc, fetchT, send } = require('./_lib');
const SOL = 'So11111111111111111111111111111111111111112';
module.exports = async (req, res) => {
  const out = { slot: null, tps: null, sol: null, epoch: null, slotIndex: null, slotsInEpoch: null };
  await Promise.all([
    rpc('getSlot').then(s => { out.slot = s; }).catch(() => {}),
    rpc('getEpochInfo').then(e => { out.epoch = e.epoch; out.slotIndex = e.slotIndex; out.slotsInEpoch = e.slotsInEpoch; }).catch(() => {}),
    rpc('getRecentPerformanceSamples', [4]).then(a => { const tx = a.reduce((s, x) => s + x.numTransactions, 0), sec = a.reduce((s, x) => s + x.samplePeriodSecs, 0); if (sec) out.tps = Math.round(tx / sec); }).catch(() => {}),
    fetchT('https://lite-api.jup.ag/price/v3?ids=' + SOL).then(r => r.json()).then(j => { const p = j[SOL] && (j[SOL].usdPrice || j[SOL].price); if (p) out.sol = +p; }).catch(() => {}),
  ]);
  send(res, out.slot ? 200 : 502, out, 's-maxage=5, stale-while-revalidate=10');
};
