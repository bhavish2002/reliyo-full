/**
 * Admin data layer — reads LIVE data from localStorage.
 * No static/placeholder values. All counts and lists are derived from
 * the same stores that user dashboards write to.
 */

import { type Task, type TaskStatus, TASK_STATUSES, STATUS_LABELS, PLATFORM_FEE_PERCENT, TRUST_DEPOSIT_PERCENT } from "@/lib/taskTypes";
import { type AppNotification, getNotifications } from "@/lib/notifications";
import { isEscalated } from "@/lib/disputeId";
import { TEST_CREDENTIALS } from "@/lib/auth";

// ── Read all tasks from both stores ─────────────────────────────────────────

export function getAllPlatformTasks(): Task[] {
  try {
    const created = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const map = new Map<string, Task>();
    // Merge — prefer accepted store for status (more advanced)
    [...created, ...accepted].forEach((t) => {
      const existing = map.get(t.id);
      if (!existing) {
        map.set(t.id, t);
      } else {
    const statusOrder: TaskStatus[] = ["open", "committed", "in_progress", "done", "disputed", "completed", "closed", "force_closed"];
        const existingIdx = statusOrder.indexOf(existing.status);
        const newIdx = statusOrder.indexOf(t.status);
        if (newIdx >= existingIdx) {
          map.set(t.id, { ...existing, ...t });
        }
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

// ── Users (derive from tasks + test credentials) ────────────────────────────

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tasksCreated: number;
  tasksAccepted: number;
  status: "active" | "suspended";
  flagged: boolean;
}

export function getAllPlatformUsers(): PlatformUser[] {
  const tasks = getAllPlatformTasks();
  const userMap = new Map<string, PlatformUser>();

  // Seed from test credentials
  TEST_CREDENTIALS.forEach((c) => {
    if (c.user.role !== "admin") {
      userMap.set(c.user.name, {
        id: c.user.id,
        name: c.user.name,
        email: c.user.email,
        role: c.user.role === "requestor" ? "Requestor" : "Acceptor",
        tasksCreated: 0,
        tasksAccepted: 0,
        status: "active",
        flagged: false,
      });
    }
  });

  // Derive from tasks
  tasks.forEach((t) => {
    if (t.createdBy) {
      const u = userMap.get(t.createdBy) || {
        id: `usr-${t.createdBy.replace(/\s/g, "-").toLowerCase()}`,
        name: t.createdBy,
        email: `${t.createdBy.replace(/\s/g, ".").toLowerCase()}@reliyo.com`,
        role: "Requestor",
        tasksCreated: 0,
        tasksAccepted: 0,
        status: "active" as const,
        flagged: false,
      };
      u.tasksCreated += 1;
      userMap.set(t.createdBy, u);
    }
    if (t.acceptedBy) {
      const u = userMap.get(t.acceptedBy) || {
        id: `usr-${t.acceptedBy.replace(/\s/g, "-").toLowerCase()}`,
        name: t.acceptedBy,
        email: `${t.acceptedBy.replace(/\s/g, ".").toLowerCase()}@reliyo.com`,
        role: "Acceptor",
        tasksCreated: 0,
        tasksAccepted: 0,
        status: "active" as const,
        flagged: false,
      };
      u.tasksAccepted += 1;
      userMap.set(t.acceptedBy, u);
    }
  });

  return Array.from(userMap.values());
}

// ── Disputes (from tasks that have disputes array or disputeCount) ───────────

export type Dsp4Status = "open" | "resolved_valid" | "resolved_invalid" | "admin_closed";

export const DSP4_STATUS_LABELS: Record<Dsp4Status, string> = {
  open: "OPEN",
  resolved_valid: "RESOLVED VALID",
  resolved_invalid: "RESOLVED INVALID",
  admin_closed: "ADMIN CLOSED",
};

export interface AdminDispute {
  disputeId: string;
  disputeNumber: number;
  taskId: string;
  taskDisplayId: string;
  taskTitle: string;
  requestor: string;
  acceptor: string;
  escalated: boolean;
  createdAt: string;
  dsp4Status: Dsp4Status; // only meaningful for escalated
  task: Task; // reference for navigation/review
}

/** Retrieve or initialize the DSP4 resolution status map from localStorage */
function getDsp4StatusMap(): Record<string, Dsp4Status> {
  try {
    return JSON.parse(localStorage.getItem("reliyo_dsp4_status") || "{}");
  } catch {
    return {};
  }
}

export function saveDsp4Status(disputeId: string, status: Dsp4Status): void {
  const map = getDsp4StatusMap();
  map[disputeId] = status;
  localStorage.setItem("reliyo_dsp4_status", JSON.stringify(map));
}

export function getAllDisputes(): AdminDispute[] {
  const tasks = getAllPlatformTasks();
  const dsp4Map = getDsp4StatusMap();
  const disputes: AdminDispute[] = [];

  tasks.forEach((t) => {
    if (t.disputes && t.disputes.length > 0) {
      t.disputes.forEach((d) => {
        disputes.push({
          disputeId: d.id,
          disputeNumber: d.number,
          taskId: t.id,
          taskDisplayId: t.taskId || t.id,
          taskTitle: t.title,
          requestor: t.createdBy || "—",
          acceptor: t.acceptedBy || "—",
          escalated: d.escalated,
          createdAt: d.createdAt,
          dsp4Status: d.escalated ? (dsp4Map[d.id] || "open") : "open",
          task: t,
        });
      });
    } else if (t.status === "disputed" && (t.disputeCount || 0) > 0) {
      // Fallback: task has disputeCount but no disputes array
      const num = t.disputeCount || 1;
      const id = `DSP${num}-${t.id}`;
      disputes.push({
        disputeId: id,
        disputeNumber: num,
        taskId: t.id,
        taskDisplayId: t.taskId || t.id,
        taskTitle: t.title,
        requestor: t.createdBy || "—",
        acceptor: t.acceptedBy || "—",
        escalated: isEscalated(num),
        createdAt: t.createdAt,
        dsp4Status: isEscalated(num) ? (dsp4Map[id] || "open") : "open",
        task: t,
      });
    }
  });

  return disputes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── Revenue computations ────────────────────────────────────────────────────

export interface RevenueStats {
  totalRevenue: number;
  totalEscrowLocked: number;
  totalEscrowReleased: number;
  monthlyRevenue: { month: string; revenue: number; fees: number }[];
  monthlyEscrow: { month: string; locked: number; released: number }[];
}

export function getRevenueStats(): RevenueStats {
  const tasks = getAllPlatformTasks();
  const fee = PLATFORM_FEE_PERCENT / 100;
  const deposit = TRUST_DEPOSIT_PERCENT / 100;

  let totalRevenue = 0;
  let totalEscrowLocked = 0;
  let totalEscrowReleased = 0;

  const monthMap = new Map<string, { revenue: number; fees: number; locked: number; released: number }>();

  tasks.forEach((t) => {
    const reward = t.reward || 0;
    const plFee = parseFloat((reward * fee).toFixed(2));
    const trustDep = parseFloat((reward * deposit).toFixed(2));
    const createdMonth = t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Unknown";

    const bucket = monthMap.get(createdMonth) || { revenue: 0, fees: 0, locked: 0, released: 0 };

    // All tasks with escrow locked (any status past open)
    if (["committed", "in_progress", "done", "disputed", "completed", "closed", "force_closed"].includes(t.status)) {
      bucket.locked += reward + trustDep;
      totalEscrowLocked += reward + trustDep;
    }

    // Closed tasks: revenue realized
    if (t.status === "closed") {
      bucket.revenue += reward;
      bucket.fees += plFee;
      bucket.released += reward + trustDep;
      totalRevenue += plFee;
      totalEscrowReleased += reward + trustDep;
    }

    // Force-closed tasks: 3% penalty from trust deposit
    if (t.status === "force_closed") {
      const penaltyFee = parseFloat((trustDep * 0.03 / 0.10).toFixed(2)); // 3% of reward
      bucket.fees += penaltyFee;
      bucket.released += reward + trustDep;
      totalRevenue += penaltyFee;
      totalEscrowReleased += reward + trustDep;
    }

    monthMap.set(createdMonth, bucket);
  });

  const monthlyRevenue = Array.from(monthMap.entries()).map(([month, d]) => ({
    month, revenue: d.revenue, fees: d.fees,
  }));

  const monthlyEscrow = Array.from(monthMap.entries()).map(([month, d]) => ({
    month, locked: d.locked, released: d.released,
  }));

  return { totalRevenue, totalEscrowLocked, totalEscrowReleased, monthlyRevenue, monthlyEscrow };
}

// ── Stats summary ───────────────────────────────────────────────────────────

export function getAdminStats() {
  const tasks = getAllPlatformTasks();
  const users = getAllPlatformUsers();
  const disputes = getAllDisputes();
  const revenue = getRevenueStats();

  const statusCounts = TASK_STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const activeDisputes = disputes.filter((d) => {
    if (d.escalated) return d.dsp4Status === "open";
    // Non-escalated: task still in disputed state
    return d.task.status === "disputed";
  });

  return {
    totalTasks: tasks.length,
    activeUsers: users.length,
    totalRevenue: revenue.totalRevenue,
    activeDisputes: activeDisputes.length,
    statusCounts,
    tasks,
    users,
    disputes,
    revenue,
  };
}

// ── Persist task status change from admin ───────────────────────────────────

export function adminUpdateTaskStatus(taskId: string, newStatus: TaskStatus): void {
  const stores = ["reliyo_tasks", "reliyo_accepted_tasks"];
  stores.forEach((key) => {
    try {
      const tasks = JSON.parse(localStorage.getItem(key) || "[]") as Task[];
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx >= 0) {
        tasks[idx] = { ...tasks[idx], status: newStatus, statusEnteredAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(tasks));
      }
    } catch { /* skip */ }
  });
}

/** Add a system timeline entry to a task from admin */
export function adminAddTimelineEntry(taskId: string, message: string, entryType: string = "admin_action", metadata?: any): void {
  const key = `reliyo_timeline_${taskId}`;
  try {
    const entries = JSON.parse(localStorage.getItem(key) || "[]");
    entries.push({
      id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId,
      author: "Admin",
      authorRole: "admin",
      message,
      timestamp: new Date().toISOString(),
      systemGenerated: true,
      entryType,
      metadata,
    });
    localStorage.setItem(key, JSON.stringify(entries));
  } catch { /* skip */ }
}

// ── Force Close Requests ────────────────────────────────────────────────────

export interface ForceCloseRequest {
  id: string;
  taskId: string;
  taskDisplayId: string;
  taskTitle: string;
  requestor: string;
  acceptor: string;
  taskStatusAtRequest: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  adminComment?: string;
  task: Task;
}

const FORCE_CLOSE_KEY = "reliyo_force_close_requests";

export function getAllForceCloseRequests(): ForceCloseRequest[] {
  try {
    const requests = JSON.parse(localStorage.getItem(FORCE_CLOSE_KEY) || "[]") as ForceCloseRequest[];
    // Refresh task references with latest data
    const tasks = getAllPlatformTasks();
    return requests.map((r) => {
      const latestTask = tasks.find((t) => t.id === r.taskId);
      return latestTask ? { ...r, task: latestTask } : r;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function saveForceCloseRequest(request: ForceCloseRequest): void {
  const existing = getAllForceCloseRequests();
  existing.unshift(request);
  localStorage.setItem(FORCE_CLOSE_KEY, JSON.stringify(existing));
}

export function resolveForceCloseRequest(requestId: string, resolution: "approved" | "rejected", comment?: string): void {
  try {
    const requests = JSON.parse(localStorage.getItem(FORCE_CLOSE_KEY) || "[]") as ForceCloseRequest[];
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx < 0) return;

    requests[idx].status = resolution;
    requests[idx].resolvedAt = new Date().toISOString();
    requests[idx].adminComment = comment;
    localStorage.setItem(FORCE_CLOSE_KEY, JSON.stringify(requests));

    const req = requests[idx];

    if (resolution === "approved") {
      // Move task to force_closed
      adminUpdateTaskStatus(req.taskId, "force_closed");
      adminAddTimelineEntry(
        req.taskId,
        `🚫 ADMIN: Force-close request APPROVED. Task moved to Force Closed. Escrow: full reward refunded to requestor + trust deposit - 3% PL fee as compensation.`,
        "admin_action",
        { fromStatus: req.taskStatusAtRequest, toStatus: "force_closed" }
      );
      // Notify
      const { notifyTaskForceClosed } = require("@/lib/notifications");
      notifyTaskForceClosed(req.task);
    } else {
      adminAddTimelineEntry(
        req.taskId,
        `ℹ️ ADMIN: Force-close request REJECTED. Task remains in ${req.taskStatusAtRequest}. ${comment || ""}`,
        "admin_action"
      );
    }
  } catch { /* skip */ }
}

export function getPendingForceCloseCount(): number {
  try {
    const requests = JSON.parse(localStorage.getItem(FORCE_CLOSE_KEY) || "[]") as ForceCloseRequest[];
    return requests.filter((r) => r.status === "pending").length;
  } catch {
    return 0;
  }
}
