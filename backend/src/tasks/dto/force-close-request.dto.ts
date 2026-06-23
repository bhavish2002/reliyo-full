import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForceCloseRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message?: string;
}
