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
  dsp4Status?: "open" | "resolved_valid" | "resolved_invalid" | "admin_closed" | null;
  dsp4ReworkDeadline?: string | null;
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

export function resolveAdminDsp4(
  taskId: string,
  status: "open" | "resolved_valid" | "resolved_invalid" | "admin_closed",
  comment: string,
) {
  return apiClient.patch<{ task: Record<string, unknown> }>(
    `/admin/disputes/${taskId}/dsp4`,
    { status, comment },
  );
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

export interface AdminCancelledTaskRow {
  taskId: string;
  taskDisplayId: string;
  title: string;
  requestor: string;
  acceptor: string;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  status: string;
  task: Record<string, unknown>;
}

export function listAdminCancelledTasks() {
  return apiClient.get<AdminCancelledTaskRow[]>("/admin/cancelled-tasks");
}

export interface AdminRevenueSummary {
  totalRevenue: number;
  platformFeeEarnings: number;
  commissionFeeEarnings: number;
  totalEscrowLocked: number;
  totalEscrowReleased: number;
  monthlyRevenue: Array<{ month: string; revenue: number; fees: number }>;
  monthlyEscrow: Array<{ month: string; locked: number; released: number }>;
}

export function getAdminRevenueSummary() {
  return apiClient.get<AdminRevenueSummary>("/admin/revenue/summary");
}

export interface AdminSupportTicketRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  issue: string;
  status: string;
  createdAt: string;
}

export function listAdminSupportTickets() {
  return apiClient.get<AdminSupportTicketRow[]>("/admin/support/tickets");
}

export function updateAdminSupportTicket(id: string, status: string) {
  return apiClient.patch<AdminSupportTicketRow>(`/admin/support/tickets/${id}`, { status });
}
