import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';

/** Sprint 6: double-entry ledger and settlement. */
@Module({
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
