import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FundHold, FundHoldPurpose, Prisma } from '@prisma/client';
import { FundHoldStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUserPayload } from '../auth/auth.types';
import { resolveFundHoldStatusFromMethod } from './payment-outcomes';
import type { CreateFundHoldDto } from './dto/create-fund-hold.dto';
import { computeTrustDepositAmount } from './trust-deposit.util';
import { PaymentWebhookService } from './payment-webhook.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import type { CheckoutConfigDto } from './payments-config.types';
import { PaymentsConfigService } from './payments-config.service';

export interface FundHoldDto {
  id: string;
  purpose: FundHoldPurpose;
  amount: number;
  currency: string;
  status: FundHoldStatus;
  provider: string;
  providerIntentId?: string;
  providerPaymentId?: string;
  clientSecret?: string;
  checkout?: CheckoutConfigDto;
  paymentMethod?: string;
  confirmedAt?: string;
  failedAt?: string;
  createdAt: string;
}

@Injectable()
export class FundHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhooks: PaymentWebhookService,
    private readonly paymentProviders: PaymentProviderRegistry,
    private readonly paymentsConfig: PaymentsConfigService,
  ) {}

  private toDto(hold: FundHold): FundHoldDto {
    const checkout = this.paymentsConfig.buildCheckoutForHold({
      provider: hold.provider,
      providerIntentId: hold.providerIntentId,
      purpose: hold.purpose,
      amount: Number(hold.amount),
      currency: hold.currency,
    });

    return {
      id: hold.id,
      purpose: hold.purpose,
      amount: Number(hold.amount),
      currency: hold.currency,
      status: hold.status,
      provider: hold.provider,
      providerIntentId: hold.providerIntentId ?? undefined,
      providerPaymentId: hold.providerPaymentId ?? undefined,
      clientSecret: hold.providerIntentId
        ? `${hold.provider}_secret_${hold.providerIntentId}`
        : undefined,
      checkout,
      paymentMethod: hold.paymentMethod ?? undefined,
      confirmedAt: hold.confirmedAt?.toISOString(),
      failedAt: hold.failedAt?.toISOString(),
      createdAt: hold.createdAt.toISOString(),
    };
  }

  async createHold(
    dto: CreateFundHoldDto,
    actor: AuthUserPayload,
  ): Promise<FundHoldDto> {
    const provider = this.config.get<string>('PAYMENT_PSP') ?? 'mock';
    const mode = this.config.get<string>('PAYMENT_MODE') ?? 'mock';
    let providerIntentId: string;
    let targetTaskId: string | undefined;

    const psp = this.paymentProviders.resolve();
    if (psp) {
      const intent = await psp.createPaymentIntent({
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        // Razorpay receipt max 40 chars; userId lives in notes.
        receipt: `${dto.purpose === 'task_reward' ? 'tr' : 'td'}_${Date.now()}`,
        notes: {
          purpose: dto.purpose,
          userId: actor.sub,
          ...(dto.taskId ? { taskId: dto.taskId } : {}),
        },
      });
      providerIntentId = intent.providerIntentId;
    } else {
      providerIntentId = `${provider}_pi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    if (dto.purpose === 'trust_deposit') {
      if (!dto.taskId) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'taskId is required for trust deposit holds.',
        });
      }
      const task = await this.prisma.task.findFirst({
        where: { OR: [{ id: dto.taskId }, { publicId: dto.taskId }], cancelledAt: null },
      });
      if (!task) {
        throw new NotFoundException({
          code: 'TASK_NOT_FOUND',
          message: 'Task not found.',
        });
      }
      if (task.status !== 'open' || task.acceptorId) {
        throw new BadRequestException({
          code: 'TASK_NOT_ACCEPTABLE',
          message: 'This task is no longer open for acceptance.',
        });
      }
      if (task.requestorId === actor.sub) {
        throw new ForbiddenException({
          code: 'TASK_ACTION_FORBIDDEN',
          message: 'You cannot accept your own task.',
        });
      }
      if (!task.rewardFundedAt) {
        throw new BadRequestException({
          code: 'PAYMENT_REWARD_NOT_LOCKED',
          message: 'Task reward is not funded.',
        });
      }
      const expectedDeposit = computeTrustDepositAmount(Number(task.reward));
      if (dto.amount !== expectedDeposit) {
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: `Trust deposit must be ${expectedDeposit} (10% of reward).`,
        });
      }
      const currency = dto.currency ?? task.currency;
      if (currency !== task.currency) {
        throw new BadRequestException({
          code: 'PAYMENT_CURRENCY_MISMATCH',
          message: 'Currency does not match the task.',
        });
      }
      targetTaskId = task.id;
    }

    const holdProvider = psp?.name ?? provider;

    const hold = await this.prisma.fundHold.create({
      data: {
        userId: actor.sub,
        purpose: dto.purpose,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        paymentMethod: dto.paymentMethod,
        provider: holdProvider,
        providerIntentId,
        status: FundHoldStatus.pending,
        targetTaskId,
      },
    });

    if (mode === 'mock') {
      const outcome = resolveFundHoldStatusFromMethod(dto.paymentMethod);
      const webhookStatus =
        outcome === FundHoldStatus.confirmed
          ? 'confirmed'
          : outcome === FundHoldStatus.failed
            ? 'failed'
            : 'pending';
      await this.webhooks.ingestEvent(holdProvider, {
        eventId: `${provider}_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        intentId: providerIntentId,
        paymentId: `${provider}_pay_${Math.random().toString(36).slice(2, 12)}`,
        status: webhookStatus,
        metadata: {
          purpose: dto.purpose,
          paymentMethod: dto.paymentMethod,
        },
      });
    }

    const refreshed = await this.prisma.fundHold.findUniqueOrThrow({
      where: { id: hold.id },
    });
    return this.toDto(refreshed);
  }

  async getHold(id: string, actor: AuthUserPayload): Promise<FundHoldDto> {
    const hold = await this.prisma.fundHold.findFirst({
      where: { id, userId: actor.sub },
    });
    if (!hold) {
      throw new NotFoundException({
        code: 'PAYMENT_HOLD_NOT_FOUND',
        message: 'Fund hold not found.',
      });
    }
    return this.toDto(hold);
  }

  /**
   * Rule Zero: reward must be confirmed before a task row is created.
   */
  async assertRewardHoldForTaskCreate(
    tx: Prisma.TransactionClient,
    fundHoldId: string,
    actor: AuthUserPayload,
    reward: number,
    currency: string,
  ): Promise<{ confirmedAt: Date; holdId: string }> {
    const hold = await tx.fundHold.findFirst({
      where: {
        id: fundHoldId,
        userId: actor.sub,
        purpose: 'task_reward',
        status: FundHoldStatus.confirmed,
        rewardLinkedTask: { is: null },
      },
    });

    if (!hold) {
      throw new BadRequestException({
        code: 'PAYMENT_REWARD_NOT_LOCKED',
        message:
          'Reward must be locked and confirmed before the task can be published.',
      });
    }

    if (Number(hold.amount) !== reward) {
      throw new BadRequestException({
        code: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'Reward amount does not match the confirmed fund hold.',
      });
    }

    if (hold.currency !== (currency ?? 'INR')) {
      throw new BadRequestException({
        code: 'PAYMENT_CURRENCY_MISMATCH',
        message: 'Currency does not match the confirmed fund hold.',
      });
    }

    if (!hold.confirmedAt) {
      throw new BadRequestException({
        code: 'PAYMENT_REWARD_NOT_LOCKED',
        message: 'Reward fund hold is not confirmed.',
      });
    }

    return { confirmedAt: hold.confirmedAt, holdId: hold.id };
  }

  /**
   * Trust deposit must be confirmed before task moves to Committed.
   */
  async assertTrustHoldForAccept(
    tx: Prisma.TransactionClient,
    fundHoldId: string,
    taskId: string,
    actor: AuthUserPayload,
    reward: number,
    currency: string,
  ): Promise<{ confirmedAt: Date; holdId: string }> {
    const expectedDeposit = computeTrustDepositAmount(reward);
    const hold = await tx.fundHold.findFirst({
      where: {
        id: fundHoldId,
        userId: actor.sub,
        purpose: 'trust_deposit',
        status: FundHoldStatus.confirmed,
        targetTaskId: taskId,
        trustLinkedTask: { is: null },
      },
    });

    if (!hold) {
      throw new BadRequestException({
        code: 'PAYMENT_TRUST_NOT_LOCKED',
        message:
          'Trust deposit must be locked and confirmed before accepting this task.',
      });
    }

    if (Number(hold.amount) !== expectedDeposit) {
      throw new BadRequestException({
        code: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'Trust deposit amount does not match 10% of task reward.',
      });
    }

    if (hold.currency !== currency) {
      throw new BadRequestException({
        code: 'PAYMENT_CURRENCY_MISMATCH',
        message: 'Currency does not match the fund hold.',
      });
    }

    if (!hold.confirmedAt) {
      throw new BadRequestException({
        code: 'PAYMENT_TRUST_NOT_LOCKED',
        message: 'Trust deposit fund hold is not confirmed.',
      });
    }

    return { confirmedAt: hold.confirmedAt, holdId: hold.id };
  }
}
