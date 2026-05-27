import type { AuthUserPayload } from '../auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export {};
