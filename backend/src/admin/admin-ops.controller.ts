import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { toTaskDto } from '../tasks/tasks.mapper';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { LedgerService } from '../ledger/ledger.service';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { DisputesService } from '../disputes/disputes.service';
import { ResolveDsp4Dto } from '../disputes/dto/resolve-dsp4.dto';
import { InactivityService } from '../jobs/inactivity.service';
import { ScheduledJobsService } from '../jobs/scheduled-jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PLATFORM_POLICY } from '../common/platform/platform-policy.constants';
import * as TaskNotify from '../notifications/task-notifications';

class ResolveCloseRequestDto {
  @IsIn(['approved', 'rejected'])
  resolution!: 'approved' | 'rejected';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

class ResolveSupportTicketDto {
  @IsIn(['done', 'reviewed'])
  status!: 'done' | 'reviewed';
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOpsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly ledger: LedgerService,
    private readonly disputes: DisputesService,
    private readonly inactivity: InactivityService,
    private readonly scheduledJobs: ScheduledJobsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('disputes')
  async listDisputes() {
    const tasks = await this.prisma.task.findMany({
      where: {
        cancelledAt: null,
        disputeCount: { gt: 0 },
      },
      include: { requestor: true, acceptor: true },
      orderBy: { updatedAt: 'desc' },
    });

    return tasks.map((t) => ({
      disputeId: `DSP${t.disputeCount}-${t.publicId}`,
      disputeNumber: t.disputeCount,
      taskId: t.id,
      taskDisplayId: t.publicId,
      taskTitle: t.title,
      requestor: t.requestor.name ?? 'Requestor',
      acceptor: t.acceptor?.name ?? '—',
      escalated: t.disputeCount >= 4,
      raised: t.statusEnteredAt.toISOString(),
      status: t.status,
      dsp4Status: this.disputes.mapDsp4Status(t),
      dsp4ReworkDeadline: t.dsp4ReworkDeadline?.toISOString() ?? null,
      task: toTaskDto(t),
    }));
  }

  @Patch('disputes/:taskId/dsp4')
  async resolveDsp4(
    @Param('taskId') taskId: string,
    @Body() dto: ResolveDsp4Dto,
    @CurrentUser() admin: AuthUserPayload,
  ) {
    const task = await this.disputes.resolveDsp4(
      taskId,
      dto.status,
      dto.comment,
      admin.sub,
    );
    return { task: toTaskDto(task) };
  }

