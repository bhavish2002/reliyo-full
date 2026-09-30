import type { FundHold, Task } from '@prisma/client';

/** Locked chart-of-accounts codes (see migration seed). */
export const LedgerAccountCode = {
  escrowReward: 'escrow_reward',
  escrowTrust: 'escrow_trust',
  platformRevenue: 'platform_revenue',
  platformCompensationReserve: 'platform_compensation_reserve',
  payableRequestor: 'payable_requestor',
  payableAcceptor: 'payable_acceptor',
} as const;

export type SettlementScenario =
  | 'closed'
  | 'force_closed'
  | 'cancel_open'
  | 'quit_trust_refund';

export const PLATFORM_FEE_ON_REWARD = 0.05;
export const FORCE_CLOSE_TRUST_PENALTY = 0.03;
/** Share of the force-close trust penalty credited to the requestor. The rest stays in the platform reserve. */
export const FORCE_CLOSE_REQUESTOR_PENALTY_SHARE = 0.7;
export const TRUST_DEPOSIT_RATE = 0.1;

export type TaskForSettlement = Task & {
  rewardFundHold: FundHold | null;
  trustFundHold: FundHold | null;
};

export interface JournalLineInput {
  accountCode: string;
  side: 'debit' | 'credit';
  amount: number;
  fundHoldId?: string;
  userId?: string;
}

export interface PostJournalInput {
  idempotencyKey: string;
  scenario: SettlementScenario;
  referenceType: string;
  referenceId: string;
  taskId: string;
  currency: string;
  description: string;
  lines: JournalLineInput[];
}
