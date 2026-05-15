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

/** Normalize persisted or raw status strings for ordering (legacy `completed` -> `closed`). */
export function normalizePolicyStatus(status: TaskStatus | string): TaskStatus {
  if (status === "completed") return "closed";
  return status as TaskStatus;
}

export function comparePolicyStatus(a: TaskStatus | string, b: TaskStatus | string): number {
  const ai = POLICY_STATUS_FLOW.indexOf(normalizePolicyStatus(a));
  const bi = POLICY_STATUS_FLOW.indexOf(normalizePolicyStatus(b));
  return ai - bi;
}
