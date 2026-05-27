import { IsString, MinLength } from 'class-validator';

export class AcceptTaskDto {
  /** Confirmed trust-deposit fund hold (required before Committed). */
  @IsString()
  @MinLength(10)
  fundHoldId!: string;
}
