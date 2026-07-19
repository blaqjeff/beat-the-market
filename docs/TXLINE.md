# TxLINE integration notes

Beat the Market reads consensus odds, live scores, and Solana-anchored
validation proofs from TxLINE (TxODDS).

## Credentials

Server-only (never `NEXT_PUBLIC_`):

- `TXLINE_GUEST_JWT`
- `TXLINE_API_TOKEN`
- `TXLINE_NETWORK` — `mainnet` or `devnet`
- optional `TXLINE_API_ORIGIN` override
- optional `SOLANA_RPC_URL` for PDA existence checks during settlement

Create credentials via local setup at `/setup/txline` (localhost/dev only) or
your TxLINE activation flow.

## Streams

| Stream | Worker handler | Persist |
| --- | --- | --- |
| Odds SSE | `handleOddsMessage` | `persistOddsRow` |
| Scores SSE | `handleScoresMessage` | `persistMatchEvent` |

Start live ingestion:

```bash
npm run ingestion:worker
```

The worker also:

1. Marks stale markets every 5s
2. Syncs fixture catalogues every 2 minutes for `TXLINE_COMPETITION_IDS` (default `72`)
3. Auto-settles a fixture ~8s after a new `game_finalised` / finished event

## Replay / demo

Captured fixtures live under `tests/fixtures/txline/`.

```bash
npm run ingestion:replay -- 18257865 72
npm run settlement:run -- 18257865
```

Replay remains the reliable hackathon demo path when live credentials or WC
schedules are unavailable.

## Validation proofs

Settlement calls `ensureScoreProof`, which:

1. Fetches `/api/scores/validation` when credentials exist, else loads a captured fixture JSON
2. Validates payload structure (Zod)
3. Locally walks Merkle `statProofs` with SHA-256 over Borsh `ScoreStat` leaves
4. Optionally checks that the `daily_scores_roots` PDA exists on Solana

Statuses:

| Status | Meaning |
| --- | --- |
| `structure_ok` | Schema + paths present |
| `paths_ok` | Local Merkle walk converges |
| `pda_found` | Daily scores PDA account exists (RPC) |
| `failed` | Unusable payload |

Full on-chain root slot decoding (5-minute batch index) is still operator/RPC
dependent; local path verification does not require a live chain.

## Supported markets

Call placement supports:

- `1X2_PARTICIPANT_RESULT`
- full-match `OVERUNDER_PARTICIPANT_GOALS`

Period-scoped and goalscorer markets are ignored or marked unavailable when
TxLINE does not publish them.
