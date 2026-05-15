# Sprint 1 — Frontend refinement and repo hardening

**Status:** Deliverables complete (see `docs/EXECUTION-TRACKER.md` for cross-sprint status)  
**Depends on:** Sprint 0 locked (`docs/sprint-0/`)

## Objectives

1. Align UI and types with the canonical lifecycle (no legacy `completed` status).
2. Align public copy with DR-008: **platform-held funds** (not “escrow”) until legal approves otherwise.
3. Standardize API client error handling to match `docs/sprint-0/api-error-contract.md`.
4. Improve observability hooks (client trace id, error boundary reference).
5. Normalize package metadata and environment examples for production-bound work.

## Deliverables checklist

- [x] Remove legacy `completed` from `TaskStatus`; migrate old `localStorage` payloads via `src/lib/taskMigration.ts`.
- [x] Requestor close path: **Accept work → mandatory rating → `Closed`** (no intermediate status).
- [x] Admin DSP4 force-close from timeline → **`force_closed`** (not `closed`).
- [x] API client: parse `{ error: { code, message, requestId, details } }` and send `X-Client-Trace-Id`.
- [x] Copy pass: platform-held funds wording on key marketing/help/legal pages and payment UI.
- [x] `package.json` name → `reliyo-frontend`; `.env.example` extended with optional Sentry placeholder.
- [x] Error boundary shows client trace reference for support correlation.

## Follow-ups (Sprint 2+)

- Replace remaining `entryType: "escrow"` timeline label with a neutral name (e.g. `funds`) when backend owns events.
- Add OpenAPI-generated types and real React Query hooks per endpoint.
- Wire `VITE_SENTRY_DSN` when production monitoring is enabled.

## Reference

- Sprint 0 decisions: `docs/sprint-0/decision-register.md`
- API error contract: `docs/sprint-0/api-error-contract.md`
