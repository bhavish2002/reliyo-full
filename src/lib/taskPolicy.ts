import type { TaskStatus } from "@/lib/taskTypes";

// Sprint-0 policy lifecycle used by frontend displays/actions.
export const POLICY_STATUS_FLOW: TaskStatus[] = [
  "open",
  "committed",
  "in_progress",
  "done",
  "disputed",
  "closed",
  "force_closed",
];

export function normalizePolicyStatus(status: TaskStatus): TaskStatus {
  // Temporary compatibility for legacy local demo data.
  if (status === "completed") {
    return "closed";
  }
  return status;
}

export function comparePolicyStatus(a: TaskStatus, b: TaskStatus): number {
  const ai = POLICY_STATUS_FLOW.indexOf(normalizePolicyStatus(a));
  const bi = POLICY_STATUS_FLOW.indexOf(normalizePolicyStatus(b));
  return ai - bi;
}
