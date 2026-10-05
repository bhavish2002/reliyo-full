# Reliyo — Production Roadmap & Readiness Tracker

> **Single source of truth** for the journey from the current phase to production launch.
> Feature-level sprint history stays in [`EXECUTION-TRACKER.md`](EXECUTION-TRACKER.md); business rules stay in [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md).
>
> **Baseline:** 2026-10-01 · branch `sprint9` @ `0deef3a` (pushed; 1 commit ahead of `origin/main`) · working tree clean.
> **Evidence rule:** each status was checked against code or config in the repo. Anything that can't be confirmed from the repo (accounts, contracts, deployed hosts) is marked **Not verified** in Notes.

---

## How to use this file

1. When a task changes state, update its **Status** (`Not Started` / `In Progress` / `Blocked` / `Completed`) and add a row to the **Changelog** at the bottom.
2. Mark a task `Completed` only when its **Verification / Acceptance** check has actually been run, and note the date in Notes.
3. Priorities: **P0** blocks taking real money or launching publicly. **P1** is required before public launch. **P2** can follow launch.
4. Milestones:
   - **M1** Code freeze (sprint9 merged).
   - **M2** Staging live (API + frontend deployed).
   - **M3** Staging sign-off (E2E + UAT pass).
   - **M4** Production go-live.
   - **M5** Stable at 30 days after launch.

---

## Snapshot (2026-10-01)

| Metric | Value | Basis |
|--------|-------|-------|
| Current phase | **Sprint 8 — E2E + hardening + deploy** (8A/8D-P0/8F/8G done; 8B E2E and 8C deploy not started) | `EXECUTION-TRACKER.md` Sprint 8 table |
| Sprint-plan completion | **~94%** | Simple average of the tracker's per-sprint % (S0 100, S1 100, S2 98, S3 95, S4 96, S5 100, S6 100, S6.5 100, S7 100, S8 50) |
| Launch-roadmap completion | **14 / 74 tasks Completed (19%)**; **~24%** if the 7 In Progress tasks count as half | Count of the rows below (updated 2026-10-05) |
| Blended to-production estimate | **~65%** | Assumed weights: 60% feature build (94%) + 40% launch roadmap (22%). The weighting is an assumption, not a measurement. |
| Last test evidence (2026-10-01, local, sequential single-worker) | Backend Jest **17/17 suites, 68/68 tests** ✅ · Frontend Vitest **9/9 files, 39/39 tests** ✅ · `tsc` backend + frontend ✅ · `nest build` ✅ · `vite build` ✅ (1.29 MB main chunk warning) · 12 local `validate:*` scripts ✅ (lifecycle, sprint5-payments, payment-paths [mock paths; live skipped], ledger-settlement, task-ownership, force-close, dsp4, quit-reaccept, inactivity, jobs-cron, profile-settings, support-tickets) · **ESLint ❌** backend 5 errors, frontend 20 errors | Not run: `validate:staging-env`, `validate:staging-webhook`, `validate:live-razorpay-smoke` (need staging host / live keys) |
| CI (GitHub Actions) | **Failing** on `main` and `sprint9`. Both workflows stop at the **Lint** step, so typecheck/test/build never run in CI. | `gh run list` 2026-09-30 runs |

**Critical blockers (P0):** QA-02 (push lint fix, confirm CI), PAY-04, PAY-06, PAY-07, LEG-06, SEC-05, INF-02, INF-04, DEP-04, QA-04.

---

