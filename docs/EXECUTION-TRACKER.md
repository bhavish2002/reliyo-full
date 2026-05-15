# Reliyo MVP — execution tracker (single source of truth)

**Purpose:** Sprint status, evidence in repo, and changelog after each sprint.  
**Canonical policy:** `docs/sprint-0/` (locked v1.0).  
**Original sequence:** MVP execution plan (Sprints 0–8) as agreed by leadership.

---

## Current position (as of last update)

| Field | Value |
|--------|--------|
| **Phase** | Between **Sprint 2 (foundation)** and **Sprint 3 (auth)** |
| **Recommendation** | **Proceed with Sprint 3** (OTP + JWT + sessions + guards + `/me`). Close Sprint 2 “paper gaps” in parallel (see *Sprint 2 closure backlog* below) so the repo matches the written Sprint 2 scope without blocking auth work. |
| **Production readiness** | **Pre-production.** No server-authoritative tasks, payments, ledger, or staging deploy pipeline yet. |

---

## Sprint status overview

Legend: **Done** | **Partial** | **Not started**

| Sprint | Theme | Status | Notes |
|--------|--------|--------|--------|
| 0 | Policy lock | **Done** | `docs/sprint-0/README.md` — LOCKED v1.0 |
| 1 | Frontend + repo hardening | **Done** | Deliverables in `docs/sprint-1/README.md`; task truth still client-side |
| 2 | Backend foundation | **Partial** | Nest + Prisma + envelopes + request ID + health + CI + compose; no domain modules, no BullMQ, no frontend CI, structured logging minimal |
| 3 | Auth + authorization | **Not started** | `src/lib/auth.ts` still demo phones + localStorage; no Nest auth module |
| 4 | Task APIs + lifecycle | **Not started** | Tasks/notifications/admin reads still `localStorage`-heavy |
| 5 | Payments + webhooks | **Not started** | — |
| 6 | Ledger + settlement | **Not started** | — |
| 7 | Disputes + admin ops | **Not started** | — |
| 8 | E2E + hardening + deploy | **Not started** | — |

---

## Detailed assessment vs plan

### Sprint 0 — Product + policy lock

| Planned item | Status | Evidence |
|----------------|--------|-----------|
| Financial / lifecycle / DSP4 / delete / KYC / wording decisions | **Done** | `docs/sprint-0/decision-register.md`, specs |
| Canonical spec docs | **Done** | `state-machine-spec.md`, `financial-settlement-spec.md`, `dispute-ops-spec.md`, `api-error-contract.md` |

### Sprint 1 — Frontend refinement + repo hardening

| Planned item | Status | Evidence / gap |
|----------------|--------|------------------|
| Remove Lovable-specific deps/metadata | **Done** | No `lovable` references in repo |
| Standardize repo/build/env | **Done** | `package.json` (`reliyo-frontend`), `.env.example`, scripts |
| UI vs final spec (lifecycle) | **Done** | Sprint 1 checklist; `taskMigration.ts`, `taskTypes.ts` |
| Screens API-ready (loading/empty/error) | **Partial** | Patterns exist on some flows; dominant data path still `localStorage` (`Dashboard`, `BrowseTasks`, `adminData.ts`, etc.) |
| Typed API client (no backend) | **Partial** | `src/lib/api/client.ts`, `contracts.ts` match error envelope + `TaskDetailResponse` shape; **React Query is installed** (`App.tsx`) but **no `useQuery`/`useMutation` in `src/`** yet — server integration not active |
| Linter debt in touched areas | **Partial** | Ongoing; no quantified gate |
| Observability hooks | **Done** | `AppErrorBoundary`, `observability.ts`, client trace + API client instrumentation |

### Sprint 2 — Backend foundation

