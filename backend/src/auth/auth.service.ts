import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose, PreferredRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import type { AuthTokensResponse } from './auth.types';
import { toPhoneE164 } from '../common/phone/phone.util';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import { toPublicUser } from '../users/users.mapper';

interface SignupMetadata {
  name?: string;
  email?: string;
  preferredRole?: 'requestor' | 'acceptor';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  sendOtp(dto: SendOtpDto) {
    const metadata: Prisma.InputJsonValue | undefined =
      dto.purpose === OtpPurpose.signup
        ? {
            name: dto.name,
            email: dto.email,
            preferredRole: dto.preferredRole ?? 'requestor',
          }
        : undefined;

    if (dto.purpose === OtpPurpose.signup && !dto.name?.trim()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Name is required for sign up.',
      });
    }

    return this.otp.sendOtp({
      phone: dto.phone,
      dialCode: dto.dialCode,
      purpose: dto.purpose,
      metadata,
    });
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    userAgent?: string,
  ): Promise<{ tokens: AuthTokensResponse; refreshRaw: string }> {
    const verified = await this.otp.verifyOtp(dto);
    let user = await this.prisma.user.findUnique({
      where: { phoneE164: verified.phoneE164 },
    });

    if (verified.purpose === OtpPurpose.signup) {
      const meta = (verified.metadata ?? {}) as SignupMetadata;
      const preferredRole =
        meta.preferredRole === 'acceptor'
          ? PreferredRole.acceptor
          : PreferredRole.requestor;

      user = await this.prisma.user.upsert({
        where: { phoneE164: verified.phoneE164 },
        create: {
          phoneE164: verified.phoneE164,
          name: meta.name?.trim() ?? null,
          email: meta.email?.trim() || null,
          preferredRole,
        },
        update: {
          name: meta.name?.trim() ?? undefined,
          email: meta.email?.trim() || undefined,
          preferredRole,
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'Account not found.',
      });
    }
    if (user.suspendedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_SUSPENDED',
        message: 'Account suspended.',
      });
    }

    const { accessToken, expiresIn } = this.tokens.signAccessToken(user);
    const refreshRaw = await this.tokens.createRefreshSession(
      user.id,
      userAgent,
    );

    return {
      tokens: {
        accessToken,
        expiresIn,
        user: toPublicUser(user),
      },
      refreshRaw,
    };
  }

  async refreshFromCookie(
    rawToken: string | undefined,
    userAgent?: string,
  ): Promise<{ tokens: AuthTokensResponse; refreshRaw: string }> {
    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_MISSING',
        message: 'Session expired. Sign in again.',
      });
    }
    try {
      const { user, newRaw } = await this.tokens.rotateRefreshToken(
        rawToken,
        userAgent,
      );
      if (user.suspendedAt) {
        throw new UnauthorizedException({
          code: 'AUTH_SUSPENDED',
          message: 'Account suspended.',
        });
      }
      const { accessToken, expiresIn } = this.tokens.signAccessToken(user);
      return {
        tokens: { accessToken, expiresIn, user: toPublicUser(user) },
        refreshRaw: newRaw,
      };
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Session expired. Sign in again.',
      });
    }
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) {
      await this.tokens.revokeRefreshToken(rawToken);
    }
  }

  phoneE164FromDto(phone: string, dialCode: string): string {
    return toPhoneE164(dialCode, phone);
  }
}
