import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CommentAttachmentDto } from './comment-attachment.dto';

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  entryType?: 'comment' | 'alert';

  @IsOptional()
  @IsIn(['progress_reminder', 'force_close_request'])
  alertType?: 'progress_reminder' | 'force_close_request';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentAttachmentDto)
  attachments?: CommentAttachmentDto[];
}
