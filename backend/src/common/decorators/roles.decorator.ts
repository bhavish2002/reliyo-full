import { SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: (PlatformRole | 'admin' | 'user')[]) =>
  SetMetadata(ROLES_KEY, roles as PlatformRole[]);
