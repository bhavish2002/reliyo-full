import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { AuthUserPayload } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PlatformRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUserPayload | undefined;
    if (!user || !required.includes(user.platformRole)) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN',
        message: 'Insufficient permissions.',
      });
    }
    return true;
  }
}
