# Sprint 3 — Authentication

## Token strategy

| Token | Storage | Transport |
|--------|---------|-----------|
| **Access** (JWT, ~15 min) | Browser memory only (`src/lib/auth/session.ts`) | `Authorization: Bearer` header |
| **Refresh** (opaque, ~7 days) | PostgreSQL hash + **httpOnly cookie** `reliyo_refresh` | Cookie on `credentials: include` requests |

Rationale: refresh tokens are not readable by JavaScript (XSS-resistant rotation). Access tokens stay out of `localStorage`.

## API routes (`/api/v1`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/otp/send` | Public (rate limited) |
| POST | `/auth/otp/verify` | Public → sets refresh cookie + returns access + user |
| POST | `/auth/refresh` | Refresh cookie → rotates session |
| POST | `/auth/logout` | Clears refresh session + cookie |
| GET | `/me` | Bearer access token |

## OTP providers

- **dev** (default): logs OTP to API console; optional `OTP_DEV_FIXED_CODE` in non-production.
- **twilio**: set `OTP_PROVIDER=twilio` and Twilio env vars.

## Local dev

1. `docker compose up -d postgres`
2. `cd backend && npx prisma migrate deploy && npm run prisma:seed`
3. `npm run start:dev`
4. Sign in with seeded phone `9000000001` (India +91) — read OTP from API logs or set `OTP_DEV_FIXED_CODE=123456`.

## Guards (backend)

- `JwtAuthGuard` — valid access JWT
- `RolesGuard` + `@Roles('admin')` — platform role
- `SuspensionGuard` — blocks suspended users
- `TaskContextGuard` — placeholder for Sprint 4 task-scoped auth

## Logging

Set `LOG_FORMAT=json` in production for structured logs (`requestId`, `userId`, `route` fields when provided).
