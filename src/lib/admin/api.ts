import { apiClient } from "@/lib/api/client";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  platformRole: string;
  suspended: boolean;
  suspendedAt: string | null;
  onboardedOn: string;
  tasksCreated: number;
  tasksAccepted: number;
}

export function listAdminUsers() {
  return apiClient.get<AdminUserRow[]>("/admin/users");
}

export function setUserSuspension(id: string, suspended: boolean, reason?: string) {
  return apiClient.patch<unknown>(`/admin/users/${id}/suspension`, {
    suspended,
    reason,
  });
}

export interface AdminDisputeRow {
  disputeId: string;
  disputeNumber: number;
  taskId: string;
  taskDisplayId: string;
  taskTitle: string;
  requestor: string;
  acceptor: string;
  escalated: boolean;
  raised: string;
  status: string;
  task: Record<string, unknown>;
}

export interface AdminCloseRequestRow {
  id: string;
  taskId: string;
  taskDisplayId: string;
  taskTitle: string;
  requestor: string;
  acceptor: string;
  taskStatusAtRequest: string;
  status: "pending" | "resolved";
  createdAt: string;
  task: Record<string, unknown>;
}

export function listAdminDisputes() {
  return apiClient.get<AdminDisputeRow[]>("/admin/disputes");
}

export function listAdminCloseRequests() {
  return apiClient.get<AdminCloseRequestRow[]>("/admin/close-requests");
}

export function resolveAdminCloseRequest(
  taskId: string,
  resolution: "approved" | "rejected",
  comment: string,
) {
  return apiClient.patch<{ task: Record<string, unknown> }>(
    `/admin/close-requests/${taskId}`,
    { resolution, comment },
  );
}