| Planned item | Status | Evidence / gap |
|----------------|--------|------------------|
| NestJS modular monolith | **Partial** | Monolith yes; **only** `HealthModule`, `PrismaModule`, `common/*` — no Auth/Users/Tasks/… modules |
| Module scaffolds (Auth, Users, Tasks, …) | **Not started** | No `src/*/auth.module.ts` style domain layout yet |
| PostgreSQL + ORM migrations baseline | **Partial** | Prisma + `audit_events` only (`backend/prisma/schema.prisma`, migrations) |
| Redis + job queue baseline | **Not started** | Redis optional in `docker-compose.yml`; **no** `@nestjs/bullmq` / BullMQ in `backend/package.json`; no workers |
| Shared validation + error format | **Done** | `ValidationPipe`, `ApiExceptionFilter`, `SuccessEnvelopeInterceptor` |
| Request ID | **Done** | `request-id.middleware.ts` |
| Structured logging | **Partial** | Nest `Logger` + error context; **no** JSON log pipeline (e.g. pino) or log aggregation contract |
| CI (lint/test/typecheck/build) | **Partial** | `.github/workflows/backend-ci.yml` only — **no** frontend workflow |
| Dev/staging separation | **Partial** | `.env` / `DATABASE_URL` per env documented; **no** staging deploy/IaC or managed DB decision recorded in repo |

### Sprints 3–8

| Sprint | Status | Summary |
|--------|--------|---------|
| 3 Auth | **Not started** | OTP/JWT/refresh/rotation, user/session tables, guards, `/me` — not in backend; frontend auth is demo |
| 4 Tasks | **Not started** | No task CRUD or lifecycle service in Nest; no `availableActions` from API consumed in UI |
| 5 Payments | **Not started** | No Stripe/webhook modules |
| 6 Ledger | **Not started** | No double-entry schema |
| 7 Disputes | **Not started** | DSP flows UI-only against local data |
| 8 Launch | **Not started** | No E2E suite, rate limits, runbooks, production deploy |

---

## Sprint 2 closure backlog (optional, parallel to Sprint 3 start)

Small items that align the **repository** with the **written** Sprint 2 plan without changing product scope:

1. **Empty Nest domain modules** (Auth, Users, Tasks, …) wired into `AppModule` with README or `MODULE.md` per folder — reduces later merge conflicts.
2. **Frontend CI** — mirror backend: `npm ci`, lint, typecheck, test, build on `src/**` and root `package.json`.
3. **Structured logging decision** — adopt JSON logs in production (Nest + pino or platform default) and document field conventions (`requestId`, `userId`, `route`).
4. **BullMQ spike** — only when first async consumer exists (often start of Sprint 5 webhooks); avoid queue infra without a consumer.

---

## Plan optimizations (CTO)

These refine **execution order** and **clarity**; they do not replace locked policy.

1. **Contract-first API (before or week-1 of Sprint 4)**  
   Publish OpenAPI from Nest; generate TypeScript types for the frontend. Reduces drift between `contracts.ts` and reality.

2. **Staging milestone (before Sprint 5)**  
   Managed Postgres + one deployed API (Render/Railway/Fly per original stack note) + secrets management. Payment work without a durable staging webhook target is high risk.

3. **Defer BullMQ until first real async boundary**  
   Sprint 2 listed Redis + queue “baseline”; empty queue is low value. **Introduce BullMQ with the first idempotent webhook or settlement job** (Sprint 5–6).

4. **Sprint 4 split (optional)**  
   **4a:** Read APIs + list/detail + comments read-only from DB. **4b:** Mutations + lifecycle engine + `availableActions`. Lets QA and mobile clients iterate earlier.

5. **Auth comment hygiene**  
   `src/lib/auth.ts` still mentions “Supabase”; execution plan says OTP + JWT. Update comments when Sprint 3 stack is chosen to avoid contributor confusion.

6. **Single PR rule for “authority move”**  
   When Sprint 4 lands, define explicit cutover: “no new `localStorage` task writes” with a grep gate or lint rule in CI.

---

## Changelog (update after each sprint or major milestone)

| Date | Change |
|------|--------|
| 2026-05-14 | Tracker created: assessed repo vs Sprints 0–8; Sprint 0–1 done; Sprint 2 partial; current position = pre–Sprint 3; recommendations recorded. |

*(Append new rows here; do not delete history.)*

---

## Links

- Sprint 0: `docs/sprint-0/README.md`
- Sprint 1: `docs/sprint-1/README.md`
- Sprint 2: `docs/sprint-2/README.md`
- Backend: `backend/README.md`
