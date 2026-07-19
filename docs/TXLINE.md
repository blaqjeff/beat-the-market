# TxLINE integration

Beat the Market reads fixtures, consensus odds, scores, and validation proofs
from TxLINE (TxODDS).

## Credentials

Server-only (never use `NEXT_PUBLIC_`):

- `TXLINE_GUEST_JWT`
- `TXLINE_API_TOKEN`
- `TXLINE_NETWORK` — `mainnet` or `devnet`
- optional `TXLINE_API_ORIGIN`
- optional `SOLANA_RPC_URL` for PDA checks during settlement

Local activation: `/setup/txline` (development / localhost only).

## Streams

| Stream | Handler | Store |
| --- | --- | --- |
| Odds SSE | `handleOddsMessage` | `persistOddsRow` |
| Scores SSE | `handleScoresMessage` | `persistMatchEvent` |

Start live ingestion:

```bash
npm run ingestion:worker
```

The worker also:

1. Marks stale markets every 5 seconds.
2. Syncs fixtures every 2 minutes for `TXLINE_COMPETITION_IDS` (default `72`).
3. Auto-settles about 8 seconds after a finished match event.

## Endpoints used

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/odds/stream` and `GET /api/scores/stream` (SSE)
- Score validation / stat-validation proof fetch
- Solana `txoracle` daily scores PDA (optional)

## Capture and replay

Captured samples live under `tests/fixtures/txline/`.

```bash
npm run txline:capture -- fixtures 72
npm run txline:capture -- odds <fixtureId>
npm run txline:capture -- scores <fixtureId>
npm run ingestion:replay -- <fixtureId> 72
```

## Practice demo (cinema)

For video recording without a live kickoff:

```bash
npm run demo:cinema
# open /matches/18257865 — Advance match / Settle on the yellow bar
```

The cinema script is a local practice path. It uses the same persist and settle
code as live. It is not a live TxLINE score stream.

Full demo steps: [README.md](../README.md#reproduce-the-demo-recording-practice-match)
and [TECHNICAL.md](./TECHNICAL.md).

## Validation proofs

Settlement calls `ensureScoreProof`, which:

1. Fetches validation data when credentials exist, else uses a captured JSON file.
2. Checks payload structure.
3. Walks Merkle `statProofs` locally.
4. Optionally checks that the daily scores PDA exists on Solana.

| Status | Meaning |
| --- | --- |
| `structure_ok` | Schema and paths present |
| `paths_ok` | Local Merkle walk converges |
| `pda_found` | Daily scores PDA account exists |
| `failed` | Payload not usable |

## Supported markets

- `1X2_PARTICIPANT_RESULT` (full match and `half=1`)
- `OVERUNDER_PARTICIPANT_GOALS` (full match and `half=1`)
- `ASIANHANDICAP_PARTICIPANT_GOALS` (full match and `half=1`)

First-half markets settle on the half-time score when available. Goalscorer
markets stay closed until TxLINE publishes them.

## Board extras

Score `Stats` keys feed goals, cards, and corners into:

- timeline
- momentum meter
- home board scorelines

Several bookmaker rows power the bookmaker spread UI. Call pricing always uses
consensus book `10021`.
