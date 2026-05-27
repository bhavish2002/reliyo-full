import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUserPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    });
  }

  validate(payload: AuthUserPayload): AuthUserPayload {
    if (!payload?.sub) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Invalid access token.',
      });
    }
    return payload;
  }
}
