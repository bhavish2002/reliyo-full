/** Fired after task create/cancel/accept so list pages can refetch. */
export const TASKS_CHANGED_EVENT = "reliyo:tasks-changed";

export function notifyTasksChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
  }
}
