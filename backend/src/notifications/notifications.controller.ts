import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

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
