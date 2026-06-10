-- AlterTable
ALTER TABLE "fund_holds"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock',
  ADD COLUMN "provider_intent_id" TEXT,
  ADD COLUMN "provider_payment_id" TEXT;

-- CreateTable
CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "external_intent_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "next_retry_at" TIMESTAMP(3),
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fund_holds_provider_intent_id_key" ON "fund_holds"("provider_intent_id");
CREATE INDEX "fund_holds_provider_provider_intent_id_idx" ON "fund_holds"("provider", "provider_intent_id");

CREATE UNIQUE INDEX "payment_webhook_events_external_event_id_key" ON "payment_webhook_events"("external_event_id");
CREATE INDEX "payment_webhook_events_status_next_retry_at_idx" ON "payment_webhook_events"("status", "next_retry_at");
CREATE INDEX "payment_webhook_events_provider_external_intent_id_idx" ON "payment_webhook_events"("provider", "external_intent_id");