## 1. Development

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S4 | DEV-01 | Server-authoritative task lifecycle | All 8 statuses (`open`…`deleted`) and their transitions, with cooldowns enforced on the server | Completed | P0 | — | — | M1 | `lifecycle.service.spec`, `validate:lifecycle` | `deleted` migration `20260923160000` |
| S4 | DEV-02 | TaskTimeline wired to task APIs | Accept, quit, done, dispute, and close all go through the API | Completed | P0 | DEV-01 | — | M1 | `TaskTimeline.test.tsx` | A localStorage fallback for force-close remains on non-server tasks (see DEV-06) |
| S8 | DEV-03 | Delete open task with full reward refund (ledger) | `cancel_open` journal posts the full reward back to the requestor | Completed | P0 | DEV-01 | — | M1 | Ledger spec 4/4 | Ledger entry only; actual money movement is PAY-06 |
| S8 | DEV-04 | Transaction Status UI | Deposits, refunds, and payout are tracked against task status and the journal | Completed | P1 | DEV-03 | — | M1 | `transactionTimeline.test.ts` 10/10 | — |
| S7 | DEV-05 | Admin ops (DSP4, force-close, users/suspend, support, revenue, notifications) | API-backed admin pages | Completed | P0 | — | — | M1 | `validate:dsp4`, `validate:force-close`, `validate:support-tickets` | Admin All Tasks, Disputes, and Close Requests still have demo fallbacks |
| S8 | DEV-06 | Remove demo/localStorage fallbacks | Delete fallbacks in `AdminAllTasks`, `AdminDisputes`, `AdminCloseRequests`, `TaskDetail`, `TaskTimeline`, and `lib/adminData.ts` (7 `setItem` calls); default `VITE_ENABLE_DEMO_DATA` to `false` | Not Started | P0 | — | — | M2 | `rg "localStorage.setItem" src` returns no lifecycle writes; staging build has the flag `false` | `src/lib/env.ts` currently defaults the flag to `"true"` |
| S8 | DEV-07 | Admin task list pagination | Admin All Tasks is capped at `pageSize: 100` | Not Started | P1 | — | — | M3 | Admin can page past 100 tasks | — |
| S8 | DEV-08 | Admin provisioning outside seed | The only way to create an admin today is `prisma/seed.ts` (+919000000003) | Not Started | P0 | — | — | M2 | Documented CLI/script grants admin to a named phone in prod; demo admin is absent in prod | — |
| S8 | DEV-09 | Account deletion + data export | The Privacy page promises deletion within 30 days and portability; there is no API for either | Not Started | P1 | — | Legal decision (LEG-02) | M3 | User can request delete/export, or the Privacy text is changed to match | — |
| 8D-P1 | DEV-10 | Dynamic platform config + notification preference enforcement | From the tracker's 8D-P1 item | Not Started | P2 | — | — | M5 | Prefs respected by `NotificationsService` | — |
| S8 | DEV-11 | OpenAPI + generated client types | From the tracker's Sprint 8 checklist | Not Started | P2 | — | — | M5 | `/api/docs` served; FE types generated | — |
| S8 | DEV-12 | Email notification channel | No mail provider in code | Not Started | P2 | INF-05 | Email provider account | M5 | Closure/dispute emails delivered | Optional for MVP; in-app notifications exist |

