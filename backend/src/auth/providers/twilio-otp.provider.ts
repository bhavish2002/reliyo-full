import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';
import type { OtpProvider, OtpSendParams } from './otp-provider.interface';

@Injectable()
export class TwilioOtpProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioOtpProvider.name);
  private readonly client: ReturnType<typeof Twilio> | null;
  private readonly from: string | undefined;

  constructor(private readonly config: ConfigService) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = config.get<string>('TWILIO_FROM_NUMBER');
    this.client = sid && token ? Twilio(sid, token) : null;
  }

  async send(params: OtpSendParams): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.error('Twilio not configured; cannot send OTP');
      throw new Error('SMS provider unavailable');
    }
    await this.client.messages.create({
      to: params.phoneE164,
      from: this.from,
      body: `Your Reliyo verification code is ${params.code}. It expires in 10 minutes.`,
    });
  }
}
