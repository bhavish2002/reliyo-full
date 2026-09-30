import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JournalLineSide, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FORCE_CLOSE_REQUESTOR_PENALTY_SHARE,
  FORCE_CLOSE_TRUST_PENALTY,
  LedgerAccountCode,
  PLATFORM_FEE_ON_REWARD,
  TRUST_DEPOSIT_RATE,
  type JournalLineInput,
  type PostJournalInput,
  type SettlementScenario,
  type TaskForSettlement,
} from './ledger.types';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Round to currency minor units (2 dp for INR/USD). */
  money(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  rewardAmount(task: TaskForSettlement): number {
    return this.money(Number(task.reward));
  }

  trustAmount(task: TaskForSettlement): number {
    if (task.trustFundHold) {
      return this.money(Number(task.trustFundHold.amount));
    }
    return this.money(this.rewardAmount(task) * TRUST_DEPOSIT_RATE);
  }

  async postJournal(
    tx: Prisma.TransactionClient,
    input: PostJournalInput,
  ): Promise<{ created: boolean; entryId: string }> {
    const existing = await tx.journalEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { created: false, entryId: existing.id };
    }

    this.assertBalanced(input.lines);

    const entry = await tx.journalEntry.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        scenario: input.scenario,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        taskId: input.taskId,
        currency: input.currency,
        description: input.description,
        lines: {
          create: input.lines.map((line) => ({
            accountCode: line.accountCode,
            side: line.side as JournalLineSide,
            amount: line.amount,
            currency: input.currency,
            fundHoldId: line.fundHoldId,
            userId: line.userId,
          })),
        },
      },
    });

    this.logger.log(
      `Journal posted: scenario=${input.scenario} task=${input.taskId} key=${input.idempotencyKey}`,
    );
    return { created: true, entryId: entry.id };
  }

  async settleClosed(
    tx: Prisma.TransactionClient,
    task: TaskForSettlement,
  ): Promise<void> {
    this.assertRewardHold(task);
    const reward = this.rewardAmount(task);
    const trust = this.trustAmount(task);
    const fee = this.money(reward * PLATFORM_FEE_ON_REWARD);
    const acceptorPayout = this.money(reward - fee);

    if (!task.acceptorId) {
      throw new BadRequestException({
        code: 'SETTLEMENT_INVALID',
        message: 'Closed settlement requires an acceptor.',
      });
    }

    await this.postJournal(tx, {
      idempotencyKey: this.key('closed', task.id),
      scenario: 'closed',
      referenceType: 'task',
      referenceId: task.id,
      taskId: task.id,
      currency: task.currency,
      description: `Standard close: reward payout minus ${PLATFORM_FEE_ON_REWARD * 100}% fee; trust refunded`,
      lines: [
        {
          accountCode: LedgerAccountCode.escrowReward,
          side: 'debit',
          amount: reward,
          fundHoldId: task.rewardFundHoldId ?? undefined,
        },
        {
          accountCode: LedgerAccountCode.payableAcceptor,
          side: 'credit',
          amount: acceptorPayout,
          userId: task.acceptorId,
        },
        {
          accountCode: LedgerAccountCode.platformRevenue,
          side: 'credit',
          amount: fee,
        },
        {
          accountCode: LedgerAccountCode.escrowTrust,
          side: 'debit',
          amount: trust,
          fundHoldId: task.trustFundHoldId ?? undefined,
        },
        {
          accountCode: LedgerAccountCode.payableAcceptor,
          side: 'credit',
          amount: trust,
          userId: task.acceptorId,
        },
      ],
    });
  }

  async settleForceClosed(
    tx: Prisma.TransactionClient,
    task: TaskForSettlement,
  ): Promise<void> {
    this.assertRewardHold(task);
    const reward = this.rewardAmount(task);
    const trust = this.trustAmount(task);
    const penalty = this.money(trust * FORCE_CLOSE_TRUST_PENALTY);
    const requestorPenaltyShare = this.money(
      penalty * FORCE_CLOSE_REQUESTOR_PENALTY_SHARE,
    );
    const platformPenaltyShare = this.money(penalty - requestorPenaltyShare);
    const acceptorTrustReturn = this.money(trust - penalty);
    const requestorRefund = this.money(reward + requestorPenaltyShare);

    await this.postJournal(tx, {
      idempotencyKey: this.key('force_closed', task.id),
      scenario: 'force_closed',
      referenceType: 'task',
      referenceId: task.id,
      taskId: task.id,
      currency: task.currency,
      description: `Force close: full reward refund plus ${FORCE_CLOSE_REQUESTOR_PENALTY_SHARE * 100}% of the ${FORCE_CLOSE_TRUST_PENALTY * 100}% trust penalty to the requestor`,
      lines: [
        {
          accountCode: LedgerAccountCode.escrowReward,
          side: 'debit',
          amount: reward,
          fundHoldId: task.rewardFundHoldId ?? undefined,
        },
        {
          accountCode: LedgerAccountCode.payableRequestor,
          side: 'credit',
          amount: requestorRefund,
          userId: task.requestorId,
        },
        {
          accountCode: LedgerAccountCode.escrowTrust,
          side: 'debit',
          amount: trust,
          fundHoldId: task.trustFundHoldId ?? undefined,
        },
        ...(task.acceptorId
          ? [
              {
                accountCode: LedgerAccountCode.payableAcceptor,
                side: 'credit' as const,
                amount: acceptorTrustReturn,
                userId: task.acceptorId,
              },
            ]
          : []),
        ...(platformPenaltyShare > 0
          ? [
              {
                accountCode: LedgerAccountCode.platformCompensationReserve,
                side: 'credit' as const,
                amount: platformPenaltyShare,
              },
            ]
          : []),
      ],
    });
  }

  async settleCancelOpen(
    tx: Prisma.TransactionClient,
    task: TaskForSettlement,
  ): Promise<void> {
    this.assertRewardHold(task);
    const reward = this.rewardAmount(task);

    await this.postJournal(tx, {
      idempotencyKey: this.key('cancel_open', task.id),
      scenario: 'cancel_open',
      referenceType: 'task',
      referenceId: task.id,
      taskId: task.id,
      currency: task.currency,
      description: 'Cancel open task: full reward refund to requestor',
      lines: [
        {
          accountCode: LedgerAccountCode.escrowReward,
          side: 'debit',
          amount: reward,
          fundHoldId: task.rewardFundHoldId ?? undefined,
        },
        {
          accountCode: LedgerAccountCode.payableRequestor,
          side: 'credit',
          amount: reward,
          userId: task.requestorId,
        },
      ],
    });
  }

  async settleQuitTrustRefund(
    tx: Prisma.TransactionClient,
    task: TaskForSettlement,
  ): Promise<void> {
    if (!task.acceptorId) {
      throw new BadRequestException({
        code: 'SETTLEMENT_INVALID',
        message: 'Quit settlement requires an acceptor.',
      });
    }
    const trust = this.trustAmount(task);
    if (trust <= 0) {
      return;
    }

    await this.postJournal(tx, {
      idempotencyKey: this.key('quit_trust_refund', task.id),
      scenario: 'quit_trust_refund',
      referenceType: 'task',
      referenceId: task.id,
      taskId: task.id,
      currency: task.currency,
      description: 'Quit within grace: full trust deposit refund to acceptor',
      lines: [
        {
          accountCode: LedgerAccountCode.escrowTrust,
          side: 'debit',
          amount: trust,
          fundHoldId: task.trustFundHoldId ?? undefined,
        },
        {
          accountCode: LedgerAccountCode.payableAcceptor,
          side: 'credit',
          amount: trust,
          userId: task.acceptorId,
        },
      ],
    });
  }

  private key(scenario: SettlementScenario, taskId: string): string {
    return `${scenario}:${taskId}`;
  }

  private assertBalanced(lines: JournalLineInput[]): void {
    const debit = this.money(
      lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0),
    );
    const credit = this.money(
      lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0),
    );
    if (debit !== credit) {
      throw new BadRequestException({
        code: 'LEDGER_UNBALANCED',
        message: `Journal entry unbalanced: debits=${debit} credits=${credit}`,
      });
    }
  }

  private assertRewardHold(task: TaskForSettlement): void {
    if (!task.rewardFundHoldId || !task.rewardFundHold) {
      throw new BadRequestException({
        code: 'SETTLEMENT_MISSING_HOLD',
        message: 'Task is missing a confirmed reward fund hold.',
      });
    }
  }

  async getAdminRevenueSummary() {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        side: 'credit',
        accountCode: {
          in: [
            LedgerAccountCode.platformRevenue,
            LedgerAccountCode.platformCompensationReserve,
          ],
        },
      },
      include: { entry: true },
    });

    const escrowLines = await this.prisma.journalLine.findMany({
      where: {
        accountCode: {
          in: [LedgerAccountCode.escrowReward, LedgerAccountCode.escrowTrust],
        },
      },
      include: { entry: true },
    });

    let platformFeeEarnings = 0;
    let commissionFeeEarnings = 0;
    const monthly = new Map<string, { revenue: number; fees: number }>();
    const monthlyEscrow = new Map<string, { locked: number; released: number }>();
    let totalEscrowLocked = 0;
    let totalEscrowReleased = 0;

    for (const line of lines) {
      const amount = Number(line.amount);
      const month = line.entry.createdAt.toISOString().slice(0, 7);
      const bucket = monthly.get(month) ?? { revenue: 0, fees: 0 };
      if (line.accountCode === LedgerAccountCode.platformRevenue) {
        platformFeeEarnings += amount;
        bucket.fees += amount;
      } else {
        commissionFeeEarnings += amount;
      }
      bucket.revenue += amount;
      monthly.set(month, bucket);
    }

    for (const line of escrowLines) {
      const amount = Number(line.amount);
      const month = line.entry.createdAt.toISOString().slice(0, 7);
      const bucket = monthlyEscrow.get(month) ?? { locked: 0, released: 0 };
      if (line.side === 'debit') {
        bucket.locked += amount;
        totalEscrowLocked += amount;
      } else {
        bucket.released += amount;
        totalEscrowReleased += amount;
        totalEscrowLocked -= amount;
      }
      monthlyEscrow.set(month, bucket);
    }

    const formatMonth = (isoMonth: string) => {
      const [y, m] = isoMonth.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const monthlyRevenue = Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: formatMonth(month),
        revenue: Math.round(v.revenue * 100) / 100,
        fees: Math.round(v.fees * 100) / 100,
      }));

    const monthlyEscrowOut = Array.from(monthlyEscrow.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: formatMonth(month),
        locked: Math.round(v.locked * 100) / 100,
        released: Math.round(v.released * 100) / 100,
      }));

    return {
      totalRevenue: Math.round((platformFeeEarnings + commissionFeeEarnings) * 100) / 100,
      platformFeeEarnings: Math.round(platformFeeEarnings * 100) / 100,
      commissionFeeEarnings: Math.round(commissionFeeEarnings * 100) / 100,
      totalEscrowLocked: Math.round(Math.max(0, totalEscrowLocked) * 100) / 100,
      totalEscrowReleased: Math.round(totalEscrowReleased * 100) / 100,
      monthlyRevenue,
      monthlyEscrow: monthlyEscrowOut,
    };
  }
}
