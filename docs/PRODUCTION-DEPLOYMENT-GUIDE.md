# Production Deployment Guide — Reliyo

> **Purpose:** Prerequisites, infrastructure choices, cost estimates, and phased roadmap from current development through public launch.  
> **Related:** [`NEXT-POA.md`](NEXT-POA.md) (engineering sprint plan) · [`sprint-5/STAGING-HOST.md`](sprint-5/STAGING-HOST.md) (Neon + Render setup) · [`EXECUTION-TRACKER.md`](EXECUTION-TRACKER.md)  
> **Last updated:** 2026-06-23

---

## Executive summary

Reliyo is a **NestJS API + React/Vite SPA + Prisma/PostgreSQL + Razorpay + OTP auth** marketplace. The codebase is **~75–80% built** but **~55–60% launch-ready**. Infrastructure can be prepared now; several **product and engineering items** (see [`NEXT-POA.md`](NEXT-POA.md) Sprint 8) must complete before taking real public traffic.

**Recommended production stack (MVP):**

| Layer | Provider |
|-------|----------|
| Domain + DNS | Cloudflare (or Namecheap + Cloudflare DNS) |
| Frontend | Cloudflare Pages or Vercel |
| API | Render Web Service (`render.yaml`) |
| Database | Neon PostgreSQL |
| Payments | Razorpay (live mode) |
| OTP | Twilio (not dev fixed code) |
| Errors | Sentry |

**Not recommended for primary hosting:** Hostinger shared hosting (wrong fit for Node + Postgres + webhooks). Hostinger VPS is possible but high ops burden vs Render + Neon.

---

## Master pre-launch checklist

### Business & legal (before taking real money)

| Item | Status | Action |
|------|--------|--------|
| Registered business entity (Pvt Ltd / LLP) | Likely needed | Required for Razorpay **live** mode, GST, formal contracts |
| Razorpay live KYC & activation | Pending | Business PAN, bank account, website, terms/privacy URLs |
| Terms of Service, Privacy Policy | Pages exist | **Legal review** for India marketplace + payments |
| Refund / cancellation policy | Partial (in Terms) | Align with [`PRODUCT-WORKFLOW.md`](PRODUCT-WORKFLOW.md) + Razorpay |
| “Platform-held funds” wording (DR-008) | Policy locked | Audit all UI/copy — no “escrow” |
| Support channel | Partial | `support@reliyo.com` + ticket system (NEXT-POA 8F) |
| Grievance officer (if required) | Unknown | Consult counsel for marketplace + payments |
| GST / tax on platform fee | Not in app | Accountant + invoice strategy |
| Data protection (DPDP Act) | Not built | Privacy policy, consent, data export/deletion plan |

### Technical (from [`NEXT-POA.md`](NEXT-POA.md))

| Item | Launch blocker? |
|------|-----------------|
| 8A — Inactivity cron | **Yes** |
| 8D-P0 — Real profile + settings (no fake UI) | **Yes** |
| 8B — E2E critical paths on staging | **Yes** |
| 8C — Deploy + Sentry + runbooks | **Yes** |
| Production OTP (Twilio, not dev fixed code) | **Yes** |
| `JWT_ACCESS_SECRET` strong + unique per env | **Yes** |
| Razorpay live keys + webhook on HTTPS API | **Yes** |
| 8E KYC + bank payouts | **No** for soft launch (ledger-only payouts) |
| 8F Support UX polish | Recommended, not blocking |

---

## 1. Domain & hosting

### What you need for production

| Component | Purpose |
|-----------|---------|
| **Domain** | e.g. `reliyo.com`, `app.reliyo.com`, `api.reliyo.com` |
| **DNS** | A/CNAME records, optional email (MX) |
| **HTTPS** | TLS on API + frontend (required for Razorpay, cookies, OTP) |
| **API host** | Always-on Node.js (NestJS) |
| **Frontend host** | Static build from `npm run build` (Vite) |
| **PostgreSQL** | Managed, not on localhost |
| **Secrets store** | Env vars on host — never in git |
| **Webhook URL** | Public HTTPS endpoint for Razorpay |
| **Staging environment** | Same architecture, test Razorpay keys |

