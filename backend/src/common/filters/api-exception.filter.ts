import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.requestId ?? randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body =
        typeof res === 'string'
          ? { message: res }
          : (res as {
              message?: string | string[];
              code?: string;
              details?: Record<string, unknown>;
            });

      const message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? exception.message);

      const code =
        typeof body.code === 'string'
          ? body.code
          : status === HttpStatus.NOT_FOUND
            ? 'NOT_FOUND'
            : `HTTP_${status}`;

      const payload: ApiErrorBody = {
        code,
        message,
        requestId,
        details: body.details,
      };

      response.status(status).json({ error: payload });
      return;
    }

    this.logger.error(
      { requestId, err: exception instanceof Error ? exception.stack : String(exception) },
      'Unhandled error',
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId,
      } satisfies ApiErrorBody,
    });
  }
}
