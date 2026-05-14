import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'] ?? req.headers['x-client-trace-id'];
    const id =
      typeof incoming === 'string' && incoming.length > 0
        ? incoming
        : `req_${randomBytes(12).toString('hex')}`;
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
