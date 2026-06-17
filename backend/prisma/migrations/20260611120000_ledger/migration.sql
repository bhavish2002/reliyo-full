-- Sprint 6: double-entry ledger for platform-held fund settlements

CREATE TYPE "JournalLineSide" AS ENUM ('debit', 'credit');

CREATE TABLE "ledger_accounts" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "journal_entries" (
  "id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "task_id" TEXT,
  "currency" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_lines" (
  "id" TEXT NOT NULL,
  "entry_id" TEXT NOT NULL,
  "account_code" TEXT NOT NULL,
  "side" "JournalLineSide" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "fund_hold_id" TEXT,
  "user_id" TEXT,
  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "journal_entries_idempotency_key_key" ON "journal_entries"("idempotency_key");
CREATE INDEX "journal_entries_task_id_idx" ON "journal_entries"("task_id");
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");
CREATE INDEX "journal_entries_scenario_idx" ON "journal_entries"("scenario");
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines"("entry_id");
CREATE INDEX "journal_lines_account_code_idx" ON "journal_lines"("account_code");

ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_fkey"
  FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_code_fkey"
  FOREIGN KEY ("account_code") REFERENCES "ledger_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ledger_accounts" ("code", "name", "description") VALUES
  ('escrow_reward', 'Reward escrow', 'Platform-held task reward funds'),
  ('escrow_trust', 'Trust escrow', 'Platform-held acceptor trust deposits'),
  ('platform_revenue', 'Platform revenue', 'Fees retained by platform'),
  ('platform_compensation_reserve', 'Compensation reserve', 'Force-close penalty reserve'),
  ('payable_requestor', 'Payable — requestor', 'Amounts owed to requestors (refunds)'),
  ('payable_acceptor', 'Payable — acceptor', 'Amounts owed to acceptors (payouts + trust refunds)');
