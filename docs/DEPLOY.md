# Production deployment

## Recommended free stack

| Piece | Service | Why |
| --- | --- | --- |
| Web app | **Vercel** (Hobby) | Fits Next.js |
| Database | **Neon** (Free) | Managed Postgres, works with Vercel |
| Ingestion worker | **Fly.io** (free allowance) | Keeps a long-running TxLINE SSE process awake |

### Why not Cloudflare Workers for the feed worker

TxLINE live odds/scores use **long-lived SSE connections**.

Cloudflare Workers are request-scoped. They are not a good host for a process
that must stay connected for hours. Do not put `ingestion:worker` on Workers.

If you only use Cloudflare later, use it for DNS or edge cache — not for this
worker.

### Production rules

- Do **not** set `DEMO_CINEMA`.
- Do **not** run cinema reset scripts against production.
- Set real TxLINE credentials.
- Set `SENDBYTE_API_KEY` and a verified `EMAIL_FROM` (required in production).
- Set `APP_URL` to the public `https://` origin.
- Set a strong `AUTH_SECRET` (32+ characters).

---

## 1. Create the Neon database

1. Sign up at https://neon.tech
2. Create a project (region near your users).
3. Copy the connection string (`DATABASE_URL`).
4. Prefer the pooled URL for the Vercel app if Neon shows both.

---

## 2. Deploy the web app on Vercel

### First link

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add AUTH_SECRET production
npx vercel env add APP_URL production
npx vercel env add SENDBYTE_API_KEY production
npx vercel env add EMAIL_FROM production
npx vercel env add TXLINE_GUEST_JWT production
npx vercel env add TXLINE_API_TOKEN production
npx vercel env add TXLINE_NETWORK production
# optional
npx vercel env add SOLANA_RPC_URL production
npx vercel env add TXLINE_COMPETITION_IDS production
```

Set `APP_URL` to the final production URL (for example
`https://beat-the-market.vercel.app` or your custom domain).

### Deploy

```bash
npx vercel --prod
```

The build runs `prisma generate`, `prisma migrate deploy`, then `next build`.

Confirm:

- `https://<your-app>/api/health`
- Sign-in works
- No yellow Demo cinema bar

---

## 3. Deploy the ingestion worker on Fly.io

The worker process:

```bash
npm run ingestion:worker
```

### Setup

```bash
# Install flyctl, then:
fly auth login
fly launch --config fly.worker.toml --no-deploy
fly secrets set DATABASE_URL="..." AUTH_SECRET="..." TXLINE_GUEST_JWT="..." TXLINE_API_TOKEN="..." TXLINE_NETWORK="mainnet" APP_URL="https://your-app.vercel.app" NODE_ENV="production"
fly deploy --config fly.worker.toml
```

The worker must share the **same** `DATABASE_URL` as Vercel (Neon).

Confirm health on the web app shows feed cursors connected after the worker
runs for a minute.

---

## 4. Smoke test (production)

1. Open the public URL.
2. Sign in with email.
3. Open a World Cup match that has TxLINE odds.
4. Place a small call.
5. Confirm `/api/health` reports database and feed status.

If markets are empty, the worker is not running or TxLINE credentials are wrong.

---

## 5. What is live vs practice

| Mode | When |
| --- | --- |
| Live TxLINE worker | Production (this document) |
| Practice cinema (`demo:cinema`) | Local video recording only |

Production must stay on the live path.
