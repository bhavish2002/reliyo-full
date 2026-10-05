# Reliyo MVP — Execution Tracker

> **Single source of truth** for sprint progress. Update the **Changelog** and task checkboxes after each milestone.  
> **Product workflow (canonical):** [`docs/PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) — **mandatory** pre-implementation checklist (also enforced via `.cursor/rules/product-workflow-validation.mdc`).  
> **Policy specs (locked):** [`docs/sprint-0/`](sprint-0/) · **Architecture:** [`docs/PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md)

---

## At a glance

| Metric | Value |
|--------|--------|
| **Plan** | 8 sprints (0 → 8) |
| **Completed** | Sprints **0–7**, **6.5** ✅ |
| **In progress** | **Sprint 8** — 8A, 8D-P0, 8F, 8G, inactivity policy ✅; **8B E2E + 8C deploy** remaining |
| **Next focus** | **8B** E2E suite → **8C** staging deploy |
| **Workflow doc** | [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) (incl. deadline-gated inactivity) |
| **Production readiness** | **Pre-production** (~80% build, ~70% launch-ready) |
| **Last verified** | 2026-09-22 — admin Escalated auto-flag Closed DSP4 rows + independent Flag/DSP4 Status filters (unit tests) |

### Progress bar (implementation)

```
Sprint 0 ██████████ 100%  Policy lock
Sprint 1 ██████████ 100%  Frontend hardening
Sprint 2 ██████████  98%  Backend foundation (BullMQ deferred)
Sprint 3 █████████░  95%  Auth + guards on task/admin routes
Sprint 4 ██████████  96%  Task APIs + timeline API + cooldown/cancel fixes
Sprint 5 ██████████ 100%  Razorpay + webhooks + checkout + live smoke
Sprint 6 ██████████ 100%  Ledger + settlement ✅
Sprint 6.5 ██████████ 100%  Stabilization gate ✅
Sprint 7 ██████████ 100%  Notifications + inactivity job + support/revenue APIs ← **complete**
Sprint 8 █████░░░░░  50%  8A/8D-P0/8F/8G + inactivity policy done; 8B E2E + 8C deploy remain
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

**Money:** Reward and trust deposits use **`fund_holds`** with mock mode (dev) or **Razorpay Orders + Checkout + webhooks** (live). Payment status is **server-authoritative** — UI polls `GET /payments/fund-holds/:id` after checkout. **Sprint 5 complete:** Rule Zero + trust lock proven via smoke scripts and browser. **Sprint 6 complete:** double-entry ledger posts settlement on cancel, quit, accept-work, and admin force-close (payables recorded; PSP payout deferred).

**Admin:** DSP4 resolution, force-close queue, cancelled-tasks audit, **notifications DB + API**, **support tickets API**, **revenue from ledger**, server **3-strike inactivity job** (hourly cron; defaults on in local dev/staging; startup backlog run; manual `POST /admin/jobs/inactivity/process-due` for QA).

**Sprint 8 (partial):** Cron scheduling (8A), API-backed profile + read-only admin settings (8D-P0), support ticket UX (8F), admin cancelled-tasks nav removed (8G), **deadline-gated inactivity** (strikes only after effective deadline in `done`), **inactivity dev automation fix** (2026-08-20), **dynamic acceptor ratings**, **support form validation + public/dashboard split**. Remaining: E2E suite (8B), deploy + hardening (8C).

---

## Sprint 6.5 — Stabilization gate ✅ (100%)

| Phase | Work | Status |
|-------|------|--------|
| 6.5A | Task ownership & visibility (`participation=created\|accepted`) | ✅ |
| 6.5B | Force-close reject → resolved list | ✅ |
| 6.5C | Minimal real-time (`useTasksListRefresh` + `notifyTasksChanged`) | ✅ |
| 6.5D | `validate:task-ownership`, `validate:force-close` | ✅ |

**Verified:** Manual browser smoke + regression scripts (2026-06-17).

---

## Sprint 7 — Disputes + admin ops ✅ (100%)

| Phase | Work | Status |
|-------|------|--------|
| 7A | DSP4 admin API + deadline math + ledger | ✅ `DisputesService`, `validate:dsp4` |
| 7B | Force-close request API + API-backed admin UI | ✅ `POST /tasks/:id/force-close-request` |
| 7C | Quit re-accept limit (DR-009) | ✅ `validate:quit-reaccept` |
| 7D | Cancel audit fields + admin cancelled-tasks view | ✅ |
| 7E | Notifications DB + API | ✅ `AppNotification` + lifecycle hooks |
| 7F | My Tasks search/filter | ✅ Client-side search |
| 7G | Transactions timeline UX | ✅ Date-grouped timeline |
| 7H | Admin preview scroll/CSS | ✅ `AdminTaskDetailDialog` API timeline |
| **Phase 1** | localStorage cleanup (inactivity, notifications, admin stats) | ✅ 2026-06-19 |

**Exit criteria:** All met. Cron scheduling for inactivity → Sprint 8.

---

## Sprint 7 (legacy table) — Disputes + admin ops

**Goal:** DSP1–DSP4, force-close approval, admin queues, notifications.

| Task | Status |
|------|--------|
| Dispute raise API (exists) + full DSP counter UI | 🟡 | Backend + API timeline; DSP4 admin API ✅ |
| DSP4 admin decision endpoints | ✅ | `PATCH /admin/disputes/:taskId/dsp4` |
| Force-close request + admin approve/reject API | ✅ | Dedicated request endpoint + admin PATCH |
| Admin disputes / escalated / close-requests data | ✅ | API-backed (`AdminDisputes`, `AdminCloseRequests`) |
| Notifications persistence + API | ⏸️ | Sprint 7E deferred |
| Support tickets API | ⬜ |
| Server 3-strike inactivity job | ⬜ | B6 |
| Revenue / analytics from ledger | ⬜ | After Sprint 6 |

**Depends on:** Sprint 4 lifecycle stable, Sprint 6 for money truth

---

## Next action plan

> **Current focus (Sprint 8 ~50%):** 8A, 8D-P0, 8F, 8G, and inactivity policy are done. **Next:** commit milestone → **8B** E2E → **8C** deploy → staging sign-off. See [`NEXT-POA.md`](NEXT-POA.md).

### Step 0 — Consolidate (0.5 day)

| # | Action | Exit check |
|---|--------|------------|
| 1 | Commit Sprint 8 work (8A, 8D-P0, 8F, 8G, inactivity) | Clean working tree; migrations applied |
| 2 | Manual sign-off using `validate:jobs-cron`, `validate:profile-settings`, `validate:support-tickets`, `validate:inactivity` | All PASS locally |

### Step 1 — Sprint 8B: E2E critical paths (3–5 days) — **launch blocker**

| # | Action | Deliverable |
|---|--------|-------------|
| 1 | Create `validate:production-paths.mjs` orchestrating existing scripts | One command runs all lifecycle/money paths |
| 2 | Chain: happy path, quit, cancel, dispute, force-close, inactivity, authz, profile PATCH | Each path asserts task status + ledger where applicable |
| 3 | Wire GitHub Actions: Postgres + API + run suite on PR/nightly | CI fails on regression |
| 4 | (Optional) Playwright browser smoke for OTP → create → pay → close | Screenshots on failure |

**Depends on:** 8A ✅, 8D-P0 ✅  
**Blocks:** 8C staging sign-off

### Step 2 — Sprint 8C: Deploy + hardening (3–5 days) — **launch blocker**

| # | Action | Deliverable |
|---|--------|-------------|
| 1 | Deploy API to Render (Neon) via `render.yaml` | `INACTIVITY_JOB_ENABLED=true`, CORS, secrets |
| 2 | Deploy frontend (Pages/Vercel/Render static) | `VITE_API_BASE_URL` → staging API |
| 3 | Run `validate:production-paths` against **staging** | Green on hosted API |
| 4 | Staging browser smoke: OTP → full lifecycle | Manual checklist pass |
| 5 | Sentry (FE + BE), runbooks (`docs/runbooks/`), webhook security tests | Observability baseline |
| 6 | Twilio OTP on staging (not dev fixed code) | Real auth on staging |

**Blocks:** Production cutover

### Step 3 — Staging sign-off → prod (2–3 days)

Use [`NEXT-POA.md` staging sign-off checklist](NEXT-POA.md#staging-sign-off-checklist). After 48h green: prod cutover (separate DB, live Razorpay, DNS).

### Step 4 — Post-launch polish (non-blocking)

| Phase | Work |
|-------|------|
| **8D-P1** | Dynamic platform config, notification prefs enforcement, preferred-role toggle |
| **8G.4** | Optional cancelled filter on Admin All Tasks |
| **8E** | KYC + payout queue (E-KYC.1–7) — required before real bank transfers |

---

### Historical — Sprint 6 ✅ (complete)

**Goal:** Double-entry ledger; post settlement on terminal lifecycle transitions per [`financial-settlement-spec.md`](sprint-0/financial-settlement-spec.md).

**Status:** All phases shipped; E2E `validate:ledger-settlement` passed locally 2026-06-15.

| Phase | # | Action | Owner | Spec / workflow | Deliverable |
|-------|---|--------|-------|-----------------|-------------|
| **6A — Schema** | 1 | Design ledger accounts + journal tables | BE | §5 Ledger Requirements | Prisma migration: `ledger_accounts`, `journal_entries`, `journal_lines` |
| | 2 | Idempotency keys per business event | BE | §5.4 | `idempotency_key` unique per `(reference_type, reference_id, scenario)` |
| | 3 | Seed chart of accounts (platform, escrow, revenue, reserve) | BE | §2 primitives | Migration seed or `prisma/seed` extension |
| **6B — Core service** | 4 | `LedgerService.postJournal()` — balanced debits/credits in one TX | BE | §5.1–5.3 | `backend/src/ledger/ledger.service.ts` |
| | 5 | Wire `LedgerModule` into `LifecycleModule` / `TasksModule` | BE | — | Settlement hooks on terminal transitions only |
| | 6 | Unit tests: each scenario balances; duplicate idempotency no-op | BE | — | `ledger.service.spec.ts` |
| **6C — Scenarios** | 7 | **`closed`** (`done` → `closed`): reward − 5% to acceptor; trust full refund; platform fee | BE | §4.1, workflow §8 | Hook in lifecycle close path |
| | 8 | **`force_closed`**: reward refund to requestor; trust − 3% penalty; reserve | BE | §4.2 | Admin / DSP4 path (stub OK if Sprint 7 API pending) |
| | 9 | **Cancel open** (`open` → `closed` + `cancelledAt`): full reward refund | BE | §4.4, D2 | `DELETE /tasks/:id` settlement |
| | 10 | **Quit within 2h** (`committed` → `open`): full trust refund | BE | §4.3 | `POST /tasks/:id/quit` settlement |
| **6D — Integration** | 11 | Link journal lines to `fund_holds` (`providerIntentId`, hold ids) | BE | Rule Zero | Traceability on every line |
| | 12 | `validate:ledger-settlement` script — all 4 scenarios | QA | PRODUCT-WORKFLOW §8 | `backend/scripts/validate-ledger-settlement.mjs` |
| | 13 | Document Sprint 6 | Docs | — | `docs/sprint-6/README.md` |

**Sprint 6 exit criteria:**

- [x] Journal entries created atomically with lifecycle transition (same DB transaction)
- [x] All four settlement scenarios implemented in code
- [x] No ad hoc balance fields on `users` or `tasks`
- [x] All four settlement scenarios pass automated script (`validate:ledger-settlement`)
- [x] `PRODUCT-WORKFLOW.md` §15 money rows updated for 5% / 3% / refunds

**Local dev commands (Sprint 6):**

```bash
cd backend && npm run prisma:migrate   # after schema
npm run test -- --testPathPattern=ledger
npm run validate:ledger-settlement -- 111111   # after script exists
```

---

### Sprint 7 — Disputes + admin ops (after Sprint 6)

| # | Action | Depends on | Notes |
|---|--------|------------|-------|
| 1 | Force-close **request** API (`POST /tasks/:id/force-close-request`) | Sprint 4 lifecycle | 24h cooldown already in engine |
| 2 | Admin **approve/reject** force-close (`PATCH /admin/close-requests/:taskId`) | #1 | Wire `AdminCloseRequests` UI |
| 3 | DSP4 admin decision endpoints + matrix | Dispute spec | Partial backend today |
| 4 | Admin disputes / escalated queues from API | — | Replace `adminData` local |
| 5 | Notifications persistence (`notifications` table + API) | — | Replace client-only |
| 6 | Server **3-strike inactivity** job (B6) | BullMQ or cron | `done` → `closed` auto path |
| 7 | Admin revenue from ledger (not mock) | Sprint 6 | `AdminRevenue` |

---

### Sprint 8 — E2E + hardening + deploy (after Sprint 7)

| # | Action | Notes |
|---|--------|-------|
| 1 | E2E critical paths vs `PRODUCT-WORKFLOW.md` | Create → pay → accept → complete → close → ledger |
| 2 | Authz abuse + webhook replay tests | Security regression |
| 3 | Deploy staging (Render + Neon) + production runbooks | `render.yaml`, `STAGING-HOST.md` |
| 4 | OpenAPI + generated client types | Frontend type safety |
| 5 | Sentry / structured logging global | Observability |
| 6 | Load tests on task list + payment webhook burst | Performance baseline |

---

### Sprint 5 — completed (reference)

| # | Action | Status |
|---|--------|--------|
| 1–7 | Razorpay adapter, webhooks, checkout, B5 staging, config API | ✅ |
| 8 | S5-M01 live smoke + `validate:payment-paths` + browser netbanking E2E | ✅ 2026-06-11 |

**Optional follow-ups (non-blocking):** Render deploy smoke; Razorpay Dashboard UPI intent vs QR for test checkout.

---

## Current system status

| Layer | Status | Notes |
|-------|--------|-------|
| **Policy / specs** | ✅ Locked v1.0 | Sprint 0 |
| **Product workflow doc** | ✅ v1.0 | `PRODUCT-WORKFLOW.md` + Cursor rule |
| **Frontend UI** | ✅ API-first | Core + admin screens API-backed; demo localStorage only on fallback |
| **Frontend ↔ API** | ✅ ~95% | TaskTimeline, notifications, admin dashboard/analytics from API |
| **Backend API** | 🟡 Tasks + auth + payments + ledger | Settlement on 4 lifecycle paths |
| **Database** | 🟡 | + `journal_entries`, `journal_lines`, `ledger_accounts` |
| **Payments** | ✅ Sprint 5 | Mock (`start:dev`) + live Razorpay (`start:dev:staging`) |
| **Ledger** | ✅ Sprint 6 | Settlement on 4 paths; E2E validated 2026-06-15 |
| **CI** | ✅ | `backend-ci.yml`, `frontend-ci.yml` |
| **Local dev** | 🟡 | Postgres **5433**; `npm run start:dev:clean` for port conflicts |
| **Staging / prod** | 🟡 | B5 ✅ Neon+Render; deploy via `render.yaml` when ready |

### Active blockers

| ID | Blocker | Affects | Mitigation | Target |
|----|---------|---------|------------|--------|
| B1 | ~~`TaskTimeline` mutations use localStorage~~ | — | ✅ Wired to task APIs (2026-05-26) | — |
| B2 | ~~Live Razorpay smoke execution~~ | — | ✅ S5-M01 + `validate:payment-paths` (2026-06-11) | — |
| B3 | ~~Admin suspend UI not wired~~ | — | ✅ `AdminUsers` + `GET /admin/users` (2026-05-26) | — |
| B4 | ~~Guards not wired~~ | — | ✅ Resolved | — |
| B5 | ~~Staging host undefined~~ | — | ✅ **Neon + Render** — [`STAGING-HOST.md`](sprint-5/STAGING-HOST.md), [`render.yaml`](../render.yaml) | Deploy when ready |
| B6 | No server 3-strike inactivity job | — | ✅ `InactivityService` + cron (8A) + deadline-gated anchor; `validate:inactivity` | — |
| B7 | Force-close + DSP4 admin APIs missing | — | ✅ Resolved Sprint 7 |

### Workflow deviations (tracked)

See [`PRODUCT-WORKFLOW.md` §16](PRODUCT-WORKFLOW.md#known-deviations--technical-debt) — active key IDs: **D2** cancel→`closed` not hard delete, **D5** force-close UI-only (resolved). **D4** inactivity → ✅ server cron + deadline-gated anchor.

---

## Sprint roadmap (all 8)

| # | Theme | Status | % | Depends on |
|---|--------|--------|---|------------|
| **0** | Product + policy lock | ✅ Done | 100% | — |
| **1** | Frontend + repo hardening | ✅ Done | 100% | Sprint 0 |
| **2** | Backend foundation | ✅ Done | 98% | Sprint 1 |
| **3** | Auth + authorization | ✅ Done | 95% | Sprint 2 |
| **4** | Task APIs + lifecycle | ✅ Done | 96% | Sprint 3 |
| **5** | Payments + webhooks | ✅ Done | 100% | Sprint 4 |
| **6** | Ledger + settlement | ✅ Done | 100% | Sprint 5 ✅ |
| **7** | Disputes + admin ops | ✅ Done | 100% | Sprint 4, 6 |
| **8** | E2E + hardening + deploy | 🟡 In progress | 50% | Sprint 7 |

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

## Sprint 5 — Payments + webhooks ✅ (100%)

**Goal:** Production payment authority; webhooks update fund holds.

| Task | Status | Notes |
|------|--------|-------|
| PSP selection | ✅ | Razorpay selected for Sprint 5 |
| Payment intents (PSP) | ✅ | `RazorpayPaymentProvider` (Orders API) in live mode |
| Razorpay webhook payload mapper | ✅ | `razorpay-webhook.mapper.ts` |
| Webhook ingestion + raw-body signature | ✅ | `rawBody: true`; `X-Razorpay-Signature` (live) |
| Idempotent webhook processing | ✅ | `payment_webhook_events` |
| Retry processing | 🟡 | DB `retry-due` + `attempts` = **our** processing retries (not Razorpay payment tries) |
| Rule Zero via webhook-confirmed holds | ✅ | Mock UPI auto-confirm; live via webhook |
| Sprint 5 regression + suite | ✅ | `validate:sprint5-suite` (8 checks) |
| Payment path automation | ✅ | `validate:payment-paths` (mock + live scenarios incl. retry) |
| Webhook log script | ✅ | `npm run payments:webhook-log` |
| B5 staging host | ✅ | **Neon + Render** — `docs/sprint-5/STAGING-HOST.md`, `render.yaml` |
| B5 tunnel + runbook | ✅ | `tunnel:webhooks`, `staging-webhooks.md` |
| `GET /payments/config` | ✅ | Mode, PSP, publishable Razorpay key |
| Frontend Razorpay Checkout | ✅ | `PaymentGateway` + retry recovery + longer poll |
| Live smoke (S5-M01) executed | ✅ | `validate:live-razorpay-smoke` + browser netbanking E2E |
| Env / JWT staging fixes | ✅ | `start:dev:staging` dotenv order; shared `JWT_ACCESS_SECRET` locally |

**Exit criteria met:**

- [x] Mock mode regression passes
- [x] Raw-body webhook verification
- [x] Checkout UI opens Razorpay when `checkout` returned
- [x] B5 staging host selected (Neon + Render) + `render.yaml`
- [x] End-to-end live payment (S5-M01 + manual netbanking test path)

**Doc:** [`docs/sprint-5/README.md`](sprint-5/README.md) · [`docs/sprint-5/TEST-CASES.md`](sprint-5/TEST-CASES.md)

**Known non-blockers:** Razorpay test-mode UPI QR / card OTP quirks are PSP-side; use netbanking, `success@razorpay`, or mock mode for local QA.

---

## Sprint 6 — Ledger + settlement ✅ (100%)

**Goal:** Double-entry ledger; settlement on terminal and refund paths.

| Task | Status | Workflow settlement |
|------|--------|---------------------|
| Ledger schema (`ledger_accounts`, `journal_entries`, `journal_lines`) | ✅ | Migration `20260611120000_ledger` |
| `LedgerService.postJournal()` + idempotency | ✅ | §5.1–5.5 |
| Close: reward − 5% to acceptor; trust refund; platform fee | ✅ | `closed` §4.1 — `accept-work` |
| Force close: reward to requestor; trust − 3% penalty | ✅ | `force_closed` §4.2 — admin approve |
| Cancel open: full reward refund | ✅ | §4.4 — `DELETE /tasks/:id` |
| Quit: full trust refund | ✅ | §4.3 — `POST /tasks/:id/quit` |
| Unit tests (`ledger.service.spec`) | ✅ | 4/4 pass |
| `validate:ledger-settlement` automation | ✅ | 4/4 scenarios — local run 2026-06-15 |
| `docs/sprint-6/README.md` | ✅ | Phased plan |
| Progressive KYC gating | ⏸️ | Optional MVP trim |
| Payout queue + PSP reconciliation job | ⏸️ | §6 — Sprint 8 |

**Exit criteria:**

- [x] Journal entries created in same DB transaction as lifecycle transition
- [x] All four settlement scenarios implemented
- [x] No ad hoc balance fields on `users` / `tasks`
- [x] `validate:ledger-settlement` passes locally
- [x] `PRODUCT-WORKFLOW.md` §15 money rows updated (5%/3%/cancel refund → 🟡 ledger-backed)

**Depends on:** Sprint 5 ✅ + [`financial-settlement-spec.md`](sprint-0/financial-settlement-spec.md)

**Doc:** [`docs/sprint-6/README.md`](sprint-6/README.md)

---

## Sprint 8 — E2E + hardening + deploy 🟡 (~50%)

| Phase | Work | Status |
|-------|------|--------|
| **8A** | Cron for inactivity + webhook retry; `INACTIVITY_JOB_ENABLED`; `GET /admin/jobs/status` | ✅ |
| **8D-P0** | `PATCH /me`, server preferences, read-only admin settings, Profile API-backed | ✅ |
| **8F** | Dashboard Support button, authenticated ticket form, admin View Details / Mark Done | ✅ |
| **8G** | Remove Cancelled Tasks admin nav/route; retain audit API | ✅ |
| **Inactivity policy** | Deadline-gated anchor; extend blocked after `done`/`disputed`; UI + docs; **dev job defaults + startup run + pending-strike UI** (2026-08-20) | ✅ |
| **8B** | E2E critical paths + CI (`validate:production-paths` or Playwright) | ⬜ |
| **8C** | Deploy staging, Sentry, runbooks, security tests | ⬜ |
| **8D-P1** | Dynamic platform config, notification prefs enforcement | ⬜ |

### Sprint 8 checklist (launch blockers)

| Task | Status |
|------|--------|
| 8A Cron / jobs registered | ✅ |
| 8A `INACTIVITY_JOB_ENABLED` env flag | ✅ |
| 8A Webhook retry processor | ✅ |
| 8A `validate:jobs-cron` | ✅ |
| 8D-P0 `PATCH /me` + Profile API-backed | ✅ |
| 8D-P0 Admin settings read-only / honest | ✅ |
| 8D-P0 Server user preferences | ✅ |
| 8F Support ticket UX (dashboard + admin) | ✅ |
| 8G Cancelled Tasks admin UI removed | ✅ |
| Inactivity deadline-gating + extend guard | ✅ |
| E2E critical paths vs `PRODUCT-WORKFLOW.md` | ⬜ |
| Authz abuse + webhook replay tests | ⬜ |
| Rate limits audit (OTP, sensitive routes) | 🟡 | OTP limits exist |
| Load tests | ⬜ |
| OpenAPI + generated client types | ⬜ |
| Sentry / observability | ⬜ |
| Incident / payout / reconciliation runbooks | ⬜ |
| Production deploy + monitoring | ⬜ |

**Depends on:** Sprints 4–7 ✅

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
| S5-M01 live smoke | `npm run validate:live-razorpay-smoke -- 111111` | Pass | 2026-06-11 ✅ |
| Payment paths | `npm run validate:payment-paths -- 111111` | UPI/card/NB + retry | 2026-06-11 ✅ |
| Webhook log | `npm run payments:webhook-log` | Lists `payment_webhook_events` | 2026-06-11 ✅ |
| Sprint 5 E2E only | `npm run validate:sprint5-payments -- <otp>` | Pass | 2026-05-28 ✅ |
| Lifecycle smoke | `npm run validate:lifecycle -- <otp>` | Pass | 2026-06-15 ✅ |
| Health API | `GET http://localhost:4000/api/v1/health` | `ok` | 2026-05-25 ✅ |
| OTP send | `POST .../auth/otp/send` | `expiresInSeconds` | 2026-05-25 ✅ |
| Rule Zero script | `node backend/scripts/validate-rule-zero.mjs` | Pass | Manual |
| Task visibility script | `node backend/scripts/validate-task-visibility.mjs` | Pass | Manual |
| Frontend build | `npm run build` (root) | Success | — |
| Ledger unit tests | `npm test -- --testPathPattern=ledger.service.spec` | 4/4 pass | 2026-06-15 ✅ |
| Ledger migration | `npm run prisma:deploy` | `20260611120000_ledger` | 2026-06-15 ✅ |
| Ledger E2E | `npm run validate:ledger-settlement -- 111111` | 4 scenarios | 2026-06-15 ✅ |
| Sprint 6.5 ownership | `npm run validate:task-ownership -- 111111` | Pass | 2026-06-17 ✅ |
| Sprint 6.5 force-close | `npm run validate:force-close -- 111111` | Pass | 2026-06-17 ✅ |
| Sprint 7A DSP4 | `npm run validate:dsp4 -- 111111` | 3 paths | 2026-06-17 ✅ |
| Sprint 7C quit policy | `npm run validate:quit-reaccept -- 111111` | Pass | 2026-06-17 ✅ |
| Sprint 8A jobs cron | `npm run validate:jobs-cron -- 111111` | Schedules + admin status | 2026-08-11 ✅ |
| Sprint 8D-P0 profile | `npm run validate:profile-settings -- 111111` | PATCH /me + admin settings | 2026-08-11 ✅ |
| Sprint 8F support | `npm run validate:support-tickets -- 111111` | Public + auth tickets | 2026-08-11 ✅ |
| Inactivity policy | `npm run validate:inactivity -- 111111` | Early done, progressive strikes, auto-close | 2026-08-20 ✅ |
| Inactivity unit tests | `npm test -- --testPathPattern=inactivity.util.spec` | 8/8 pass | 2026-08-11 ✅ |
| Inactivity job-env tests | `npm test -- --testPathPattern=job-env.spec` | Dev default on | 2026-08-20 ✅ |
| Inactivity UI tests | `npm test -- src/lib/inactivityDisplay.test.ts` | Pending-strike label | 2026-08-20 ✅ |
| Backend build | `cd backend && npm run build` | 0 errors | 2026-06-17 ✅ |

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
| 2026-06-11 | 5 | **Sprint 5 closed ✅:** S5-M01 live smoke, `validate:payment-paths`, checkout retry fixes, `payments:webhook-log`, staging env/JWT fixes, browser netbanking E2E. |
| 2026-06-11 | 6 | Sprint 6 kickoff: ledger schema + settlement hooks planned; tracker updated. |
| 2026-06-15 | 6 | **Parts 6A–6C shipped:** ledger migration, `LedgerService`, hooks on cancel/quit/accept-work/force-close; `validate:ledger-settlement`; unit tests 4/4. |
| 2026-06-15 | 6 | **Sprint 6 closed ✅:** `validate:ledger-settlement` 4/4 (cancel, quit, closed, force_closed); all exit criteria met. |
| 2026-06-17 | 6.5 | **Sprint 6.5 closed ✅:** ownership, force-close reject, real-time refresh, regression scripts. |
| 2026-06-19 | 7 | **Phase 1 cleanup:** removed client inactivity mutations, localStorage notification writes; admin dashboard/analytics + task detail dialog API-only. |
| 2026-08-11 | 8 | **Sprint 8 partial (~50%):** 8A cron/jobs, 8D-P0 profile/settings, 8F support UX, 8G admin cleanup, deadline-gated inactivity policy; `validate:jobs-cron`, `validate:profile-settings`, `validate:support-tickets`, extended `validate:inactivity`. |
| 2026-09-24 | 8 | **Transaction status:** View Status tracks reward deposit, trust deposit, refunds, and reward payout against task status and the settlement journal. "No Further Settlements" appears only after `deleted`, `closed`, or `force_closed` is fully settled. Force-close requestor refund is the full reward plus 70% of the 3% trust-deposit penalty. |
| 2026-09-10 | 8 | **Dispute cooldown:** DSP1 immediate; later rounds 48h → 24h → 12h from last raise; resets when acceptor marks `done` again. Raise Dispute stays visible in `done`/`disputed` and greys out with remaining time on hover. Server `cooldowns.disputeAfter` persists across refresh/re-login; raise blocked with `DISPUTE_COOLDOWN_ACTIVE`. **DSP4 rework:** `max(effectiveDeadline, review+10d)` — no change when 10+ days remain; otherwise 10 days from review. `extendedDeadline` written only when the date moves. |
| 2026-10-05 | 8 | **Lint fixed (roadmap QA-09):** 25 ESLint errors resolved (BE 5, FE 20). Lint, typecheck, unit tests, and builds green locally; push to confirm GitHub CI. No behaviour change. |
| 2026-10-01 | 8 | **Full verification:** Jest 68/68, Vitest 39/39, `tsc` BE+FE, `nest build`, `vite build`, and 12 local `validate:*` scripts pass. **ESLint fails** (BE 5 / FE 20 errors), so GitHub CI is red at Lint on `main` and `sprint9` (roadmap QA-09). |
| 2026-10-01 | 8 | **Production roadmap:** [`PRODUCTION-ROADMAP.md`](PRODUCTION-ROADMAP.md) created as the launch source of truth (73 tasks; 13 completed). New P0 findings: generic webhook route accepts default mock secret in live mode (PAY-04); no PSP refund/payout execution (PAY-06/07); refresh cookie `secure` only on `NODE_ENV=production` (SEC-05). |
| 2026-08-20 | 8 | **Inactivity fix:** job defaults on in dev/staging, startup `processDue`, UI pending-strike message (no stuck “1 minute”); `validate:inactivity` PASS. **Polish:** dynamic ratings, support ticket validation, public `/help-support` vs dashboard prefill split. |

---

## Quick links

| Resource | Path |
|----------|------|
| **Product workflow (validate here first)** | [`docs/PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) |
| **Production roadmap (launch source of truth)** | [`docs/PRODUCTION-ROADMAP.md`](PRODUCTION-ROADMAP.md) |
| Architecture & file guide | [`docs/PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) |
| Sprint 4 detail | [`docs/sprint-4/README.md`](sprint-4/README.md) |
| Sprint 5 payments / staging | [`docs/sprint-5/README.md`](sprint-5/README.md) |
| Sprint 5 test cases | [`docs/sprint-5/TEST-CASES.md`](sprint-5/TEST-CASES.md) |
| Sprint 6 ledger | [`docs/sprint-6/README.md`](sprint-6/README.md) |
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
