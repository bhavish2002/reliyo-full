# Reliyo MVP — Execution Tracker

> **Single source of truth** for sprint progress. Update the **Changelog** and task checkboxes after each milestone.  
> **Product workflow (canonical):** [`docs/PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) — **mandatory** pre-implementation checklist (also enforced via `.cursor/rules/product-workflow-validation.mdc`).  
> **Policy specs (locked):** [`docs/sprint-0/`](sprint-0/) · **Architecture:** [`docs/PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md)

---

## At a glance

| Metric | Value |
|--------|--------|
| **Plan** | 8 sprints (0 → 8) |
| **Completed** | Sprints **0, 1, 2, 3** ✅ |
| **In progress** | **Sprint 5 closeout (95%)** — live smoke script ready; Razorpay test keys needed for final S5-M01 |
| **Next sprint** | **Sprint 6** — Ledger + settlement |
| **Workflow doc** | [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) v1.0 (2026-05-25) |
| **Production readiness** | **Pre-production** (~60% of MVP build) |
| **Last verified** | 2026-06-10 — `validate:sprint5-suite` 8/8; live smoke skipped (no Razorpay keys) |

### Progress bar (implementation)

```
Sprint 0 ██████████ 100%  Policy lock
Sprint 1 ██████████ 100%  Frontend hardening
Sprint 2 ██████████  98%  Backend foundation (BullMQ deferred)
Sprint 3 █████████░  95%  Auth + guards on task/admin routes
Sprint 4 ██████████  96%  Task APIs + timeline API + cooldown/cancel fixes
Sprint 5 █████████░  95%  B5 host + live smoke script; keys needed for S5-M01
Sprint 6 ░░░░░░░░░░   0%  Ledger + settlement
Sprint 7 ░░░░░░░░░░   0%  Disputes + admin ops APIs
Sprint 8 ░░░░░░░░░░   0%  E2E + deploy
```

### Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done — matches plan + workflow, verified or evidenced in repo |
| 🟡 | Partial — started but gaps remain |
| ⬜ | Not started |
| ⏸️ | Deferred by decision (documented) |
| 🚫 | Blocked — dependency or external decision needed |

---

## Current project status (executive summary)

Reliyo is a **task marketplace MVP** (NestJS + React + PostgreSQL) with **locked business policy** (Sprint 0) and **server-authoritative identity** (Sprint 3). **Task lifecycle logic is backend-authoritative** (Sprint 4) and timeline actions are API-wired for core flows. Recent Sprint 4 fixes also include: dispute cooldown reset after `disputed -> done`, duplicate-dispute prevention while already `disputed`, attachment persistence in timeline metadata, and cancel response consistency.

**Money:** Reward and trust deposits use **`fund_holds`** with mock mode (dev) or **Razorpay Orders + Checkout + webhooks** (live). Payment status is **server-authoritative** — UI polls `GET /payments/fund-holds/:id` after checkout. **No ledger settlement** yet (Sprint 6).

**Admin:** Suspend-user API exists; disputes/close-requests list APIs are being wired. DSP4 resolution workflows still partial.

**Canonical workflow:** [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) §15–16 lists every gap vs the product spec.

---

## Next action plan

### Immediate (Sprint 4 polish — finish before Sprint 5)

| # | Action | Owner | Workflow refs | Unblocks |
|---|--------|-------|---------------|----------|
| 1 | ~~Wire `TaskTimeline` to task APIs~~ | FE | ✅ 2026-05-26 | — |
| 2 | ~~`availableActions` + cooldowns from API~~ | FE | ✅ 2026-05-26 | — |
| 3 | ~~Dashboard → API~~ | FE | ✅ 2026-05-26 | — |
| 4 | ~~My Tasks In Dispute tab~~ | FE | ✅ (API `status=disputed`) | — |
| 5 | ~~Admin Users suspend API~~ | FE | ✅ 2026-05-26 | — |
| 6 | ~~Normalize Biweekly~~ | FE | ✅ 2026-05-26 | — |
| 7 | ✅ `validate:lifecycle` script + manual dispute/cancel verification | BE/QA | 2026-05-28 checks | Sprint 4 confidence |