## 2. Infrastructure

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 8C | INF-01 | API hosting blueprint | `render.yaml`: build, `prisma migrate deploy`, health check `/api/v1/health` | Completed | P0 | — | Render account | M2 | Blueprint exists | Whether it is actually deployed: **Not verified** |
| 8C | INF-02 | Frontend hosting | No frontend service, `vercel.json`, or `_redirects` exists | Not Started | P0 | DEV-06 | Cloudflare Pages / Vercel account | M2 | SPA served over HTTPS; deep links such as `/task/:id` resolve | Needs SPA fallback config |
| 8C | INF-03 | Domain, DNS, SSL | Production domain with `app.` and `api.` subdomains | Not Started | P0 | — | Domain purchase | M2 | HTTPS valid on both hosts | Domain ownership: **Not verified** |
| 8C | INF-04 | Production OTP provider | `twilio-otp.provider.ts` exists, but `render.yaml` sets `OTP_PROVIDER=dev` | In Progress | P0 | LEG-07 | Twilio (or other SMS) account; India DLT | M2 | Real SMS received on staging; dev code rejected | The fixed dev code is ignored only when `NODE_ENV=production` |
| 8C | INF-05 | Transactional email provider | None in code | Not Started | P2 | — | Provider account | M5 | Test email delivered | — |
| 8C | INF-06 | Cron single-instance guarantee | Jobs run in-process (`@nestjs/schedule`); more than one API instance would duplicate runs | Not Started | P1 | — | — | M3 | Documented "1 instance" setting, or a DB lock / BullMQ | `REDIS_URL` is reserved and not wired |
| 8C | INF-07 | Separate production environment | Only a staging blueprint exists | Not Started | P0 | INF-01 | Prod DB (DB-02) | M4 | Prod service with its own secrets and DB | — |
| Post | INF-08 | Redis / BullMQ (optional) | Deferred in Sprint 2 | Not Started | P2 | INF-06 | Upstash/Redis | M5 | Jobs on a queue | Only needed when scaling past one instance |

## 3. Payments

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S5 | PAY-01 | Fund holds + Razorpay Orders/Checkout | Reward escrow (Rule Zero) and 10% trust deposit; checkout signature verified | Completed | P0 | — | Razorpay test keys | M1 | `validate:live-razorpay-smoke` passed 2026-06-11 (tracker) | Re-run on deployed staging: QA-05 |
| S5 | PAY-02 | Webhook ingestion | Razorpay HMAC check, idempotency by `externalEventId`, retry job | Completed | P0 | — | — | M1 | `payment-webhook.service.spec` | See PAY-04 for the security gap |
| S6 | PAY-03 | Double-entry ledger settlement | Journals for `closed`, `force_closed`, `cancel_open`, `quit_trust_refund`; 70/30 penalty split | Completed | P0 | — | — | M1 | Ledger spec 4/4; `validate:ledger-settlement` | Only records payables |
| 8C | PAY-04 | **Harden generic webhook route** | In `PAYMENT_MODE=live`, `POST /payments/webhooks/:provider` for any non-razorpay provider verifies against `PAYMENT_WEBHOOK_SECRET_MOCK`, which falls back to `'mock-webhook-secret'` and is not set in `render.yaml`. `processEvent` looks up the hold by `providerIntentId` and never checks that the provider matches. A forged event could confirm a hold. | Not Started | **P0** | — | — | M2 | In live mode only `razorpay` is accepted; event provider must equal hold provider; startup fails when `RAZORPAY_WEBHOOK_SECRET` is missing; spec added | Rule Zero risk |
| 8C | PAY-05 | Webhook status-regression guard | `processEvent` sets the hold status from the payload, so a later `failed` can overwrite `confirmed` | Not Started | P1 | PAY-04 | — | M3 | Spec: `confirmed` hold ignores `failed`/`pending` events | — |
| 8C | PAY-06 | **Execute refunds to payer** | `PaymentProvider` only has `createPaymentIntent`. Deleted, quit, and force-close refunds exist only as ledger payables. | Not Started | **P0** | PAY-03 | Razorpay live account | M3 | Razorpay Refund API call (or a documented manual ops SOP) per refund journal; refund id stored | Decision needed: automated vs manual for MVP |
| 8C | PAY-07 | **Execute acceptor payouts** | No payout integration, and the schema has no bank/UPI fields | Not Started | **P0** | PAY-03 | RazorpayX or Route (confirm with Razorpay), or a manual bank-transfer SOP | M3 | Payout recorded against the payable; acceptor bank/UPI captured and verified | Decision needed: automated vs manual |
| 8C | PAY-08 | Reconciliation | Daily check of ledger vs Razorpay settlements | Not Started | P1 | PAY-06, PAY-07 | Razorpay dashboard/API access | M4 | Runbook + report; zero unexplained variance on staging | — |
| 8C | PAY-09 | Razorpay live merchant activation | KYC, website review, live keys, webhook URL registered | Not Started | P0 | INF-03, LEG-03, LEG-05 | Business entity + bank account | M4 | Live keys in prod env; webhook test delivery succeeds | Account status: **Not verified** |
| Post | PAY-10 | Constant-time signature compare | `expected !== signature` uses a plain string compare | Not Started | P2 | — | — | M5 | `timingSafeEqual` used | — |

