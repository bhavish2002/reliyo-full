import { Injectable } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeDueStrikeLevel,
  computeInactivityAnchor,
  countStrikesInDoneStint,
  INACTIVITY_STRIKE_HOURS,
  resolveEffectiveDeadline,
} from './inactivity.util';

const STRIKE_MESSAGES = [
  'Reminder 1 of 3 — this completed task still needs a decision (accept work or raise a dispute).',
  'Reminder 2 of 3 — still no decision on this task.',
  'Reminder 3 of 3 — task closed automatically because no decision was made in time.',
] as const;

@Injectable()
export class InactivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly ledger: LedgerService,
  ) {}

  async processDue(): Promise<{ processed: number; strikes: number; closed: number }> {
    const tasks = await this.prisma.task.findMany({
      where: { status: 'done', cancelledAt: null },
      include: { requestor: true, acceptor: true },
    });

    let strikes = 0;
    let closed = 0;

    for (const task of tasks) {
      const result = await this.processTask(task.id);
      strikes += result.strikesAdded;
      if (result.autoClosed) closed += 1;
    }

    return { processed: tasks.length, strikes, closed };
  }

  private async processTask(taskId: string): Promise<{
    strikesAdded: number;
    autoClosed: boolean;
  }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { requestor: true, acceptor: true },
    });
    if (!task || task.status !== 'done') {
      return { strikesAdded: 0, autoClosed: false };
    }

    const effectiveDeadline = resolveEffectiveDeadline(
      task.deadline,
      task.extendedDeadline,
    );
    const inactivityAnchor = computeInactivityAnchor(
      task.statusEnteredAt,
      effectiveDeadline,
    );
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });

    const existingStrikes = countStrikesInDoneStint(events, inactivityAnchor);
    const hoursElapsed =
      (Date.now() - inactivityAnchor.getTime()) / (1000 * 60 * 60);
    const dueStrike = computeDueStrikeLevel(hoursElapsed);

    if (dueStrike <= existingStrikes) {
      return { strikesAdded: 0, autoClosed: false };
    }

    let strikesAdded = 0;
    let autoClosed = false;

    await this.prisma.$transaction(async (tx) => {
      for (let i = existingStrikes; i < dueStrike; i++) {
        await tx.taskEvent.create({
          data: {
            taskId: task.id,
            authorUserId: null,
            authorName: 'System',
            authorRole: 'system',
            message: STRIKE_MESSAGES[i],
            entryType: 'alert',
            systemGenerated: true,
            metadata: { alertType: 'sla_warning', strike: i + 1 },
          },
        });
        strikesAdded += 1;
      }

      if (dueStrike >= INACTIVITY_STRIKE_HOURS.length) {
        const fresh = await tx.task.findUniqueOrThrow({
          where: { id: task.id },
          include: { requestor: true, acceptor: true },
        });
        this.lifecycle.assertTransition(fresh.status, 'closed');
        const forSettlement = await tx.task.findUniqueOrThrow({
          where: { id: task.id },
          include: { rewardFundHold: true, trustFundHold: true },
        });
        await this.ledger.settleClosed(tx, forSettlement);
        await tx.task.update({
          where: { id: task.id },
          data: { status: 'closed', statusEnteredAt: new Date() },
        });
        await tx.taskEvent.create({
          data: {
            taskId: task.id,
            authorUserId: null,
            authorName: 'System',
            authorRole: 'system',
            message:
              'Task auto-closed after 3 reminders with no decision.',
            entryType: 'status_change',
            systemGenerated: true,
            metadata: {
              fromStatus: 'done',
              toStatus: 'closed',
              reason: 'inactivity_3_strike',
            },
          },
        });
        autoClosed = true;
      }
    });

    return { strikesAdded, autoClosed };
  }
}
