// Whether an owner can be paid through the Ring. Registration transactions are built by the agent once it is live.
const { send, cfg, isAddr } = require('./_lib');
module.exports = async (req, res) => {
  const owner = new URL(req.url, 'http://x').searchParams.get('owner');
  if (!isAddr(owner)) return send(res, 400, { error: 'not a Solana address' });
  const { agent } = cfg();
  if (!agent || !process.env.HELIUS_API_KEY) return send(res, 200, { registered: false, reason: 'Registration opens when the agent goes live. Your private wallet is saved in this browser until then.' });
  send(res, 200, { registered: false, reason: 'Not registered yet. The agent sponsors registration for holders each cycle.' });
};
