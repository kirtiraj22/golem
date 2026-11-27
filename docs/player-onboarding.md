# Player onboarding (Solana + Supabase)

This milestone adds a mandatory wallet onboarding gate before the existing
Copper Stall game world mounts. It does not change the map, sprites, movement,
NPCs, economy, or existing game state.

## Flow

1. Open `/`.
2. Click **Start Trading**.
3. Enter a trader name.
4. Connect a Solana wallet (Phantom, Solflare, Backpack, or any other Wallet
   Standard-compatible wallet) through the wallet-adapter picker.
5. Click **Start Game** and sign the short server-generated message.
6. The server verifies the Ed25519 signature, creates or retrieves the
   `player_profiles` row, and sets an HttpOnly session cookie.
7. `/game` mounts the existing game only when the session cookie resolves to a
   player profile.

Returning wallets retrieve their existing profile. The original username is
preserved; `last_seen_at` is refreshed.

## Packages

The onboarding stack uses the maintained ecosystem libraries:

- `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, and
  `@solana/wallet-adapter-react-ui` for Wallet Standard discovery,
  connection/disconnection, account changes, and message signing.
- `@solana/web3.js` (`PublicKey`) for address parsing and canonicalization.
- Node's built-in `crypto` Ed25519 verification on the server. This is the
  server-side ownership proof and does not require an RPC call.
- `@supabase/supabase-js` for typed, server-only service-role access instead of
  handwritten PostgREST helpers.

## Environment variables

Add these to `web/.env.local` (and to the deployment environment):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Optional wallet UI/RPC settings. Wallet connection and message signing do not
# need an RPC call, but the provider uses this endpoint for future game actions.
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

`NEXT_PUBLIC_SUPABASE_URL` is public. `SUPABASE_SERVICE_ROLE_KEY` is server-only
and must never be prefixed with `NEXT_PUBLIC_`. The browser never receives it.

## Supabase setup

Apply the migrations in order. The new onboarding migration is:

```text
supabase/migrations/20261122000000_player_onboarding.sql
```

It creates `public.player_profiles` with a unique `wallet_address`, username
constraints, `created_at`, `updated_at`, `last_seen_at`, RLS with no
anon/authenticated grants, and the atomic `upsert_player_profile` function.
It reuses `public.auth_challenges` and `public.wallet_sessions` from
`20260101000100_golem_auth.sql`.

If the project is linked to the Supabase CLI:

```bash
supabase db push
```

Otherwise paste the migration into the Supabase SQL editor after the earlier
migrations have been applied.

## Local test flow

```bash
cd web
npm run dev
```

Open <http://localhost:3001>.

1. Without a wallet extension, open **Start Trading** and confirm the
   "No Solana wallet detected" state.
2. Install/activate Phantom or Solflare, reload, and click **Connect**.
3. Reject the connection request and confirm the rejection message.
4. Connect successfully, enter a valid name, click **Start Game**, and sign the
   message in the wallet.
5. Confirm the existing game loads at `/game`.
6. Refresh `/game` and confirm the session persists.
7. Return to `/`, open onboarding, and confirm the "Welcome back" state.
8. Use **Use a different wallet**, reconnect with the same wallet, and confirm
   the existing profile is retrieved instead of duplicated.
9. Try `/game`, `/game-preview`, and `/game-legacy` in a private window with no
   session; all should redirect to `/?onboarding=required`.

Useful checks without a wallet:

```bash
# Invalid wallet is rejected before any Supabase call.
curl -s -X POST http://localhost:3001/api/auth/challenge \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"not-a-wallet","username":"CopperFox"}'

# A valid-shaped wallet reaches the Supabase configuration check.
curl -s -X POST http://localhost:3001/api/auth/challenge \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"11111111111111111111111111111111","username":"CopperFox"}'
```

The second call returns `503` with a configuration message until the Supabase
environment variables and migration are in place.

## Security model

- The server issues a random single-use nonce and a 5-minute challenge message.
- The challenge message includes the wallet address and trader name.
- The server verifies the wallet's Ed25519 signature over that exact message.
- The challenge is consumed atomically, so a signature cannot be replayed.
- The profile is only created or retrieved after signature verification.
- The session token is random, stored as a SHA-256 hash, and sent to the browser
  as an HttpOnly, SameSite=Lax cookie.
- `/game` and the other game routes read the session server-side. A
  frontend-supplied wallet address is never treated as proof of ownership.
- The service-role key stays on the server.

## Gameplay notes

- The active game includes a server-authoritative storage-auction ledger in
  `public.player_game_state` (in-game coins, lots, rival bids, revealed hauls,
  inventory, market days and headlines).
- Auction writes go through `/api/game/state` and use the verified session
  cookie plus the service-role key. Anon/authenticated roles cannot read or
  write the ledger directly.
- NEAR wallet integration was removed. No NEAR packages, panels, contexts or
  environment variables are loaded by the web app.
- The Anchor/MagicBlock program under `onchain/` is unchanged. It is not
  deployed on devnet yet, so the current auction ledger is explicitly
  off-chain; no fabricated on-chain confirmations are shown.
- The old tutorial/dialogue content and `/game-legacy` route are preserved.
- The onboarding gate does not rewrite the existing market simulation; the
  auction ledger is a separate server-side economy for storage lots and items.
