-- CreateEnum
CREATE TYPE "FundHoldPurpose" AS ENUM ('task_reward', 'trust_deposit');
CREATE TYPE "FundHoldStatus" AS ENUM ('pending', 'confirmed', 'failed');

-- CreateTable
CREATE TABLE "fund_holds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "FundHoldPurpose" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "FundHoldStatus" NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_holds_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "reward_fund_hold_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_reward_fund_hold_id_key" ON "tasks"("reward_fund_hold_id");
CREATE INDEX "fund_holds_user_id_status_idx" ON "fund_holds"("user_id", "status");

-- AddForeignKey
ALTER TABLE "fund_holds" ADD CONSTRAINT "fund_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reward_fund_hold_id_fkey" FOREIGN KEY ("reward_fund_hold_id") REFERENCES "fund_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