## 4. Security / Auth

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S3 | SEC-01 | Phone OTP + JWT + rotating refresh | 10-minute OTP TTL, 5 verify attempts, refresh in an httpOnly cookie, rotated in the DB | Completed | P0 | — | — | M1 | Auth specs | — |
| S3 | SEC-02 | Server-side authorization | `JwtAuthGuard` + `RolesGuard('admin')` on admin controllers; `SuspensionGuard` + `TaskContextGuard` on task routes | Completed | P0 | — | — | M1 | Guards present on all controllers | `notifications.controller` has no `SuspensionGuard` (SEC-09) |
| 8C | SEC-03 | Security headers | No `helmet` in `main.ts` or `package.json` | Not Started | P1 | — | — | M2 | Response headers include HSTS, nosniff, frame-options | — |
| 8C | SEC-04 | HTTP rate limiting | OTP per-phone limits exist (5/hr prod); no `@nestjs/throttler` / IP limits | In Progress | P1 | — | — | M2 | 429 returned on burst to `/auth/*` and payment routes | — |
| 8C | SEC-05 | **Refresh-cookie flags across domains** | `secure` only when `NODE_ENV=production` (staging is `staging`); `sameSite: 'lax'` may block refresh if the FE and API sit on different sites | Not Started | **P0** | INF-02, INF-03 | — | M2 | Refresh works on deployed staging after reload; cookie is `Secure` | Same-site subdomains or `sameSite=none; secure` |
| 8B | SEC-06 | Authz abuse + webhook replay tests | Tracker Sprint 8 checklist item | Not Started | P1 | PAY-04 | — | M3 | Tests: cross-user task actions denied; replayed webhook is a no-op | — |
| 8C | SEC-07 | Production secrets | Strong JWT secrets, Razorpay, and Twilio keys in host secret store; never committed | Not Started | P0 | INF-07 | — | M4 | Secret checklist signed off; rotated from staging | **Not verified** |
| 8C | SEC-08 | Dependency audit | `npm audit` on root + backend | Not Started | P1 | — | — | M3 | No high/critical findings unaddressed | **Not verified** |
| Post | SEC-09 | Suspension check on notifications | Suspended users can still read notifications | Not Started | P2 | — | — | M5 | Decision documented or guard added | May be intentional |

## 5. Database

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S2–S8 | DB-01 | Prisma schema + migrations | Migrations through `20260923160000_task_status_deleted` | Completed | P0 | — | — | M1 | `prisma migrate deploy` on a clean DB | — |
| 8C | DB-02 | Production Postgres | Neon is the chosen staging host (`STAGING-HOST.md`); prod DB not provisioned in repo | Not Started | P0 | — | Neon (or other) account | M2 | `DATABASE_URL` (pooled) + `DIRECT_URL` set; migrations applied | Staging DB existence: **Not verified** |
| 8C | DB-03 | Backups + restore drill | Nothing in repo | Not Started | P0 | DB-02 | Paid tier with PITR (confirm with provider) | M4 | Restore drill to a branch DB completed | — |
| 8C | DB-04 | Health check includes DB | `/health` returns env/version/commit only | Not Started | P1 | — | — | M2 | Health fails when DB is unreachable | — |
| 8C | DB-05 | Production seed hygiene | Seed creates demo users and admin | Not Started | P0 | DEV-08 | — | M4 | Prod DB has no `+9190000000xx` demo users | — |
| 8C | DB-06 | Connection limits | Pooling settings for serverless Postgres | Not Started | P1 | DB-02 | — | M3 | No connection exhaustion under QA-06 | **Not verified** |

