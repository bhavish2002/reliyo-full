/**
 * Notification engine for the Reliyo trust-based task marketplace.
 * 
 * Principles:
 * - Notifications are rare, high-priority, and actionable
 * - Every notification answers "What should the user do now?"
 * - Role-aware: same event may notify different roles differently
 * - Idempotent: same event never generates duplicate notifications
 * - Smart suppression: collapsed per-task, no notifications for closed tasks
 */

export type NotificationType =
  | "task_accepted"
  | "acceptor_quit"
  | "alert_raised"
  | "force_close_requested"
  | "task_marked_done"
  | "dispute_raised"
  | "fix_resubmitted"
  | "rating_required"
  | "task_force_closed"
  | "task_closed"
  | "admin_force_close_request"
  | "admin_dispute_escalation"
  | "admin_abuse_flag";

export type NotificationPriority = "critical" | "high" | "medium";

export type NotificationTarget = "requestor" | "acceptor" | "admin";

export interface AppNotification {
  id: string;
  taskId: string;
  taskDisplayId: string; // e.g. RLY-TSK-2026-XXXX
  taskTitle: string;
  type: NotificationType;
  priority: NotificationPriority;
  target: NotificationTarget;
  title: string;
  message: string;
  ctaPath: string; // deep-link to task
  timestamp: string; // ISO
  read: boolean;
  flagged: boolean;
}

// ── Storage keys ────────────────────────────────────────────────────────────

const STORAGE_KEY_REQUESTOR = "reliyo_notifications_requestor";
const STORAGE_KEY_ACCEPTOR = "reliyo_notifications_acceptor";
const STORAGE_KEY_ADMIN = "reliyo_notifications_admin";

function getStorageKey(target: NotificationTarget): string {
  if (target === "admin") return STORAGE_KEY_ADMIN;
  if (target === "acceptor") return STORAGE_KEY_ACCEPTOR;
  return STORAGE_KEY_REQUESTOR;
}

// ── Read / Write ────────────────────────────────────────────────────────────

export function getNotifications(target: NotificationTarget): AppNotification[] {
  const key = getStorageKey(target);
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as AppNotification[];
  } catch {
    return [];
  }
}

function saveNotifications(target: NotificationTarget, notifications: AppNotification[]): void {
  localStorage.setItem(getStorageKey(target), JSON.stringify(notifications));
}

// ── Idempotency key ─────────────────────────────────────────────────────────

function makeIdempotencyKey(taskId: string, type: NotificationType, target: NotificationTarget): string {
  return `${taskId}::${type}::${target}`;
}

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Smart suppression ───────────────────────────────────────────────────────

function isDuplicate(existing: AppNotification[], taskId: string, type: NotificationType): boolean {
  // Alerts and disputes must always generate a new notification every time
  if (type === "alert_raised" || type === "dispute_raised" || type === "admin_dispute_escalation" || type === "force_close_requested" || type === "admin_force_close_request") {
    return false;
  }
  // For rating_required, allow multiple (reminders) but not same-day
  if (type === "rating_required") {
    const today = new Date().toISOString().slice(0, 10);
    return existing.some(n => n.taskId === taskId && n.type === type && n.timestamp.slice(0, 10) === today);
  }
  // For all others, deduplicate by task+type
  return existing.some(n => n.taskId === taskId && n.type === type);
}

function isTaskClosed(taskId: string): boolean {
  try {
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
    const task = tasks.find((t: any) => t.id === taskId);
    return task?.status === "closed" || task?.status === "force_closed";
  } catch {
    return false;
  }
}

// ── Core push function ──────────────────────────────────────────────────────

export function pushNotification(params: {
  taskId: string;
  taskDisplayId: string;
  taskTitle: string;
  type: NotificationType;
  priority: NotificationPriority;
  target: NotificationTarget;
  title: string;
  message: string;
}): void {
  // Suppress if task is already closed (except for the closure notification itself)
  if (params.type !== "task_closed" && params.type !== "task_force_closed" && isTaskClosed(params.taskId)) return;

  const existing = getNotifications(params.target);

  // Idempotency check
  if (isDuplicate(existing, params.taskId, params.type)) return;

  const notification: AppNotification = {
    id: generateId(),
    taskId: params.taskId,
    taskDisplayId: params.taskDisplayId,
    taskTitle: params.taskTitle,
    type: params.type,
    priority: params.priority,
    target: params.target,
    title: params.title,
    message: params.message,
    ctaPath: `/task/${params.taskId}`,
    timestamp: new Date().toISOString(),
    read: false,
    flagged: false,
  };

  // Prepend (newest first)
  saveNotifications(params.target, [notification, ...existing]);
}

