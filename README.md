# H3LIX site

Home (`/`) with the live voxel world, and the terminal (`/terminal`).

Run locally: `MOCK=1 node dev/server.cjs` then open http://localhost:8833 (MOCK=1 answers /api from fixtures;
drop it where Solana and pump.fun are reachable). Rebuild scripts after editing `src/`: `npm i && ./build.sh`.

Deploy: Vercel, static + `api/*.js` functions. Replace `__SITE__` in the og/twitter tags with the live URL.

Environment variables (all optional; without them the site shows honest "not live yet" states):
- `H3LIX_MINT`     the $H3LIX mint, once launched (wallet balances, pair checks)
- `AGENT_ADDRESS`  the agent's public wallet (agent tab, cycle clock)
- `PAIRS`          comma-separated mints of coins paired to $H3LIX
- `RPC_URL`        a mainnet RPC (falls back to public endpoints)
- `HELIUS_API_KEY` needed for Privacy Rings registration and payouts
