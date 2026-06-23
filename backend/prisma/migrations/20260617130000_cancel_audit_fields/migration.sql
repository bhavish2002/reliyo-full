-- Sprint 7D: cancel audit fields
ALTER TABLE "tasks" ADD COLUMN "cancelled_by_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN "cancel_reason" TEXT;
