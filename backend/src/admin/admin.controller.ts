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
import { toPublicUser } from '../users/users.mapper';
import { nationalDigitsFromE164 } from '../common/phone/phone.util';
import { IsBoolean, IsOptional } from 'class-validator';

const DEFAULT_DIAL = '+91';

class SuspendUserDto {
  @IsBoolean()
  suspended!: boolean;

  @IsOptional()
  reason?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tasksCreated: true, tasksAccepted: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name ?? 'User',
      email: u.email ?? '',
      phone: nationalDigitsFromE164(u.phoneE164, DEFAULT_DIAL),
      platformRole: u.platformRole,
      suspended: u.suspendedAt != null,
      suspendedAt: u.suspendedAt?.toISOString() ?? null,
      onboardedOn: u.createdAt.toISOString(),
      tasksCreated: u._count.tasksCreated,
      tasksAccepted: u._count.tasksAccepted,
    }));
  }

  @Patch(':id/suspension')
  async setSuspension(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ) {
    if (dto.suspended) {
      const activeCount = await this.prisma.task.count({
        where: {
          cancelledAt: null,
          status: { in: ['committed', 'in_progress', 'done', 'disputed'] },
          OR: [{ requestorId: id }, { acceptorId: id }],
        },
      });
      if (activeCount > 0) {
        throw new BadRequestException({
          code: 'USER_HAS_ACTIVE_TASKS',
          message:
            'Cannot suspend user while they have active tasks. Resolve those tasks first.',
        });
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        suspendedAt: dto.suspended ? new Date() : null,
      },
    });
    return toPublicUser(user);
  }
}
