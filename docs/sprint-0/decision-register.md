# Sprint 0 Decision Register

Version: `v1.0`  
Status: LOCKED

Status legend:

- `LOCKED` - approved and versioned
- `PENDING` - requires founder/legal/product sign-off

---

## DR-001: Force Closed Settlement Formula

- Status: `LOCKED`
- Owner: Founder + Finance + Legal
- Locked decision:
  - Requestor receives 100% reward refund.
  - Acceptor receives trust deposit refund minus 3% penalty.
  - Penalty basis is 3% of trust deposit amount.
  - Settlement rounding mode is half-up to 2 decimal places.
- Implementation notes:
  - Penalty handling must map to immutable ledger entries.
  - API responses should include explicit breakdown fields for refund and penalty.
- Due before: Sprint 5 design start

## DR-002: Compensation Source Of Truth

- Status: `LOCKED`
- Owner: Founder + Finance
- Locked decision:
  - Compensation source is explicit ledger account `platform_compensation_reserve`.
  - Reserve funding model is periodic allocation from platform fee revenue.
- Implementation notes:
  - Reserve balance checks are required before applying compensation settlements.
  - If reserve is insufficient, settlement enters exception queue with `COMP_RESERVE_INSUFFICIENT`.
- Due before: Sprint 6 implementation

## DR-003: Platform Fee Applicability

- Status: `LOCKED`
- Owner: Founder + Legal + Finance
- Locked decision:
  - Apply 5% platform fee on `Closed` outcomes, including when the path was `Disputed` -> `Closed`.
  - Do not apply 5% platform fee on `Force Closed`.
  - Do not apply 5% platform fee on cancel-before-accept.
- Implementation notes:
  - Fee posting occurs only at terminal settlement execution time.
  - Fee applicability must be returned in settlement breakdown for auditability.
- Due before: Sprint 5 payment integration

## DR-004: Canonical Lifecycle Contract

- Status: `LOCKED`
- Owner: Product + Backend Lead
- Locked states:
  - `Open`, `Committed`, `In Progress`, `Done`, `Disputed`, `Closed`, `Force Closed`
- Notes:
  - Legacy `completed` state is prohibited in backend contract.
- Due before: Sprint 4 implementation

## DR-005: DSP4 Admin Semantics

- Status: `LOCKED`
- Owner: Product + Ops Lead
- Locked decision:
  - `OPEN` (DSP4 ongoing) -> task remains `Disputed`.
  - `RESOLVED_VALID` -> task remains `Disputed` with rework window, then either returns to normal close path or moves to `Force Closed` if window rules fail.
  - `RESOLVED_INVALID` -> `Closed`.
  - `ADMIN_CLOSED` -> `Force Closed`.
- Rework controls:
  - Rework window is system-computed with minimum 10-day rule.
  - Acceptor may transition `Disputed` -> `Done` only within active rework window.
- Due before: Sprint 7 implementation

## DR-006: Delete Semantics And Retention

- Status: `LOCKED`
- Owner: Legal + Product
- Locked decision:
  - "Delete task" is a business cancel action with archival retention (no hard delete).
  - Retention period for cancelled tasks and linked audit trail is 6 months.
  - Archived cancelled records are visible to admin only.
- Implementation notes:
  - Cancel action must preserve immutable financial and audit references.
  - User-facing UI should label this action as "Cancel Task" while preserving legacy compatibility.
- Due before: Sprint 4 data model

## DR-007: KYC Thresholds And Payout Gating

- Status: `LOCKED`
- Owner: Compliance + Finance
- Locked decision:
  - Use tiered progressive KYC thresholds based on cumulative accepted payouts.
  - Thresholds: Tier 1 at 10,000; Tier 2 at 50,000; Tier 3 at 200,000.
  - If KYC is missing or fails at payout time, settlement moves to payout hold queue with explicit reason code.
- Implementation notes:
  - Hold queue must support retry after KYC completion.
  - KYC tier and hold reason must be visible in admin operations panel.
- Due before: Sprint 6 implementation

## DR-008: Legal Payment Wording

- Status: `LOCKED`
- Owner: Legal
- Locked decision:
  - Use "platform-held funds" wording only.
  - Prohibit "escrow" terminology across all surfaces until explicit legal approval.
  - Enforce this policy in UI copy, API docs, support templates, and legal/static pages.
- Implementation notes:
  - Add copy lint/checklist in Sprint 1 UI cleanup.
  - Any legal exception must be added as a new decision record.
- Due before: Sprint 1 UX copy alignment
