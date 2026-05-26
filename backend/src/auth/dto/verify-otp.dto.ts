import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{6,15}$/)
  phone!: string;

  @IsString()
  @Matches(/^\+?\d{1,4}$/)
  dialCode!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
