import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { InactivityService } from './inactivity.service';

@Module({
  imports: [LifecycleModule, LedgerModule],
  providers: [InactivityService],
  exports: [InactivityService],
})
export class JobsModule {}
