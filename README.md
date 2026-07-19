# Beat the Market

Beat the Market is a free World Cup skill game.

Fans get confidence credits for each match. They make calls at TxLINE consensus
prices. Correct calls earn points. After the match, each call gets a settlement
receipt.

Confidence credits and points have **no cash value**. This is not a betting book.

- Global track: Consumer and Fan Experiences (Superteam Earn)
- Regional track: TxODDS World Cup Hackathon Nigeria
- Data source: [TxLINE](https://txodds.com/) / TxODDS
- Repository: [blaqjeff/beat-the-market](https://github.com/blaqjeff/beat-the-market)

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Product technical documentation (ASD-STE100 style) |
| [docs/TXLINE.md](docs/TXLINE.md) | TxLINE endpoints, worker, proofs |
| [docs/BUSINESS.md](docs/BUSINESS.md) | Commercial path (leagues) |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Production deploy (Vercel + Neon + Fly worker) |

**Submission tip:** Use the GitHub URL for `docs/TECHNICAL.md` as your product
technical documentation link. Keep docs in this repo so judges open one place
with no extra login.

## How the product works

1. Sign in with email (magic link) or Phantom wallet.
2. Open a match. Spend credits on result, totals, or handicap markets.
3. Prices and scores update from TxLINE when the live worker runs.
4. After full time, the app settles calls and writes receipts.
5. Points update the leaderboard. You can join private leagues or share a PnL card.

**Call markets supported**

- Match result (`1X2_PARTICIPANT_RESULT`), full match and first half
- Totals (`OVERUNDER_PARTICIPANT_GOALS`), full match and first half
- Asian handicap (`ASIANHANDICAP_PARTICIPANT_GOALS`), full match and first half

Call prices always use the TxLINE consensus book (`BookmakerId` 10021).

## Production deploy

Free stack: **Vercel** (app) + **Neon** (Postgres) + **Fly.io** (ingestion worker).

Do not run the practice cinema on production. Do not set `DEMO_CINEMA`.

Full steps: [docs/DEPLOY.md](docs/DEPLOY.md).

## Local development

### Prerequisites

- Node.js 24 or newer
- Docker Desktop (local Postgres)

### Setup

```bash
npm install
cp .env.example .env.local
# Set AUTH_SECRET (example: openssl rand -base64 48)
npm run db:up
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Sign-in**

- **Email** — SendByte sends the magic link when `SENDBYTE_API_KEY` is set. In
  development without that key, the server returns a local verify URL.
- **Phantom** — Signs a one-time challenge. The app never asks for a private key.

**TxLINE credentials (local)** — activate at
[http://localhost:3000/setup/txline](http://localhost:3000/setup/txline)
(development / localhost only).

### Environment

See `.env.example`. Server secrets must **not** use `NEXT_PUBLIC_` names.

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
- Optional: `SENDBYTE_API_KEY`, `EMAIL_FROM`
- TxLINE: `TXLINE_GUEST_JWT`, `TXLINE_API_TOKEN`, `TXLINE_NETWORK`
- Optional: `SOLANA_RPC_URL`, `TXLINE_COMPETITION_IDS` (default `72`)

## Reproduce the demo recording (practice match)

Use this path to record the video when no live match is on screen.

The yellow **Demo cinema** bar steps a **practice script** on fixture
`18257865` (France vs England). That script is for the demo walkthrough. It is
**not** the real bronze-match scoreline. Production uses live TxLINE odds and
scores through the ingestion worker.

### Steps

1. Start Postgres and apply migrations (if needed):

```bash
npm run db:up
npm run db:migrate
```

2. Reset the practice match to prematch:

```bash
npm run demo:cinema
```

3. Start the app (skip if `npm run dev` already runs):

```bash
npm run dev
```

4. Open [http://localhost:3000/matches/18257865](http://localhost:3000/matches/18257865).

5. Sign in.

6. Place a **pre-match** call on an open market.

7. On the yellow bar, click **Advance match** several times. Watch score,
   timeline, and prices move.

8. Place an **in-play** call after a price shift (optional but good for the video).

9. Advance until full time. Click **Settle calls**.

10. Open the settlement **receipt**, then the **leaderboard** (and a league or
    share card if you want).

### Optional CLI controls

```bash
npm run demo:cinema -- advance
npm run demo:cinema -- settle
```

### Reset credits for recording

```bash
npx tsx --require ./scripts/polyfill-server-only.cjs scripts/demo/reset-credits.ts
# or one user: ... reset-credits.ts blaqjeff
```

### Show real TxLINE odds (not the practice script)

```bash
npm run txline:capture -- odds 18257739
npm run ingestion:replay -- 18257739 72
```

Then open [http://localhost:3000/matches/18257739](http://localhost:3000/matches/18257739)
(Spain vs Argentina). Those rows come from the TxLINE odds API.

### Do not use for the video walkthrough

```bash
npm run ingestion:replay -- 18257865 72
```

Bulk replay loads the match at once. The cinema bar will not show a step-by-step
board for recording.

Practice script file: `tests/fixtures/txline/demo.18257865.beats.json`

## Live TxLINE ingestion

```bash
npm run ingestion:worker
```

The worker connects to TxLINE odds and scores streams, syncs fixtures, marks
stale markets, and auto-settles after full time.

Manual settlement (replay / ops):

```bash
npm run settlement:run -- 18257865
npm run settlement:run -- 18257865 --correct
npm run settlement:run -- 18257865 --pda
```

Details: [docs/TXLINE.md](docs/TXLINE.md).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Health: `GET /api/health`

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Home, live board, World Cup history |
| `/matches/[fixtureId]` | Match centre |
| `/login` | Sign-in |
| `/leaderboard` | Global rankings |
| `/profile/[username]` | Stats and receipts |
| `/receipts/[callId]` | Settlement receipt |
| `/share/calls/[callId]` | Shareable PnL card |
| `/leagues` | Create or join private leagues |
| `/leagues/[inviteCode]` | League board |

Local-only ops page: `/setup/txline` (not linked in the product UI).

### Ranking tie-break

1. Total points (highest first)
2. Accuracy (highest first; voids excluded)
3. Decided call count (highest first)
4. Username (A–Z)

## Business model (short)

Free friend leagues now. Premium and branded leagues are the commercial path.
See [docs/BUSINESS.md](docs/BUSINESS.md).

## TxLINE endpoints used

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}` (and historical / updates as needed)
- `GET /api/odds/stream` and `GET /api/scores/stream` (SSE)
- `GET /api/scores/stat-validation` (proof payload)
- Solana `txoracle`: `daily_scores_roots` PDA (optional check)

## Capture tooling

```bash
npm run txline:capture -- fixtures 72
npm run txline:capture -- odds <fixtureId>
npm run txline:capture -- scores <fixtureId>
npm run txline:probe-streams -- odds 12
npm run txline:probe-validation -- <fixtureId> <seq>
```

Captured samples: `tests/fixtures/txline/`.

## License

Private hackathon project unless otherwise stated.
