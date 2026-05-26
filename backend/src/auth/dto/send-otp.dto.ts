import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class SendOtpDto {
  @IsString()
  @Matches(/^\d{6,15}$/)
  phone!: string;

  @IsString()
  @Matches(/^\+?\d{1,4}$/)
  dialCode!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsIn(['requestor', 'acceptor'])
  preferredRole?: 'requestor' | 'acceptor';
}
