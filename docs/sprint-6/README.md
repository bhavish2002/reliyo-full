# Sprint 6 — Ledger + settlement

**Goal:** Double-entry journal entries on terminal money-moving lifecycle events per [`financial-settlement-spec.md`](../sprint-0/financial-settlement-spec.md).

## Phased delivery

| Phase | Scope | Status |
|-------|--------|--------|
| **6A** | Prisma schema + migration + chart of accounts | ✅ |
| **6B** | `LedgerService.postJournal()` + idempotency | ✅ |
| **6C** | Four settlement scenarios wired to APIs | ✅ |
| **6D** | `validate:ledger-settlement` + unit tests | 🟡 script ready; run locally |
| **6E** | Payout queue, PSP reconciliation, KYC gating | ⏸️ deferred |

## Settlement scenarios

| Scenario | Trigger | API |
|----------|---------|-----|
| `cancel_open` | Requestor deletes open task | `DELETE /tasks/:id` |
| `quit_trust_refund` | Acceptor quits within 2h | `POST /tasks/:id/quit` |
| `closed` | Requestor accepts work | `POST /tasks/:id/accept-work` |
| `force_closed` | Admin approves force-close | `PATCH /admin/close-requests/:taskId` |

## Math (INR example, reward 1000)

| Event | Platform fee | Requestor | Acceptor |
|-------|--------------|-----------|----------|
| **closed** | 50 (5% of reward) | — | 950 + 100 trust refund |
| **force_closed** | 3 (3% of trust) → compensation reserve | 1000 refund | 77 trust return |
| **cancel_open** | — | 500 refund | — |
| **quit** | — | — | 100 trust refund |

## Chart of accounts

| Code | Purpose |
|------|---------|
| `escrow_reward` | Platform-held reward |
| `escrow_trust` | Platform-held trust deposit |
| `platform_revenue` | 5% fee on normal close |
| `platform_compensation_reserve` | 3% force-close penalty |
| `payable_requestor` | Refunds owed to requestor |
| `payable_acceptor` | Payouts / trust refunds owed to acceptor |

## Verify locally

```bash
cd backend
npm run start:dev          # terminal 1
npm test -- --testPathPattern=ledger.service.spec
npm run validate:ledger-settlement -- 111111
```

Journal rows: `journal_entries` / `journal_lines` tables (no UI yet).

## Not in Sprint 6

- Actual PSP payout execution (Razorpay transfers)
- `disputed` → `closed` DSP4 settlement (Sprint 7)
- 3-strike auto-close settlement (Sprint 7 job)
