import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FundHoldStatus, Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface PaymentWebhookPayload {
  eventId: string;
  intentId: string;
  paymentId?: string;
  status: 'confirmed' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  signPayload(provider: string, rawBody: string): string {
    const secret = this.resolveWebhookSecret(provider);
    return createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  verifySignature(provider: string, rawBody: string, signature?: string): void {
    const mode = this.config.get<string>('PAYMENT_MODE') ?? 'mock';
    if (mode === 'mock') return;
    if (!signature) {
      throw new BadRequestException({
        code: 'PAYMENT_WEBHOOK_SIGNATURE_MISSING',
        message: 'Missing webhook signature.',
      });
    }
    const expected = this.signPayload(provider, rawBody);
    if (expected !== signature) {
      throw new BadRequestException({
        code: 'PAYMENT_WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid webhook signature.',
      });
    }
  }

  /** Razorpay uses X-Razorpay-Signature over the raw webhook body. */
  verifyRazorpaySignature(rawBody: string, signature?: string): void {
    const mode = this.config.get<string>('PAYMENT_MODE') ?? 'mock';
    if (mode === 'mock') return;
    if (!signature) {
      throw new BadRequestException({
        code: 'PAYMENT_WEBHOOK_SIGNATURE_MISSING',
        message: 'Missing Razorpay webhook signature.',
      });
    }
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected !== signature) {
      throw new BadRequestException({
        code: 'PAYMENT_WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid Razorpay webhook signature.',
      });
    }
  }

  async ingestEvent(
    provider: string,
    payload: PaymentWebhookPayload,
  ): Promise<{ processed: boolean; duplicate: boolean }> {
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { externalEventId: payload.eventId },
    });
    if (existing?.status === 'processed') {
      return { processed: true, duplicate: true };
    }

    const event = existing
      ? await this.prisma.paymentWebhookEvent.update({
          where: { id: existing.id },
          data: {
            payload: payload as unknown as Prisma.InputJsonValue,
            status: 'pending',
          },
        })
      : await this.prisma.paymentWebhookEvent.create({
          data: {
            provider,
            externalEventId: payload.eventId,
            externalIntentId: payload.intentId,
            payload: payload as unknown as Prisma.InputJsonValue,
            status: 'pending',
          },
        });

    await this.processEvent(event.id);
    return { processed: true, duplicate: false };
  }

  async retryDueEvents(limit = 50): Promise<{ attempted: number; processed: number }> {
    const now = new Date();
    const events = await this.prisma.paymentWebhookEvent.findMany({
      where: {
        status: 'failed',
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });

    let processed = 0;
    for (const e of events) {
      try {
        await this.processEvent(e.id);
        processed += 1;
      } catch {
        // keep retry schedule updates in processEvent
      }
    }
    return { attempted: events.length, processed };
  }

  private async processEvent(eventId: string): Promise<void> {
    const event = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) return;

    const payload = event.payload as unknown as PaymentWebhookPayload;
    try {
      const hold = await this.prisma.fundHold.findFirst({
        where: { providerIntentId: payload.intentId },
      });
      if (!hold) {
        throw new Error(`Fund hold not found for intent ${payload.intentId}`);
      }

      const nextStatus =
        payload.status === 'confirmed'
          ? FundHoldStatus.confirmed
          : payload.status === 'failed'
            ? FundHoldStatus.failed
            : FundHoldStatus.pending;

      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.fundHold.update({
          where: { id: hold.id },
          data: {
            status: nextStatus,
            providerPaymentId: payload.paymentId,
            confirmedAt: nextStatus === FundHoldStatus.confirmed ? now : hold.confirmedAt,
            failedAt: nextStatus === FundHoldStatus.failed ? now : hold.failedAt,
          },
        }),
        this.prisma.paymentWebhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'processed',
            processedAt: now,
            attempts: { increment: 1 },
            lastError: null,
            nextRetryAt: null,
          },
        }),
      ]);
    } catch (err) {
      const attempts = event.attempts + 1;
      const retryMinutes = Math.min(30, 2 ** Math.min(attempts, 5));
      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          attempts,
          lastError: err instanceof Error ? err.message : 'Unknown webhook processing error',
          nextRetryAt: new Date(Date.now() + retryMinutes * 60 * 1000),
        },
      });
      this.logger.warn(`Webhook processing failed for ${event.externalEventId}: ${String(err)}`);
      throw err;
    }
  }

  private resolveWebhookSecret(provider: string): string {
    if (provider === 'razorpay') {
      return this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
    }
    return this.config.get<string>('PAYMENT_WEBHOOK_SECRET_MOCK') ?? 'mock-webhook-secret';
  }
}

