import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FundHoldsController } from './fund-holds.controller';
import { FundHoldsService } from './fund-holds.service';

@Module({
  imports: [AuthModule],
  controllers: [FundHoldsController],
  providers: [FundHoldsService],
  exports: [FundHoldsService],
})
export class PaymentsModule {}