### Where to buy the domain

Buy the domain **separately** from app hosting (cleaner DNS, easier migration).

| Registrar | Notes |
|-----------|--------|
| **Cloudflare Registrar** | At-cost pricing, excellent DNS + free CDN/WAF |
| **Namecheap / Porkbun** | Simple, good value |
| **Hostinger** | OK for **domain only**; see hosting verdict below |

**Recommendation:** Buy on **Cloudflare** or Namecheap; point DNS to Render + Cloudflare Pages/Vercel.

### Recommended hosting

| Layer | Recommended | Why |
|-------|-------------|-----|
| **Database** | **Neon** | Prisma-compatible, backups, branching for staging — see [`STAGING-HOST.md`](sprint-5/STAGING-HOST.md) |
| **API** | **Render** | `render.yaml` exists; health check; easy secrets |
| **Frontend** | **Cloudflare Pages** or **Vercel** | Free/cheap CDN, fast static deploy |
| **CDN/WAF** | **Cloudflare** (free tier) | DDoS, caching, TLS |

### Is Hostinger a good choice?

**For Reliyo: not as the primary application host.**

| Requirement | Reliyo needs | Hostinger typical offering |
|-------------|--------------|----------------------------|
| Long-running Node (NestJS) | Yes | Shared hosting is PHP-oriented; **VPS** works but self-managed |
| PostgreSQL | Yes | Not their strength vs Neon/RDS |
| Razorpay webhooks (reliable HTTPS) | Yes | VPS OK if always on |
| Cron (inactivity job) | Yes | VPS cron OK |
| Prisma migrations on deploy | Yes | Manual on VPS |
| Low ops burden at MVP | Preferred | Hostinger VPS = you are DevOps |

**Verdict:**

- **Hostinger domain:** Fine.
- **Hostinger shared hosting:** **Not recommended** for NestJS + Postgres + webhooks.
- **Hostinger VPS:** Possible for cost savings; higher setup and maintenance vs **Render + Neon**.

**Better MVP alternatives:** Render + Neon + Cloudflare Pages (already documented in repo), or Railway / Fly.io.

---

## 2. Production database

### How local setup changes

| Today (dev) | Production |
|-------------|------------|
| Postgres in Docker on `localhost:5433` | **Managed Postgres** (Neon recommended) |
| `DATABASE_URL` in `.env` | `DATABASE_URL` in host secrets (pooled URL) |
| DBeaver → local DB | DBeaver → **optional** read-only access |
| `prisma migrate` from laptop | `prisma migrate deploy` in **CI/CD build** |
| Seed users for dev | **No demo seed** in prod (or guarded one-time script) |

**Yes — you still use PostgreSQL.** Only the **host** changes.

### Where Postgres is hosted

1. **Neon** (chosen for staging in [`STAGING-HOST.md`](sprint-5/STAGING-HOST.md))
2. **Alternatives:** Supabase, AWS RDS, Render Postgres

Use Neon’s **pooled connection string** for serverless/container workloads.

### Role of DBeaver after go-live

| Use | Recommended? |
|-----|----------------|
| Ad-hoc queries / debugging | Yes, with **read-only** DB user |
| Schema exploration | Yes |
| Running migrations manually | **Avoid** — use pipeline `prisma migrate deploy` |
| Day-to-day app operation | **No** — app uses Prisma only |

Create a **read-only** DB role for DBeaver; never use the superuser string on a laptop.

### Database best practices

| Area | Practice |
|------|----------|
| **Backups** | Neon PITR / daily backups on paid tier; test restore quarterly |
| **Migrations** | Forward-only in prod; run in deploy build |
| **Monitoring** | Connection count, storage, slow queries |
| **Security** | TLS required; rotate credentials; separate staging/prod DBs |
| **Secrets** | `DATABASE_URL` only on API host — never in frontend |

