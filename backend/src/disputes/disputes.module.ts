import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { DisputesService } from './disputes.service';

@Module({
  imports: [LifecycleModule, LedgerModule, NotificationsModule],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
