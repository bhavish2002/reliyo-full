import type { Request } from 'express';

/** Express request with Nest `rawBody: true` bootstrap option. */
export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}
