const { send, cfg } = require('./_lib');
module.exports = (req, res) => send(res, 200, cfg(), 'public, max-age=30');
