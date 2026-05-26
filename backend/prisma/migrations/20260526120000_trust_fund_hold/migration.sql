-- AlterTable
ALTER TABLE "fund_holds" ADD COLUMN "target_task_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "trust_fund_hold_id" TEXT;

-- CreateIndex
CREATE INDEX "fund_holds_target_task_id_idx" ON "fund_holds"("target_task_id");
CREATE UNIQUE INDEX "tasks_trust_fund_hold_id_key" ON "tasks"("trust_fund_hold_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_trust_fund_hold_id_fkey" FOREIGN KEY ("trust_fund_hold_id") REFERENCES "fund_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
