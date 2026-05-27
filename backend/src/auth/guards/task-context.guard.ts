import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUserPayload } from '../auth.types';
import { LifecycleService } from '../../lifecycle/lifecycle.service';

/**
 * Ensures the user is requestor, acceptor, or admin for the task in :id param.
 */
@Injectable()
export class TaskContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUserPayload | undefined;
    const taskId = request.params['id'] as string | undefined;

    if (!user?.sub || !taskId) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN',
        message: 'Authentication required.',
      });
    }

    const task = await this.prisma.task.findFirst({
      where: {
        OR: [{ id: taskId }, { publicId: taskId }],
        cancelledAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found.',
      });
    }

    const role = this.lifecycle.resolveContextRole(
      task,
      user.sub,
      user.platformRole,
    );

    const method = request.method.toUpperCase();
    const path = (request.path || request.url || '').split('?')[0];
    const isAcceptRoute =
      method === 'POST' &&
      /\/accept$/.test(path) &&
      !/\/accept-work$/.test(path);

    const canBrowseOpenTask = method === 'GET' && task.status === 'open';
    const canAcceptOpenTask =
      isAcceptRoute &&
      task.status === 'open' &&
      !task.acceptorId &&
      task.requestorId !== user.sub;

    if (role === 'none' && !canBrowseOpenTask && !canAcceptOpenTask) {
      throw new ForbiddenException({
        code: 'TASK_CONTEXT_FORBIDDEN',
        message: 'You are not a participant on this task.',
      });
    }

    return true;
  }
}
