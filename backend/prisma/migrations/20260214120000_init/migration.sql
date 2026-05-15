-- Baseline schema (Sprint 2)
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