### Sprint 5 (current — closeout)

| # | Action | Notes |
|---|--------|-------|
| 1 | ✅ PSP selected: **Razorpay**; env contract added | `PAYMENT_PSP`, webhook secrets |
| 2 | ✅ Payment intent flow (`provider_intent_id`, pending-first) | `RazorpayPaymentProvider` Orders API |
| 3 | ✅ Webhook endpoint + raw-body signature + idempotent events | `rawBody: true`, `X-Razorpay-Signature` |
| 4 | ✅ Webhook-driven fund hold updates + retry-due endpoint | `payment_webhook_events` |
| 5 | ✅ B5 staging runbook + tunnel script + env template | `docs/sprint-5/`, `npm run tunnel:webhooks` |
| 6 | ✅ `GET /payments/config` + checkout payload on fund holds | `PaymentsConfigService` |
| 7 | ✅ Frontend Razorpay Checkout + poll until confirmed | `PaymentGateway`, `lib/payments/flow.ts` |
| 8 | 🟡 Live Razorpay smoke | `npm run validate:live-razorpay-smoke` — needs `.env.staging.local` keys |

### Sprint 6–8 (sequential)

| Sprint | Focus |
|--------|--------|
| **6** | Ledger entries on `closed`, `force_closed`, cancel, quit; 5% / 3% fees per workflow |
| **7** | Force-close request API + admin approval; DSP4 matrix; notifications DB; support tickets |
| **8** | E2E against `PRODUCT-WORKFLOW.md`; deploy + monitoring + runbooks |

---

## Current system status

| Layer | Status | Notes |
|-------|--------|-------|
| **Policy / specs** | ✅ Locked v1.0 | Sprint 0 |
| **Product workflow doc** | ✅ v1.0 | `PRODUCT-WORKFLOW.md` + Cursor rule |
| **Frontend UI** | 🟡 Hybrid | Core task/timeline actions API-backed; some admin flows still local |
| **Frontend ↔ API** | 🟡 ~75% | TaskTimeline wired; remaining admin/dispute ops pending |
| **Backend API** | 🟡 Tasks + auth + payments/webhooks | Live PSP callback integration pending staging |
| **Database** | 🟡 | `users`, `tasks`, `task_events`, `fund_holds` |
| **Payments** | 🟡 Mock + live path | Mock dev default; Razorpay Orders/Checkout/webhooks in live mode |
| **Ledger** | ⬜ | Module scaffold only |
| **CI** | ✅ | `backend-ci.yml`, `frontend-ci.yml` |
| **Local dev** | 🟡 | Postgres **5433**; `npm run start:dev:clean` for port conflicts |
| **Staging / prod** | 🟡 | B5 ✅ Neon+Render; deploy via `render.yaml` when ready |

### Active blockers

| ID | Blocker | Affects | Mitigation | Target |
|----|---------|---------|------------|--------|
| B1 | ~~`TaskTimeline` mutations use localStorage~~ | — | ✅ Wired to task APIs (2026-05-26) | — |
| B2 | Live Razorpay smoke execution | Sprint 5 | Add test keys → `validate:live-razorpay-smoke` | User keys in `.env.staging.local` |
| B3 | ~~Admin suspend UI not wired~~ | — | ✅ `AdminUsers` + `GET /admin/users` (2026-05-26) | — |
| B4 | ~~Guards not wired~~ | — | ✅ Resolved | — |
| B5 | ~~Staging host undefined~~ | — | ✅ **Neon + Render** — [`STAGING-HOST.md`](sprint-5/STAGING-HOST.md), [`render.yaml`](../render.yaml) | Deploy when ready |
| B6 | No server 3-strike inactivity job | Done → closed auto path | Cron/BullMQ + API transition | Sprint 7 |
| B7 | Force-close + DSP4 admin APIs missing | Admin ops | Sprint 7 endpoints | Sprint 7 |

### Workflow deviations (tracked)

