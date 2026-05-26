import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FundHoldPurpose } from '@prisma/client';

export class CreateFundHoldDto {
  @IsEnum(FundHoldPurpose)
  purpose!: FundHoldPurpose;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsIn(['upi', 'card', 'netbanking'])
  paymentMethod!: string;

  /** Required when purpose is trust_deposit (open task being accepted). */
  @IsOptional()
  @IsString()
  taskId?: string;
}
