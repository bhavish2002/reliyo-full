import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FundHoldsController } from './fund-holds.controller';
import { FundHoldsService } from './fund-holds.service';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentWebhookService } from './payment-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RazorpayPaymentProvider } from './providers/razorpay-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { PaymentsConfigService } from './payments-config.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FundHoldsController, PaymentsWebhookController, PaymentsController],
  providers: [
    FundHoldsService,
    PaymentWebhookService,
    RazorpayPaymentProvider,
    PaymentProviderRegistry,
    PaymentsConfigService,
  ],
  exports: [FundHoldsService],
})
export class PaymentsModule {}