See [`PRODUCT-WORKFLOW.md` §16](PRODUCT-WORKFLOW.md#known-deviations--technical-debt) — active key IDs: **D2** cancel→`closed` not hard delete, **D4** inactivity client-only, **D5** force-close UI-only.

---

## Sprint roadmap (all 8)

| # | Theme | Status | % | Depends on |
|---|--------|--------|---|------------|
| **0** | Product + policy lock | ✅ Done | 100% | — |
| **1** | Frontend + repo hardening | ✅ Done | 100% | Sprint 0 |
| **2** | Backend foundation | ✅ Done | 98% | Sprint 1 |
| **3** | Auth + authorization | ✅ Done | 95% | Sprint 2 |
| **4** | Task APIs + lifecycle | 🟡 Polishing | 96% | Sprint 3 |
| **5** | Payments + webhooks | 🟡 Closeout | 95% | Sprint 4 polish |
| **6** | Ledger + settlement | ⬜ Not started | 0% | Sprint 5 |
| **7** | Disputes + admin ops | ⬜ Not started | 0% | Sprint 4, 6 |
| **8** | E2E + hardening + deploy | ⬜ Not started | 0% | Sprint 7 |

---

## Sprint 0 — Product + policy lock ✅ (100%)

**Goal:** Freeze business rules before implementation.

| Task | Status |
|------|--------|
| Decision register locked | ✅ |
| State machine spec | ✅ |
| Financial settlement spec | ✅ |
| Dispute ops spec | ✅ |
| API error contract | ✅ |
| Legal/platform-held funds wording (DR-008) | ✅ |
| Canonical workflow consolidated | ✅ | `docs/PRODUCT-WORKFLOW.md` (2026-05-25) |

**Evidence:** `docs/sprint-0/`

**Exit criteria met:** All policy docs locked; implementation references Sprint 0 for transitions/settlement.

---

## Sprint 1 — Frontend refinement + repo hardening ✅ (100%)

**Goal:** Align UI with policy; API-ready client patterns.

| Task | Status | Evidence |
|------|--------|----------|
| Remove Lovable-specific artifacts | ✅ | No `lovable` in repo |
| Canonical task statuses (no `completed`) | ✅ | `taskTypes.ts`, `taskMigration.ts` |
| Accept → rate → `closed`; admin `force_closed` | ✅ | UI flows (pre-API) |
| API error envelope + client trace | ✅ | `lib/api/client.ts` |
| Platform-held funds copy | ✅ | Marketing/legal pages |
| Package/env standardization | ✅ | `reliyo-frontend`, `.env.example` |
| Error boundary + trace ref | ✅ | `AppErrorBoundary.tsx` |
| Landing footer (Resources, Company, social, legal) | ✅ | `Footer.tsx` |
| Screens API-ready (loading/empty/error) | 🟡 | Patterns exist; Dashboard still local |
| OpenAPI-generated types | ⬜ | Sprint 8 or follow-up |
| React Query per endpoint | ⬜ | Sprint 4 polish / 8 |
| Sentry wired | ⬜ | Placeholder only |
| Neutral timeline `entryType` (not `escrow`) | ⬜ | Follow-up |

**Doc:** [`docs/sprint-1/README.md`](sprint-1/README.md)

**Remaining follow-ups:** Carried to Sprint 4 polish (Dashboard API) and Sprint 8 (OpenAPI, Sentry).

---

## Sprint 2 — Backend foundation ✅ (98%)

**Goal:** NestJS monolith, Prisma, envelopes, CI, local infra.

| Task | Status | Evidence |
|------|--------|----------|
| NestJS app + global prefix | ✅ | `backend/src/main.ts` |
| Prisma + PostgreSQL | ✅ | `prisma/schema.prisma`, migrations |
| `audit_events` baseline table | ✅ | Migration `20260214120000_init` |
| ValidationPipe (whitelist) | ✅ | `main.ts` |
| API error + success envelopes | ✅ | Filter + interceptor |
| Request ID middleware | ✅ | `request-id.middleware.ts` |
| Health + version routes | ✅ | `health.controller.ts` |
| Docker Compose Postgres | ✅ | Port **5433** on host |
| Backend CI | ✅ | `.github/workflows/backend-ci.yml` |
| Frontend CI | ✅ | `.github/workflows/frontend-ci.yml` |
| Domain module scaffolds | ✅ | `tasks`, `lifecycle`, `payments`, `ledger`, `disputes`, … |
| Structured logging convention | 🟡 | `StructuredLogger` exists; not global Nest logger |
| Redis + BullMQ baseline | ⏸️ | Deferred to Sprint 5+ |
| Staging/prod env separation | 🟡 | `.env` only; blocked by B5 |

**Doc:** [`docs/sprint-2/README.md`](sprint-2/README.md)

---

## Sprint 3 — Authentication + authorization ✅ (95%)

**Goal:** Server-authoritative identity; replace demo phone-only auth.

| Task | Status | Evidence |
|------|--------|----------|
| OTP send/verify | ✅ | `OtpService`, `auth.controller.ts` |
| Rate limits (send + verify) | ✅ | `otp.service.ts`; `clear-otp` scripts |
| Dev + Twilio OTP providers | ✅ | `dev-otp`, `twilio-otp` |
| JWT access token | ✅ | `JwtStrategy`, memory on client |
| Refresh token + rotation | ✅ | `refresh_sessions`, httpOnly cookie |
| Prisma `User`, `OtpChallenge`, `RefreshSession` | ✅ | Migration `20260515120000_auth` |
| Seed demo users (9000000001–3) | ✅ | `prisma/seed.ts` |
| APIs: send, verify, refresh, logout | ✅ | `/auth/*` |
| GET `/me` | ✅ | `auth.controller.ts` |
| `JwtAuthGuard` | ✅ | Protected routes |
| `SuspensionGuard` | ✅ | `/me`, `/tasks/*`, `/payments/fund-holds` |
| `RolesGuard` | ✅ | `PATCH /admin/users/:id/suspension` |
| `TaskContextGuard` | ✅ | Task mutations (Sprint 4); accept allowed for `none` on open tasks |
| Frontend `AuthProvider` + API auth | ✅ | `contexts/AuthContext.tsx` |
| Sign-in / sign-up / verify OTP pages | ✅ | API-backed |
| Token strategy documented | ✅ | `docs/sprint-3/AUTH.md` |
| Auth unit tests | 🟡 | Minimal (`auth.service.spec.ts`) |
| Admin suspend ↔ UI | 🟡 | API ✅; `AdminUsers.tsx` local (B3) |
| No permanent marketplace role | 🟡 | `preferred_role` UX only — matches workflow |

**Doc:** [`docs/sprint-3/README.md`](sprint-3/README.md) · [`docs/sprint-3/AUTH.md`](sprint-3/AUTH.md)

**Remaining:** Wire admin users UI (B3); expand auth tests in Sprint 8.

---

## Sprint 4 — Task APIs + lifecycle 🟡 (96% — **closeout**)

**Goal:** Task truth on server; lifecycle engine; `availableActions`; Rule Zero + trust deposit.

### Backend — done

| Task | Status | Evidence |
|------|--------|----------|
| Prisma: Task + TaskEvent | ✅ | `20260525120000_tasks` |
| Prisma: FundHold + task hold FKs | ✅ | `20260525180000_fund_holds`, `20260526120000_trust_fund_hold` |
| Lifecycle transition service | ✅ | `lifecycle.service.ts`, `lifecycle.types.ts` |
| Server-side cooldowns | ✅ | quit 2h, dispute 48h, force-close req 24h |
| `availableActions` on detail | ✅ | `getDetail()` |
| Tasks REST API | ✅ | `tasks.controller.ts` |
| Fund holds REST API | ✅ | `fund-holds.controller.ts` |
| Rule Zero — reward before `open` | ✅ | `fundHoldId` on `POST /tasks` |
| Trust 10% before `committed` | ✅ | `trust_deposit` hold on accept |
| List scopes: mine / browse / admin | ✅ | `GET /tasks?scope=` |
| TaskContextGuard + SuspensionGuard | ✅ | Task routes |
| Admin suspend API | ✅ | `admin.controller.ts` |
| extend-deadline API | ✅ | Requestor only |
| Lifecycle unit tests | ✅ | includes cooldown reset + disputed guard |

### Frontend — partial

| Task | Status | Evidence |
|------|--------|----------|
| Create → review → payment → API create | ✅ | `CreateTask`, `PaymentGateway` |
| Accept → payment → API accept | ✅ | `TaskDetail` |
| Browse / My Tasks / Admin All Tasks lists | ✅ | API + refresh events |
| Task detail load from API | ✅ | `getTaskDetail`; auth-gated |
| Cancel open task via API | ✅ | `cancelTask` |
| **TaskTimeline → API** | ✅ | quit/mark-done/dispute/comments/accept-work via API |
| Dashboard from API | ✅ | `scope=mine` |
| Notifications from API | ⬜ | Client-only |
| Send Alert / Request Force Close | ⬜ | UI/local only (Sprint 7 API) |
| 3-strike inactivity | ⬜ | `lib/inactivity.ts` client-only (B6) |
| React Query hooks | ⬜ | Follow-up |
| OpenAPI / generated types | ⬜ | Follow-up |

**Doc:** [`docs/sprint-4/README.md`](sprint-4/README.md) · Workflow gaps: [`PRODUCT-WORKFLOW.md` §15–16](PRODUCT-WORKFLOW.md#implementation-alignment-as-of-sprint-4)

**Sprint 4 exit criteria (to mark ✅):**

- [x] B1 resolved — all lifecycle actions via API
- [x] Dashboard + dispute tab API-backed
- [x] B3 admin suspend UI wired
- [x] Manual lifecycle validation (create/accept/in-progress/disputed/done/closed) + targeted bug checks

---

## Sprint 5 — Payments + webhooks 🟡 (95%)

**Goal:** Production payment authority; webhooks update fund holds.

| Task | Status | Notes |
|------|--------|-------|
| PSP selection | ✅ | Razorpay selected for Sprint 5 |
| Payment intents (PSP) | ✅ | `RazorpayPaymentProvider` (Orders API) in live mode |
| Razorpay webhook payload mapper | ✅ | `razorpay-webhook.mapper.ts` |
| Webhook ingestion + raw-body signature | ✅ | `rawBody: true`; `X-Razorpay-Signature` (live) |
| Idempotent webhook processing | ✅ | `payment_webhook_events` |
| Retry processing | 🟡 | DB `retry-due`; BullMQ optional |
| Rule Zero via webhook-confirmed holds | ✅ | Mock UPI auto-confirm; live via webhook |
| Sprint 5 regression + suite | ✅ | `validate:sprint5-suite` (8 checks) |
| B5 staging host | ✅ | **Neon + Render** — `docs/sprint-5/STAGING-HOST.md`, `render.yaml` |
| B5 tunnel + runbook | ✅ | `tunnel:webhooks`, `staging-webhooks.md` |
| `GET /payments/config` | ✅ | Mode, PSP, publishable Razorpay key |
| Frontend Razorpay Checkout | ✅ | `PaymentGateway` + `settleFundHold` poll |
| Live smoke automation (S5-M01) | ✅ | `validate:live-razorpay-smoke` |
| Live smoke executed | 🟡 | Requires Razorpay test keys in `.env.staging.local` |

**Exit criteria (to mark ✅):**

- [x] Mock mode regression passes
- [x] Raw-body webhook verification
- [x] Checkout UI opens Razorpay when `checkout` returned
- [x] B5 staging host selected (Neon + Render) + `render.yaml`
- [ ] One end-to-end live payment — run `validate:live-razorpay-smoke` after adding Razorpay test keys to `.env.staging.local`

---

## Sprint 6 — Ledger + settlement ⬜ (0%)

**Goal:** Double-entry ledger; settlement on terminal and refund paths.

| Task | Status | Workflow settlement |
|------|--------|---------------------|
| Ledger schema | ⬜ | |
| Close: reward − 5% to acceptor; trust refund | ⬜ | `closed` |
| Force close: reward to requestor; trust − 3% | ⬜ | `force_closed` |
| Cancel open: full reward refund | ⬜ | Delete before accept |
| Quit: full trust refund | ⬜ | Within 2h |
| Progressive KYC gating | ⬜ | Optional MVP trim |
| Payout queue + reconciliation | ⬜ | |

**Depends on:** Sprint 5 + [`financial-settlement-spec.md`](sprint-0/financial-settlement-spec.md)

---

## Sprint 7 — Disputes + admin ops ⬜ (0%)

**Goal:** DSP1–DSP4, force-close approval, admin queues, notifications.

| Task | Status |
|------|--------|
| Dispute raise API (exists) + full DSP counter UI | 🟡 | Backend partial; UI local |
| DSP4 admin decision endpoints | ⬜ |
| Force-close request + admin approve/reject API | ⬜ |
| Admin disputes / escalated / close-requests data | ⬜ | Currently `adminData` / local |
| Notifications persistence + API | ⬜ |
| Support tickets API | ⬜ |
| Server 3-strike inactivity job | ⬜ | B6 |
| Revenue / analytics from ledger | ⬜ | After Sprint 6 |

**Depends on:** Sprint 4 lifecycle stable, Sprint 6 for money truth

---

## Sprint 8 — E2E + hardening + deploy ⬜ (0%)

| Task | Status |
|------|--------|
| E2E critical paths vs `PRODUCT-WORKFLOW.md` | ⬜ |
| Authz abuse + webhook replay tests | ⬜ |
| Rate limits audit (OTP, sensitive routes) | 🟡 | OTP limits exist |
| Load tests | ⬜ |
| OpenAPI + generated client types | ⬜ |
| Sentry / observability | ⬜ |
| Incident / payout / reconciliation runbooks | ⬜ |
| Production deploy + monitoring | ⬜ |

**Depends on:** Sprints 4–7

---

## Local verification log

| Check | Command / URL | Expected | Last run |
|-------|----------------|----------|----------|
| Postgres up | `docker compose ps` | healthy, port **5433** | Manual |
| Migrations | `cd backend && npm run prisma:deploy` | All applied (incl. fund_holds) | Manual |
| Seed | `npm run prisma:seed` | 3 users | Manual |
| Backend build | `cd backend && npm run build` | 0 errors | 2026-05-28 ✅ |
| Payments tests | `cd backend && npm run test -- --testPathPattern=payments` | Pass (20) | 2026-05-28 ✅ |
| Staging env template | `cd backend && npm run validate:staging-env` | Pass | 2026-05-28 ✅ |
| Frontend payment tests | `npm test -- src/lib/payments/api.test.ts` | Pass | 2026-05-28 ✅ |
| Staging host decision | Neon + Render — `docs/sprint-5/STAGING-HOST.md` | Documented | 2026-05-28 ✅ |
| Sprint 5 suite | `npm run validate:sprint5-suite -- 111111` | 8/8 pass | 2026-06-10 ✅ |
| Sprint 5 E2E only | `npm run validate:sprint5-payments -- <otp>` | Pass | 2026-05-28 ✅ |
| Lifecycle smoke | `npm run validate:lifecycle -- <otp>` | Pass | 2026-05-28 ✅ |
| Health API | `GET http://localhost:4000/api/v1/health` | `ok` | 2026-05-25 ✅ |
| OTP send | `POST .../auth/otp/send` | `expiresInSeconds` | 2026-05-25 ✅ |
| Rule Zero script | `node backend/scripts/validate-rule-zero.mjs` | Pass | Manual |
| Task visibility script | `node backend/scripts/validate-task-visibility.mjs` | Pass | Manual |
| Frontend build | `npm run build` (root) | Success | — |
| E2E create→accept | Two seeded users + payment mock | Tasks in lists | Manual |

---

## Changelog

| Date | Sprint | Summary |
|------|--------|---------|
| 2026-05-14 | — | Tracker created; Sprints 0–1 done; Sprint 2 partial. |
| 2026-05-15 | 2–3 | Sprint 3 auth shipped; Sprint 2 closure; frontend CI. |
| 2026-05-25 | Review | Tracker refactor; blockers B1–B5; local verify health + OTP. |
| 2026-05-25 | 4 | Tasks schema, lifecycle, REST APIs, guards, admin suspend; FE create/browse/detail/accept/cancel via API. |
| 2026-05-25 | 4 | Fund holds (reward + trust), Rule Zero + 10% trust on accept; migrations `fund_holds`. |
| 2026-05-25 | — | **`PRODUCT-WORKFLOW.md`** canonical workflow + gap matrix; Cursor rule `product-workflow-validation.mdc`; tracker expanded with next-action plan, B6–B7, per-sprint % and exit criteria. |
| 2026-05-26 | 4 polish | TaskTimeline → API; `availableActions`/cooldowns; Dashboard API; Admin users list+suspend; Biweekly; fix `canQuit`; `validate-lifecycle.mjs`. |
| 2026-05-28 | 4 polish | Fixed dispute cooldown reset after `disputed->done`; blocked duplicate raise while `disputed`; fixed cancel response false `TASK_NOT_FOUND`; attachment metadata persisted via API comments. |
| 2026-05-28 | 5 | Added payment intent + webhook foundation: `provider_intent_id`, signed webhook endpoint, idempotent `payment_webhook_events`, DB retry-due processor, mock flow updated to webhook-driven status updates. |
| 2026-05-28 | 5 | Live Razorpay adapter (`RazorpayPaymentProvider`), webhook payload mapper + `verifyRazorpaySignature`, fund-hold lookup by `providerIntentId`, `validate:sprint5-payments` E2E (reward → task → card trust webhook → accept). |
| 2026-05-28 | 5 | B5 staging runbook (`docs/sprint-5/`), tunnel script, raw-body webhooks, `GET /payments/config`, checkout DTO on fund holds, frontend Razorpay Checkout + server poll (`PaymentGateway`, `settleFundHold`). |
| 2026-05-28 | 5 | Sprint 5 test matrix (`docs/sprint-5/TEST-CASES.md`) + `validate:sprint5-suite` (8 checks: health, config, Rule Zero, webhooks, regression, unit, env). |
| 2026-05-28 | 5 | B5 closed: staging host **Neon + Render** (`STAGING-HOST.md`, `render.yaml`), `start:dev:staging`, `validate:live-razorpay-smoke` (S5-M01). |
| 2026-06-10 | 5 | Resumed closeout: `check:razorpay-keys`, optional `LIVE_SMOKE=1` in suite; re-verified `validate:sprint5-suite` 8/8. |

---

## Quick links

| Resource | Path |
|----------|------|
| **Product workflow (validate here first)** | [`docs/PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) |
| Architecture & file guide | [`docs/PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) |
| Sprint 4 detail | [`docs/sprint-4/README.md`](sprint-4/README.md) |
| Sprint 5 payments / staging | [`docs/sprint-5/README.md`](sprint-5/README.md) |
| Sprint 5 test cases | [`docs/sprint-5/TEST-CASES.md`](sprint-5/TEST-CASES.md) |
| Sprint 0 specs | [`docs/sprint-0/`](sprint-0/) |
| Backend setup | [`backend/README.md`](../backend/README.md) |
| Auth details | [`docs/sprint-3/AUTH.md`](sprint-3/AUTH.md) |
| Cursor workflow rule | [`.cursor/rules/product-workflow-validation.mdc`](../.cursor/rules/product-workflow-validation.mdc) |

---

## How to update this file

1. Complete **`PRODUCT-WORKFLOW.md` pre-implementation checklist** before coding (Cursor rule enforces this).
2. Change task symbols (✅ / 🟡 / ⬜) when work lands.
3. Update **At a glance**, progress bar %, and **Next action plan** after each milestone.
4. Add a **Changelog** row (date + sprint + summary).
5. Record **Local verification log** after test runs.
6. Add/remove **Active blockers**; link workflow deviation IDs (D1–D9) when relevant.
7. Mark sprint **exit criteria** checkboxes when a sprint is truly complete.
