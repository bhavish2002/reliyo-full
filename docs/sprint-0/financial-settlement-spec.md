# Financial Settlement Spec

Version: `v1.2`  
Owner: Finance + Backend Lead  
Status: LOCKED

> **v1.2 (2026-09-24):** force-close requestor refund is the full reward plus 70% of the 3% trust-deposit penalty. Transaction status follows deposit, refund, and payout progress and shows "No Further Settlements" only after a deleted, closed, or force-closed task is fully settled.
>
> **v1.1 (2026-09-23):** delete-before-accept settles as `Deleted` with a full reward refund. Quit within 2h initiates a full trust-deposit refund. Acceptor net receipt is not a guaranteed displayed amount (platform fee plus variable payment-gateway charges).

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

- requestor receives a full reward refund plus **70% of the trust-deposit penalty**
- trust-deposit penalty remains **3% of the trust deposit**
- acceptor receives the trust deposit minus that penalty
- the remaining **30%** of the penalty is credited to `platform_compensation_reserve`

### 4.3 Quit Within 2h

Trigger: `Committed` -> `Open` via quit within cooldown

Target outcome:

- full trust-deposit refund initiated to the acceptor
- reward remains funded for task reopening

### 4.4 Delete Before Acceptance

Trigger: requestor deletes while task is still `Open` (no acceptor)

Target outcome:

- status becomes `Deleted`
- full reward refund initiated to the requestor
- task archived with retention policy (`cancelledAt`)

The amount an acceptor ultimately receives on a normal close is the reward minus the platform fee, and may also be reduced by variable payment-gateway charges at payout. The product does not display a guaranteed acceptor payout.

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
