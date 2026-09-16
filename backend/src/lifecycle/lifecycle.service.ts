import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Task, TaskEvent, TaskStatus, User } from '@prisma/client';
import { isDsp4ReworkWindowActive } from '../disputes/dsp4-deadline.util';
import {
  disputeCooldownMsForCount,
  FORCE_CLOSE_COOLDOWN_MS,
  MAX_DISPUTES,
  QUIT_GRACE_MS,
  VALID_TRANSITIONS,
  type CooldownMeta,
  type TaskActionSummary,
  type TaskContextRole,
} from './lifecycle.types';

@Injectable()
export class LifecycleService {
  resolveContextRole(
    task: Task,
    userId: string,
    platformRole: User['platformRole'],
  ): TaskContextRole {
    if (platformRole === 'admin') return 'admin';
    if (task.requestorId === userId) return 'requestor';
    if (task.acceptorId === userId) return 'acceptor';
    return 'none';
  }

  assertTransition(from: TaskStatus, to: TaskStatus): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        code: 'TASK_INVALID_TRANSITION',
        message: `Cannot transition from ${from} to ${to}.`,
      });
    }
  }

  computeCooldowns(
    task: Task,
    events: TaskEvent[],
  ): CooldownMeta {
    const meta: CooldownMeta = {};
    if (task.acceptedAt) {
      const quitUntil = new Date(task.acceptedAt.getTime() + QUIT_GRACE_MS);
      if (quitUntil > new Date()) {
        meta.quitUntil = quitUntil.toISOString();
      }
    }

    const lastDispute = [...events]
      .reverse()
      .find(
        (e) =>
          e.entryType === 'alert' &&
          (e.metadata as { alertType?: string } | null)?.alertType ===
            'dispute_raised',
      );
    const lastDone = [...events]
      .reverse()
      .find(
        (e) =>
          e.entryType === 'status_change' &&
          (e.metadata as { toStatus?: TaskStatus } | null)?.toStatus === 'done',
      );

    // Clock starts at the last raise. Acceptor returning work to `done` resets it
    // so the next round can be raised immediately. Persisted via `disputeAfter`
    // on GET /tasks/:id so refresh/re-login keeps the same remaining time.
    if (
      lastDispute &&
      task.disputeCount > 0 &&
      task.disputeCount < MAX_DISPUTES
    ) {
      const resetByDone =
        (lastDone != null && lastDone.createdAt > lastDispute.createdAt) ||
        (task.status === 'done' &&
          task.statusEnteredAt.getTime() > lastDispute.createdAt.getTime());
      if (!resetByDone) {
        const cooldownMs = disputeCooldownMsForCount(task.disputeCount);
        if (cooldownMs > 0) {
          const disputeAfter = new Date(
            lastDispute.createdAt.getTime() + cooldownMs,
          );
          if (disputeAfter > new Date()) {
            meta.disputeAfter = disputeAfter.toISOString();
          }
        }
      }
    }

    const lastForceCloseReq = [...events]
      .reverse()
      .find(
        (e) =>
          e.entryType === 'alert' &&
          (e.metadata as { alertType?: string } | null)?.alertType ===
            'force_close_request',
      );
    if (lastForceCloseReq) {
      const forceCloseAfter = new Date(
        lastForceCloseReq.createdAt.getTime() + FORCE_CLOSE_COOLDOWN_MS,
      );
      if (forceCloseAfter > new Date()) {
        meta.forceCloseAfter = forceCloseAfter.toISOString();
      }
    }

    return meta;
  }

  computeAvailableActions(
    task: Task,
    role: TaskContextRole,
    userId: string,
    cooldowns: CooldownMeta,
  ): TaskActionSummary {
    const status = task.status;
    const isTerminal = status === 'closed' || status === 'force_closed';

    const canComment = this.canComment(status, role);

    const canAccept =
      role !== 'requestor' &&
      role !== 'admin' &&
      status === 'open' &&
      !task.acceptorId &&
      task.requestorId !== userId &&
      task.rewardFundedAt != null;

    if (isTerminal) {
      return {
        canAccept: false,
        canDelete: false,
        canQuit: false,
        canRaiseDispute: false,
        canMarkDone: false,
        canAcceptWork: false,
        canComment: false,
      };
    }

    if (role === 'none') {
      return {
        canAccept,
        canDelete: false,
        canQuit: false,
        canRaiseDispute: false,
        canMarkDone: false,
        canAcceptWork: false,
        canComment: false,
      };
    }

    const canDelete =
      role === 'requestor' &&
      status === 'open' &&
      !task.acceptorId;

    const canQuit =
      role === 'acceptor' &&
      status === 'committed' &&
      !!cooldowns.quitUntil &&
      new Date(cooldowns.quitUntil) > new Date();

    // Acceptor may mark done from disputed on DSP1–3, or DSP4 only within active rework window.
    const canMarkDoneFromDisputed =
      role === 'acceptor' &&
      status === 'disputed' &&
      (task.disputeCount < 4 ||
        isDsp4ReworkWindowActive(
          task.dsp4Status,
          task.dsp4ReworkDeadline,
        ));

    const canMarkDone =
      (role === 'acceptor' && status === 'in_progress') || canMarkDoneFromDisputed;

    // Stays true during cooldown so the UI greys the button instead of hiding it.
    // The wait itself is enforced in TasksService.raiseDispute.
    const canRaiseDispute =
      role === 'requestor' &&
      (status === 'done' || status === 'disputed') &&
      task.disputeCount < MAX_DISPUTES;

    const canAcceptWork = role === 'requestor' && status === 'done';

    if (role === 'admin') {
      return {
        canAccept: false,
        canDelete: false,
        canQuit: false,
        canRaiseDispute: false,
        canMarkDone: false,
        canAcceptWork: false,
        canComment,
      };
    }

    return {
      canAccept,
      canDelete,
      canQuit,
      canRaiseDispute,
      canMarkDone,
      canAcceptWork,
      canComment,
    };
  }

  canComment(status: TaskStatus, role: TaskContextRole): boolean {
    switch (status) {
      case 'open':
        return false;
      case 'committed':
        return role === 'acceptor';
      case 'in_progress':
      case 'done':
        return role === 'requestor' || role === 'acceptor';
      case 'disputed':
        return role === 'requestor' || role === 'acceptor' || role === 'admin';
      default:
        return false;
    }
  }

  assertActionAllowed(
    action: keyof TaskActionSummary,
    available: TaskActionSummary,
  ): void {
    if (!available[action]) {
      throw new ForbiddenException({
        code: 'TASK_ACTION_FORBIDDEN',
        message: `Action ${action} is not allowed in the current task state.`,
      });
    }
  }
}
