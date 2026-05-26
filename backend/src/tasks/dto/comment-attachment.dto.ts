import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CommentAttachmentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(25 * 1024 * 1024)
  size!: number;

  @IsString()
  @MaxLength(128)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  dataUrl?: string;
}
