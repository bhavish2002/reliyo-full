import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuspensionGuard } from '../auth/guards/suspension.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { CreateFundHoldDto } from './dto/create-fund-hold.dto';
import { ConfirmFundHoldCheckoutDto } from './dto/confirm-fund-hold-checkout.dto';
import { FundHoldsService } from './fund-holds.service';

@Controller('payments/fund-holds')
@UseGuards(JwtAuthGuard, SuspensionGuard)
export class FundHoldsController {
  constructor(private readonly fundHolds: FundHoldsService) {}

  @Post()
  create(@Body() dto: CreateFundHoldDto, @CurrentUser() user: AuthUserPayload) {
    return this.fundHolds.createHold(dto, user);
  }

  @Get('transactions/list')
  listTransactions(@CurrentUser() user: AuthUserPayload) {
    return this.fundHolds.listUserTransactions(user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.fundHolds.getHold(id, user);
  }

  @Post(':id/confirm-checkout')
  confirmCheckout(
    @Param('id') id: string,
    @Body() dto: ConfirmFundHoldCheckoutDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.fundHolds.confirmCheckout(id, dto, user);
  }
}
