import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { InactivityService } from './inactivity.service';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [LifecycleModule, LedgerModule, PaymentsModule, NotificationsModule],
  providers: [InactivityService, ScheduledJobsService],
  exports: [InactivityService, ScheduledJobsService],
})
export class JobsModule {}