## 6. QA / UAT

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S1–S8 | QA-01 | Unit test suites | Backend 17 suites / 68 tests; frontend 9 files / 39 tests | Completed | P0 | — | — | M1 | `npm test` (both) green | Verified 2026-10-01 (local, single worker) |
| S1 | QA-02 | CI (lint, typecheck, test, build) | `backend-ci.yml`, `frontend-ci.yml` exist, but runs on `main`/`sprint9` fail at Lint | In Progress | P0 | QA-09 | — | M1 | Both workflows green on PR and `main` | — |
| S8 | QA-09 | **Fix ESLint errors** | Backend 5 errors (unused imports/vars in `admin-ops.controller`, `disputes.service`, `scheduled-jobs.service.spec`, `tasks.service`). Frontend 20 errors (mostly `no-explicit-any` in `Dashboard`, `CreateTask`, `AdminDashboard`; `no-regex-spaces` in `validation.ts`; `no-useless-escape` in `SignUp`; `require()` in `tailwind.config.ts`) | Completed | **P0** | — | — | M1 | `npm run lint` exits 0 in both packages | Done 2026-10-05; lint 0 errors in both packages, tests/typecheck/build still green. Warnings (19 FE, 1 BE) remain. Root ESLint now ignores `backend/dist`. |
| 8B | QA-03 | DB-backed checks in CI | `validate:*` scripts need Postgres; CI has none | Not Started | P1 | — | — | M3 | CI job with Postgres service runs `validate:lifecycle`, `validate:ledger-settlement`, `validate:dsp4` | — |
| 8B | QA-04 | **E2E critical paths** | No Playwright/e2e in repo | Not Started | **P0** | DEV-06 | — | M3 | Create → fund → accept → done → close; dispute → DSP4; force-close; delete; quit | Tracker estimate: 3–5 days |
| 8C | QA-05 | Live Razorpay smoke on staging | Passed locally 2026-06-11 (tracker) | In Progress | P0 | INF-02, PAY-04 | Razorpay test keys on staging | M3 | Smoke passes against deployed staging URL | — |
| 8C | QA-06 | Load test | From the tracker checklist | Not Started | P2 | M2 | — | M3 | Target RPS documented and met | — |
| 8C | QA-07 | UAT | Real users on staging, following `PRODUCT-WORKFLOW.md` | Not Started | P0 | QA-04 | Test users | M3 | Sign-off sheet with no open P0/P1 | — |
| 8C | QA-08 | Browser/mobile matrix | Responsive + Chrome/Safari/Firefox | Not Started | P1 | INF-02 | — | M3 | Matrix checklist passed | **Not verified** |

## 7. Legal / Compliance

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S8 | LEG-01 | Terms of Service | `/terms` page with the platform disclaimer | In Progress | P0 | — | Lawyer | M4 | Lawyer-reviewed text published | Legal review: **Not verified** |
| S8 | LEG-02 | Privacy Policy matches implementation | Claims deletion/portability that aren't implemented | Blocked | P0 | DEV-09 | Lawyer | M4 | Every claim maps to a feature or process | — |
| 8C | LEG-03 | Refund / cancellation policy page | No route or page exists (`App.tsx`) | Not Started | P0 | PAY-06 | — | M4 | Public page linked in footer | Confirm Razorpay website requirements with Razorpay |
| 8C | LEG-04 | DPDP Act 2023 + grievance officer | No grievance contact in `src` | Not Started | P0 | — | Lawyer | M4 | Grievance officer named on site; consent text reviewed | — |
| Pre | LEG-05 | Business entity, GST, bank account | Needed for Razorpay KYC | Not Started | P0 | — | CA / incorporation | M4 | Documents available | **Not verified** |
| Pre | LEG-06 | **Regulatory review of holding user funds** | Platform holds rewards and deposits for third parties (escrow-like flow) | Not Started | **P0** | — | Lawyer / Razorpay | M4 | Written opinion, or Razorpay product (e.g. Route/escrow) confirmed suitable | **Not verified**; may change PAY-06/07 design |
| Pre | LEG-07 | SMS sender / template registration (India DLT) | Usually needed for transactional SMS in India | Not Started | P0 | — | SMS provider | M2 | OTP template approved | Confirm with SMS provider |

