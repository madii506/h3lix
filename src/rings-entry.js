import { LocalShieldedKeys } from '@heliuslabs/zolana';
import { initializePoseidon } from '../node_modules/@heliuslabs/zolana/dist/hasher/index.js';
import { ed25519DerivationMessage } from '../node_modules/@heliuslabs/zolana/dist/keypair/derivation.js';
const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58(bytes) {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = '1' + s; else break; }
  return s;
}
export function unb58(str) {
  let n = 0n; for (const c of str) { const i = A.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); }
  const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of str) { if (c === '1') out.unshift(0); else break; }
  return new Uint8Array(out);
}
// the exact bytes a wallet signs to derive its Privacy Rings keys (Solana off-chain message v0)
export function derivationMessage(solanaPublicKey) { return ed25519DerivationMessage(unb58(solanaPublicKey)); }
export async function derivePrivateWallet(solanaPublicKey, signature) {
  await initializePoseidon();
  const keys = LocalShieldedKeys.fromDerivationSeed({ solanaPublicKey, derivationSeed: signature });
  const bytes = keys.address().toBytes();
  try { keys.destroy && keys.destroy(); } catch (e) {}
  return b58(bytes);
}