---

## 3. Infrastructure & platform management

### Unified management?

| Approach | What you manage in one place |
|----------|------------------------------|
| **Render + Neon** | Two dashboards; simple for MVP |
| **Vercel + Neon** | Frontend + DB; API on Render |
| **AWS (ECS + RDS + CloudFront)** | One AWS console — heavy ops |
| **Railway** | App + DB in one project — good MVP alternative |

### AWS vs alternatives

| Stage | Recommendation |
|-------|----------------|
| **MVP / first 1–10k users** | **Render + Neon + Cloudflare Pages** |
| **Growth (queues, workers)** | Add Redis (Upstash) + BullMQ on Render worker |
| **Scale / enterprise** | AWS ECS/RDS when team and traffic justify DevOps cost |

### Recommended architecture

```
                    ┌─────────────────────────────────────┐
                    │           Cloudflare DNS            │
                    │  reliyo.com → Pages                 │
                    │  api.reliyo.com → Render            │
                    └─────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ Cloudflare Pages│        │  Render Web Svc │        │     Neon PG     │
│  React (Vite)   │─HTTPS─►│  NestJS API     │─TLS───►│  Prisma         │
│  VITE_API_URL   │        │  Cron (8A)      │        │  Backups/PITR   │
└─────────────────┘        └────────┬────────┘        └─────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Razorpay         Twilio OTP      Sentry
              webhooks         SMS             logs/errors
```

**Security:** HTTPS everywhere, locked `CORS_ORIGIN`, httpOnly refresh cookies, short JWT TTL, Razorpay signature verification, admin role guards, OTP rate limits.

---

## 4. Deployment costs (estimates)

Indicative USD unless noted. Adjust for traffic and INR Razorpay fees.

### Monthly recurring (early production, low traffic)

| Item | Low estimate | Mid estimate | Notes |
|------|--------------|--------------|-------|
| **Domain** | — | ~$1/mo amortized | ~$12–15/yr `.com` |
| **DNS/CDN** | $0 | $0–20 | Cloudflare free tier often enough |
| **API (Render)** | $7 | $25 | Starter vs always-on |
| **Frontend** | $0 | $20 | Pages/Vercel free tier often sufficient |
| **Database (Neon)** | $0 | $19–69 | Free for dev; paid for prod |
| **SSL** | $0 | $0 | Included on recommended hosts |
| **Email (transactional)** | $0 | $20 | Resend / SendGrid / SES |
| **SMS OTP (Twilio)** | $10 | $50+ | Per login volume |
| **Sentry** | $0 | $26 | Free → Team |
| **Backups** | $0 | In Neon paid | |
| **Redis (optional)** | $0 | $10 | Upstash for BullMQ |
| **Uptime monitoring** | $0 | $10 | Better Uptime, etc. |
| **Razorpay** | % of GMV | ~2% + GST per txn | No fixed monthly fee typically |
| **Total infra (excl. GMV)** | **~$15–25/mo** | **~$80–150/mo** | |

### Yearly

| Item | Estimate |
|------|----------|
| Domain renewal | $12–20 |
| Apple Developer (if mobile) | $99/yr |
| Infra (mid tier) | ~$1,000–1,800/yr |
| Razorpay | Variable (% of volume) |

### One-time / pre-launch costs

| Item | Estimate |
|------|----------|
| Google Play developer account | $25 one-time |
| Company incorporation (India) | ₹5k–25k+ |
| Legal review (Terms/Privacy) | ₹25k–1L+ |
| Razorpay onboarding | Time + documentation |
| CA/GST setup | Variable |

### Razorpay (business budget)

- Domestic cards/UPI: **~2% + GST** per transaction (confirm on your plan).
- **Route/payouts** (post 8E KYC): additional payout fees.
- Settlements to your bank per Razorpay schedule (often T+2).

---

## 5. Production readiness — gaps & risks

### Must complete before public launch

