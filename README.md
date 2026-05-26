# Reliyo

Monorepo for Reliyo's task marketplace: React frontend (`/`) and NestJS API (`backend/`).

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Vitest + Testing Library
- NestJS + Prisma (API in `backend/`)

## Getting started (frontend)

Requirements:

- Node.js 20+
- npm 10+

From the repository root:

```sh
npm install
npm run dev
```

## Backend API

See `backend/README.md`. Quick local stack:

```sh
docker compose up -d postgres
cd backend
cp .env.example .env.local
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Sprint 2 notes: `docs/sprint-2/README.md`.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - serve production build locally
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run test` - run tests once
- `npm run test:watch` - run tests in watch mode

## Environment

Copy `.env.example` to `.env.local` and configure values before local development.

## Notes

- The API is a Sprint 2 foundation (health, Prisma baseline, shared envelopes). Domain routes are added in later sprints.

## Planning & architecture

- **MVP execution tracker (status):** [`docs/EXECUTION-TRACKER.md`](docs/EXECUTION-TRACKER.md)
- **Project overview (architecture, gaps, roadmap):** [`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md)

## Planning Specs
- Sprint 0 policy-lock documents are available in `docs/sprint-0/`.
- Sprint 1 execution notes and checklist: `docs/sprint-1/README.md`.
- Sprint 2 backend foundation: `docs/sprint-2/README.md`.
