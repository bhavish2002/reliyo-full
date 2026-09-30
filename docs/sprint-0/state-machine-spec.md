# State Machine Spec (Canonical)

Version: `v1.2`  
Owner: Backend Lead  
Status: LOCKED

> **v1.2 (2026-09-23):** requestor delete-before-accept is `Deleted` (terminal), with a full reward refund. Quit within 2h remains `Committed` → `Open` with a full trust-deposit refund.
>
> **v1.1 (2026-09-10):** dispute cooldown — none before DSP1; 48/24/12h from last raise; resets when work returns to `Done`. DSP4 rework = `max(deadline, review + 10 days)`.

## 1) Valid Task States

Only the following states are valid in backend authority:

1. `Open`
2. `Committed`
3. `In Progress`
4. `Done`
5. `Disputed`
6. `Closed`
7. `Force Closed`
8. `Deleted`

`Deleted` is the terminal state when a requestor removes a task before it is accepted. It is not a user-visible active lifecycle state. Any other state (including legacy `completed` or a separate `cancelled` label) is invalid.

## 2) Rule Zero

A task record becomes active only after reward funding is confirmed by payment authority.

- reward not confirmed -> no task in active lifecycle
- reward confirmed -> task starts in `Open`

## 3) Allowed Transitions

- `Open` -> `Committed`
- `Open` -> `Deleted` (requestor delete before accept; full reward refund; archived)
- `Committed` -> `In Progress`
- `Committed` -> `Open` (quit within 2h window after a full trust-deposit refund is initiated)
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
- `Deleted` -> terminal

## 4) Action Cooldowns

- Quit Task: 2 hours from acceptance timestamp.
- Raise Dispute: no cooldown before DSP1. From DSP2 onward: 48h / 24h / 12h from last raise. Returning to `Done` after a fix resets the wait so the next raise is immediate.
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
- DSP4 resolved-valid rework window: `max(effective deadline, review date + 10 days)`
  - if original deadline crossed -> 10 days from review date
  - if remaining window < 10 days -> 10 days from review date
  - if remaining window >= 10 days -> deadline unchanged

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