## 8. Deployment

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S8 | DEP-01 | Merge `sprint9` → `main` | `sprint9` is pushed and 1 commit ahead of `origin/main` | In Progress | P0 | QA-01, QA-09 | — | M1 | PR merged; CI green | — |
| 8C | DEP-02 | Deploy staging API | Render blueprint + migrations | Not Started | P0 | DEP-01, DB-02, PAY-04 | Render account | M2 | `GET /api/v1/health` 200 on staging URL | **Not verified** whether already deployed |
| 8C | DEP-03 | Deploy staging frontend | `VITE_API_BASE_URL` → staging API; demo flag `false` | Not Started | P0 | INF-02, DEV-06 | — | M2 | Login + create task on staging | — |
| 8C | DEP-04 | **Staging env hardening** | `OTP_PROVIDER` real, cookie flags, `CORS_ORIGIN`, webhook secrets, `PUBLIC_API_URL` | Not Started | **P0** | INF-04, SEC-05 | — | M2 | `validate:staging-env` passes on host | — |
| 8C | DEP-05 | Staging sign-off | E2E + UAT + live smoke | Not Started | P0 | QA-04, QA-05, QA-07 | — | M3 | Sign-off recorded here | Tracker estimate: 2–3 days |
| 8C | DEP-06 | Production go-live | Prod env, live keys, Razorpay webhook registered, DNS cutover | Not Started | P0 | M3, PAY-09, SEC-07, DB-03, LEG-* | All prerequisites | M4 | First real ₹ transaction settled end to end | — |
| 8C | DEP-07 | Rollback + migration plan | Prior build redeploy; forward-only migration policy | Not Started | P1 | DEP-02 | — | M4 | Rollback rehearsed on staging | — |

## 9. Post-launch monitoring

| Phase/Sprint | Task ID | Task/Deliverable | Description | Status | Priority | Dependencies | Prerequisites | Target milestone | Verification/Acceptance | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 8C | OPS-01 | Error tracking (Sentry) | No Sentry dependency; `VITE_SENTRY_DSN` commented out in `.env.example` | Not Started | P1 | DEP-02 | Sentry account | M2 | Test error visible for FE + API | — |
| 8C | OPS-02 | Uptime monitoring | Ping `/api/v1/health` + FE | Not Started | P1 | DB-04 | Uptime service | M4 | Alert fires on downtime | — |
| S2 | OPS-03 | Structured logging | JSON logger + request-id middleware exist; retention/search not set | In Progress | P1 | DEP-02 | Log drain (host) | M4 | Logs searchable by request id | — |
| 8C | OPS-04 | Runbooks | No `docs/runbooks/`: incident, refund/payout, reconciliation, dispute ops | Not Started | P0 | PAY-06, PAY-07 | — | M4 | Runbooks reviewed; dry-run on staging | — |
| 8C | OPS-05 | Alerts on webhook/job failures | `GET /admin/jobs/status` exists; no alerting | Not Started | P1 | OPS-01 | — | M4 | Alert on failed webhook > N or job not run | — |
| Post | OPS-06 | Support + grievance SLA | Support tickets exist; SLA undefined | Not Started | P1 | LEG-04 | — | M5 | SLA published; tickets triaged within it | — |

---

## Execution order (critical path)

