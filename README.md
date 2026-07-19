# Beat the Market

A live World Cup prediction game powered by TxLINE consensus probabilities,
scores, match events, and Solana-anchored validation proofs.

Fans receive a limited confidence-credit budget for each match. They can make
pre-match and in-play calls at the current TxLINE probability, earn more points
for correctly calling unlikely outcomes, and inspect a reproducible settlement
receipt after the match.

This is a free skill game. Confidence credits and points have no cash value.

## Hackathon

- Global track: Consumer and Fan Experiences
- Regional track: TxODDS World Cup Hackathon Nigeria
- Primary data source: TxLINE
- Repository: [blaqjeff/beat-the-market](https://github.com/blaqjeff/beat-the-market)

## Current status

Phases **0–6 complete**, plus core ops hardening (auto-settle, fixture sync,
Merkle path checks, account linking). Phase 7 (public deploy + demo video)
remains for submission.

| Phase | Status | What shipped |
| --- | --- | --- |
| 0 Feed discovery | Done | WC fixtures, odds/scores catalogue, SSE probes, validation proof fetch. Goalscorer/assist unavailable on current payloads. |
| 1 Foundation | Done | App shell, Postgres, email (SendByte) + Phantom wallet auth (linkable), health, CI. |
| 2 Ingestion | Done | Normalize/persist, SSE worker, fixture catalogue sync, auto-settle on FT, deterministic replay. |
| 3 Pre-match game | Done | 1000 credits/match, market board, atomic call placement. |
| 4 Live match centre | Done | Score/clock/timeline, in-play markets, polling, frozen live context. |
| 5 Settlement | Done | Deterministic settle, receipts, point ledger, TxLINE proof + local Merkle paths + Solana PDA refs. |
| 6 Competition | Done | Rankings, profiles, private leagues, PnL share cards. |
| 7 Deploy | Next | Hosted URL, managed DB, always-on worker, submission package. |

## Product loop

1. Sign in (email magic link or Phantom).
2. Open a match → spend confidence credits on 1X2 or totals at TxLINE %.
3. During play, markets and probabilities update without a full page reload.
4. After `game_finalised`, settlement runs automatically from the ingestion worker
   (or manually via `settlement:run`) → receipts + leaderboard points.
5. Trace points on your profile; share PnL cards; optional private leagues.

Supported call markets today: `1X2_PARTICIPANT_RESULT` and full-match
`OVERUNDER_PARTICIPANT_GOALS` (pre-match and in-play when TxLINE publishes
`InRunning` prices).

## Local development

### Prerequisites

- Node.js 24+
- Docker Desktop (for local Postgres)

### Setup

```bash
npm install
cp .env.example .env.local
# Set AUTH_SECRET to a long random value (openssl rand -base64 48)
npm run db:up
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in with:

- **Email magic link** — sent via SendByte to your inbox. Requires
  `SENDBYTE_API_KEY` and a verified `EMAIL_FROM` domain. If the key is unset in
  development only, a local verify URL is returned so you can still sign in.
- **Phantom wallet** — signs a one-time challenge message. No private key is
  ever requested or stored.

TxLINE activation (local only): [http://localhost:3000/setup/txline](http://localhost:3000/setup/txline)

### Demo path (France vs England cinema)

Past-match **cinema replay** — step through kick-off → goals → cards → HT → FT
while recording. Do **not** use bulk `ingestion:replay` for demos (it dumps the
whole match at once so nothing moves on screen).

```bash
npm run db:migrate
npm run demo:cinema                 # reset to prematch board
npm run dev                         # if not already running
# Open http://localhost:3000/matches/18257865
# Sign in → place a call → click "Advance match" on the yellow demo bar
# At full time → "Settle calls" → open receipt / share card / leaderboard
```

CLI alternative to the on-page buttons:

```bash
npm run demo:cinema -- advance
npm run demo:cinema -- settle
```

Bookmaker spread, momentum meter, 1st-half / handicap markets, and call drift
are all exercised by this cinema script.

### Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Health endpoint: `GET /api/health`

### Ingestion

```bash
# Deterministic replay from captured fixtures (same path as live)
npm run ingestion:replay -- 18257865 72

# Live SSE worker (odds + scores + fixture sync + auto-settle on FT)
npm run ingestion:worker
```

See [docs/TXLINE.md](docs/TXLINE.md) for feed, proof, and competition ID details.

### Settlement

Live worker auto-settles after `game_finalised`. Manual still works for replay:

```bash
npm run settlement:run -- 18257865
npm run settlement:run -- 18257865 --correct   # allow score corrections
npm run settlement:run -- 18257865 --pda       # also check daily scores PDA on RPC
```

Or `POST /api/settlement/<fixtureId>` (in production, requires
`x-settlement-secret: <AUTH_SECRET>`).

### Environment

Server-only secrets must never use `NEXT_PUBLIC_` names. See `.env.example` for:

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
- Optional `SENDBYTE_API_KEY` / `EMAIL_FROM` ([SendByte](https://docs.sendbyte.africa/))
- TxLINE credentials (`TXLINE_GUEST_JWT`, `TXLINE_API_TOKEN`) and optional `SOLANA_RPC_URL`

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Match list / home |
| `/matches/[fixtureId]` | Live match centre (markets, calls, timeline) |
| `/login` | Email + wallet sign-in |
| `/leaderboard` | Global rankings (documented tie-break) |
| `/profile/[username]` | Stats + receipt trail |
| `/receipts/[callId]` | Settlement receipt + proof refs |
| `/share/calls/[callId]` | Downloadable PnL share card for winning calls |
| `/leagues` | Create / join private leagues |
| `/leagues/[inviteCode]` | League board |

Operator-only (not linked in the product UI): `/setup/txline` on localhost in
development, for activating TxLINE credentials.

### Ranking tie-break

1. Total points (DESC)
2. Accuracy (DESC; voids excluded)
3. Decided call count (DESC)
4. Username (ASC)

## Capture tooling

```bash
npm run txline:capture -- fixtures 72
npm run txline:capture -- odds <fixtureId>
npm run txline:capture -- scores <fixtureId>
npm run txline:probe-streams -- odds 12
npm run txline:probe-validation -- <fixtureId> <seq>
```

Captured fixtures live under `tests/fixtures/txline/`.

## TxLINE endpoints used

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}` / historical / updates
- `GET /api/odds/stream` and `GET /api/scores/stream` (SSE)
- `GET /api/scores/stat-validation` (Merkle proof payload)
- Solana `txoracle` program: daily scores PDA
  (`daily_scores_roots` + epoch day from proof timestamp)

## License

Private hackathon project unless otherwise stated.
