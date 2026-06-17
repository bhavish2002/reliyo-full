import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminController } from './admin.controller';
import { AdminOpsController } from './admin-ops.controller';

@Module({
  imports: [AuthModule, LifecycleModule, LedgerModule],
  controllers: [AdminController, AdminOpsController],
})
export class AdminModule {}
