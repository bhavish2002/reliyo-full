import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/crypto/hash.util';
import type { AuthUserPayload } from './auth.types';

const REFRESH_COOKIE = 'reliyo_refresh';

@Injectable()
export class TokenService {
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessTtlSec = Number(config.get('JWT_ACCESS_TTL_SEC', 900));
    this.refreshTtlSec = Number(config.get('JWT_REFRESH_TTL_SEC', 604800));
  }

  static refreshCookieName(): string {
    return REFRESH_COOKIE;
  }

  signAccessToken(user: User): { accessToken: string; expiresIn: number } {
    const payload: AuthUserPayload = {
      sub: user.id,
      phoneE164: user.phoneE164,
      platformRole: user.platformRole,
      preferredRole: user.preferredRole,
    };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.accessTtlSec,
    });
    return { accessToken, expiresIn: this.accessTtlSec };
  }

  async createRefreshSession(
    userId: string,
    userAgent?: string,
    rotatedFromId?: string,
  ): Promise<string> {
    const raw = randomToken(48);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000);
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        rotatedFromId,
      },
    });
    return raw;
  }

  async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
  ): Promise<{ user: User; newRaw: string }> {
    const tokenHash = sha256(rawToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      throw new Error('Invalid refresh session');
    }
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const newRaw = await this.createRefreshSession(
      session.userId,
      userAgent,
      session.id,
    );
    return { user: session.user, newRaw };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  refreshCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  } {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTtlSec * 1000,
    };
  }
}
