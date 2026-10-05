import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { Dsp4Status, Task, User } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import * as TaskNotify from '../notifications/task-notifications';
import {
  computeDsp4ReworkDeadline,
} from './dsp4-deadline.util';
import type { Dsp4AdminStatus } from './dto/resolve-dsp4.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  async resolveDsp4(
    taskId: string,
    status: Dsp4AdminStatus,
    comment: string,
    adminUserId: string,
  ): Promise<Task & { requestor: User; acceptor: User | null }> {
    const task = await this.prisma.task.findFirst({
      where: { OR: [{ id: taskId }, { publicId: taskId }], cancelledAt: null },
      include: { requestor: true, acceptor: true },
    });
    if (!task) {
      throw new BadRequestException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found.',
      });
    }
    if (task.disputeCount < 4) {
      throw new BadRequestException({
        code: 'DSP4_NOT_ESCALATED',
        message: 'DSP4 resolution is only available after the 4th dispute.',
      });
    }
    if (task.status !== 'disputed' && status !== 'admin_closed') {
      throw new BadRequestException({
        code: 'DSP4_INVALID_TASK_STATUS',
        message: 'DSP4 admin actions require the task to be in disputed status.',
      });
    }

    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    const adminName = admin?.name ?? 'Admin';

    const resolved = await this.prisma.$transaction(async (tx) => {
      const baseEvent = {
        taskId: task.id,
        authorUserId: adminUserId,
        authorName: adminName,
        authorRole: 'admin' as const,
        entryType: 'admin_action' as const,
        systemGenerated: true,
      };

      switch (status) {
        case 'open': {
          await tx.task.update({
            where: { id: task.id },
            data: {
              dsp4Status: 'open',
              dsp4ResolvedValid: false,
              dsp4ReworkDeadline: null,
            },
          });
          await tx.taskEvent.create({
            data: {
              ...baseEvent,
              message: `DSP4 status set to OPEN. ${comment}`,
              metadata: {
                dsp4Status: 'open',
                fromStatus: task.status,
                toStatus: 'disputed',
              },
            },
          });
          break;
        }
        case 'resolved_valid': {
          const reworkDeadline = computeDsp4ReworkDeadline(
            task.deadline,
            task.extendedDeadline,
          );
          const effectiveDeadline = task.extendedDeadline ?? task.deadline;
          const extendsDeadline =
            reworkDeadline.getTime() > effectiveDeadline.getTime();
          await tx.task.update({
            where: { id: task.id },
            data: {
              status: 'disputed',
              dsp4Status: 'resolved_valid',
              dsp4ResolvedValid: true,
              dsp4ReworkDeadline: reworkDeadline,
              ...(extendsDeadline ? { extendedDeadline: reworkDeadline } : {}),
            },
          });
          await tx.taskEvent.create({
            data: {
              ...baseEvent,
              message: `DSP4 RESOLVED VALID — ${comment}. Acceptor must complete by ${reworkDeadline.toISOString().slice(0, 10)}.`,
              metadata: {
                dsp4Status: 'resolved_valid',
                dsp4ReworkDeadline: reworkDeadline.toISOString(),
                fromStatus: task.status,
                toStatus: 'disputed',
              },
            },
          });
          break;
        }
        case 'resolved_invalid': {
          this.lifecycle.assertTransition(task.status, 'closed');
          const forSettlement = await tx.task.findUniqueOrThrow({
            where: { id: task.id },
            include: { rewardFundHold: true, trustFundHold: true },
          });
          await this.ledger.settleClosed(tx, forSettlement);
          await tx.task.update({
            where: { id: task.id },
            data: {
              status: 'closed',
              statusEnteredAt: new Date(),
              dsp4Status: 'resolved_invalid',
              dsp4ResolvedValid: false,
              dsp4ReworkDeadline: null,
            },
          });
          await tx.taskEvent.create({
            data: {
              ...baseEvent,
              message: `DSP4 RESOLVED INVALID — ${comment}. Task closed with standard settlement.`,
              metadata: {
                dsp4Status: 'resolved_invalid',
                fromStatus: task.status,
                toStatus: 'closed',
              },
            },
          });
          break;
        }
        case 'admin_closed': {
          this.lifecycle.assertTransition(task.status, 'force_closed');
          const forSettlement = await tx.task.findUniqueOrThrow({
            where: { id: task.id },
            include: { rewardFundHold: true, trustFundHold: true },
          });
          await this.ledger.settleForceClosed(tx, forSettlement);
          await tx.task.update({
            where: { id: task.id },
            data: {
              status: 'force_closed',
              statusEnteredAt: new Date(),
              dsp4Status: 'admin_closed',
              dsp4ResolvedValid: false,
              dsp4ReworkDeadline: null,
            },
          });
          await tx.taskEvent.create({
            data: {
              ...baseEvent,
              message: `DSP4 ADMIN CLOSED — ${comment}. Force-close settlement applied.`,
              metadata: {
                dsp4Status: 'admin_closed',
                fromStatus: task.status,
                toStatus: 'force_closed',
              },
            },
          });
          break;
        }
        default:
          throw new BadRequestException({
            code: 'DSP4_INVALID_STATUS',
            message: 'Unknown DSP4 status.',
          });
      }

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { requestor: true, acceptor: true },
      });
    });

    if (resolved.status === 'closed' || resolved.status === 'force_closed') {
      void TaskNotify.notifyTaskClosed(
        this.notifications,
        resolved,
        resolved.status === 'force_closed' ? 'force_closed' : 'closed',
      );
    }
    return resolved;
  }

  mapDsp4Status(task: {
    disputeCount: number;
    dsp4Status: Dsp4Status | null;
  }): Dsp4AdminStatus | null {
    if (task.disputeCount < 4) {
      return null;
    }
    return task.dsp4Status ?? 'open';
  }
}
