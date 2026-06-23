import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { DisputesService } from './disputes.service';

@Module({
  imports: [LifecycleModule, LedgerModule],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
