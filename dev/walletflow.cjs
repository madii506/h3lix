// E2E: a fake Wallet Standard wallet (real Ed25519 key via WebCrypto) connects, signs the Privacy Rings
// derivation message, and the terminal derives the private wallet.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const b58 = by => { let n = 0n; for (const x of by) n = n * 256n + BigInt(x); let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } for (const x of by) { if (x === 0) s = '1' + s; else break; } return s; };
    let kp, account;
    const ready = (async () => { kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)); account = { address: b58(raw), publicKey: raw, chains: ['solana:mainnet'], features: ['solana:signMessage'] }; })();
    const wallet = {
      version: '1.0.0', name: 'TestWallet', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="8"%3E%3Crect width="8" height="8" fill="%23ff5a32"/%3E%3C/svg%3E',
      chains: ['solana:mainnet'], get accounts() { return account ? [account] : []; },
      features: {
        'standard:connect': { version: '1.0.0', connect: async () => { await ready; return { accounts: [account] }; } },
        'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
        'standard:events': { version: '1.0.0', on: () => () => {} },
        'solana:signMessage': { version: '1.0.0', signMessage: async ({ message }) => [{ signedMessage: message, signature: new Uint8Array(await crypto.subtle.sign('Ed25519', kp.privateKey, message)) }] },
      },
    };
    const reg = api => api.register(wallet);
    window.addEventListener('wallet-standard:app-ready', e => reg(e.detail));
    window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: reg }));
  });
  await p.goto('http://localhost:8833/terminal#private'); await p.waitForTimeout(1200);
  await p.click('#connBtn'); await p.waitForTimeout(300);
  const items = await p.$$eval('#connMenu button, #connMenu a', els => els.map(e => e.textContent.trim()));
  await p.click('#connMenu button[data-w="TestWallet"]'); await p.waitForTimeout(800);
  const chip = await p.textContent('#connBtn');
  await p.click('#ps2b'); await p.waitForSelector('#ps3.done', { timeout: 30000 }).catch(() => {});
  const pw = await p.textContent('#pAddr'), err = await p.textContent('#ps2e');
  await p.click('[data-act="register"]'); await p.waitForTimeout(600);
  const reg = await p.textContent('#ps4e');
  await p.click('.tabs button[data-tab="wallet"]'); await p.waitForTimeout(900);
  const sol = await p.textContent('#wSol');
  await p.screenshot({ path: '/tmp/h3shots/d-private-done.jpg', type: 'jpeg', quality: 80 });
  await p.click('.tabs button[data-tab="private"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/h3shots/d-private-done2.jpg', type: 'jpeg', quality: 80 });
  console.log(JSON.stringify({ items, chip, pw: pw.slice(0, 24) + '…' + pw.length, err, reg, sol, errs }, null, 1));
  await b.close();
})();