| Step | Tasks | Blocked by | Exit |
|------|-------|-----------|------|
| 1. Code freeze | QA-09, QA-02, DEP-01 | — | **M1** |
| 2. Security fixes in code | PAY-04, PAY-05, SEC-03, SEC-04, DB-04, DEV-06, DEV-08 | M1 | Specs green |
| 3. Decide money-out model | PAY-06, PAY-07 (automated vs manual SOP), LEG-06 | Business/legal input | Decision recorded |
| 4. Staging up | DB-02, INF-02, INF-03, INF-04, SEC-05, DEP-02–04, OPS-01 | Steps 2 + accounts | **M2** |
| 5. Test on staging | QA-03, QA-04, QA-05, SEC-06, QA-07, QA-08 | M2 | **M3** |
| 6. Business & legal | LEG-01–07, PAY-09 | Run in parallel from step 1 | Docs + live keys |
| 7. Production | INF-07, DB-03, DB-05, SEC-07, OPS-02–05, DEP-06–07 | M3 + step 6 | **M4** |
| 8. Stabilise | PAY-08, OPS-06, P2 items | M4 | **M5** |

---

## Production readiness checklist

Legend: ✅ Completed · 🟡 Partial · ⬜ Not done · ❔ Not verified

| Area | Item | State | Task |
|------|------|-------|------|
| Development | Server-authoritative lifecycle, 8 statuses | ✅ | DEV-01 |
| Development | No localStorage lifecycle writes / demo fallbacks in prod build | ⬜ | DEV-06 |
| Backend/API | Global ValidationPipe (whitelist, forbidNonWhitelisted) | ✅ | — |
| Backend/API | Security headers + HTTP rate limits | ⬜ / 🟡 | SEC-03, SEC-04 |
| Backend/API | Health includes DB | ⬜ | DB-04 |
| Database | Migrations apply cleanly | ✅ | DB-01 |
| Database | Prod DB, backups, restore drill | ⬜ | DB-02, DB-03 |
| Payments | Escrow before `open` (Rule Zero) | ✅ | PAY-01 |
| Payments | Webhook route accepts only verified Razorpay in live mode | ⬜ | PAY-04 |
| Payments | Refunds and payouts actually move money | ⬜ | PAY-06, PAY-07 |
| Payments | Live merchant account active | ❔ | PAY-09 |
| Security/Auth | OTP + JWT + rotating refresh; server roles | ✅ | SEC-01, SEC-02 |
| Security/Auth | Real SMS provider on staging/prod | 🟡 | INF-04 |
| Security/Auth | Cookie works cross-domain and is `Secure` | ⬜ | SEC-05 |
| Security/Auth | Prod secrets set + rotated | ❔ | SEC-07 |
| UI/UX | Core user + admin pages API-backed | ✅ | DEV-05 |
| UI/UX | Browser/mobile matrix | ❔ | QA-08 |
| Admin/Ops | Admin bootstrap without seed | ⬜ | DEV-08 |
| Admin/Ops | Runbooks (incident, refund/payout, reconciliation) | ⬜ | OPS-04 |
| Testing/QA | Unit suites green | ✅ | QA-01 |
| Testing/QA | Lint clean (local) | ✅ | QA-09 |
| Testing/QA | CI green on `main` | ⬜ | QA-02 (push + confirm run) |
| Testing/QA | Local API workflow scripts (`validate:*`) | ✅ | — |
| Testing/QA | E2E + DB-backed CI | ⬜ | QA-03, QA-04 |
| Testing/QA | UAT sign-off | ⬜ | QA-07 |
| Legal | Terms reviewed; Privacy accurate; Refund policy; grievance officer | 🟡 / ⬜ | LEG-01–04 |
| Legal | Entity/GST; funds-holding regulatory opinion; DLT | ❔ | LEG-05–07 |
| Deployment | Staging API + FE live | ⬜ | DEP-02, DEP-03 |
| Deployment | Rollback plan | ⬜ | DEP-07 |
| Post-launch | Sentry, uptime, alerts, log retention | ⬜ / 🟡 | OPS-01–05 |

