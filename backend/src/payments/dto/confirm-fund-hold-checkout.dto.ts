import { IsString, MinLength } from 'class-validator';

/** Razorpay Checkout success payload — verified server-side with key secret. */
export class ConfirmFundHoldCheckoutDto {
  @IsString()
  @MinLength(1)
  razorpayPaymentId!: string;

  @IsString()
  @MinLength(1)
  razorpayOrderId!: string;

  @IsString()
  @MinLength(1)
  razorpaySignature!: string;
}
