# Sprint 3 — Authentication + authorization

**Status:** Complete (see `docs/EXECUTION-TRACKER.md`)

## Delivered

- OTP send/verify with rate limits and dev/Twilio providers
- JWT access + rotating refresh sessions in PostgreSQL
- APIs: `/auth/otp/send`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`, `GET /me`
- Nest guards: JWT, roles, suspension, task-context stub
- Frontend: `AuthProvider`, API-backed sign-in/sign-up/verify, memory access token + httpOnly refresh cookie
- Sprint 2 closure: domain module scaffolds, frontend CI, structured logging convention

## Docs

- Token and API details: `AUTH.md`

## Next

Sprint 4 — task CRUD, lifecycle engine, migrate UI off `localStorage` task stores.