// ── Convenience emitters (called from action sites) ─────────────────────────

export function notifyTaskAccepted(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_accepted",
    priority: "high",
    target: "requestor",
    title: "Task Accepted",
    message: `An acceptor has committed to "${task.title}".`,
  });
}

export function notifyAcceptorQuit(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "acceptor_quit",
    priority: "high",
    target: "requestor",
    title: "Acceptor Withdrew",
    message: `Acceptor withdrew from "${task.title}". Your task is open again.`,
  });
}

export function notifyAlertRaised(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "alert_raised",
    priority: "high",
    target: "acceptor",
    title: "Update Requested",
    message: `Requestor is waiting for an update on "${task.title}".`,
  });
}

export function notifyForceCloseRequested(task: { id: string; taskId?: string; title: string; }) {
  // Notify admin
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "admin_force_close_request",
    priority: "high",
    target: "admin",
    title: "Force-Close Requested",
    message: `Force-close requested on "${task.title}". Review required.`,
  });
  // Notify acceptor (FYI)
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "force_close_requested",
    priority: "medium",
    target: "acceptor",
    title: "Force-Close Requested",
    message: `A force-close has been requested on "${task.title}".`,
  });
}

export function notifyTaskMarkedDone(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_marked_done",
    priority: "high",
    target: "requestor",
    title: "Task Marked Done",
    message: `"${task.title}" marked done. Please review.`,
  });
}

export function notifyDisputeRaised(task: { id: string; taskId?: string; title: string; }) {
  // Notify acceptor
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "dispute_raised",
    priority: "critical",
    target: "acceptor",
    title: "Dispute Raised",
    message: `A dispute has been raised on "${task.title}".`,
  });
  // Notify admin
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "admin_dispute_escalation",
    priority: "critical",
    target: "admin",
    title: "Dispute Raised",
    message: `A dispute has been raised on "${task.title}". Monitor required.`,
  });
}

export function notifyFixResubmitted(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "fix_resubmitted",
    priority: "high",
    target: "requestor",
    title: "Updated Work Submitted",
    message: `Updated work submitted for "${task.title}". Please review.`,
  });
}

export function notifyRatingRequired(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "rating_required",
    priority: "high",
    target: "requestor",
    title: "Rating Required",
    message: `Rating required to close "${task.title}".`,
  });
}

export function notifyTaskForceClosed(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_force_closed",
    priority: "high",
    target: "requestor",
    title: "Task Closed by Admin",
    message: `"${task.title}" closed by admin. See details.`,
  });
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_force_closed",
    priority: "high",
    target: "acceptor",
    title: "Task Closed by Admin",
    message: `"${task.title}" closed by admin. See details.`,
  });
}

export function notifyTaskClosed(task: { id: string; taskId?: string; title: string; }) {
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_closed",
    priority: "high",
    target: "requestor",
    title: "Task Closed",
    message: `"${task.title}" has been closed. Escrow funds released.`,
  });
  pushNotification({
    taskId: task.id,
    taskDisplayId: task.taskId || task.id,
    taskTitle: task.title,
    type: "task_closed",
    priority: "high",
    target: "acceptor",
    title: "Task Closed",
    message: `"${task.title}" has been closed. Payment released.`,
  });
}

// ── Mutation helpers (for Notifications page) ───────────────────────────────

export function markNotificationRead(target: NotificationTarget, notifId: string): void {
  const notifs = getNotifications(target);
  const idx = notifs.findIndex(n => n.id === notifId);
  if (idx >= 0) {
    notifs[idx].read = !notifs[idx].read;
    saveNotifications(target, notifs);
  }
}

export function markAllNotificationsRead(target: NotificationTarget): void {
  const notifs = getNotifications(target);
  notifs.forEach(n => { n.read = true; });
  saveNotifications(target, notifs);
}

export function toggleNotificationFlag(target: NotificationTarget, notifId: string): void {
  const notifs = getNotifications(target);
  const idx = notifs.findIndex(n => n.id === notifId);
  if (idx >= 0) {
    notifs[idx].flagged = !notifs[idx].flagged;
    saveNotifications(target, notifs);
  }
}

export function getUnreadCount(target: NotificationTarget): number {
  return getNotifications(target).filter(n => !n.read).length;
}
