# Beat the Market — Product Technical Documentation

**Document type:** Product technical documentation  
**Language style:** ASD-STE100 (Simplified Technical English)  
**Product:** Beat the Market  
**Audience:** Hackathon judges, operators, engineers  
**Repository:** https://github.com/blaqjeff/beat-the-market  

---

## 1. Purpose

This document describes the Beat the Market product.

It tells you:

- what the product does
- how the system works
- how TxLINE supplies data
- how to run a local demo
- how to operate a live feed

Use short words. Follow the steps in order.

---

## 2. Product summary

Beat the Market is a free skill game for World Cup fans.

### 2.1 What the user does

1. The user signs in.
2. The user opens a match.
3. The user spends confidence credits on a market price.
4. The user waits for the match result.
5. The system settles the call and shows a receipt.
6. Points update the leaderboard.

### 2.2 What the product is not

- The product is not a betting book.
- Confidence credits have no cash value.
- Points have no cash value.

### 2.3 Primary data source

TxLINE (TxODDS) supplies:

- fixture lists
- consensus odds
- bookmaker odds
- score and match events
- score validation payloads

---

## 3. System overview

The system has these parts:

1. **Web app** — Next.js UI and API routes.
2. **Database** — PostgreSQL (Prisma).
3. **Ingestion worker** — reads TxLINE streams and writes the database.
4. **Settlement** — closes calls and writes receipts and points.
5. **Auth** — email magic link and Phantom wallet.

### 3.1 Data flow (live)

1. TxLINE sends odds and score messages.
2. The worker stores markets, odds snapshots, and match events.
3. The match centre reads that data and shows prices and scores.
4. The user places a call at the current consensus price.
5. After full time, settlement uses the final score.
6. The system writes a receipt and point ledger entries.

### 3.2 Data flow (practice demo)

1. A local practice script supplies odds and score rows.
2. The same store and settle path runs.
3. The UI shows a yellow **Demo cinema** control bar.
4. The operator advances the practice match step by step.

Note: The practice scoreline is for demonstration. It is not a live TxLINE score feed.

---

## 4. Main features

### 4.1 Match centre

The match centre shows:

- home and away teams
- score and clock when available
- open markets and prices
- bookmaker spread (when several books exist)
- timeline events
- momentum meter
- user calls and credit balance

### 4.2 Markets

The system accepts calls on:

- match result (`1X2_PARTICIPANT_RESULT`)
- totals (`OVERUNDER_PARTICIPANT_GOALS`)
- Asian handicap (`ASIANHANDICAP_PARTICIPANT_GOALS`)

Full-match and first-half periods are supported when TxLINE publishes them.

Call pricing uses consensus book id `10021`.

### 4.3 Settlement and receipts

After full time:

1. The system resolves each open call.
2. The system awards or withholds points.
3. The system writes a settlement receipt.
4. The receipt shows inputs and proof references when available.

### 4.4 Competition

The product includes:

- global leaderboard
- user profiles
- private leagues
- shareable PnL cards for selected winning calls

### 4.5 World Cup history

The home page shows finished World Cup results with short summaries.

History uses a maintained results archive. Live boards show upcoming or in-play fixtures from the database.

---

## 5. TxLINE integration

### 5.1 Credentials

Store these on the server only:

- `TXLINE_GUEST_JWT`
- `TXLINE_API_TOKEN`
- `TXLINE_NETWORK` (`mainnet` or `devnet`)

Do not put TxLINE secrets in `NEXT_PUBLIC_` variables.

### 5.2 Endpoints used

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/odds/stream` (SSE)
- `GET /api/scores/stream` (SSE)
- Score validation / stat-validation proof fetch
- Optional Solana PDA check for daily scores roots

### 5.3 Worker duties

When you run `npm run ingestion:worker`, the worker:

1. Connects to odds and scores streams.
2. Stores new odds and events.
3. Syncs fixture catalogues on a timer.
4. Marks stale markets.
5. Starts settlement after a finished match event.

More detail: [TXLINE.md](./TXLINE.md).

---

## 6. Install and run (local)

### 6.1 Needs

- Node.js 24 or newer
- Docker Desktop for Postgres

### 6.2 Procedure — first setup

1. Open a terminal in the project root.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `AUTH_SECRET` to a long random value.
5. Run `npm run db:up`.
6. Run `npm run db:migrate`.
7. Run `npm run dev`.
8. Open `http://localhost:3000`.

### 6.3 Procedure — sign in

1. Open `/login`.
2. Use email magic link or Phantom wallet.
3. Confirm you can open `/` and a match page.

---

## 7. Procedure — reproduce the demo recording

Use this procedure when you record the product video and no live match is available.

### 7.1 Prepare

1. Run `npm run db:up` if Postgres is not running.
2. Run `npm run db:migrate` if needed.
3. Run `npm run demo:cinema` to reset fixture `18257865` to prematch.
4. Run `npm run dev` if the app is not running.
5. Open `http://localhost:3000/matches/18257865`.
6. Sign in.

### 7.2 Record the loop

1. Place one pre-match call.
2. Click **Advance match** on the yellow demo bar.
3. Watch the board update.
4. Place one in-play call after a price change (recommended).
5. Advance to full time.
6. Click **Settle calls**.
7. Open the receipt.
8. Open the leaderboard.

### 7.3 Optional — show live TxLINE odds

1. Run `npm run txline:capture -- odds 18257739`.
2. Run `npm run ingestion:replay -- 18257739 72`.
3. Open `http://localhost:3000/matches/18257739`.
4. Show the odds board. Say that these prices came from the TxLINE API.

### 7.4 Optional — reset credits

1. Run  
   `npx tsx --require ./scripts/polyfill-server-only.cjs scripts/demo/reset-credits.ts`.
2. Refresh the match page.
3. Confirm the credit balance is `1000`.

### 7.5 Warnings

- Do not use bulk `ingestion:replay` for fixture `18257865` during video recording. It loads the match in one step.
- Do not say the practice cinema score is a live TxLINE goal feed.
- Do not say the practice cinema score is the official bronze-match result.

---

## 8. Procedure — live feed operation

1. Set TxLINE credentials in the server environment.
2. Set `DATABASE_URL` and `AUTH_SECRET`.
3. Run migrations.
4. Start the web app.
5. Start `npm run ingestion:worker`.
6. Open `/api/health` and confirm feed status is healthy.
7. Open a match that has open markets.
8. Place a test call only with a test account.

---

## 9. Security notes

1. Keep secrets on the server.
2. Do not commit `.env` files.
3. Do not request or store wallet private keys.
4. Protect settlement admin routes in production with the settlement secret header.

---

## 10. Related documents

- [TXLINE.md](./TXLINE.md) — feed and proof notes
- [BUSINESS.md](./BUSINESS.md) — commercial path
- [README.md](../README.md) — setup and demo commands

---

## 11. Document control

| Field | Value |
| --- | --- |
| Standard | ASD-STE100 style (short sentences, active voice, one action per step) |
| Hosting | Public GitHub file `docs/TECHNICAL.md` |
| Update rule | Update this file when product behavior or demo steps change |
