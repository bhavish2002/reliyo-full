import type { TaskStatus } from '@prisma/client';

export type TaskContextRole = 'requestor' | 'acceptor' | 'admin' | 'none';

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['committed', 'closed'],
  committed: ['in_progress', 'open', 'force_closed'],
  in_progress: ['done', 'force_closed'],
  done: ['closed', 'disputed'],
  disputed: ['done', 'closed', 'force_closed'],
  closed: [],
  force_closed: [],
};

export const QUIT_GRACE_MS = 2 * 60 * 60 * 1000;
export const DISPUTE_COOLDOWN_MS = 48 * 60 * 60 * 1000;
export const FORCE_CLOSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface TaskActionSummary {
  canAccept: boolean;
  canDelete: boolean;
  canQuit: boolean;
  canRaiseDispute: boolean;
  canMarkDone: boolean;
  canAcceptWork: boolean;
  canComment: boolean;
}

export interface CooldownMeta {
  quitUntil?: string;
  disputeAfter?: string;
  forceCloseAfter?: string;
}
