import {
  listAdminDisputes,
  listAdminUsers,
  getAdminRevenueSummary,
  type AdminDisputeRow,
} from "@/lib/admin/api";
import { listTasks, mapApiTaskToTask } from "@/lib/tasks/api";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/taskTypes";

export interface AdminOverviewStats {
  totalTasks: number;
  activeUsers: number;
  totalRevenue: number;
  activeDisputes: number;
  statusCounts: Record<TaskStatus, number>;
  tasks: Task[];
  disputes: AdminDisputeRow[];
}

export async function fetchAdminOverview(): Promise<AdminOverviewStats> {
  const [tasksRes, users, disputes, revenue] = await Promise.all([
    listTasks({ scope: "admin", page: 1, pageSize: 500 }),
    listAdminUsers(),
    listAdminDisputes(),
    getAdminRevenueSummary(),
  ]);

  const tasks = tasksRes.items.map(mapApiTaskToTask);
  const statusCounts = TASK_STATUSES.reduce(
    (acc, s) => {
      acc[s] = tasks.filter((t) => t.status === s).length;
      return acc;
    },
    {} as Record<TaskStatus, number>,
  );

  const activeDisputes = disputes.filter((d) => {
    if (d.escalated) {
      return d.dsp4Status === "open" || d.dsp4Status === "resolved_valid";
    }
    return d.status === "disputed";
  }).length;

  return {
    totalTasks: tasks.length,
    activeUsers: users.length,
    totalRevenue: revenue.totalRevenue,
    activeDisputes,
    statusCounts,
    tasks,
    disputes,
  };
}

export const emptyAdminOverview: AdminOverviewStats = {
  totalTasks: 0,
  activeUsers: 0,
  totalRevenue: 0,
  activeDisputes: 0,
  statusCounts: TASK_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<TaskStatus, number>,
  ),
  tasks: [],
  disputes: [],
};
