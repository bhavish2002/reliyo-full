import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Task, TaskEvent, TaskStatus, User } from '@prisma/client';
import {
  DISPUTE_COOLDOWN_MS,
  FORCE_CLOSE_COOLDOWN_MS,
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
    if (lastDispute) {
      // Cooldown resets after a disputed -> done cycle.
      if (lastDone && lastDone.createdAt > lastDispute.createdAt) {
        return meta;
      }
      const disputeAfter = new Date(
        lastDispute.createdAt.getTime() + DISPUTE_COOLDOWN_MS,
      );
      if (disputeAfter > new Date()) {
        meta.disputeAfter = disputeAfter.toISOString();
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

    // Acceptor may mark done from disputed until DSP4 (disputeCount >= 4), or after DSP4 resolved-valid.
    const canMarkDoneFromDisputed =
      role === 'acceptor' &&
      status === 'disputed' &&
      (task.disputeCount < 4 || task.dsp4ResolvedValid);

    const canMarkDone =
      (role === 'acceptor' && status === 'in_progress') || canMarkDoneFromDisputed;

    const canRaiseDispute =
      role === 'requestor' &&
      status === 'done' &&
      task.disputeCount < 4 &&
      !cooldowns.disputeAfter;

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
