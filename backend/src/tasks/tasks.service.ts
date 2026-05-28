import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Task, TaskStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { generateTaskPublicId } from './task-id.util';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { ListTasksQueryDto } from './dto/list-tasks.dto';
import type { AddCommentDto } from './dto/add-comment.dto';
import type { AcceptWorkDto } from './dto/accept-work.dto';
import type { AcceptTaskDto } from './dto/accept-task.dto';
import {
  toTaskDto,
  toTimelineEntryDto,
  type TaskDetailDto,
  type TaskDto,
} from './tasks.mapper';
import type { AuthUserPayload } from '../auth/auth.types';
import { FundHoldsService } from '../payments/fund-holds.service';

type TaskWithUsers = Task & { requestor: User; acceptor: User | null };

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly fundHolds: FundHoldsService,
  ) {}

  private async loadTaskOrThrow(id: string): Promise<TaskWithUsers> {
    const task = await this.prisma.task.findFirst({
      where: { OR: [{ id }, { publicId: id }], cancelledAt: null },
      include: { requestor: true, acceptor: true },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found.',
      });
    }
    return task;
  }

  private async appendEvent(
    tx: Prisma.TransactionClient,
    params: {
      taskId: string;
      authorUserId: string | null;
      authorName: string;
      authorRole: string;
      message: string;
      entryType: string;
      systemGenerated: boolean;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return tx.taskEvent.create({ data: params });
  }

  private async transition(
    tx: Prisma.TransactionClient,
    task: TaskWithUsers,
    to: TaskStatus,
    event: {
      message: string;
      authorUserId: string | null;
      authorName: string;
      authorRole: string;
      entryType?: string;
      metadata?: Prisma.InputJsonValue;
    },
    extra?: Partial<Task>,
  ): Promise<TaskWithUsers> {
    this.lifecycle.assertTransition(task.status, to);
    const now = new Date();
    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        status: to,
        statusEnteredAt: now,
        ...extra,
      },
      include: { requestor: true, acceptor: true },
    });
    await this.appendEvent(tx, {
      taskId: task.id,
      authorUserId: event.authorUserId,
      authorName: event.authorName,
      authorRole: event.authorRole,
      message: event.message,
      entryType: event.entryType ?? 'status_change',
      systemGenerated: true,
      metadata: {
        fromStatus: task.status,
        toStatus: to,
        ...(event.metadata as object),
      },
    });
    return updated;
  }

  async create(dto: CreateTaskDto, actor: AuthUserPayload): Promise<TaskDto> {
    const currency = dto.currency ?? 'INR';
    const task = await this.prisma.$transaction(async (tx) => {
      const { confirmedAt, holdId } =
        await this.fundHolds.assertRewardHoldForTaskCreate(
          tx,
          dto.fundHoldId,
          actor,
          dto.reward,
          currency,
        );

      const created = await tx.task.create({
        data: {
          publicId: generateTaskPublicId(),
          title: dto.title.trim(),
          description: dto.description.trim(),
          workType: dto.workType,
          manpower: dto.manpower,
          location: dto.location,
          country: dto.country,
          deadline: new Date(dto.deadline),
          updateFrequency: dto.updateFrequency,
          skills: dto.skills,
          domain: dto.domain,
          reward: dto.reward,
          currency,
          currencySymbol: dto.currencySymbol,
          requestorId: actor.sub,
          status: 'open',
          rewardFundedAt: confirmedAt,
          rewardFundHoldId: holdId,
          statusEnteredAt: confirmedAt,
        },
        include: { requestor: true, acceptor: true },
      });

      await this.appendEvent(tx, {
        taskId: created.id,
        authorUserId: null,
        authorName: 'System',
        authorRole: 'system',
        message:
          'Task created and reward locked as platform-held funds.',
        entryType: 'funds',
        systemGenerated: true,
      });
      await this.appendEvent(tx, {
        taskId: created.id,
        authorUserId: null,
        authorName: 'System',
        authorRole: 'system',
        message: 'Task published and visible to acceptors.',
        entryType: 'status_change',
        systemGenerated: true,
        metadata: { toStatus: 'open' },
      });

      return created;
    });

    return toTaskDto(task);
  }

  async list(
    query: ListTasksQueryDto,
    actor: AuthUserPayload,
  ): Promise<{ items: TaskDto[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.TaskWhereInput = { cancelledAt: null };

    if (query.scope === 'admin') {
      if (actor.platformRole !== 'admin') {
        throw new ForbiddenException({
          code: 'AUTH_FORBIDDEN',
          message: 'Admin access required.',
        });
      }
      if (query.status) {
        where.status = query.status;
      }
    } else if (query.scope === 'mine') {
      where.OR = [
        { requestorId: actor.sub },
        { acceptorId: actor.sub },
      ];
    } else {
      where.status = query.status ?? 'open';
      where.requestorId = { not: actor.sub };
      where.rewardFundedAt = { not: null };
    }

    if (query.country) where.country = query.country;
    if (query.domain) where.domain = query.domain;
    if (query.search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        include: { requestor: true, acceptor: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((t) => toTaskDto(t)),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(id: string, actor: AuthUserPayload): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    if (role === 'none' && task.status !== 'open') {
      throw new ForbiddenException({
        code: 'TASK_CONTEXT_FORBIDDEN',
        message: 'You are not a participant on this task.',
      });
    }
    const cooldowns = this.lifecycle.computeCooldowns(task, events);
    const availableActions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      cooldowns,
    );

    return {
      task: toTaskDto(task),
      timeline: events.map(toTimelineEntryDto),
      availableActions,
      cooldowns,
    };
  }

  async cancel(id: string, actor: AuthUserPayload): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canDelete', actions);

    if (role !== 'requestor') {
      throw new ForbiddenException({
        code: 'TASK_ACTION_FORBIDDEN',
        message: 'Only the requestor can cancel this task.',
      });
    }

    const cancelledTask = await this.prisma.$transaction(async (tx) => {
      await this.transition(
        tx,
        task,
        'closed',
        {
          message: 'Task cancelled by requestor. Platform-held reward will be refunded.',
          authorUserId: actor.sub,
          authorName: task.requestor.name ?? 'Requestor',
          authorRole: 'requestor',
          entryType: 'status_change',
        },
      );
      await tx.task.update({
        where: { id: task.id },
        data: { cancelledAt: new Date() },
      });

      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { requestor: true, acceptor: true },
      });
    });

    const refreshedEvents = await this.prisma.taskEvent.findMany({
      where: { taskId: cancelledTask.id },
      orderBy: { createdAt: 'asc' },
    });
    const refreshedRole = this.lifecycle.resolveContextRole(
      cancelledTask,
      actor.sub,
      actor.platformRole,
    );
    const refreshedCooldowns = this.lifecycle.computeCooldowns(
      cancelledTask,
      refreshedEvents,
    );
    const refreshedActions = this.lifecycle.computeAvailableActions(
      cancelledTask,
      refreshedRole,
      actor.sub,
      refreshedCooldowns,
    );

    return {
      task: toTaskDto(cancelledTask),
      timeline: refreshedEvents.map(toTimelineEntryDto),
      availableActions: refreshedActions,
      cooldowns: refreshedCooldowns,
    };
  }

  async accept(
    id: string,
    dto: AcceptTaskDto,
    actor: AuthUserPayload,
  ): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canAccept', actions);

    const acceptor = await this.prisma.user.findUnique({
      where: { id: actor.sub },
    });
    if (!acceptor) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    await this.prisma.$transaction(async (tx) => {
      const { confirmedAt, holdId } =
        await this.fundHolds.assertTrustHoldForAccept(
          tx,
          dto.fundHoldId,
          task.id,
          actor,
          Number(task.reward),
          task.currency,
        );

      const acceptedAt = confirmedAt;
      await tx.task.update({
        where: { id: task.id },
        data: {
          acceptorId: actor.sub,
          acceptedAt,
          trustDepositFundedAt: confirmedAt,
          trustFundHoldId: holdId,
        },
      });
      const refreshed = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { requestor: true, acceptor: true },
      });
      await this.transition(tx, refreshed, 'committed', {
        message: `${acceptor.name ?? 'Acceptor'} has accepted the task. Trust deposit locked. Status: Committed.`,
        authorUserId: null,
        authorName: 'System',
        authorRole: 'system',
      });
    });

    return this.getDetail(id, actor);
  }

  async quit(id: string, actor: AuthUserPayload): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canQuit', actions);

    await this.prisma.$transaction(async (tx) => {
      await this.transition(tx, task, 'open', {
        message: 'Acceptor quit the task within the grace window. Trust deposit refunded.',
        authorUserId: actor.sub,
        authorName: task.acceptor?.name ?? 'Acceptor',
        authorRole: 'acceptor',
      });
      await tx.task.update({
        where: { id: task.id },
        data: {
          acceptorId: null,
          acceptedAt: null,
          trustDepositFundedAt: null,
        },
      });
    });

    return this.getDetail(id, actor);
  }

  async markDone(id: string, actor: AuthUserPayload): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canMarkDone', actions);

    await this.prisma.$transaction(async (tx) => {
      await this.transition(tx, task, 'done', {
        message: `${task.acceptor?.name ?? 'Acceptor'} has marked this task as Done. Awaiting requestor review.`,
        authorUserId: actor.sub,
        authorName: task.acceptor?.name ?? 'Acceptor',
        authorRole: 'acceptor',
      });
    });

    return this.getDetail(id, actor);
  }

  async acceptWork(
    id: string,
    dto: AcceptWorkDto,
    actor: AuthUserPayload,
  ): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canAcceptWork', actions);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          rating: dto.rating,
          ratingFeedback: dto.feedback,
        },
      });
      await this.appendEvent(tx, {
        taskId: task.id,
        authorUserId: actor.sub,
        authorName: task.requestor.name ?? 'Requestor',
        authorRole: 'requestor',
        message: `Requestor accepted the work with rating ${dto.rating}/5.`,
        entryType: 'rating',
        systemGenerated: false,
        metadata: { rating: dto.rating },
      });
      const refreshed = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { requestor: true, acceptor: true },
      });
      await this.transition(tx, refreshed, 'closed', {
        message: 'Task closed. Platform-held funds released per settlement policy.',
        authorUserId: null,
        authorName: 'System',
        authorRole: 'system',
        entryType: 'funds',
      });
    });

    return this.getDetail(id, actor);
  }

  async raiseDispute(
    id: string,
    actor: AuthUserPayload,
    message?: string,
  ): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const actions = this.lifecycle.computeAvailableActions(
      task,
      role,
      actor.sub,
      this.lifecycle.computeCooldowns(task, events),
    );
    this.lifecycle.assertActionAllowed('canRaiseDispute', actions);

    await this.prisma.$transaction(async (tx) => {
      const disputeCount = task.disputeCount + 1;
      await tx.task.update({
        where: { id: task.id },
        data: { disputeCount },
      });
      await this.appendEvent(tx, {
        taskId: task.id,
        authorUserId: actor.sub,
        authorName: task.requestor.name ?? 'Requestor',
        authorRole: 'requestor',
        message: message ?? 'Requestor raised a dispute.',
        entryType: 'alert',
        systemGenerated: false,
        metadata: { alertType: 'dispute_raised', disputeCount },
      });
      const refreshed = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { requestor: true, acceptor: true },
      });
      if (refreshed.status === 'done') {
        await this.transition(tx, refreshed, 'disputed', {
          message: 'Task moved to Disputed.',
          authorUserId: null,
          authorName: 'System',
          authorRole: 'system',
        });
      }
    });

    return this.getDetail(id, actor);
  }

  async addComment(
    id: string,
    dto: AddCommentDto,
    actor: AuthUserPayload,
  ): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
    });
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    const isRequestorAlert =
      dto.entryType === 'alert' &&
      role === 'requestor' &&
      (task.status === 'committed' || task.status === 'in_progress');

    if (!isRequestorAlert && !this.lifecycle.canComment(task.status, role)) {
      throw new ForbiddenException({
        code: 'TASK_COMMENT_FORBIDDEN',
        message: 'Comments are not allowed in the current state.',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: actor.sub } });

    const entryType = dto.entryType ?? 'comment';
    const metadataPayload = {
      ...(entryType === 'alert' && dto.alertType
        ? { alertType: dto.alertType }
        : {}),
      ...(dto.attachments?.length ? { attachments: dto.attachments } : {}),
    };
    const eventMetadata: Prisma.InputJsonValue | undefined =
      Object.keys(metadataPayload).length > 0
        ? (metadataPayload as unknown as Prisma.InputJsonValue)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      await this.appendEvent(tx, {
        taskId: task.id,
        authorUserId: actor.sub,
        authorName: user?.name ?? 'User',
        authorRole: role,
        message: dto.message.trim(),
        entryType,
        systemGenerated: entryType === 'alert',
        metadata: eventMetadata,
      });

      if (task.status === 'committed' && role === 'acceptor' && entryType === 'comment') {
        const refreshed = await tx.task.findUniqueOrThrow({
          where: { id: task.id },
          include: { requestor: true, acceptor: true },
        });
        await this.transition(tx, refreshed, 'in_progress', {
          message: `Task moved to In Progress. ${user?.name ?? 'Acceptor'} has started working.`,
          authorUserId: null,
          authorName: 'System',
          authorRole: 'system',
        });
      }
    });

    return this.getDetail(id, actor);
  }

  async extendDeadline(
    id: string,
    extendedDeadline: string,
    actor: AuthUserPayload,
  ): Promise<TaskDetailDto> {
    const task = await this.loadTaskOrThrow(id);
    const role = this.lifecycle.resolveContextRole(
      task,
      actor.sub,
      actor.platformRole,
    );
    if (role !== 'requestor') {
      throw new ForbiddenException({
        code: 'TASK_ACTION_FORBIDDEN',
        message: 'Only the requestor can extend the deadline.',
      });
    }

    const ext = new Date(extendedDeadline);
    if (ext <= task.deadline) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Extended deadline must be after the original deadline.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: { extendedDeadline: ext },
      });
      await this.appendEvent(tx, {
        taskId: task.id,
        authorUserId: actor.sub,
        authorName: task.requestor.name ?? 'Requestor',
        authorRole: 'requestor',
        message: `Deadline extended to ${ext.toISOString()}.`,
        entryType: 'alert',
        systemGenerated: false,
        metadata: { extendedDeadline: ext.toISOString() },
      });
    });

    return this.getDetail(id, actor);
  }
}
