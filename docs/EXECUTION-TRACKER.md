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
| **In progress** | **Sprint 4 polish** (~92% — run `validate:lifecycle` to close) |
| **Next sprint** | **Sprint 5** — real payments + webhooks (after 4 polish) |
| **Workflow doc** | [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) v1.0 (2026-05-25) |
| **Production readiness** | **Pre-production** (~52% of MVP build) |
| **Last verified** | 2026-05-25 — health + OTP OK; backend unit tests pass; fund-hold + task flows manual |

### Progress bar (implementation)

```
Sprint 0 ██████████ 100%  Policy lock
Sprint 1 ██████████ 100%  Frontend hardening
Sprint 2 ██████████  98%  Backend foundation (BullMQ deferred)
Sprint 3 █████████░  95%  Auth + guards on task/admin routes
Sprint 4 █████████░  92%  Task APIs + timeline API + dashboard/admin polish
Sprint 5 ░░░░░░░░░░   5%  Mock fund holds exist; PSP/webhooks not started
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

Reliyo is a **task marketplace MVP** (NestJS + React + PostgreSQL) with **locked business policy** (Sprint 0) and **server-authoritative identity** (Sprint 3). **Task lifecycle logic lives on the backend** (Sprint 4), but the **frontend is still hybrid**: create, browse, list, detail load, accept, and cancel use the API; **timeline mutations** (mark done, dispute, accept work, force close, alerts) often still write **localStorage**.

**Money:** Reward and trust deposits use **`fund_holds`** with a mock payment gateway (UPI confirms, card pending, net banking fails). **No ledger settlement** yet — closing a task does not move real balances (Sprint 6).

**Admin:** Suspend-user API exists; most admin screens (disputes, close requests, revenue, support) are **UI + demo data**.

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
| 7 | **Run `npm run validate:lifecycle`** before Sprint 5 | BE/QA | Manual with OTP from logs | CI confidence |

### Sprint 5 (after polish)

| # | Action | Notes |
|---|--------|-------|
| 1 | Choose PSP (Razorpay/Stripe/etc.) + staging env (B5) | Webhook tunnel |
| 2 | Payment intents replacing mock `confirm` | Real auth/capture |
| 3 | Webhook handler + idempotency + BullMQ retry | ⏸️ Redis from Sprint 2 |
| 4 | Map webhook → `fund_holds` confirmed/failed | Rule Zero + trust on accept |

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
| **Frontend UI** | 🟡 Hybrid | API for lists/create/accept/cancel; timeline local |
| **Frontend ↔ API** | 🟡 ~60% | `lib/tasks/api.ts`; `TaskTimeline` not fully wired |
| **Backend API** | 🟡 Tasks + auth + payments holds | No webhooks, no admin task ops |
| **Database** | 🟡 | `users`, `tasks`, `task_events`, `fund_holds` |
| **Payments** | 🟡 Mock | `FundHoldsService`, not production PSP |
| **Ledger** | ⬜ | Module scaffold only |
| **CI** | ✅ | `backend-ci.yml`, `frontend-ci.yml` |
| **Local dev** | 🟡 | Postgres **5433**; `npm run start:dev:clean` for port conflicts |
| **Staging / prod** | ⬜ | No deploy IaC (B5) |

### Active blockers

| ID | Blocker | Affects | Mitigation | Target |
|----|---------|---------|------------|--------|
| B1 | ~~`TaskTimeline` mutations use localStorage~~ | — | ✅ Wired to task APIs (2026-05-26) | — |
| B2 | No payment webhooks / real PSP | Sprint 5–6 | Sprint 5 after B1 | Sprint 5 |
| B3 | ~~Admin suspend UI not wired~~ | — | ✅ `AdminUsers` + `GET /admin/users` (2026-05-26) | — |
| B4 | ~~Guards not wired~~ | — | ✅ Resolved | — |
| B5 | Staging environment undefined | Sprint 5+ | Pick host + managed Postgres | Before Sprint 5 |
| B6 | No server 3-strike inactivity job | Done → closed auto path | Cron/BullMQ + API transition | Sprint 7 |
| B7 | Force-close + DSP4 admin APIs missing | Admin ops | Sprint 7 endpoints | Sprint 7 |

### Workflow deviations (tracked)

See [`PRODUCT-WORKFLOW.md` §16](PRODUCT-WORKFLOW.md#known-deviations--technical-debt) — key IDs: **D1** timeline local, **D2** cancel→`closed` not hard delete, **D4** inactivity client-only, **D5** force-close UI-only.

---

## Sprint roadmap (all 8)

| # | Theme | Status | % | Depends on |
|---|--------|--------|---|------------|
| **0** | Product + policy lock | ✅ Done | 100% | — |
| **1** | Frontend + repo hardening | ✅ Done | 100% | Sprint 0 |
| **2** | Backend foundation | ✅ Done | 98% | Sprint 1 |
| **3** | Auth + authorization | ✅ Done | 95% | Sprint 2 |
| **4** | Task APIs + lifecycle | 🟡 Core done | 80% | Sprint 3 |
| **5** | Payments + webhooks | ⬜ Started | 5% | Sprint 4 polish |
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

## Sprint 4 — Task APIs + lifecycle 🟡 (80% — **current focus**)

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
| Lifecycle unit tests | 🟡 | `lifecycle.service.spec.ts` |

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
- [ ] Manual E2E: `npm run validate:lifecycle` (OTP from dev logs)

---

## Sprint 5 — Payments + webhooks ⬜ (5%)

**Goal:** Production payment authority; webhooks update fund holds.

| Task | Status | Notes |
|------|--------|-------|
| Fund hold schema + mock confirm | ✅ | Sprint 4 — not Sprint 5 done |
| Payment intents (PSP) | ⬜ | Replace mock confirm |
| Webhook ingestion + signature verify | ⬜ | |
| Idempotent webhook processing | ⬜ | |
| Rule Zero via webhook-confirmed holds | 🟡 | Logic exists; needs real PSP |
| BullMQ for webhook retry | ⬜ | ⏸️ Redis |
| Staging + webhook tunnel | 🚫 | B5 |

**Depends on:** Sprint 4 polish complete

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
| Backend build | `cd backend && npm run build` | 0 errors | 2026-05-25 ✅ |
| Backend tests | `cd backend && npm run test` | Pass | 2026-05-25 ✅ |
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

---

## Quick links

| Resource | Path |
|----------|------|
| **Product workflow (validate here first)** | [`docs/PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) |
| Architecture & file guide | [`docs/PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) |
| Sprint 4 detail | [`docs/sprint-4/README.md`](sprint-4/README.md) |
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
