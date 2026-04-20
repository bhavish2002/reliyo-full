# Reliyo Frontend

This repository contains the frontend application for Reliyo's task marketplace experience.

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Vitest + Testing Library

## Getting started

Requirements:

- Node.js 20+
- npm 10+

Install and run:

```sh
npm install
npm run dev
```

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

- This repo is frontend-only in the current phase.
- Backend/API integration scaffolding is included for Sprint 1 readiness, but no backend business logic is implemented here.
