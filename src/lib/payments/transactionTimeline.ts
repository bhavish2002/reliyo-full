import type { UserTransaction } from "@/lib/payments/api";

export type TimelineStageState = "completed" | "current" | "upcoming" | "failed";

export interface FundTimelineStage {
  id: string;
  title: string;
  description: string;
  state: TimelineStageState;
  timestamp?: string;
  pendingAction?: string;
}

export interface TaskFundTimeline {
  taskId: string;
  taskDisplayId?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskCancelled?: boolean;
  role: "requestor" | "acceptor";
  amount: number;
  currency: string;
  symbol: string;
  currentStageId: string;
  stages: FundTimelineStage[];
  headline: string;
  subheadline?: string;
  /** Shown only after a deleted, closed, or force-closed task has every applicable settlement recorded. */
  noFurtherSettlements: boolean;
}

const TERMINAL_FOR_BANNER = new Set(["deleted", "closed", "force_closed"]);

function currencySymbol(currency: string): string {
  return currency === "INR" ? "₹" : `${currency} `;
}

function selectHold(txs: UserTransaction[]): UserTransaction {
  return txs.find((t) => t.status === "confirmed") ?? txs[0];
}

function applyStates(
  stages: Omit<FundTimelineStage, "state">[],
  currentId: string | null,
  failedId?: string,
): FundTimelineStage[] {
  const currentIdx = currentId ? stages.findIndex((s) => s.id === currentId) : -1;
  return stages.map((stage, idx) => {
    if (failedId && stage.id === failedId) {
      return { ...stage, state: "failed" as const };
    }
    if (currentId === null) {
      return { ...stage, state: "completed" as const };
    }
    if (idx < currentIdx) return { ...stage, state: "completed" as const };
    if (idx === currentIdx) return { ...stage, state: "current" as const };
    return { ...stage, state: "upcoming" as const };
  });
}

interface MoneyLeg {
  initiatedId: string;
  successId: string;
  initiatedTitle: string;
  successTitle: string;
  description: string;
  settled: boolean;
  pendingAction: string;
}

function pushLeg(
  stages: Omit<FundTimelineStage, "state">[],
  leg: MoneyLeg,
  initiatedAt?: string,
  successAt?: string,
) {
  stages.push({
    id: leg.initiatedId,
    title: leg.initiatedTitle,
    description: leg.description,
    timestamp: initiatedAt,
  });
  stages.push({
    id: leg.successId,
    title: leg.successTitle,
    description: leg.settled
      ? `${leg.successTitle}. Nothing else is waiting on this step.`
      : "This step completes when the settlement is recorded.",
    timestamp: leg.settled ? successAt : undefined,
  });
}

