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

Copy environment and set `DATABASE_URL` if it differs:

```sh
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
