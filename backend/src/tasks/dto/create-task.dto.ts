import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsString()
  workType!: string;

  @IsInt()
  @Min(1)
  manpower!: number;

  @IsString()
  location!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsDateString()
  deadline!: string;

  @IsString()
  updateFrequency!: string;

  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @IsString()
  domain!: string;

  @IsNumber()
  @Min(0.01)
  reward!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  currencySymbol?: string;

  /** Confirmed reward fund hold (Rule Zero — required). */
  @IsString()
  @MinLength(10)
  fundHoldId!: string;
}