---

## Prerequisites and costs

Costs are **estimates from [`PRODUCTION-DEPLOYMENT-GUIDE.md`](PRODUCTION-DEPLOYMENT-GUIDE.md) §4 (USD unless noted). Confirm each with the provider before you budget.**

| Prerequisite | Needed by | Why (evidence) | One-time | Monthly / usage |
|---|---|---|---|---|
| Domain + DNS | M2 | FE/API hosts, cookie domain (SEC-05) | ~$12–15/yr `.com` | DNS/CDN $0–20 |
| API hosting (Render) | M2 | `render.yaml` | — | $7–25 |
| Frontend hosting | M2 | No FE service exists | — | $0–20 |
| Postgres (Neon) | M2 (staging), M4 (prod) | Prisma | — | $0 dev; $19–69 prod |
| SSL | M2 | HTTPS + `Secure` cookie | — | $0 (included on host) |
| SMS OTP (Twilio or other) | M2 | `twilio-otp.provider.ts` | DLT registration: confirm with provider | $10–50+ (usage) |
| Razorpay merchant (live) | M4 | Fund holds; refunds/payouts | Onboarding: time + documents | "~2% + GST per txn" (doc estimate; **confirm with Razorpay**). Payout/Route pricing: **confirm with Razorpay** |
| Sentry | M2 | No error tracking today | — | $0–26 |
| Uptime monitoring | M4 | Health endpoint | — | $0–10 |
| Email provider | M5 (optional) | Not in code | — | $0–20 |
| Redis | Only if scaling past 1 instance | `REDIS_URL` not wired | — | $0–10 |
| Backups / PITR | M4 | No backup config | — | Included in Neon paid tier (doc); **confirm** |
| Company incorporation (India) | Before PAY-09 | Razorpay KYC | ₹5k–25k+ | — |
| Legal review | Before M4 | Terms/Privacy/Refund/DPDP, funds-holding opinion | ₹25k–1L+ (Terms/Privacy only per doc); funds-holding opinion **not estimated** | — |
| CA / GST setup | Before M4 | Invoicing / fees | Variable | Variable |
| **Total infra (excl. GMV)** | | | | **~$15–25 lean · ~$80–150 comfortable** (doc) |

---

## Changelog

| Date | Summary |
|------|---------|
| 2026-10-05 | **QA-09 Completed:** fixed 25 ESLint errors. Backend: unused imports in `admin-ops.controller`, `disputes.service`, `scheduled-jobs.service.spec`; removed an unused `taskEvent.findMany` in `tasks.service.addComment`. Frontend: typed chart tooltips (`Dashboard`, `AdminDashboard`) and admin nav items (`AdminLayout`); removed `as any` in `CreateTask`; empty interfaces → type aliases (`command`, `textarea`); regex cleanups (`validation`, `SignUp`); ESM import for `tailwindcss-animate`; root ESLint ignores `backend/dist`. No behaviour change. |
| 2026-10-01 | Full local verification (sequential, single worker): unit tests, typecheck, both builds, and 12 `validate:*` scripts pass. ESLint fails (BE 5 / FE 20 errors), and that is why CI is red on `main`. Added QA-09; QA-01 → Completed; QA-02 → In Progress. |
| 2026-10-01 | Created from a code review of `sprint9` @ `0deef3a`. New findings not already in the tracker: PAY-04 (generic webhook route + default mock secret in live mode), PAY-05 (status regression), PAY-06/07 (no PSP refund/payout; no bank/UPI fields), SEC-05 (cookie `secure` only on `NODE_ENV=production`), DEV-06 (demo flag defaults `true`), DEV-08 (admin only via seed), DEV-09/LEG-02 (Privacy claims), DB-04 (health has no DB check). |
