import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth.types';

@Injectable()
export class SuspensionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = request.user as AuthUserPayload | undefined;
    if (!payload?.sub) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { suspendedAt: true },
    });
    if (user?.suspendedAt) {
      throw new ForbiddenException({
        code: 'AUTH_SUSPENDED',
        message: 'Account suspended.',
      });
    }
    return true;
  }
}
