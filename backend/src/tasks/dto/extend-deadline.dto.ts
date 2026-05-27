import { IsDateString } from 'class-validator';

export class ExtendDeadlineDto {
  @IsDateString()
  extendedDeadline!: string;
}
