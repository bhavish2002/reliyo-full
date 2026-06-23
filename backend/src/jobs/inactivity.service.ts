import { Injectable } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { LifecycleService } from '../lifecycle/lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';

const STRIKE_HOURS = [72, 144, 192] as const;
const STRIKE_MESSAGES = [
  'Strike 1/3: Requestor has been inactive for 3 days. Please review the task to avoid auto-closure.',
  'Strike 2/3: Requestor has been inactive for 6 days. Task will auto-close in 2 days if no action is taken.',
  'Strike 3/3: Task has been automatically closed due to requestor inactivity.',
];

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

    const events = await this.prisma.taskEvent.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });

    const existingStrikes = events.filter((e) => {
      const meta = e.metadata as { alertType?: string } | null;
      return e.entryType === 'alert' && meta?.alertType === 'sla_warning';
    }).length;

    const hoursElapsed =
      (Date.now() - task.statusEnteredAt.getTime()) / (1000 * 60 * 60);

    let dueStrike = 0;
    for (let i = 0; i < STRIKE_HOURS.length; i++) {
      if (hoursElapsed >= STRIKE_HOURS[i]) dueStrike = i + 1;
    }

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

      if (dueStrike >= 3) {
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
              'Task auto-closed after 3 inactivity strikes (requestor did not accept work).',
            entryType: 'status_change',
            systemGenerated: true,
            metadata: { fromStatus: 'done', toStatus: 'closed', reason: 'inactivity_3_strike' },
          },
        });
        autoClosed = true;
      }
    });

    return { strikesAdded, autoClosed };
  }
}
