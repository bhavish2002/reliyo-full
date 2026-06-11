import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
} from './payment-provider.types';

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
}
