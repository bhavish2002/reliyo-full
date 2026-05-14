import type { Task, TaskStatus } from "@/lib/taskTypes";

/** Legacy localStorage status from pre-Sprint-1 demos. */
const LEGACY_COMPLETED = "completed" as const;

/**
 * Coerce persisted task status to the canonical Sprint-0 contract.
 * `completed` was a pre-lock intermediate; map to `done` or `closed` by rating presence.
 */
export function migrateLegacyTaskStatus(raw: string): TaskStatus {
  if (raw === LEGACY_COMPLETED) return "done";
  return raw as TaskStatus;
}

export function migrateLegacyTask(task: Task): Task {
  const raw = task.status as string;
  if (raw !== LEGACY_COMPLETED) return task;
  if (task.rating != null) {
    return { ...task, status: "closed" };
  }
  return { ...task, status: "done" };
}

export function migrateLegacyTaskList(tasks: Task[]): Task[] {
  return tasks.map(migrateLegacyTask);
}
