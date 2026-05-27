-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('open', 'committed', 'in_progress', 'done', 'disputed', 'closed', 'force_closed');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'open',
    "work_type" TEXT NOT NULL,
    "manpower" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT NOT NULL,
    "country" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "extended_deadline" TIMESTAMP(3),
    "update_frequency" TEXT NOT NULL,
    "skills" TEXT[],
    "domain" TEXT NOT NULL,
    "reward" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currency_symbol" TEXT,
    "requestor_id" TEXT NOT NULL,
    "acceptor_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "reward_funded_at" TIMESTAMP(3),
    "trust_deposit_funded_at" TIMESTAMP(3),
    "status_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "rating_feedback" TEXT,
    "dsp4_resolved_valid" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "system_generated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_public_id_key" ON "tasks"("public_id");

-- CreateIndex
CREATE INDEX "tasks_status_created_at_idx" ON "tasks"("status", "created_at");

-- CreateIndex
CREATE INDEX "tasks_requestor_id_idx" ON "tasks"("requestor_id");

-- CreateIndex
CREATE INDEX "tasks_acceptor_id_idx" ON "tasks"("acceptor_id");

-- CreateIndex
CREATE INDEX "task_events_task_id_created_at_idx" ON "task_events"("task_id", "created_at");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requestor_id_fkey" FOREIGN KEY ("requestor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_acceptor_id_fkey" FOREIGN KEY ("acceptor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
