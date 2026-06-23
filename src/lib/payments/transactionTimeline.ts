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
}

function currencySymbol(currency: string): string {
  return currency === "INR" ? "₹" : `${currency} `;
}

function primaryHold(txs: UserTransaction[]): UserTransaction {
  const reward = txs.find((t) => t.purpose === "task_reward");
  return reward ?? txs[0];
}

function markStages(
  stages: Omit<FundTimelineStage, "state">[],
  currentId: string,
  failedId?: string,
): FundTimelineStage[] {
  const currentIdx = stages.findIndex((s) => s.id === currentId);
  return stages.map((stage, idx) => {
    if (failedId && stage.id === failedId) {
      return { ...stage, state: "failed" as const };
    }
    if (currentIdx === -1) {
      return { ...stage, state: "completed" as const };
    }
    if (idx < currentIdx) return { ...stage, state: "completed" as const };
    if (idx === currentIdx) return { ...stage, state: "current" as const };
    return { ...stage, state: "upcoming" as const };
  });
}

function settlementLabel(scenario?: string): { title: string; description: string } {
  switch (scenario) {
    case "closed":
      return {
        title: "Settlement complete",
        description: "Funds released per task completion. Platform fee deducted where applicable.",
      };
    case "force_closed":
      return {
        title: "Force-close settlement",
        description: "Admin-approved force close. Reward refunded to requestor; trust penalties may apply.",
      };
    case "cancel_open":
      return {
        title: "Refund processed",
        description: "Task was cancelled while open. Your deposit has been refunded.",
      };
    case "quit_trust_refund":
      return {
        title: "Trust deposit refunded",
        description: "Acceptor quit during grace period. Trust deposit returned.",
      };
    default:
      return {
        title: "Settlement complete",
        description: "Fund movement completed for this task.",
      };
  }
}

function buildRequestorTimeline(tx: UserTransaction): TaskFundTimeline {
  const symbol = currencySymbol(tx.currency);
  const status = tx.taskStatus ?? "open";
  const settled = Boolean(tx.settlementScenario) || ["closed", "force_closed"].includes(status);
  const failed = tx.status === "failed";

  const stages: Omit<FundTimelineStage, "state">[] = [
    {
      id: "payment_initiated",
      title: "Payment initiated",
      description: `${symbol}${tx.amount.toFixed(2)} reward deposit started via ${tx.paymentMethod ?? tx.provider}.`,
      timestamp: tx.createdAt,
    },
    {
      id: "payment_confirmed",
      title: "Payment successful",
      description: "Funds received and secured in Reliyo escrow for this task.",
      timestamp: tx.confirmedAt,
    },
    {
      id: "task_active",
      title: "Task active",
      description:
        status === "open"
          ? "Funds held in escrow while the task is open for acceptors."
          : "Reward is locked in escrow while work is underway.",
      timestamp: tx.confirmedAt,
    },
    {
      id: "work_delivered",
      title: "Work delivered",
      description: "Acceptor marked work as done. Review and accept to release payout.",
      timestamp: undefined,
    },
    {
      id: "settlement",
      title: settlementLabel(tx.settlementScenario).title,
      description: settlementLabel(tx.settlementScenario).description,
      timestamp: tx.settlementAt,
    },
  ];

  let currentId = "payment_initiated";
  let headline = "Processing payment";
  let subheadline: string | undefined = "Waiting for payment confirmation.";
  let pendingAction: string | undefined;

  if (failed) {
    currentId = "payment_initiated";
    headline = "Payment failed";
    subheadline = "Your reward deposit could not be confirmed. Retry from the task.";
  } else if (tx.status === "pending") {
    currentId = "payment_initiated";
    headline = "Payment processing";
    subheadline = "Your bank or payment provider is confirming the transaction.";
    pendingAction = "Complete payment if checkout is still open.";
  } else if (settled) {
    currentId = "settlement";
    headline = settlementLabel(tx.settlementScenario).title;
    subheadline = "No further fund action is required.";
  } else if (status === "disputed") {
    currentId = "work_delivered";
    headline = "Dispute under review";
    subheadline = "Funds remain in escrow while admins review the dispute.";
    pendingAction = "Wait for admin resolution or respond on the task timeline.";
  } else if (status === "done") {
    currentId = "work_delivered";
    headline = "Review work to release funds";
    subheadline = "Acceptor payout is pending your acceptance.";
    pendingAction = "Accept work on the task page to release the acceptor payout.";
  } else if (["committed", "in_progress"].includes(status)) {
    currentId = "task_active";
    headline = "Work in progress";
    subheadline = `Your ${symbol}${tx.amount.toFixed(2)} is held safely in escrow.`;
  } else if (status === "open") {
    currentId = "task_active";
    headline = "Awaiting acceptor";
    subheadline = "Funds are secured. Waiting for someone to accept the task.";
  } else if (tx.confirmedAt) {
    currentId = "task_active";
    headline = "Funds in escrow";
    subheadline = "Your payment is confirmed and held for this task.";
  }

  const marked = markStages(stages, currentId, failed ? "payment_initiated" : undefined);
  const current = marked.find((s) => s.state === "current");
  if (current && pendingAction) {
    current.pendingAction = pendingAction;
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
    currentStageId: currentId,
    stages: marked,
    headline,
    subheadline,
  };
}

