-- Sprint 8F: subject line, user linkage, normalize reviewed → done
ALTER TABLE "support_tickets" ADD COLUMN "user_id" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN "subject" TEXT;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "support_tickets"
SET "subject" = LEFT("issue", 80)
WHERE "subject" IS NULL;

UPDATE "support_tickets"
SET "status" = 'done'
WHERE "status" = 'reviewed';

CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");
