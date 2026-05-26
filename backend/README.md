# Reliyo API (`reliyo-api`)

NestJS modular monolith baseline: Prisma + PostgreSQL, shared validation, API error envelope, request IDs, and health endpoints.

## Requirements

- Node.js 20+
- PostgreSQL 16+ (local or Docker)

## Setup

From the repo root, start Postgres (optional Redis is available with `--profile redis`):

```sh
docker compose up -d postgres
```

Postgres is published on **host port 5433** (not 5432) so it does not clash with a local PostgreSQL install on Windows/macOS.

Copy environment (Prisma needs `backend/.env`; Nest also reads `.env.local`):

```sh
cp .env.example .env
# optional overrides:
cp .env.example .env.local
```

Install and migrate:

```sh
npm install
npx prisma generate
npx prisma migrate deploy
```

## Run

```sh
npm run start:dev
```

Default base URL: `http://localhost:4000/api/v1`. Health: `GET /api/v1/health`, version: `GET /api/v1/health/version`.

Auth (Sprint 3): `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`. See `docs/sprint-3/AUTH.md`.

**OTP rate limit in dev:** default 30 sends/hour per phone (5 in production). If login shows "Too many OTP requests", run `npm run clear-otp:all` or `npm run clear-otp -- 9000000002`.

Payments (Rule Zero): `POST /payments/fund-holds` (lock reward before task exists), then `POST /tasks` with `fundHoldId`. Dev outcomes: UPI → confirmed, card → pending, netbanking → failed.

**Port 4000 in use (`EADDRINUSE`):** stop the other API process, then start again:

```powershell
npm run kill-port
npm run start:dev
# or one step:
npm run start:dev:clean
```

After migrations, seed demo users: `npm run prisma:seed` (phones `9000000001`–`9000000003` with +91).

## Frontend alignment

Point the frontend at `VITE_API_BASE_URL=http://localhost:4000/api/v1` when exercising the API locally.

## Scripts

| Script            | Description                |
| ----------------- | -------------------------- |
| `npm run start:dev` | Dev server with watch    |
| `npm run build`   | Production compile         |
| `npm run test`    | Jest                       |
| `npm run lint`    | ESLint (flat config)       |
| `npm run typecheck` | `tsc --noEmit`           |
| `npx prisma migrate dev` | Create migration (dev) |
| `npx prisma migrate deploy` | Apply migrations (CI/prod) |
