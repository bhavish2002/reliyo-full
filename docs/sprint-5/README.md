# Sprint 5 — Payments + webhooks

**Goal:** Production-grade payment authority; PSP webhooks update `fund_holds` before task lifecycle proceeds (Rule Zero + trust deposit).

**Status:** ~95% — mock path fully automated; live smoke needs Razorpay TEST keys.

| Doc | Purpose |
|-----|---------|
| [STAGING-HOST.md](./STAGING-HOST.md) | **B5 decision:** Neon Postgres + Render API |
| [staging-webhooks.md](./staging-webhooks.md) | Tunnel + Razorpay webhook registration |
| [TEST-CASES.md](./TEST-CASES.md) | Sprint 5 test matrix |

## Quick commands

```bash
cd backend

# Mock mode (daily dev)
npm run start:dev
npm run validate:sprint5-suite -- 111111

# Check if live keys are configured
npm run check:razorpay-keys

# Live mode (after adding .env.staging.local)
npm run start:dev:staging
LIVE_SMOKE=1 npm run validate:sprint5-suite -- 111111
# or:
npm run validate:live-razorpay-smoke -- 111111
```

## Close Sprint 5 (final 5%)

1. Copy `backend/.env.staging.local.example` → `backend/.env.staging.local`
2. Add Razorpay **test mode** keys from [dashboard](https://dashboard.razorpay.com/app/keys)
3. `npm run start:dev:staging` (terminal 1)
4. `npm run validate:live-razorpay-smoke -- 111111`
5. Optional: `npm run tunnel:webhooks` + register URL in Razorpay for real checkout callbacks
6. Deploy staging: follow [STAGING-HOST.md](./STAGING-HOST.md) + root `render.yaml`

## Then → Sprint 6

Ledger + settlement on `closed`, `force_closed`, cancel, quit per `docs/sprint-0/financial-settlement-spec.md`.
