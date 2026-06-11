# B5 — Staging + webhook tunnel (Razorpay)

Use this runbook to receive **real Razorpay webhooks** against a local or staging API before production deploy.

## Prerequisites

- Razorpay **test mode** keys (`rzp_test_*`) from [Razorpay Dashboard](https://dashboard.razorpay.com/)
- API running on port **4000** (`npm run start:dev` or staging host)
- **cloudflared** or **ngrok** installed ([cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) recommended)

## 1. Configure staging env

```bash
cd backend
cp .env.staging.example .env.staging
# Edit DATABASE_URL, JWT secrets, Razorpay test keys
```

Minimum payment vars:

| Variable | Value |
|----------|--------|
| `PAYMENT_MODE` | `live` |
| `PAYMENT_PSP` | `razorpay` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | test secret |
| `RAZORPAY_WEBHOOK_SECRET` | from Razorpay webhook setup |

Load for local staging smoke:

```bash
# PowerShell
$env:NODE_ENV="staging"
Get-Content .env.staging | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }
npm run start:dev
```

On a remote staging host, inject the same keys via your secrets manager.

## 2. Start webhook tunnel

```bash
cd backend
npm run tunnel:webhooks
```

Default exposes `http://localhost:4000`. The script prints:

```
Register in Razorpay → Webhooks:
  https://<tunnel-host>/api/v1/payments/webhooks/razorpay
```

Set `PUBLIC_API_URL=https://<tunnel-host>` in `.env.staging` for reference.

### Razorpay dashboard

1. **Settings → Webhooks → Add New Webhook**
2. URL: `{PUBLIC_API_URL}/api/v1/payments/webhooks/razorpay`
3. Secret: same as `RAZORPAY_WEBHOOK_SECRET`
4. Events: `payment.captured`, `payment.failed`, `order.paid`
5. Save and use **Send test webhook** to verify `200` response

## 3. Verify signature + ingestion

```bash
# After creating a pending hold, pass its providerIntentId (order_xxx):
npm run validate:staging-webhook -- order_xxxxxxxx
```

For full live smoke (real Razorpay order + signed webhook + Rule Zero):

```bash
npm run start:dev:staging
npm run validate:live-razorpay-smoke -- 111111
```

## 4. Frontend checkout (live mode)

1. Set frontend `VITE_API_BASE_URL` to tunnel or staging API
2. `GET /payments/config` returns `mode: live` and `razorpayKeyId`
3. Payment page opens Razorpay Checkout with `order_id` from fund hold
4. On success, poll `GET /payments/fund-holds/:id` until `confirmed`, then publish task / accept

## Workflow alignment

- **Rule Zero:** Task `POST /tasks` only after reward hold `confirmed` (webhook or mock auto-confirm).
- **Trust 10%:** Accept only after trust hold `confirmed`.
- **No client-trusted payment status:** UI polls server; webhook is source of truth in live mode.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `PAYMENT_WEBHOOK_SIGNATURE_INVALID` | Secret mismatch; ensure Razorpay secret = `RAZORPAY_WEBHOOK_SECRET`; raw body middleware enabled |
| Webhook 404 | Tunnel not pointing to port 4000; check `API_PREFIX=api/v1` |
| Hold stays `pending` | Event not subscribed; check Razorpay webhook logs |
| CORS errors from frontend | Add frontend origin to `CORS_ORIGIN` on API |
