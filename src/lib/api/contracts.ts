import type { Task, TaskStatus } from "@/lib/taskTypes";

/**
 * Canonical error body per `docs/sprint-0/api-error-contract.md`.
 * Some environments may return the body at the top level; the client accepts both.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

export interface ApiSuccessResponse<T> {
  data: T;
  requestId?: string;
}

export interface TaskListQuery {
  status?: TaskStatus;
  country?: string;
  domain?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskActionSummary {
  canAccept: boolean;
  canDelete: boolean;
  canQuit: boolean;
  canRaiseDispute: boolean;
  canMarkDone: boolean;
  canAcceptWork: boolean;
}

export interface TaskDetailResponse {
  task: Task;
  availableActions: TaskActionSummary;
  cooldowns: {
    quitUntil?: string;
    disputeAfter?: string;
    forceCloseAfter?: string;
  };
}
