import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuspensionGuard } from '../auth/guards/suspension.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { CreateFundHoldDto } from './dto/create-fund-hold.dto';
import { FundHoldsService } from './fund-holds.service';

@Controller('payments/fund-holds')
@UseGuards(JwtAuthGuard, SuspensionGuard)
export class FundHoldsController {
  constructor(private readonly fundHolds: FundHoldsService) {}

  @Post()
  create(@Body() dto: CreateFundHoldDto, @CurrentUser() user: AuthUserPayload) {
    return this.fundHolds.createHold(dto, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.fundHolds.getHold(id, user);
  }
}
