import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FundHold, FundHoldPurpose, Prisma } from '@prisma/client';
import { FundHoldStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUserPayload } from '../auth/auth.types';
import { resolveFundHoldStatusFromMethod } from './payment-outcomes';
import type { CreateFundHoldDto } from './dto/create-fund-hold.dto';
import { computeTrustDepositAmount } from './trust-deposit.util';

export interface FundHoldDto {
  id: string;
  purpose: FundHoldPurpose;
  amount: number;
  currency: string;
  status: FundHoldStatus;
  paymentMethod?: string;
  confirmedAt?: string;
  failedAt?: string;
  createdAt: string;
}

@Injectable()
export class FundHoldsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(hold: FundHold): FundHoldDto {
    return {
      id: hold.id,
      purpose: hold.purpose,
      amount: Number(hold.amount),
      currency: hold.currency,
      status: hold.status,
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
    const status = resolveFundHoldStatusFromMethod(dto.paymentMethod);
    const now = new Date();
    let targetTaskId: string | undefined;

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

    const hold = await this.prisma.fundHold.create({
      data: {
        userId: actor.sub,
        purpose: dto.purpose,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        paymentMethod: dto.paymentMethod,
        status,
        targetTaskId,
        confirmedAt: status === FundHoldStatus.confirmed ? now : null,
        failedAt: status === FundHoldStatus.failed ? now : null,
      },
    });

    return this.toDto(hold);
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
