import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps successful controller return values as `{ data, requestId? }`
 * per `docs/sprint-0/api-error-contract.md` success shape used by the frontend.
 */
@Injectable()
export class SuccessEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body: unknown) => {
        const req = context.switchToHttp().getRequest<Request>();
        const requestId = req.requestId;

        if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
          const o = body as Record<string, unknown>;
          if (requestId && o['requestId'] === undefined) {
            return { ...o, requestId };
          }
          return body;
        }

        return requestId ? { data: body, requestId } : { data: body };
      }),
    );
  }
}
