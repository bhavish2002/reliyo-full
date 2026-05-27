import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret, verifySecret } from '../common/crypto/hash.util';
import { toPhoneE164 } from '../common/phone/phone.util';
import type { OtpProvider } from './providers/otp-provider.interface';
import { OTP_PROVIDER } from './providers/otp-provider.interface';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly devFixedCode: string | null;
  private readonly maxSendsPerHour: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {
    const isProd = config.get<string>('NODE_ENV') === 'production';
    const fixed = config.get<string>('OTP_DEV_FIXED_CODE');
    this.devFixedCode = !isProd && fixed ? fixed : null;
    const configured = config.get<string>('OTP_MAX_SENDS_PER_HOUR');
    this.maxSendsPerHour = configured
      ? Number(configured)
      : isProd
        ? 5
        : 30;
  }

  async sendOtp(params: {
    phone: string;
    dialCode: string;
    purpose: OtpPurpose;
    metadata?: Prisma.InputJsonValue;
  }): Promise<{ expiresInSeconds: number }> {
    const phoneE164 = toPhoneE164(params.dialCode, params.phone);
    await this.enforceSendRateLimit(phoneE164);

    if (params.purpose === OtpPurpose.login) {
      const user = await this.prisma.user.findUnique({ where: { phoneE164 } });
      if (!user) {
        throw new NotFoundException({
          code: 'AUTH_USER_NOT_FOUND',
          message: 'No account found for this phone number.',
        });
      }
      if (user.suspendedAt) {
        throw new HttpException(
          {
            code: 'AUTH_SUSPENDED',
            message:
              'This account has been suspended. Contact support for details.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const code = this.generateCode();
    const codeHash = hashSecret(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.otpChallenge.create({
      data: {
        phoneE164,
        purpose: params.purpose,
        codeHash,
        expiresAt,
        metadata: params.metadata ?? undefined,
      },
    });

    await this.otpProvider.send({ phoneE164, code });
    this.logger.log(`OTP issued for ${phoneE164} (${params.purpose})`);

    return { expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(params: {
    phone: string;
    dialCode: string;
    code: string;
  }): Promise<{
    phoneE164: string;
    purpose: OtpPurpose;
    metadata: Prisma.JsonValue | null;
  }> {
    const phoneE164 = toPhoneE164(params.dialCode, params.phone);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phoneE164,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException({
        code: 'AUTH_OTP_INVALID',
        message: 'Invalid or expired verification code.',
      });
    }

    if (challenge.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new HttpException(
        {
          code: 'AUTH_OTP_LOCKED',
          message: 'Too many attempts. Request a new code.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid =
      (this.devFixedCode && params.code === this.devFixedCode) ||
      verifySecret(params.code, challenge.codeHash);

    if (!valid) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException({
        code: 'AUTH_OTP_INVALID',
        message: 'Invalid or expired verification code.',
      });
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return {
      phoneE164,
      purpose: challenge.purpose,
      metadata: challenge.metadata,
    };
  }

  private generateCode(): string {
    if (this.devFixedCode) return this.devFixedCode;
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async enforceSendRateLimit(phoneE164: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.otpChallenge.count({
      where: { phoneE164, createdAt: { gte: since } },
    });
    if (count >= this.maxSendsPerHour) {
      throw new HttpException(
        {
          code: 'AUTH_OTP_RATE_LIMIT',
          message: 'Too many OTP requests. Try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
