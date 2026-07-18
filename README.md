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

## Current status

- **Phase 0 complete** — World Cup feed discovery, market catalogue, SSE probes,
  validation proof fetch. Goalscorer/assist unavailable on current payloads.
- **Phase 1 complete** — app shell, Postgres identity schema, email + wallet
  auth (SendByte), health checks, CI workflow.
- **Phase 2 complete** — TxLINE normalize/persist, SSE worker, replay, feed
  health.
- **Next: Phase 3** — pre-match confidence-credit game.

## Local development

### Prerequisites

- Node.js 22+
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

- **Email magic link** — without `SENDBYTE_API_KEY`, the verify URL is printed
  in the server log and returned in the API response during development.
- **Phantom wallet** — signs a one-time challenge message. No private key is
  ever requested or stored.

TxLINE activation (local only): [http://localhost:3000/setup/txline](http://localhost:3000/setup/txline)

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

# Live SSE worker (odds + scores, reconnect with backoff)
npm run ingestion:worker
```

### Environment

Server-only secrets must never use `NEXT_PUBLIC_` names. See `.env.example` for:

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
- Optional `SENDBYTE_API_KEY` / `EMAIL_FROM` ([SendByte](https://docs.sendbyte.africa/))
- TxLINE credentials and Solana RPC

## Capture tooling

```bash
npm run txline:capture -- fixtures 72
npm run txline:capture -- odds <fixtureId>
npm run txline:capture -- scores <fixtureId>
npm run txline:probe-streams -- odds 12
npm run txline:probe-validation -- <fixtureId> <seq>
```
