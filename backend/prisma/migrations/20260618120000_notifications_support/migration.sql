-- Sprint 7E/7 closeout: notifications + support tickets
CREATE TYPE "NotificationTargetRole" AS ENUM ('requestor', 'acceptor', 'admin');

CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "target_role" "NotificationTargetRole" NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "task_id" TEXT,
    "task_display_id" TEXT,
    "task_title" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "cta_path" TEXT,
    "read_at" TIMESTAMP(3),
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_notifications_idempotency_key_key" ON "app_notifications"("idempotency_key");
CREATE INDEX "app_notifications_user_id_created_at_idx" ON "app_notifications"("user_id", "created_at");
CREATE INDEX "app_notifications_target_role_created_at_idx" ON "app_notifications"("target_role", "created_at");

ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_tickets_public_id_key" ON "support_tickets"("public_id");
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");
