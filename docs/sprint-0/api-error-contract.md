# API Error Contract

Version: `v1.0`  
Owner: Backend Lead + Frontend Lead  
Status: LOCKED

## 1) Goals

- Provide consistent error handling across all APIs.
- Allow frontend to render deterministic user messaging.
- Support observability and fast triage with request IDs.

## 2) Response Shape

All non-2xx responses must follow:

```json
{
  "error": {
    "code": "TASK_TRANSITION_INVALID",
    "message": "Transition from DONE to COMMITTED is not allowed.",
    "requestId": "req_01J...",
    "details": {
      "fromStatus": "DONE",
      "toStatus": "COMMITTED"
    }
  }
}
```

## 3) Required Fields

- `code`: machine-readable stable error code
- `message`: human-readable safe message
- `requestId`: unique request correlation value
- `details`: optional structured context

## 4) HTTP Status Mapping

- `400` validation and malformed input
- `401` unauthenticated
- `403` authenticated but not authorized
- `404` resource not found
- `409` conflict (state transition race, idempotency conflict)
- `422` business rule violation
- `429` rate limit exceeded
- `500` unhandled server error
- `503` dependent service unavailable

## 5) Domain Error Code Families

- `AUTH_*` authentication/session errors
- `PERMISSION_*` authorization errors
- `TASK_*` lifecycle/task operation errors
- `PAYMENT_*` intent, webhook, settlement errors
- `LEDGER_*` posting/reconciliation errors
- `DISPUTE_*` dispute flow and cooldown errors
- `ADMIN_*` admin workflow errors
- `RATE_LIMIT_*` throttling errors

## 6) Idempotency And Conflict Rules

- Mutating endpoints that can retry must accept idempotency key.
- Duplicate idempotency keys with mismatched payload return `409`.
- Replay-safe operations return original result where applicable.

## 7) Frontend Handling Contract

Frontend should:

1. Map `code` to deterministic UX copy.
2. Display `requestId` in support/debug panel.
3. Retry only on safe retry categories (for example `503`, selected `429`).

## 8) Logging Requirements

Server logs for each error must include:

- requestId
- user ID (if available)
- endpoint
- normalized error code
- stack trace for internal logs only

## 9) Open Questions

- Finalize full error code catalog during Sprint 2 module scaffolding.
