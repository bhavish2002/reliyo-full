# Sprint 4 — Task APIs + lifecycle

**Status:** Implemented (core) — see `docs/EXECUTION-TRACKER.md`  
**Workflow alignment:** [`docs/PRODUCT-WORKFLOW.md`](../PRODUCT-WORKFLOW.md) §15–§16

## Delivered

### Backend
- Prisma `tasks`, `task_events` + migration `20260525120000_tasks`
- `LifecycleService` — transitions, cooldowns, `availableActions`
- `TasksService` — create, list, detail, cancel, accept, quit, mark-done, accept-work, dispute, comments, extend-deadline
- `TasksController` — REST under `/api/v1/tasks`
- `TaskContextGuard` — participant or admin required on task routes
- `SuspensionGuard` on `/me` and task mutations
- `PATCH /api/v1/admin/users/:id/suspension` — admin suspend (B3 partial)

### Frontend
- `src/lib/tasks/api.ts` — API client helpers
- Create task → Step 3 → `/payment` → fund hold confirmed → `POST /tasks` with `fundHoldId` (Rule Zero)
- Lists: `GET /tasks?scope=mine|browse|admin` wired in My Tasks, Browse Tasks, Admin All Tasks
- Browse tasks → `GET /tasks?scope=browse`
- Task detail → `GET /tasks/:id` with localStorage fallback when API unavailable
- Accept / cancel → API actions

## Documented deviations (until Sprint 5)

| Topic | Sprint 4 behavior |
|--------|-------------------|
| Rule Zero (reward funding) | `POST /payments/fund-holds` then `POST /tasks` with `fundHoldId`; `rewardFundedAt` from confirmed hold |
| Trust deposit | `POST /payments/fund-holds` (`trust_deposit` + `taskId`) then `POST /tasks/:id/accept` with `fundHoldId` |
| Payment UI | Create + accept flows use `/payment`; UPI confirms → commit; card pending / netbanking failed → no state change |
| Ledger | No money movement; status-only transitions |
| Admin force-close | Not exposed as API yet (Sprint 7) |
| OpenAPI | Not generated yet |

## API reference

| Method | Path |
|--------|------|
| POST | `/tasks` |
| GET | `/tasks?scope=browse\|mine` |
| GET | `/tasks/:id` |
| DELETE | `/tasks/:id` |
| POST | `/tasks/:id/accept` |
| POST | `/tasks/:id/quit` |
| POST | `/tasks/:id/mark-done` |
| POST | `/tasks/:id/accept-work` |
| POST | `/tasks/:id/dispute` |
| POST | `/tasks/:id/comments` |
| POST | `/tasks/:id/extend-deadline` |

## Local setup

```sh
cd backend && npm run prisma:deploy
```

## Sprint 4 exit criteria (tracker)

See [`docs/EXECUTION-TRACKER.md`](../EXECUTION-TRACKER.md) — Sprint 4 section. Must complete before Sprint 5:

- [ ] Wire `TaskTimeline` to task APIs (blocker B1)
- [ ] Dashboard + dispute tab API-backed
- [ ] Admin Users suspend UI wired (B3)
- [ ] Manual E2E: create → accept → comment → mark done → accept work

## Next

Sprint 5 — real payment intents + webhooks; replace simulated funding flags.
