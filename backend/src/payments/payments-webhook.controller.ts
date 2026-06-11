import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { RawBodyRequest } from '../common/types/raw-body-request';
import { PaymentWebhookPayload, PaymentWebhookService } from './payment-webhook.service';
import { mapRazorpayWebhook, type RazorpayWebhookBody } from './razorpay-webhook.mapper';

@Controller('payments/webhooks')
export class PaymentsWebhookController {
  constructor(private readonly webhooks: PaymentWebhookService) {}

  @Post('retry-due')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  retryDue(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 50;
    return this.webhooks.retryDueEvents(Number.isFinite(parsed) ? parsed : 50);
  }

  @Post(':provider')
  async ingest(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest,
    @Headers('x-reliyo-signature') reliyoSignature?: string,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    if (!rawBody) {
      throw new BadRequestException({
        code: 'PAYMENT_WEBHOOK_BODY_MISSING',
        message: 'Webhook request body is required.',
      });
    }

    if (provider === 'razorpay') {
      this.webhooks.verifyRazorpaySignature(rawBody, razorpaySignature);
      const body = JSON.parse(rawBody) as RazorpayWebhookBody;
      const mapped = mapRazorpayWebhook(body);
      return this.webhooks.ingestEvent('razorpay', mapped);
    }

    this.webhooks.verifySignature(provider, rawBody, reliyoSignature);
    const payload = JSON.parse(rawBody) as PaymentWebhookPayload;
    return this.webhooks.ingestEvent(provider, payload);
  }
}
