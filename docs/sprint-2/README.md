# Sprint 2 — Backend foundation

**Cross-sprint status:** `docs/EXECUTION-TRACKER.md` (single source of truth for MVP execution).

## Goals

- NestJS modular monolith under `backend/` with global validation and consistent API responses.
- PostgreSQL schema managed by Prisma; baseline `audit_events` migration for future audit logging.
- Request correlation via `x-request-id` (and optional `x-client-trace-id`), structured error envelope per Sprint 0 contract.
- CI workflow for lint, typecheck, test, and build when `backend/` changes.
- Local Postgres (and optional Redis) via root `docker-compose.yml`.

## Deferred / follow-up

- **BullMQ**: Dependencies were removed from the Sprint 2 baseline to avoid unused wiring; `REDIS_URL` remains documented for a future queue module. Use `docker compose --profile redis up -d redis` when implementing workers.
- **Staging vs production**: Use distinct `DATABASE_URL` and `NODE_ENV` per environment; no separate deploy configs in this sprint.

## Checklist

- [x] Nest app, health + version routes under `API_PREFIX`
- [x] Prisma + initial migration (`audit_events`)
- [x] Global `ValidationPipe`, exception filter, success envelope interceptor
- [x] Request ID middleware
- [x] Docker Compose for Postgres
- [x] GitHub Actions backend CI
- [ ] BullMQ job modules (next sprint or spike)
