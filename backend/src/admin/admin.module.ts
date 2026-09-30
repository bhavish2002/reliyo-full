import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputesModule } from '../disputes/disputes.module';
import { JobsModule } from '../jobs/jobs.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminOpsController } from './admin-ops.controller';

@Module({
  imports: [AuthModule, LifecycleModule, LedgerModule, DisputesModule, JobsModule, NotificationsModule],
  controllers: [AdminController, AdminOpsController],
})
export class AdminModule {}
