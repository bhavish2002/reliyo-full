# Sprint 5 — Payments test cases

**Scope:** Fund holds, Razorpay adapter, webhooks, Rule Zero, trust deposit, checkout config.  
**Canonical workflow:** [`PRODUCT-WORKFLOW.md`](../PRODUCT-WORKFLOW.md) (Rule Zero, trust 10%, server-authoritative payment status).

## Automation map

| ID | Layer | Command / location |
|----|--------|-------------------|
| S5-UT | Unit | `cd backend && npm test -- --testPathPattern=payments` |
| S5-FE | Frontend unit | `npm test -- src/lib/payments` |
| S5-E2E | API regression | `cd backend && npm run validate:sprint5-suite -- 111111` |
| S5-ENV | Staging template | `cd backend && npm run validate:staging-env` |
| S5-LC | Lifecycle smoke | `cd backend && npm run validate:lifecycle -- 111111` |

**Prerequisites:** Postgres on **5433**, `npm run prisma:deploy`, API on **4000**, `OTP_DEV_FIXED_CODE=111111` in `backend/.env`.

---

## Unit tests (automated)

### Payment outcomes (`payment-outcomes.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U01 | UPI payment method | Hold → `confirmed` via mock webhook |
| S5-U02 | Card payment method | Hold → `pending` until webhook |
| S5-U03 | Net banking | Hold → `failed` via mock webhook |

### Razorpay mapper (`razorpay-webhook.mapper.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U10 | `payment.captured` payload | `status: confirmed`, `intentId` = order_id |
| S5-U11 | `payment.failed` payload | `status: failed` |
| S5-U12 | Normalized internal payload | Passthrough without re-map |
| S5-U13 | Missing order_id | Throws |

### Webhook service (`payment-webhook.service.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U20 | Mock HMAC verify (live mode) | Valid sig passes; invalid throws |
| S5-U21 | Razorpay HMAC verify (live mode) | Raw body signature match |
| S5-U22 | Duplicate `eventId` | `{ duplicate: true }`, no double-settle |

### Payments config (`payments-config.service.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U30 | `PAYMENT_MODE=mock` | `checkoutEnabled: false` |
| S5-U31 | `PAYMENT_MODE=live` + key | `checkoutEnabled: true`, checkout DTO on hold |
| S5-U32 | Mock provider hold in live mode | No checkout DTO |

### Razorpay provider (`razorpay-payment.provider.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U40 | Missing credentials | `PAYMENT_PSP_NOT_CONFIGURED` |
| S5-U41 | Orders API success | `providerIntentId` = Razorpay order id |

### Trust deposit math (`trust-deposit.util.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U50 | 10% of reward | Correct minor amount for accept validation |

### Frontend poll (`src/lib/payments/api.test.ts`)

| ID | Case | Expected |
|----|------|----------|
| S5-U60 | Hold already confirmed | Single GET, no poll loop |
| S5-U61 | Hold pending then confirmed | Polls until settled |

---

## API / E2E tests (automated scripts)

### Health & config

| ID | Case | Expected |
|----|------|----------|
| S5-E01 | `GET /health` | `200`, status ok |
| S5-E02 | `GET /payments/config` | `mode`, `psp`, `webhookPath` present |

### Rule Zero (workflow)

| ID | Case | Expected |
|----|------|----------|
| S5-E10 | Create task without fund hold | `400` `PAYMENT_REWARD_NOT_LOCKED` |
| S5-E11 | Create task with unconfirmed hold (card reward) | `400` (hold not confirmed) |
| S5-E12 | Reward UPI hold → create task | Task `open` |

### Trust deposit (workflow)

| ID | Case | Expected |
|----|------|----------|
| S5-E20 | Accept without trust hold | `400` `PAYMENT_TRUST_NOT_LOCKED` |
| S5-E21 | Trust amount ≠ 10% reward | `400` `PAYMENT_AMOUNT_MISMATCH` |
| S5-E22 | Card trust pending → Razorpay webhook → accept | Task `committed` |

### Webhooks

| ID | Case | Expected |
|----|------|----------|
| S5-E30 | Razorpay-shaped `payment.captured` | Hold `confirmed` |
| S5-E31 | Duplicate same `eventId` | Idempotent, no error |
| S5-E32 | Webhook missing body (raw) | `400` in live path |

### Full regression (`validate:sprint5-payments`)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| S5-E40 | End-to-end mock flow | Reward UPI → task → card trust → webhook → accept | `committed` |

---

## Manual / staging only (not in CI yet)

| ID | Case | How |
|----|------|-----|
| S5-M01 | Live Razorpay smoke (real order + signed webhook) | `npm run validate:live-razorpay-smoke -- 111111` (needs `.env.staging.local`) |
| S5-M02 | Razorpay dashboard test webhook | `npm run validate:staging-webhook -- <order_id>` with live secret |
| S5-M03 | Signed webhook rejected on tampered body | Post modified JSON with original signature → `400` |

---

## Pass criteria (Sprint 5 exit)

- [x] All S5-UT tests pass (20+ cases)
- [x] S5-FE payment tests pass
- [x] `validate:sprint5-suite` passes against local API
- [ ] One S5-M01 live payment on staging (blocker B2)