function buildRequestorTimeline(tx: UserTransaction): TaskFundTimeline {
  const symbol = currencySymbol(tx.currency);
  const status = tx.taskStatus ?? "";
  const scenario = tx.settlementScenario;
  const failed = tx.status === "failed";
  const pending = tx.status === "pending";
  const confirmed = tx.status === "confirmed";
  const amountLabel = `${symbol}${tx.amount.toFixed(2)}`;

  const isDeleteRefund = status === "deleted" || scenario === "cancel_open";
  const isForceRefund = !isDeleteRefund && (status === "force_closed" || scenario === "force_closed");
  const isNormalClose = !isDeleteRefund && !isForceRefund && status === "closed";

  const stages: Omit<FundTimelineStage, "state">[] = [
    {
      id: "reward_initiated",
      title: "Reward Deposit Initiated",
      description: `${amountLabel} reward deposit started via ${tx.paymentMethod ?? tx.provider}.`,
      timestamp: tx.createdAt,
    },
    {
      id: "reward_successful",
      title: "Reward Deposit Successful",
      description: confirmed
        ? "Reward deposit successful. The task is Open and available in Browse."
        : "The task moves to Open and appears in Browse only after this deposit succeeds.",
      timestamp: confirmed ? tx.confirmedAt : undefined,
    },
  ];

  let leg: MoneyLeg | null = null;
  if (isDeleteRefund) {
    leg = {
      initiatedId: "refund_initiated",
      successId: "refund_successful",
      initiatedTitle: "Refund Initiated",
      successTitle: "Refund Successful",
      description:
        "The task was deleted before it was accepted. A full refund of the reward deposit has been initiated.",
      settled: scenario === "cancel_open",
      pendingAction: "Your refund is being processed.",
    };
  } else if (isForceRefund) {
    leg = {
      initiatedId: "refund_initiated",
      successId: "refund_successful",
      initiatedTitle: "Refund Initiated",
      successTitle: "Refund Successful",
      description:
        "The task was force-closed. A full refund of the reward deposit has been initiated, plus 70% of the acceptor's trust-deposit penalty.",
      settled: scenario === "force_closed",
      pendingAction: "Your refund is being processed.",
    };
  } else if (isNormalClose) {
    leg = {
      initiatedId: "release_initiated",
      successId: "release_successful",
      initiatedTitle: "Reward Release Initiated",
      successTitle: "Reward Release Successful",
      description:
        "The task is closed. Release of the locked reward has been initiated for acceptor settlement.",
      settled: scenario === "closed",
      pendingAction: "Reward release is being processed.",
    };
  }

  if (leg && confirmed) {
    pushLeg(stages, leg, tx.settlementAt, tx.settlementAt);
  }

  let currentId: string | null = "reward_initiated";
  let headline = "Reward Deposit Initiated";
  let subheadline = "Waiting for the reward deposit to succeed.";
  let pendingAction: string | undefined;
  let noFurtherSettlements = false;

  if (failed) {
    currentId = "reward_initiated";
    headline = "Reward deposit failed";
    subheadline = "The reward deposit was not confirmed. The task stays unpublished until payment succeeds.";
  } else if (pending) {
    currentId = "reward_initiated";
    headline = "Reward Deposit Initiated";
    subheadline = "Your payment provider is confirming the reward deposit.";
    pendingAction = "Complete payment if checkout is still open.";
  } else if (leg && !leg.settled) {
    currentId = leg.initiatedId;
    headline = leg.initiatedTitle;
    subheadline = leg.pendingAction;
    pendingAction = leg.pendingAction;
  } else if (leg && leg.settled) {
    currentId = null;
    headline = leg.successTitle;
    subheadline = "This payment leg is complete.";
    noFurtherSettlements =
      TERMINAL_FOR_BANNER.has(status) && (isDeleteRefund || isForceRefund || isNormalClose);
  } else if (confirmed) {
    currentId = null;
    headline = "Reward Deposit Successful";
    subheadline =
      status === "open"
        ? "The task is Open and available in Browse. Your reward stays locked until the task is settled."
        : "Your reward deposit is locked while this task is in progress.";
  }

  const marked = applyStates(stages, currentId, failed ? "reward_initiated" : undefined);
  const current = marked.find((s) => s.state === "current");
  if (current && pendingAction) current.pendingAction = pendingAction;

  if (noFurtherSettlements) {
    headline = "No Further Settlements";
    subheadline = "All payments for this task have been settled.";
  }

  return {
    taskId: tx.taskId!,
    taskDisplayId: tx.taskDisplayId,
    taskTitle: tx.taskTitle,
    taskStatus: tx.taskStatus,
    taskCancelled: tx.taskCancelled,
    role: "requestor",
    amount: tx.amount,
    currency: tx.currency,
    symbol,
    currentStageId: currentId ?? leg?.successId ?? "reward_successful",
    stages: marked,
    headline,
    subheadline,
    noFurtherSettlements,
  };
}

