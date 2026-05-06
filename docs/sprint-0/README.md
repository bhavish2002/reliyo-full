# Sprint 0 - Policy Lock Pack

This folder contains the canonical policy documents that must be finalized before backend implementation begins.

## Documents

- `decision-register.md` - master decision log with owners and due dates.
- `state-machine-spec.md` - canonical task lifecycle, transitions, cooldowns, and invariants.
- `financial-settlement-spec.md` - settlement formulas, fee handling, and payout/refund rules.
- `dispute-ops-spec.md` - DSP1-DSP4 flow, admin semantics, and force-close operations.
- `api-error-contract.md` - standard API error schema, status mapping, and error code taxonomy.

## Sprint 0 Exit Criteria

Sprint 0 is complete only when all items below are true:

1. Every decision marked `PENDING` in `decision-register.md` is moved to `LOCKED`.
2. Legal review has signed off on payments and platform-held funds wording.
3. State machine and settlement formulas are approved by product + engineering + operations.
4. API error contract is approved by frontend and backend leads.
5. Version tags are assigned to each spec (for example `v1.0`).

## Sprint 0 Completion Status

- Current status: `LOCKED / COMPLETE`
- Completion date: 2026-05-06
- Next phase enabled: Sprint 1

All Sprint 0 decisions are now locked and versioned as `v1.0`.

## How To Use

1. Review each file in order.
2. Resolve all `PENDING DECISION` blocks.
3. Keep all locked decisions immutable; changes require a new decision entry.
4. Start Sprint 1 only after Sprint 0 exit criteria are met.
