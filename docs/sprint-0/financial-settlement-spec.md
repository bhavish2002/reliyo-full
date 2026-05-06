# Financial Settlement Spec

Version: `v1.0`  
Owner: Finance + Backend Lead  
Status: LOCKED

## 1) Scope

Defines money movement rules for:

- task funding
- trust deposit locking
- refunds
- payouts
- force-close compensation

All money movement must be recorded through double-entry ledger postings.

## 2) Monetary Primitives

- reward amount: funded by requestor
- trust deposit: 10% of reward, funded by acceptor
- platform fee: 5% on `Closed` outcomes (including `Disputed` -> `Closed`)
- force-close penalty: 3% of trust deposit amount

## 3) Rule Zero Financial Contract

- reward authorization created -> no lifecycle state change yet
- reward capture confirmed -> task may become `Open`
- trust deposit capture confirmed -> task may become `Committed`

No status change is accepted before corresponding funding confirmation.

## 4) Settlement Scenarios

### 4.1 Closed (standard completion)

Trigger: `Done` -> `Closed`

Target outcome:

- acceptor receives reward minus platform fee (policy-dependent)
- acceptor trust deposit fully refunded
- platform fee posted to platform revenue account

### 4.2 Force Closed

Trigger: admin-approved force close or DSP4 admin close outcome

Target outcome:

- requestor receives full reward refund
- acceptor trust deposit returned minus 3% of trust deposit penalty
- compensation/penalty mapped via `platform_compensation_reserve`

### 4.3 Quit Within 2h

Trigger: `Committed` -> `Open` via quit within cooldown

Target outcome:

- trust deposit fully refunded to acceptor
- reward remains funded for task reopening

### 4.4 Cancel Before Acceptance

Trigger: requestor cancels while task still `Open`

Target outcome:

- full reward refund to requestor
- task archived with retention policy

## 5) Ledger Requirements

1. No ad hoc balance updates.
2. Every business action maps to one or more journal entries.
3. Journal entry set must balance (sum debits == sum credits).
4. Journal lines include:
   - account
   - amount
   - currency
   - reference type and ID
   - idempotency key
5. Financial state changes happen in single transaction with business command.

## 6) Reconciliation Requirements

- Daily reconciliation job against PSP transaction exports/events.
- Mismatch records placed into operations queue.
- No auto-write-off; manual resolution with audit trail required.

## 7) Payout Gating

- Payout only when:
  - settlement eligibility reached
  - KYC tier threshold satisfied
  - risk checks pass
- otherwise:
  - move to hold queue with reason code

## 8) Open Questions

- None for Sprint 0.
- Future policy changes require new decision record and spec version bump.