function buildAcceptorTimeline(tx: UserTransaction): TaskFundTimeline {
  const symbol = currencySymbol(tx.currency);
  const status = tx.taskStatus ?? "";
  const scenario = tx.settlementScenario;
  const failed = tx.status === "failed";
  const pending = tx.status === "pending";
  const confirmed = tx.status === "confirmed";
  const amountLabel = `${symbol}${tx.amount.toFixed(2)}`;

  const isQuit = scenario === "quit_trust_refund";
  const isForce = !isQuit && (status === "force_closed" || scenario === "force_closed");
  const isClose = !isQuit && !isForce && status === "closed";

  const stages: Omit<FundTimelineStage, "state">[] = [
    {
      id: "trust_initiated",
      title: "Trust Deposit Initiated",
      description: `${amountLabel} trust deposit started to accept this task.`,
      timestamp: tx.createdAt,
    },
    {
      id: "trust_successful",
      title: "Trust Deposit Successful",
      description: confirmed
        ? "Trust deposit successful. The task is Committed and has been removed from Browse."
        : "The task moves to Committed and leaves Browse only after this deposit succeeds.",
      timestamp: confirmed ? tx.confirmedAt : undefined,
    },
  ];

  let leg: MoneyLeg | null = null;
  if (isQuit) {
    leg = {
      initiatedId: "refund_initiated",
      successId: "refund_successful",
      initiatedTitle: "Refund Initiated",
      successTitle: "Refund Successful",
      description:
        "You quit within the 2-hour grace period. The task returned to Open, and a full refund of your trust deposit has been initiated.",
      settled: true,
      pendingAction: "Your trust-deposit refund is being processed.",
    };
  } else if (isForce) {
    leg = {
      initiatedId: "trust_settlement_initiated",
      successId: "trust_settlement_successful",
      initiatedTitle: "Trust Settlement Initiated",
      successTitle: "Trust Settlement Successful",
      description:
        "The task was force-closed. Settlement of your trust deposit has been initiated, after the platform penalty.",
      settled: scenario === "force_closed",
      pendingAction: "Trust-deposit settlement is being processed.",
    };
  } else if (isClose) {
    leg = {
      initiatedId: "payout_initiated",
      successId: "payout_successful",
      initiatedTitle: "Reward Payout Initiated",
      successTitle: "Reward Payout Successful",
      description:
        "The task is closed. Reward payout has been initiated. The final amount is subject to the platform fee and any applicable transaction charges. Your trust deposit is refunded in full.",
      settled: scenario === "closed",
      pendingAction: "Your reward payout is being processed.",
    };
  }

  if (leg && confirmed) {
    pushLeg(stages, leg, tx.settlementAt, tx.settlementAt);
  }

  let currentId: string | null = "trust_initiated";
  let headline = "Trust Deposit Initiated";
  let subheadline = "Waiting for the trust deposit to succeed.";
  let pendingAction: string | undefined;
  let noFurtherSettlements = false;

  if (failed) {
    currentId = "trust_initiated";
    headline = "Trust deposit failed";
    subheadline = "The trust deposit was not confirmed. The task is not Committed until payment succeeds.";
  } else if (pending) {
    currentId = "trust_initiated";
    headline = "Trust Deposit Initiated";
    subheadline = "Your payment provider is confirming the trust deposit.";
    pendingAction = "Complete payment if checkout is still open.";
  } else if (leg && !leg.settled) {
    currentId = leg.initiatedId;
    headline = leg.initiatedTitle;
    subheadline = leg.pendingAction;
    pendingAction = leg.pendingAction;
  } else if (leg && leg.settled) {
    currentId = null;
    headline = leg.successTitle;
    subheadline = isQuit
      ? "Your trust deposit has been refunded in full. You cannot accept this task again."
      : "This payment leg is complete.";
    noFurtherSettlements = TERMINAL_FOR_BANNER.has(status);
  } else if (confirmed) {
    currentId = null;
    headline = "Trust Deposit Successful";
    subheadline = "The task is Committed and no longer listed in Browse. Your trust deposit stays locked until settlement.";
  }

  const marked = applyStates(stages, currentId, failed ? "trust_initiated" : undefined);
  const current = marked.find((s) => s.state === "current");
  if (current && pendingAction) current.pendingAction = pendingAction;

  if (noFurtherSettlements) {
    headline = "No Further Settlements";
    subheadline = "All payments for this task have been settled.";
  }

  return {
    taskId: tx.taskId!,
    taskDisplayId: tx.taskDisplayId,
    taskTitle: tx.taskTitle,
    taskStatus: tx.taskStatus,
    taskCancelled: tx.taskCancelled,
    role: "acceptor",
    amount: tx.amount,
    currency: tx.currency,
    symbol,
    currentStageId: currentId ?? leg?.successId ?? "trust_successful",
    stages: marked,
    headline,
    subheadline,
    noFurtherSettlements,
  };
}

/** Fund-movement timeline for one task, driven by the hold and the recorded settlement. */
export function buildTaskFundTimeline(
  taskId: string,
  transactions: UserTransaction[],
): TaskFundTimeline | null {
  const taskTxs = transactions.filter((t) => t.taskId === taskId);
  if (taskTxs.length === 0) return null;

  const tx = selectHold(taskTxs);
  if (tx.role === "acceptor" || tx.purpose === "trust_deposit") {
    return buildAcceptorTimeline(tx);
  }
  return buildRequestorTimeline(tx);
}
