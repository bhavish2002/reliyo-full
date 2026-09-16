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
export const MAX_DISPUTES = 4;
/**
 * Hours to wait before the next raise, indexed by disputes already raised.
 * DSP1 is immediate; later rounds shorten: 0→none, 1→48h, 2→24h, 3→12h.
 */
export const DISPUTE_COOLDOWN_HOURS_BY_ROUND = [0, 48, 24, 12] as const;
export const FORCE_CLOSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

export function disputeCooldownMsForCount(disputeCount: number): number {
  const index = Math.min(
    Math.max(disputeCount, 0),
    DISPUTE_COOLDOWN_HOURS_BY_ROUND.length - 1,
  );
  return DISPUTE_COOLDOWN_HOURS_BY_ROUND[index] * HOUR_MS;
}

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
