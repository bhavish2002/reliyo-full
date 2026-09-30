# B5 — Managed staging host (decision)

**Decision (2026-05-28):** **Neon PostgreSQL** + **Render Web Service** for Reliyo staging.

| Component | Provider | Why |
|-----------|----------|-----|
| **PostgreSQL** | [Neon](https://neon.tech) | Serverless Postgres, free tier, connection string for Prisma |
| **API** | [Render](https://render.com) | Simple Node deploy, env secrets, HTTPS URL for Razorpay webhooks |
| **Frontend** (optional) | Render Static Site or Vercel | `VITE_API_BASE_URL` → staging API URL |
| **Local webhook dev** | `npm run tunnel:webhooks` | cloudflared/ngrok before staging URL exists |

## Architecture

```
[React staging] ──HTTPS──► [Render: reliyo-api-staging]
                                    │
                                    ▼
                            [Neon: reliyo-staging DB]
                                    ▲
[Razorpay webhooks] ──HTTPS──► /api/v1/payments/webhooks/razorpay
```

## 1. Neon database

1. Create project **reliyo-staging** on Neon.
2. Copy connection string → `DATABASE_URL` (use pooled URL for serverless if offered).
3. Run migrations once from your machine:

```bash
cd backend
DATABASE_URL="postgresql://..." npm run prisma:deploy
DATABASE_URL="postgresql://..." npm run prisma:seed
```

## 2. Render API service

Use the repo root [`render.yaml`](../../render.yaml) or create manually:

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build | `npm ci && npm run build && npx prisma migrate deploy` |
| Start | `npm run start:prod` |
| Health check | `/api/v1/health` |

**Required env vars** (Render dashboard → Environment):

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `staging` |
| `DATABASE_URL` | Neon connection string |
| `JWT_ACCESS_SECRET` | Strong random string |
| `CORS_ORIGIN` | Frontend staging URL |
| `PAYMENT_MODE` | `live` |
| `PAYMENT_PSP` | `razorpay` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | test secret |
| `RAZORPAY_WEBHOOK_SECRET` | from Razorpay webhook |
| `OTP_PROVIDER` | `dev` + `OTP_DEV_FIXED_CODE` for QA, or Twilio |
| `INACTIVITY_JOB_ENABLED` | `true` on staging/prod (hourly 3-strike job) |
| `WEBHOOK_RETRY_JOB_ENABLED` | `true` optional (retry failed webhook events every 10 min) |

After deploy, note API URL: `https://reliyo-api-staging.onrender.com`

## 3. Razorpay webhook (staging)

1. Razorpay Dashboard → **Webhooks → Add**
2. URL: `https://<render-host>/api/v1/payments/webhooks/razorpay`
3. Secret = `RAZORPAY_WEBHOOK_SECRET` on Render
4. Events: `payment.captured`, `payment.failed`, `order.paid`

## 4. Verify staging

```bash
curl https://<render-host>/api/v1/health
curl https://<render-host>/api/v1/payments/config
```

From your machine (API must be up, keys configured):

```bash
cd backend
API_BASE=https://<render-host>/api/v1 npm run validate:live-razorpay-smoke -- 111111
```

## Local staging (before Render)

Use `.env.staging` + `.env.staging.local` (secrets) and tunnel:

```bash
cd backend
cp .env.staging.example .env.staging
cp .env.staging.local.example .env.staging.local   # add Razorpay test keys
npm run start:dev:staging
# separate terminal:
npm run tunnel:webhooks
# register tunnel URL in Razorpay, then:
npm run validate:live-razorpay-smoke -- 111111
```

See also [staging-webhooks.md](./staging-webhooks.md).