function buildAcceptorTimeline(tx: UserTransaction): TaskFundTimeline {
  const symbol = currencySymbol(tx.currency);
  const status = tx.taskStatus ?? "open";
  const settled = Boolean(tx.settlementScenario) || ["closed", "force_closed"].includes(status);
  const failed = tx.status === "failed";

  const stages: Omit<FundTimelineStage, "state">[] = [
    {
      id: "trust_initiated",
      title: "Trust deposit initiated",
      description: `${symbol}${tx.amount.toFixed(2)} trust deposit started to accept this task.`,
      timestamp: tx.createdAt,
    },
    {
      id: "trust_locked",
      title: "Trust deposit locked",
      description: "Deposit confirmed and held as trust collateral for this task.",
      timestamp: tx.confirmedAt,
    },
    {
      id: "work_phase",
      title: "Work in progress",
      description: "Complete the task and mark it done to become eligible for payout.",
      timestamp: tx.confirmedAt,
    },
    {
      id: "payout_pending",
      title: "Payout pending",
      description: "Waiting for requestor to accept your work before reward is released.",
      timestamp: undefined,
    },
    {
      id: "settlement",
      title: settlementLabel(tx.settlementScenario).title,
      description: settlementLabel(tx.settlementScenario).description,
      timestamp: tx.settlementAt,
    },
  ];

  let currentId = "trust_initiated";
  let headline = "Processing trust deposit";
  let subheadline: string | undefined = "Waiting for deposit confirmation.";
  let pendingAction: string | undefined;

  if (failed) {
    currentId = "trust_initiated";
    headline = "Trust deposit failed";
    subheadline = "Deposit could not be confirmed. Accept the task again to retry.";
  } else if (tx.status === "pending") {
    currentId = "trust_initiated";
    headline = "Confirming trust deposit";
    subheadline = "Your payment provider is processing the trust deposit.";
    pendingAction = "Complete payment if checkout is still open.";
  } else if (settled) {
    currentId = "settlement";
    headline = settlementLabel(tx.settlementScenario).title;
    subheadline =
      tx.settlementScenario === "closed"
        ? "Reward payout and trust release completed."
        : "Trust movement completed for this task.";
  } else if (status === "disputed") {
    currentId = "payout_pending";
    headline = "Dispute under review";
    subheadline = "Payout is paused while admins review the dispute.";
    pendingAction = "Respond on the task timeline if more information is needed.";
  } else if (status === "done") {
    currentId = "payout_pending";
    headline = "Awaiting requestor acceptance";
    subheadline = "Work submitted. Payout releases when the requestor accepts.";
    pendingAction = "No action needed — waiting on requestor.";
  } else if (["committed", "in_progress"].includes(status)) {
    currentId = "work_phase";
    headline = "Work in progress";
    subheadline = `Trust deposit of ${symbol}${tx.amount.toFixed(2)} is locked for this task.`;
    pendingAction = "Mark work as done when you finish.";
  } else if (tx.confirmedAt) {
    currentId = "work_phase";
    headline = "Trust deposit secured";
    subheadline = "Begin work on the task.";
  }

  const marked = markStages(stages, currentId, failed ? "trust_initiated" : undefined);
  const current = marked.find((s) => s.state === "current");
  if (current && pendingAction) {
    current.pendingAction = pendingAction;
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
    currentStageId: currentId,
    stages: marked,
    headline,
    subheadline,
  };
}

/** Build Razorpay-style fund movement timeline for a single task. */
export function buildTaskFundTimeline(
  taskId: string,
  transactions: UserTransaction[],
): TaskFundTimeline | null {
  const taskTxs = transactions.filter((t) => t.taskId === taskId);
  if (taskTxs.length === 0) return null;

  const tx = primaryHold(taskTxs);
  if (tx.role === "acceptor" || tx.purpose === "trust_deposit") {
    return buildAcceptorTimeline(tx);
  }
  return buildRequestorTimeline(tx);
}
