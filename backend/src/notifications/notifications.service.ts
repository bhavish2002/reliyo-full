import { Injectable } from '@nestjs/common';
import type { NotificationTargetRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId?: string | null;
  targetRole: NotificationTargetRole;
  type: string;
  priority?: 'critical' | 'high' | 'medium';
  taskId?: string;
  taskDisplayId?: string;
  taskTitle?: string;
  title: string;
  message: string;
  ctaPath?: string;
  idempotencyKey: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createIfNew(input: CreateNotificationInput): Promise<void> {
    try {
      await this.prisma.appNotification.create({
        data: {
          userId: input.userId ?? null,
          targetRole: input.targetRole,
          type: input.type,
          priority: input.priority ?? 'medium',
          taskId: input.taskId,
          taskDisplayId: input.taskDisplayId,
          taskTitle: input.taskTitle,
          title: input.title,
          message: input.message,
          ctaPath: input.ctaPath,
          idempotencyKey: input.idempotencyKey,
        },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') return;
      throw err;
    }
  }

  async notifyAdmins(input: Omit<CreateNotificationInput, 'userId' | 'targetRole'>) {
    const admins = await this.prisma.user.findMany({
      where: { platformRole: 'admin' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.createIfNew({
          ...input,
          userId: admin.id,
          targetRole: 'admin',
          idempotencyKey: `${input.idempotencyKey}:admin:${admin.id}`,
        }),
      ),
    );
  }

  async listForUser(userId: string, platformRole: string) {
    const where: Prisma.AppNotificationWhereInput =
      platformRole === 'admin'
        ? {
            OR: [{ userId }, { targetRole: 'admin' }],
          }
        : { userId };

    const rows = await this.prisma.appNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map((n) => this.toDto(n));
  }

  async markRead(userId: string, id: string, platformRole: string) {
    const row = await this.prisma.appNotification.findUnique({ where: { id } });
    if (!row) return null;
    if (platformRole !== 'admin' && row.userId !== userId) return null;
    if (platformRole === 'admin' && row.userId && row.userId !== userId) {
      return null;
    }
    const updated = await this.prisma.appNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toDto(updated);
  }

  async markAllRead(userId: string, platformRole: string) {
    const where: Prisma.AppNotificationWhereInput =
      platformRole === 'admin'
        ? { OR: [{ userId }, { targetRole: 'admin' }], readAt: null }
        : { userId, readAt: null };
    await this.prisma.appNotification.updateMany({
      where,
      data: { readAt: new Date() },
    });
  }

  async toggleFlag(userId: string, id: string, platformRole: string) {
    const row = await this.prisma.appNotification.findUnique({ where: { id } });
    if (!row) return null;
    if (platformRole !== 'admin' && row.userId !== userId) return null;
    const updated = await this.prisma.appNotification.update({
      where: { id },
      data: { flagged: !row.flagged },
    });
    return this.toDto(updated);
  }

  private toDto(n: {
    id: string;
    taskId: string | null;
    taskDisplayId: string | null;
    taskTitle: string | null;
    type: string;
    priority: string;
    title: string;
    message: string;
    ctaPath: string | null;
    createdAt: Date;
    readAt: Date | null;
    flagged: boolean;
  }) {
    return {
      id: n.id,
      taskId: n.taskId ?? '',
      taskDisplayId: n.taskDisplayId ?? '',
      taskTitle: n.taskTitle ?? '',
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      ctaPath: n.ctaPath ?? (n.taskId ? `/task/${n.taskId}` : '/notifications'),
      timestamp: n.createdAt.toISOString(),
      read: n.readAt != null,
      flagged: n.flagged,
    };
  }
}
