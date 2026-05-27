import { apiClient } from "@/lib/api/client";
import type { Task, TaskStatus, TimelineEntry } from "@/lib/taskTypes";
import type { TaskActionSummary } from "@/lib/api/contracts";

export interface TaskListResponse {
  items: ApiTask[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiTask {
  id: string;
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  workType: string;
  manpower: number;
  location: string;
  country?: string;
  deadline: string;
  extendedDeadline?: string;
  updateFrequency: string;
  skills: string[];
  domain: string;
  reward: number;
  currency?: string;
  currencySymbol?: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
  acceptedAt?: string;
  acceptedBy?: string;
  acceptedById?: string;
  disputeCount?: number;
  rating?: number;
  ratingFeedback?: string;
  statusEnteredAt?: string;
  dsp4ResolvedValid?: boolean;
}

export interface TaskDetailApi {
  task: ApiTask;
  timeline: TimelineEntry[];
  availableActions: TaskActionSummary & { canComment?: boolean };
  cooldowns: {
    quitUntil?: string;
    disputeAfter?: string;
    forceCloseAfter?: string;
  };
}

export function mapApiTaskToTask(t: ApiTask): Task {
  return {
    id: t.id,
    taskId: t.taskId,
    title: t.title,
    description: t.description,
    status: t.status,
    workType: t.workType,
    manpower: t.manpower,
    location: t.location,
    country: t.country,
    deadline: t.deadline,
    extendedDeadline: t.extendedDeadline,
    updateFrequency: t.updateFrequency,
    skills: t.skills,
    domain: t.domain,
    reward: t.reward,
    currency: t.currency,
    currencySymbol: t.currencySymbol,
    createdAt: t.createdAt,
    createdBy: t.createdBy,
    createdById: t.createdById,
    acceptedAt: t.acceptedAt,
    acceptedBy: t.acceptedBy,
    acceptedById: t.acceptedById,
    disputeCount: t.disputeCount,
    rating: t.rating,
    ratingFeedback: t.ratingFeedback,
    statusEnteredAt: t.statusEnteredAt,
    dsp4ResolvedValid: t.dsp4ResolvedValid,
  };
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  workType: string;
  manpower: number;
  location: string;
  country?: string;
  deadline: string;
  updateFrequency: string;
  skills: string[];
  domain: string;
  reward: number;
  currency?: string;
  currencySymbol?: string;
  fundHoldId: string;
}

export function createTask(payload: CreateTaskPayload) {
  return apiClient.post<ApiTask>("/tasks", payload);
}

export function listTasks(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return apiClient.get<TaskListResponse>(`/tasks${q ? `?${q}` : ""}`);
}

export function getTaskDetail(id: string) {
  return apiClient.get<TaskDetailApi>(`/tasks/${id}`);
}

export function cancelTask(id: string) {
  return apiClient.delete<TaskDetailApi>(`/tasks/${id}`);
}

export function acceptTask(id: string, fundHoldId: string) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/accept`, { fundHoldId });
}

export function quitTask(id: string) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/quit`, {});
}

export function markDoneTask(id: string) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/mark-done`, {});
}

export function acceptWorkTask(id: string, body: { rating: number; feedback?: string }) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/accept-work`, body);
}

export function raiseDisputeTask(id: string, message?: string) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/dispute`, { message });
}

export interface CommentAttachmentPayload {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export function addTaskComment(
  id: string,
  message: string,
  opts?: {
    entryType?: "comment" | "alert";
    alertType?: "progress_reminder" | "force_close_request";
    attachments?: CommentAttachmentPayload[];
  },
) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/comments`, {
    message,
    ...opts,
  });
}

/** Apply a task detail API response to UI state. */
export function parseTaskDetail(detail: TaskDetailApi) {
  return {
    task: mapApiTaskToTask(detail.task),
    timeline: detail.timeline,
    availableActions: detail.availableActions,
    cooldowns: detail.cooldowns,
  };
}

export function extendDeadlineTask(id: string, extendedDeadline: string) {
  return apiClient.post<TaskDetailApi>(`/tasks/${id}/extend-deadline`, { extendedDeadline });
}
