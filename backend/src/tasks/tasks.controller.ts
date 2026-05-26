import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuspensionGuard } from '../auth/guards/suspension.guard';
import { TaskContextGuard } from '../auth/guards/task-context.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AcceptWorkDto } from './dto/accept-work.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, SuspensionGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.create(dto, user);
  }

  @Get()
  list(@Query() query: ListTasksQueryDto, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.list(query, user);
  }

  @Get(':id')
  @UseGuards(TaskContextGuard)
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.getDetail(id, user);
  }

  @Delete(':id')
  @UseGuards(TaskContextGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.cancel(id, user);
  }

  @Post(':id/accept')
  @UseGuards(TaskContextGuard)
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptTaskDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tasks.accept(id, dto, user);
  }

  @Post(':id/quit')
  @UseGuards(TaskContextGuard)
  quit(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.quit(id, user);
  }

  @Post(':id/mark-done')
  @UseGuards(TaskContextGuard)
  markDone(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tasks.markDone(id, user);
  }

  @Post(':id/accept-work')
  @UseGuards(TaskContextGuard)
  acceptWork(
    @Param('id') id: string,
    @Body() dto: AcceptWorkDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tasks.acceptWork(id, dto, user);
  }

  @Post(':id/dispute')
  @UseGuards(TaskContextGuard)
  raiseDispute(
    @Param('id') id: string,
    @Body() body: { message?: string },
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tasks.raiseDispute(id, user, body?.message);
  }

  @Post(':id/comments')
  @UseGuards(TaskContextGuard)
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tasks.addComment(id, dto, user);
  }

  @Post(':id/extend-deadline')
  @UseGuards(TaskContextGuard)
  extendDeadline(
    @Param('id') id: string,
    @Body() dto: ExtendDeadlineDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tasks.extendDeadline(id, dto.extendedDeadline, user);
  }
}