| Category | Gap | Risk |
|----------|-----|------|
| **Deploy** | Not on Render/Neon prod yet | No real environment |
| **Auth** | `OTP_PROVIDER=dev` in staging template | No real account security |
| **Profile** | Hardcoded demo profile | Wrong user data |
| **Admin settings** | Fake save toast | Ops confusion |
| **Jobs** | No inactivity cron | Policy not enforced |
| **E2E** | No full CI suite | Money-path regressions |
| **Observability** | Sentry not wired | Blind to prod errors |
| **Secrets** | Default JWT in examples | Forgery if copied to prod |
| **Demo data** | `VITE_ENABLE_DEMO_DATA` | Must be **false** in prod |

### Security improvements

- HTTP rate limiting on sensitive routes
- `helmet`, strict CORS, cookie `Secure` + `SameSite`
- Webhook replay / signature tests (NEXT-POA 8C.5)
- Admin audit logging
- Dependency scanning in CI
- Rotate secrets per environment

### Compliance (India)

- Razorpay live business KYC
- Platform-held funds disclosure (DR-008)
- Acceptor bank payouts require KYC (DR-007, NEXT-POA 8E) before real transfers
- DPDP: privacy policy, breach process — legal counsel

### Acceptable at soft launch vs not

| Acceptable | Not acceptable |
|------------|----------------|
| Ledger payables without bank transfer | Broken payment collection |
| No native mobile apps | Broken mobile **browser** UX |
| Manual support email | Fake admin settings UI |
| No KYC UI yet | “Instant bank payout” misleading copy |

---

## 6. Cross-platform compatibility

### Current state

| Signal | Assessment |
|--------|------------|
| `viewport` meta tag | Present in `index.html` |
| Tailwind responsive breakpoints | Used widely across app |
| `DashboardLayout` mobile sheet | Sidebar → hamburger on small screens |
| Admin tables | `overflow-x-auto` — cramped on phone |
| `TaskTimeline` | Dense on small screens — needs QA |
| Razorpay Checkout | Mobile-friendly PSP widget |
| Device test matrix | **Not evidenced** — treat as partial |

**Verdict:** **Responsive web app**, not fully verified on all devices. Likely good on desktop; core user flows acceptable on mobile; admin is desktop-oriented.

### Remaining mobile web work

- [ ] QA: iPhone Safari, Android Chrome, tablets
- [ ] Fix clipped modals / horizontal scroll on task detail + admin
- [ ] Touch targets on TaskTimeline actions
- [ ] Payment return URLs on mobile browsers
- [ ] Optional PWA: manifest + icons

### Responsive web vs native apps

| Option | Recommendation |
|--------|----------------|
| **Responsive web** | **Yes for launch** |
| **PWA** | Low-cost post-launch enhancement |
| **Native iOS/Android** | **Defer** until product-market fit |

---

## 7. Publishing mobile apps (future)

### Approaches

| Approach | Effort | Result |
|----------|--------|--------|
| Responsive web only | Polish remaining | Browser |
| PWA | 1–2 weeks | Installable web |
| **Capacitor** wrap SPA | 3–6 weeks | Store listing, one codebase |
| React Native / Expo | 3–6+ months | Native UX, partial rewrite |

**Practical path:** Launch web → **Capacitor** if store presence needed without full rewrite.

### Google Play Store

| Item | Detail |
|------|--------|
| Developer account | $25 one-time |
| Review | Hours to days |
| Requirements | Privacy policy URL, data safety form, signing key |
| Payments policy | Marketplace + Razorpay in WebView — review Google policies with counsel |
| Effort | ~2–4 weeks with Capacitor |

### Apple App Store

| Item | Detail |
|------|--------|
| Developer account | $99/year |
| Review | Stricter; 1–7 days typical |
| Requirements | Privacy labels, demo account for reviewers |
| WebView apps | Apple may reject thin wrappers — may need more native shell |
| Effort | ~4–8 weeks first submission |

### Additional mobile work