  @Get('close-requests')
  async listCloseRequests() {
    const events = await this.prisma.taskEvent.findMany({
      where: { entryType: 'alert' },
      include: {
        task: { include: { requestor: true, acceptor: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const forceCloseEvents = events.filter((e) => {
      const meta = e.metadata as { alertType?: string } | null;
      return meta?.alertType === 'force_close_request';
    });

    const latestByTask = new Map<string, (typeof forceCloseEvents)[0]>();
    for (const ev of forceCloseEvents) {
      const existing = latestByTask.get(ev.taskId);
      if (!existing || ev.createdAt > existing.createdAt) {
        latestByTask.set(ev.taskId, ev);
      }
    }

    const taskIds = Array.from(latestByTask.keys());
    const adminEvents =
      taskIds.length > 0
        ? await this.prisma.taskEvent.findMany({
            where: {
              taskId: { in: taskIds },
              entryType: 'admin_action',
            },
            orderBy: { createdAt: 'desc' },
          })
        : [];

    return Array.from(latestByTask.values()).map((ev) => {
      const t = ev.task;
      let status: 'pending' | 'approved' | 'rejected' = 'pending';

      if (t.status === 'force_closed') {
        status = 'approved';
      } else {
        const resolutionEvent = adminEvents.find((a) => {
          if (a.taskId !== ev.taskId || a.createdAt < ev.createdAt) {
            return false;
          }
          const meta = a.metadata as {
            forceCloseResolution?: string;
            toStatus?: string;
          } | null;
          if (meta?.forceCloseResolution === 'rejected') return true;
          if (meta?.forceCloseResolution === 'approved') return true;
          if (meta?.toStatus === 'force_closed') return true;
          return (
            a.message.includes('REJECTED') || a.message.includes('APPROVED')
          );
        });

        if (resolutionEvent) {
          const meta = resolutionEvent.metadata as {
            forceCloseResolution?: string;
            toStatus?: string;
          } | null;
          if (
            meta?.forceCloseResolution === 'rejected' ||
            resolutionEvent.message.includes('REJECTED')
          ) {
            status = 'rejected';
          } else {
            status = 'approved';
          }
        }
      }

      return {
        id: ev.id,
        taskId: t.id,
        taskDisplayId: t.publicId,
        taskTitle: t.title,
        requestor: t.requestor.name ?? '—',
        acceptor: t.acceptor?.name ?? '—',
        taskStatusAtRequest: t.status,
        status,
        createdAt: ev.createdAt.toISOString(),
        task: toTaskDto(t),
      };
    });
  }

  @Patch('close-requests/:taskId')
  async resolveCloseRequest(
    @Param('taskId') taskId: string,
    @Body() dto: ResolveCloseRequestDto,
  ) {
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

    if (dto.resolution === 'approved') {
      this.lifecycle.assertTransition(task.status, 'force_closed');
      await this.prisma.$transaction(async (tx) => {
        const forSettlement = await tx.task.findUniqueOrThrow({
          where: { id: task.id },
          include: { rewardFundHold: true, trustFundHold: true },
        });
        await this.ledger.settleForceClosed(tx, forSettlement);

        await tx.task.update({
          where: { id: task.id },
          data: { status: 'force_closed', statusEnteredAt: new Date() },
        });
        await tx.taskEvent.create({
          data: {
            taskId: task.id,
            authorUserId: null,
            authorName: 'Admin',
            authorRole: 'admin',
            message: `Force-close request APPROVED. ${dto.comment}`,
            entryType: 'admin_action',
            systemGenerated: true,
            metadata: {
              fromStatus: task.status,
              toStatus: 'force_closed',
              forceCloseResolution: 'approved',
            },
          },
        });
      });
      void TaskNotify.notifyTaskClosed(this.notifications, task, 'force_closed');
    } else {
      await this.prisma.taskEvent.create({
        data: {
          taskId: task.id,
          authorUserId: null,
          authorName: 'Admin',
          authorRole: 'admin',
          message: `Force-close request REJECTED. ${dto.comment}`,
          entryType: 'admin_action',
          systemGenerated: true,
          metadata: {
            forceCloseResolution: 'rejected',
          },
        },
      });
    }

    const refreshed = await this.prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { requestor: true, acceptor: true },
    });
    return { task: toTaskDto(refreshed) };
  }

  @Get('cancelled-tasks')
  async listCancelledTasks() {
    const tasks = await this.prisma.task.findMany({
      where: { cancelledAt: { not: null } },
      include: { requestor: true, acceptor: true },
      orderBy: { cancelledAt: 'desc' },
    });

    return tasks.map((t) => ({
      taskId: t.id,
      taskDisplayId: t.publicId,
      title: t.title,
      requestor: t.requestor.name ?? '—',
      acceptor: t.acceptor?.name ?? '—',
      cancelledAt: t.cancelledAt?.toISOString() ?? null,
      cancelledById: t.cancelledById,
      cancelReason: t.cancelReason,
      status: t.status,
      task: toTaskDto(t),
    }));
  }

  @Get('revenue/summary')
  async revenueSummary() {
    return this.ledger.getAdminRevenueSummary();
  }

  @Get('support/tickets')
  async listSupportTickets() {
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => ({
      id: t.publicId,
      name: t.name,
      email: t.email,
      phone: t.phone,
      subject: t.subject ?? t.issue.slice(0, 80),
      issue: t.issue,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  @Patch('support/tickets/:id')
  async updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: ResolveSupportTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });
    if (!ticket) {
      throw new BadRequestException({
        code: 'TICKET_NOT_FOUND',
        message: 'Support ticket not found.',
      });
    }
    const nextStatus = dto.status;
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: nextStatus },
    });
    return {
      id: updated.publicId,
      status: updated.status,
      subject: updated.subject ?? updated.issue.slice(0, 80),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  @Get('jobs/status')
  getJobsStatus() {
    return this.scheduledJobs.getStatus();
  }

  @Get('settings')
  getPlatformSettings() {
    return PLATFORM_POLICY;
  }

  @Post('jobs/inactivity/process-due')
  async processInactivity() {
    return this.inactivity.processDue();
  }
}
