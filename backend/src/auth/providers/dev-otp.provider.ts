import { Injectable, Logger } from '@nestjs/common';
import type { OtpProvider, OtpSendParams } from './otp-provider.interface';

@Injectable()
export class DevOtpProvider implements OtpProvider {
  private readonly logger = new Logger(DevOtpProvider.name);

  async send(params: OtpSendParams): Promise<void> {
    this.logger.warn(
      `[DEV OTP] ${params.phoneE164} => ${params.code} (not sent via SMS)`,
    );
  }
}
