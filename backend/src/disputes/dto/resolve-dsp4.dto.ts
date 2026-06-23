import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const DSP4_ADMIN_STATUSES = [
  'open',
  'resolved_valid',
  'resolved_invalid',
  'admin_closed',
] as const;

export type Dsp4AdminStatus = (typeof DSP4_ADMIN_STATUSES)[number];

export class ResolveDsp4Dto {
  @IsIn(DSP4_ADMIN_STATUSES)
  status!: Dsp4AdminStatus;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}
