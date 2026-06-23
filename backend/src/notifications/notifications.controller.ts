import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

class CreateSupportTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  email!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  issue!: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload) {
    return this.notifications.listForUser(user.sub, user.platformRole);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: AuthUserPayload) {
    return this.notifications.markAllRead(user.sub, user.platformRole);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.notifications.markRead(user.sub, id, user.platformRole);
  }

  @Patch(':id/flag')
  toggleFlag(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.notifications.toggleFlag(user.sub, id, user.platformRole);
  }
}

@Controller('support')
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('tickets')
  async create(@Body() dto: CreateSupportTicketDto) {
    const publicId = `RT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        publicId,
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        issue: dto.issue.trim(),
      },
    });
    return {
      id: ticket.publicId,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
