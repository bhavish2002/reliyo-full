import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuspensionGuard } from '../auth/guards/suspension.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, SuspensionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Live acceptor rating aggregate (average of requestor ratings on closed tasks). */
  @Get(':id/rating')
  async getUserRating(@Param('id') id: string) {
    return this.users.getRatingStats(id);
  }
}
