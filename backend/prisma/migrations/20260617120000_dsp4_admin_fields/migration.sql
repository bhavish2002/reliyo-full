-- Sprint 7A: DSP4 admin status fields on tasks
CREATE TYPE "Dsp4Status" AS ENUM ('open', 'resolved_valid', 'resolved_invalid', 'admin_closed');

ALTER TABLE "tasks" ADD COLUMN "dsp4_status" "Dsp4Status";
ALTER TABLE "tasks" ADD COLUMN "dsp4_rework_deadline" TIMESTAMP(3);

-- Escalated tasks default to open DSP4 queue state
UPDATE "tasks" SET "dsp4_status" = 'open' WHERE "dispute_count" >= 4 AND "dsp4_status" IS NULL;
