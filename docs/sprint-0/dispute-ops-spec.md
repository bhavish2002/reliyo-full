# Dispute Operations Spec (DSP1-DSP4)

Version: `v1.0`  
Owner: Product Ops + Backend Lead  
Status: LOCKED

## 1) Scope

Defines operational and technical behavior for dispute creation, escalation, cooldown, and admin outcomes.

## 2) Dispute Levels

- DSP1-DSP3: requestor/acceptor dispute loop
- DSP4: escalated dispute requiring admin intervention

Maximum disputes per task: 4

## 3) Core Rules

1. Requestor may raise disputes on `Done` (or escalate from `Disputed`) subject to cooldown.
2. Cooldown between dispute raises: 48 hours.
3. On DSP1-DSP3, acceptor may submit fix and move back to `Done`.
4. On DSP4, acceptor cannot change status unless admin resolves-valid policy enables constrained rework.
5. All dispute actions must generate timeline and audit events.

## 4) DSP4 Admin Outcomes

- `OPEN` -> task remains `Disputed`
- `RESOLVED_VALID` -> task remains `Disputed`, enable constrained rework window, then either normal close path or `Force Closed` if window rules fail
- `RESOLVED_INVALID` -> task transitions `Closed`
- `ADMIN_CLOSED` -> task transitions `Force Closed`

## 5) Force-Close Requests

- Requestor can submit force-close request in `Committed` or `In Progress`.
- Cooldown for repeated request: 24 hours.
- Request goes to admin queue for approve/reject.
- Approval triggers force-close transition and settlement workflow.
- Rejection leaves task in current state with reason note.

## 6) Case Operations Requirements

Every dispute case should include:

- dispute ID and round number
- task metadata
- timeline excerpts
- supporting attachments
- prior admin actions
- decision reasoning

## 7) SLA Recommendations

- DSP4 first admin response target: within 24h
- force-close queue response target: within 12h
- support ticket triage target: within 8h

## 8) Audit And Compliance

All admin actions must persist:

- who acted
- what changed
- why (reason code + optional note)
- when
- request ID / correlation ID

No silent override operations are allowed.

## 9) Open Questions

- None for Sprint 0.
- Future operational changes require new decision record and spec version bump.