- Push notifications (FCM/APNs)
- Deep linking
- App-specific OTP UX
- Store assets, ASO, crash reporting

---

## Phased deployment roadmap

### Phase 0 — Prerequisites (1–2 weeks, parallel with engineering)

- [ ] Register business entity (if required for Razorpay live)
- [ ] Purchase domain (Cloudflare recommended)
- [ ] Razorpay live application submitted
- [ ] Legal review Terms + Privacy
- [ ] Twilio account + Indian SMS compliance (DLT if required)
- [ ] Neon **staging** + **production** projects (separate DBs)

### Phase 1 — Engineering gate ([`NEXT-POA.md`](NEXT-POA.md) 8A + 8D-P0 + 8B)

- [ ] 8A: Inactivity cron + `INACTIVITY_JOB_ENABLED`
- [ ] 8D-P0: `PATCH /me`, server preferences, honest admin settings
- [ ] 8B: E2E suite green locally
- [ ] Remove prod demo flags; strong JWT secrets

### Phase 2 — Staging deploy (8C partial)

- [ ] Deploy API to Render (staging) — [`render.yaml`](../render.yaml)
- [ ] Deploy frontend to Cloudflare Pages / Vercel (staging)
- [ ] `CORS_ORIGIN`, `VITE_API_BASE_URL`, Razorpay **test** webhooks
- [ ] Full smoke: OTP → pay → lifecycle on staging URL
- [ ] Sentry staging DSN

### Phase 3 — Staging soak (48–72 hours)

- [ ] Internal + beta users (5–10)
- [ ] Monitor errors, webhooks, DB connections
- [ ] Fix E2E blockers

### Phase 4 — Production deploy

- [ ] Neon production DB + `prisma migrate deploy`
- [ ] Render production service (separate from staging)
- [ ] `NODE_ENV=production`, `OTP_PROVIDER=twilio`, no `OTP_DEV_FIXED_CODE`
- [ ] Razorpay **live** keys + webhook on production API URL
- [ ] Frontend: `VITE_ENABLE_DEMO_DATA=false`
- [ ] DNS cutover + SSL verify
- [ ] Runbooks in `docs/runbooks/`

### Phase 5 — Soft launch

- [ ] Limited geography or invite-only
- [ ] Monitor Sentry, Razorpay, ledger reconciliation
- [ ] NEXT-POA 8F support UX + 8G admin cleanup
- [ ] Disclose: bank transfers after KYC (8E)

### Phase 6 — Post-launch (8E+)

- [ ] KYC + Razorpay Route payouts
- [ ] PWA or Capacitor evaluation
- [ ] Scale tier upgrades
- [ ] AWS migration only if metrics justify

---

## Staging sign-off checklist

- [ ] `validate:production-paths` (or Playwright) green on **staging** API
- [ ] Inactivity cron ran; `validate:inactivity` green
- [ ] Profile PATCH persists across browsers
- [ ] Admin settings honest (saved or read-only)
- [ ] Razorpay webhook on staging URL; signature verified
- [ ] Sentry receiving FE + BE events
- [ ] Runbooks linked from README
- [ ] No dev OTP fixed code in staging/prod
- [ ] `CORS_ORIGIN` + `VITE_API_BASE_URL` correct

---

## Quick reference

| Question | Answer |
|----------|--------|
| **Domain** | Cloudflare/Namecheap; `app.` + `api.` subdomains |
| **Hosting** | **Not Hostinger shared**; use **Render + Neon + Cloudflare Pages** |
| **Database** | PostgreSQL on **Neon**; DBeaver optional read-only |
| **Unified platform** | Render+Neon for MVP; AWS at scale |
| **Monthly infra** | **~$15–25** lean, **~$80–150** comfortable |
| **Launch blockers** | NEXT-POA 8A/8B/8C/8D-P0, real OTP, Razorpay live |
| **Mobile** | Launch as **responsive web**; native apps later |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-06-23 | Initial guide — domain, hosting, DB, infra, costs, readiness, mobile, roadmap |
