# Production deployment

## Recommended free stack (through early August)

| Piece | Service | Why |
| --- | --- | --- |
| Web app | **Vercel** (Hobby) | Fits Next.js — $0 |
| Database | **Neon** (Free) | Managed Postgres — $0 |
| Ingestion worker | **Render** (Free web service) | Long-running Node + SSE — $0 |

### Why not Cloudflare Workers

TxLINE live odds/scores need a **long-lived SSE** process. Cloudflare Workers
are request-scoped. Do not put `ingestion:worker` there.

### Why not Fly.io (for now)

Fly requires a card and bills for always-on machines (~$2–3/mo). Skip until
budget allows.

### Production rules

- Do **not** set `DEMO_CINEMA`.
- Do **not** run cinema reset scripts against production.
- Set real TxLINE credentials.
- Set `SENDBYTE_API_KEY` and a verified `EMAIL_FROM` on Vercel.
- Set `APP_URL` to the public `https://` origin.
- Do **not** set `NODE_ENV` in the Vercel dashboard (breaks `npm install` /
  Tailwind if set as a project env var).

---

## 1. Neon database

1. Sign up at https://neon.tech
2. Create a project.
3. Copy `DATABASE_URL` (pooled URL preferred for Vercel).

---

## 2. Vercel web app

```bash
npx vercel link
npx vercel env add DATABASE_URL production
# … AUTH_SECRET, APP_URL, SENDBYTE_*, TXLINE_*, etc.
npx vercel --prod
```

Confirm `https://<your-app>/api/health` — web + database up, no Demo cinema bar.

---

## 3. Render free worker (always-on via keep-alive)

The worker is `npm run ingestion:worker`. It also serves `GET /health` so
Render treats it as a web service.

### Deploy

1. Sign up at https://render.com (free — no card required for Free plan).
2. **New → Blueprint** and connect the GitHub repo, **or** New → Web Service
   with:
   - Runtime: **Docker**
   - Dockerfile path: `Dockerfile.worker`
   - Instance type: **Free**
   - Health check path: `/health`
3. Set env vars (same Neon DB + TxLINE secrets as Vercel):

   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `APP_URL` = your Vercel URL
   - `TXLINE_GUEST_JWT`
   - `TXLINE_API_TOKEN`
   - `TXLINE_NETWORK` = `mainnet`
   - `TXLINE_COMPETITION_IDS` = `72`
   - optional `SOLANA_RPC_URL`

4. Deploy. Note the public URL, e.g. `https://beat-the-market-worker.onrender.com`.

### Keep-alive (required on Free)

Render **spins down** Free web services after ~15 minutes with no HTTP traffic.
That would kill the SSE feed.

Create a free job at https://cron-job.org (or UptimeRobot):

- URL: `https://<your-worker>.onrender.com/health`
- Interval: every **5 minutes**
- Method: GET

750 free instance hours/month ≈ enough for continuous run through early August
if the keep-alive stays enabled.

### Confirm

After ~1 minute with the worker up:

`https://<your-vercel-app>/api/health` should show `feed` connected (not `idle`).

---

## 4. Smoke test

1. Open the public Vercel URL.
2. Sign in with email.
3. Open a World Cup match with TxLINE odds.
4. Place a small call.
5. Confirm `/api/health` reports database + feed.

If markets are empty, the worker is down, keep-alive failed, or TxLINE
credentials are wrong.

---

## 5. Live vs practice

| Mode | When |
| --- | --- |
| Live TxLINE worker (Render) | Production |
| Practice cinema (`demo:cinema`) | Local video recording only |

Production must stay on the live path.
