import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputesModule } from '../disputes/disputes.module';
import { JobsModule } from '../jobs/jobs.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminController } from './admin.controller';
import { AdminOpsController } from './admin-ops.controller';

@Module({
  imports: [AuthModule, LifecycleModule, LedgerModule, DisputesModule, JobsModule],
  controllers: [AdminController, AdminOpsController],
})
export class AdminModule {}
