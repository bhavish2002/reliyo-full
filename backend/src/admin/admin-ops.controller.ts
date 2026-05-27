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

    const byTask = new Map<string, (typeof forceCloseEvents)[0]>();
    for (const ev of forceCloseEvents) {
      if (!byTask.has(ev.taskId)) {
        byTask.set(ev.taskId, ev);
      }
    }

    return Array.from(byTask.values()).map((ev) => {
      const t = ev.task;
      const pending =
        t.status !== 'force_closed' &&
        ['committed', 'in_progress', 'done', 'disputed'].includes(t.status);
      return {
        id: ev.id,
        taskId: t.id,
        taskDisplayId: t.publicId,
        taskTitle: t.title,
        requestor: t.requestor.name ?? '—',
        acceptor: t.acceptor?.name ?? '—',
        taskStatusAtRequest: t.status,
        status: pending ? 'pending' : 'resolved',
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
