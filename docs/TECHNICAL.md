# Beat the Market — Product Technical Documentation

| Field | Value |
| --- | --- |
| Product | Beat the Market |
| Version | 1.0 |
| Audience | Reviewers, operators, engineers |
| Language | ASD-STE100 (Simplified Technical English) |
| Repository | https://github.com/blaqjeff/beat-the-market |

---

## 1. Scope

This document describes the architecture, data sources, features, and
operation of Beat the Market.

Related documents:

- [TXLINE.md](./TXLINE.md) — TxLINE endpoints and feed behaviour
- [BUSINESS.md](./BUSINESS.md) — commercial model
- [DEPLOY.md](./DEPLOY.md) — production hosting
- [README.md](../README.md) — install commands and local setup

---

## 2. Product description

Beat the Market is a free skill game for FIFA World Cup matches.

Users receive a fixed confidence-credit budget for each match. They place
calls against TxLINE consensus market prices. The system settles calls after
full time and awards points. Each settled call produces a receipt.

Confidence credits and points have no cash value. The product is not a
wagering service.

Primary external data source: TxLINE (TxODDS).

---

## 3. Architecture

### 3.1 Components

| Component | Role |
| --- | --- |
| Web application | Next.js user interface and HTTP API |
| Database | PostgreSQL via Prisma |
| Ingestion worker | Reads TxLINE streams and writes match data |
| Settlement module | Resolves calls, writes receipts and point ledger |
| Authentication | Email magic link (SendByte) and Phantom wallet |

### 3.2 Live data flow

1. TxLINE publishes fixture, odds, and score messages.
2. The ingestion worker stores markets, odds snapshots, and match events.
3. The match centre reads stored data and displays prices and scores.
4. The user places a call at the current consensus price.
5. After full time, settlement resolves open calls from the final score.
6. The system writes receipts and updates the point ledger and leaderboard.

### 3.3 Practice-match path

When a live kickoff is not available, operators may load a local practice
script for fixture `18257865`. That path uses the same persistence and
settlement code as live ingestion. Practice scorelines are for controlled
demonstration only. They are not live TxLINE score messages.

See the README for operator commands.

---

## 4. Functional specification

### 4.1 Authentication

Supported methods:

- Email magic link
- Phantom wallet challenge signature

The system does not request or store wallet private keys.

### 4.2 Match centre

The match centre provides:

- team names, score, and clock when available
- open markets and consensus prices
- bookmaker spread when multiple books exist
- event timeline
- momentum meter
- open and settled calls
- remaining confidence credits

### 4.3 Markets

Accepted market types:

| Type | Periods |
| --- | --- |
| `1X2_PARTICIPANT_RESULT` | Full match; first half (`half=1`) |
| `OVERUNDER_PARTICIPANT_GOALS` | Full match; first half |
| `ASIANHANDICAP_PARTICIPANT_GOALS` | Full match; first half |

Call pricing uses TxLINE consensus bookmaker id `10021`.

First-half markets settle on the half-time score when that snapshot exists.
Goalscorer markets remain unavailable until TxLINE publishes them.

### 4.4 Settlement and receipts

After full time:

1. Each open call is resolved (won, lost, or void).
2. Points are awarded according to locked price and stake.
3. A settlement receipt stores inputs and narrative.
4. Proof references are attached when validation data is available.

### 4.5 Competition features

- Global leaderboard with documented tie-break rules
- User profiles with receipt history
- Private invite-only leagues
- Shareable PnL cards for selected winning calls
- World Cup results archive on the home page

### 4.6 Ranking tie-break

1. Total points (descending)
2. Accuracy (descending; voids excluded)
3. Decided call count (descending)
4. Username (ascending)

---

## 5. TxLINE integration

### 5.1 Credentials

Server environment only:

- `TXLINE_GUEST_JWT`
- `TXLINE_API_TOKEN`
- `TXLINE_NETWORK` (`mainnet` or `devnet`)

Do not expose these values through `NEXT_PUBLIC_` variables.

### 5.2 Endpoints

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/fixtures/snapshot` | Competition fixture catalogue |
| GET | `/api/odds/snapshot/{fixtureId}` | Odds snapshot |
| GET | `/api/scores/snapshot/{fixtureId}` | Score snapshot |
| GET | `/api/odds/stream` | Odds SSE stream |
| GET | `/api/scores/stream` | Scores SSE stream |
| GET | Score validation / stat-validation | Settlement proof payload |

Optional: Solana `txoracle` daily scores PDA existence check.

### 5.3 Ingestion worker

Command: `npm run ingestion:worker`

Duties:

1. Maintain odds and scores stream connections.
2. Persist odds rows and match events.
3. Sync fixture catalogues on an interval.
4. Mark stale markets.
5. Trigger settlement after finished-match events.

Full feed notes: [TXLINE.md](./TXLINE.md).

---

## 6. Deployment and operation

### 6.1 Runtime requirements

- Node.js 24 or newer
- PostgreSQL
- TxLINE credentials for live odds and scores
- Optional SendByte credentials for production email delivery
- Optional Solana RPC URL for PDA checks

### 6.2 Core process

1. Configure environment variables from `.env.example`.
2. Apply database migrations.
3. Start the web application.
4. Start the ingestion worker for live feeds.
5. Verify `GET /api/health`.

### 6.3 Local development

Install and run commands are listed in [README.md](../README.md).

---

## 7. Security

1. Keep secrets in server environment variables.
2. Do not commit `.env` files.
3. Do not store wallet private keys.
4. Protect privileged settlement routes in production with the configured
   settlement secret header.

---

## 8. Application routes

| Route | Description |
| --- | --- |
| `/` | Home, live board, results archive |
| `/matches/[fixtureId]` | Match centre |
| `/login` | Sign-in |
| `/leaderboard` | Global rankings |
| `/profile/[username]` | User stats and receipts |
| `/receipts/[callId]` | Settlement receipt |
| `/share/calls/[callId]` | PnL share card |
| `/leagues` | League create and join |
| `/leagues/[inviteCode]` | League leaderboard |

---

## 9. Document control

| Field | Value |
| --- | --- |
| Style | ASD-STE100: short sentences, active voice, one action per procedural step |
| Location | `docs/TECHNICAL.md` in the public repository |
| Maintenance | Update when architecture, markets, or TxLINE usage change |
