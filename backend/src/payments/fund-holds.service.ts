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
import type { ConfirmFundHoldCheckoutDto } from './dto/confirm-fund-hold-checkout.dto';
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
  targetTaskId?: string;
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
      targetTaskId: hold.targetTaskId ?? undefined,
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

    const holdCurrency = (dto.currency ?? 'INR').toUpperCase();

    const psp = this.paymentProviders.resolve();
    if (psp && !this.paymentsConfig.isCheckoutCurrencySupported(holdCurrency)) {
      const supported =
        this.paymentsConfig.getConfig().supportedCheckoutCurrencies.join(', ');
      throw new BadRequestException({
        code: 'PAYMENT_CURRENCY_NOT_SUPPORTED',
        message: `Razorpay checkout does not support ${holdCurrency}. Supported: ${supported}. Indian Razorpay test accounts accept INR only.`,
      });
    }
    if (psp) {
      const intent = await psp.createPaymentIntent({
        amount: dto.amount,
        currency: holdCurrency,
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
   * Confirm a live Razorpay Checkout payment using the client success payload.
   * Webhooks remain the backup path; this avoids requiring a tunnel for local staging.
   */
  async confirmCheckout(
    holdId: string,
    dto: ConfirmFundHoldCheckoutDto,
    actor: AuthUserPayload,
  ): Promise<FundHoldDto> {
    const hold = await this.prisma.fundHold.findFirst({
      where: { id: holdId, userId: actor.sub },
    });
    if (!hold) {
      throw new NotFoundException({
        code: 'PAYMENT_HOLD_NOT_FOUND',
        message: 'Fund hold not found.',
      });
    }

    if (hold.status === FundHoldStatus.confirmed) {
      return this.toDto(hold);
    }
    if (hold.status === FundHoldStatus.failed) {
      throw new BadRequestException({
        code: 'PAYMENT_HOLD_FAILED',
        message: 'This payment has already failed.',
      });
    }

    if (hold.provider !== 'razorpay' || !hold.providerIntentId) {
      throw new BadRequestException({
        code: 'PAYMENT_CHECKOUT_NOT_APPLICABLE',
        message: 'Checkout confirmation is only for Razorpay fund holds.',
      });
    }

    if (hold.providerIntentId !== dto.razorpayOrderId) {
      throw new BadRequestException({
        code: 'PAYMENT_ORDER_MISMATCH',
        message: 'Razorpay order does not match this fund hold.',
      });
    }

    this.webhooks.verifyRazorpayCheckoutSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    await this.webhooks.ingestEvent(hold.provider, {
      eventId: `checkout_${dto.razorpayPaymentId}`,
      intentId: dto.razorpayOrderId,
      paymentId: dto.razorpayPaymentId,
      status: 'confirmed',
      metadata: { source: 'checkout_confirm' },
    });

    const refreshed = await this.prisma.fundHold.findUniqueOrThrow({
      where: { id: holdId },
    });
    return this.toDto(refreshed);
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

  async listUserTransactions(actor: AuthUserPayload): Promise<{
    items: UserTransactionDto[];
    total: number;
  }> {
    const holds = await this.prisma.fundHold.findMany({
      where: { userId: actor.sub },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const holdIds = holds.map((h) => h.id);
    const targetTaskIds = holds
      .map((h) => h.targetTaskId)
      .filter((id): id is string => Boolean(id));

    const linkedTasks = await this.prisma.task.findMany({
      where: {
        OR: [
          { id: { in: targetTaskIds } },
          { rewardFundHoldId: { in: holdIds } },
          { trustFundHoldId: { in: holdIds } },
        ],
      },
      include: { requestor: true, acceptor: true },
    });

    const taskByHoldId = new Map<string, (typeof linkedTasks)[0]>();
    for (const t of linkedTasks) {
      if (t.rewardFundHoldId) taskByHoldId.set(t.rewardFundHoldId, t);
      if (t.trustFundHoldId) taskByHoldId.set(t.trustFundHoldId, t);
    }

    const journalLines = await this.prisma.journalLine.findMany({
      where: { userId: actor.sub },
      include: { entry: true },
      orderBy: { entry: { createdAt: 'desc' } },
      take: 200,
    });

    const settlementByTaskId = new Map<
      string,
      { scenario: string; amount: number; at: string }
    >();
    for (const line of journalLines) {
      const taskId = line.entry.taskId;
      if (!taskId) continue;
      const existing = settlementByTaskId.get(taskId);
      const amount = Number(line.amount);
      if (!existing || line.entry.createdAt > new Date(existing.at)) {
        settlementByTaskId.set(taskId, {
          scenario: line.entry.scenario,
          amount,
          at: line.entry.createdAt.toISOString(),
        });
      }
    }

    const items: UserTransactionDto[] = holds.map((hold) => {
      const task =
        (hold.targetTaskId
          ? linkedTasks.find((t) => t.id === hold.targetTaskId)
          : undefined) ?? taskByHoldId.get(hold.id);

      const role =
        task?.requestorId === actor.sub
          ? 'requestor'
          : task?.acceptorId === actor.sub
            ? 'acceptor'
            : hold.purpose === 'task_reward'
              ? 'requestor'
              : 'acceptor';

      const settlement = task ? settlementByTaskId.get(task.id) : undefined;

      return {
        id: hold.id,
        kind: 'fund_hold' as const,
        purpose: hold.purpose,
        role,
        amount: Number(hold.amount),
        currency: hold.currency,
        status: hold.status,
        paymentMethod: hold.paymentMethod ?? undefined,
        provider: hold.provider,
        providerPaymentId: hold.providerPaymentId ?? undefined,
        taskId: task?.id,
        taskDisplayId: task?.publicId,
        taskTitle: task?.title,
        taskStatus: task?.status,
        taskCancelled: task?.cancelledAt != null,
        settlementScenario: settlement?.scenario,
        settlementAt: settlement?.at,
        createdAt: hold.createdAt.toISOString(),
        confirmedAt: hold.confirmedAt?.toISOString(),
        failedAt: hold.failedAt?.toISOString(),
      };
    });

    return { items, total: items.length };
  }
}

export interface UserTransactionDto {
  id: string;
  kind: 'fund_hold';
  purpose: FundHoldPurpose;
  role: 'requestor' | 'acceptor';
  amount: number;
  currency: string;
  status: FundHoldStatus;
  paymentMethod?: string;
  provider: string;
  providerPaymentId?: string;
  taskId?: string;
  taskDisplayId?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskCancelled?: boolean;
  settlementScenario?: string;
  settlementAt?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}
