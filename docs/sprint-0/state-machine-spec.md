# State Machine Spec (Canonical)

Version: `v1.0`  
Owner: Backend Lead  
Status: LOCKED

## 1) Valid Task States

Only the following states are valid in backend authority:

1. `Open`
2. `Committed`
3. `In Progress`
4. `Done`
5. `Disputed`
6. `Closed`
7. `Force Closed`

Any other state (including legacy `completed`) is invalid.

## 2) Rule Zero

A task record becomes active only after reward funding is confirmed by payment authority.

- reward not confirmed -> no task in active lifecycle
- reward confirmed -> task starts in `Open`

## 3) Allowed Transitions

- `Open` -> `Committed`
- `Open` -> `Cancelled` (business action, archived; not part of user-visible lifecycle states)
- `Committed` -> `In Progress`
- `Committed` -> `Open` (quit within 2h window after valid trust deposit refund)
- `Committed` -> `Force Closed` (admin-approved force close)
- `In Progress` -> `Done`
- `In Progress` -> `Force Closed` (admin-approved force close)
- `Done` -> `Closed`
- `Done` -> `Disputed`
- `Disputed` -> `Done` (acceptor fix submitted, until DSP3 rules)
- `Disputed` -> `Closed` (resolved invalid path or requestor accepts after fix)
- `Disputed` -> `Force Closed` (admin close path)
- `Closed` -> terminal
- `Force Closed` -> terminal

## 4) Action Cooldowns

- Quit Task: 2 hours from acceptance timestamp.
- Raise Dispute: 48 hours from last dispute raise event.
- Request Force Close: 24 hours from last force-close request event.

Cooldown checks are enforced server-side and returned in API response as metadata.

## 5) Permission Model (Server-Enforced)

- Platform role: `user` or `admin`
- Task-context role inferred per task:
  - requestor: task creator
  - acceptor: accepted participant

No client-provided role input is trusted for authorization.

## 6) Invariants

1. Exactly one acceptor per task at a time.
2. Requestor cannot accept own task.
3. No transition without authorization check + invariant check.
4. Monetary transitions must be ledger-backed before status commit.
5. Terminal states are immutable except via explicit admin correction workflow.

## 7) Deadline Rules

- If deadline passed, requestor may extend deadline via explicit action.
- DSP4 resolved-valid rework window:
  - if original deadline crossed -> minimum 10 days
  - if remaining window < 10 days -> extend to 10 days minimum

## 8) Event Requirements

Every transition must append:

- immutable transition event
- actor identity and role
- timestamp
- source and target state
- correlation/request ID

## 9) Lock Notes

- DSP4 semantics and cancellation retention policy are locked in `decision-register.md`.
- Any lifecycle change requires a new decision record and spec version bump.
