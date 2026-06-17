import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { toTaskDto } from '../tasks/tasks.mapper';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { LedgerService } from '../ledger/ledger.service';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

class ResolveCloseRequestDto {
  @IsIn(['approved', 'rejected'])
  resolution!: 'approved' | 'rejected';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOpsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly ledger: LedgerService,
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
      task: toTaskDto(t),
    }));
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
}
