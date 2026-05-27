export interface OtpSendParams {
  phoneE164: string;
  code: string;
}

export interface OtpProvider {
  send(params: OtpSendParams): Promise<void>;
}

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');
