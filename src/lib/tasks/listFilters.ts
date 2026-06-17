import type { Task } from "@/lib/taskTypes";

/** Tasks the user created (requestor) — ID-only, per PRODUCT-WORKFLOW §2. */
export function filterCreatedByUser(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.createdById === userId);
}

/** Tasks the user accepted (acceptor) — ID-only. */
export function filterAcceptedByUser(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.acceptedById === userId);
}

/** Browse list: open tasks not owned by the current user. */
export function filterBrowseTasksForUser(tasks: Task[], userId: string | undefined): Task[] {
  return tasks.filter(
    (t) => t.status === "open" && (!userId || t.createdById !== userId),
  );
}
