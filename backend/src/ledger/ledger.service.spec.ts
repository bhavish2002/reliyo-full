import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import type { TaskForSettlement } from './ledger.types';

function mockTask(overrides: Partial<TaskForSettlement> = {}): TaskForSettlement {
  return {
    id: 'task_1',
    publicId: 'T-001',
    title: 'Test',
    description: 'd',
    status: 'done',
    workType: 'Virtual',
    manpower: 1,
    location: 'Mumbai',
    country: 'India',
    deadline: new Date(),
    extendedDeadline: null,
    updateFrequency: 'Biweekly',
    skills: [],
    domain: 'Technology',
    reward: 1000 as never,
    currency: 'INR',
    currencySymbol: '₹',
    requestorId: 'req_1',
    acceptorId: 'acc_1',
    acceptedAt: new Date(),
    rewardFundedAt: new Date(),
    trustDepositFundedAt: new Date(),
    statusEnteredAt: new Date(),
    disputeCount: 0,
    rating: null,
    ratingFeedback: null,
    dsp4ResolvedValid: false,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    dsp4Status: null,
    dsp4ReworkDeadline: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rewardFundHoldId: 'hold_reward',
    trustFundHoldId: 'hold_trust',
    rewardFundHold: {
      id: 'hold_reward',
      userId: 'req_1',
      purpose: 'task_reward',
      amount: 1000 as never,
      currency: 'INR',
      status: 'confirmed',
      provider: 'mock',
      providerIntentId: 'mock_pi_r',
      providerPaymentId: null,
      paymentMethod: 'upi',
      confirmedAt: new Date(),
      failedAt: null,
      targetTaskId: null,
      createdAt: new Date(),
    },
    trustFundHold: {
      id: 'hold_trust',
      userId: 'acc_1',
      purpose: 'trust_deposit',
      amount: 100 as never,
      currency: 'INR',
      status: 'confirmed',
      provider: 'mock',
      providerIntentId: 'mock_pi_t',
      providerPaymentId: null,
      paymentMethod: 'upi',
      confirmedAt: new Date(),
      failedAt: null,
      targetTaskId: 'task_1',
      createdAt: new Date(),
    },
    ...overrides,
  } as TaskForSettlement;
}

describe('LedgerService', () => {
  const prisma = {
    journalEntry: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const service = new LedgerService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.journalEntry.findUnique.mockResolvedValue(null);
    prisma.journalEntry.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'je_1', ...data }),
    );
  });

  it('posts balanced closed settlement (5% fee on reward)', async () => {
    const tx = prisma;
    await service.settleClosed(tx as never, mockTask());

    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    const { data } = tx.journalEntry.create.mock.calls[0][0];
    expect(data.scenario).toBe('closed');
    expect(data.idempotencyKey).toBe('closed:task_1');

    const lines = data.lines.create;
    const debit = lines
      .filter((l: { side: string }) => l.side === 'debit')
      .reduce((s: number, l: { amount: number }) => s + Number(l.amount), 0);
    const credit = lines
      .filter((l: { side: string }) => l.side === 'credit')
      .reduce((s: number, l: { amount: number }) => s + Number(l.amount), 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(1100);

    const revenue = lines.find(
      (l: { accountCode: string }) => l.accountCode === 'platform_revenue',
    );
    expect(Number(revenue.amount)).toBe(50);
  });

  it('is idempotent on duplicate idempotency key', async () => {
    prisma.journalEntry.findUnique.mockResolvedValueOnce({ id: 'existing' });
    const result = await service.postJournal(prisma as never, {
      idempotencyKey: 'cancel_open:task_1',
      scenario: 'cancel_open',
      referenceType: 'task',
      referenceId: 'task_1',
      taskId: 'task_1',
      currency: 'INR',
      description: 'test',
      lines: [
        { accountCode: 'escrow_reward', side: 'debit', amount: 100 },
        { accountCode: 'payable_requestor', side: 'credit', amount: 100 },
      ],
    });
    expect(result).toEqual({ created: false, entryId: 'existing' });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    prisma.journalEntry.findUnique.mockResolvedValue(null);
  });

  it('posts force_closed: full reward plus 70% of the trust penalty to the requestor', async () => {
    const tx = prisma;
    await service.settleForceClosed(tx as never, mockTask());

    const { data } = tx.journalEntry.create.mock.calls.at(-1)[0];
    expect(data.scenario).toBe('force_closed');
    const lines = data.lines.create as Array<{
      accountCode: string;
      side: string;
      amount: number;
      userId?: string;
    }>;
    const debit = lines
      .filter((l) => l.side === 'debit')
      .reduce((s, l) => s + Number(l.amount), 0);
    const credit = lines
      .filter((l) => l.side === 'credit')
      .reduce((s, l) => s + Number(l.amount), 0);
    expect(debit).toBe(credit);

    const requestor = lines.find((l) => l.accountCode === 'payable_requestor');
    const acceptor = lines.find((l) => l.accountCode === 'payable_acceptor');
    const reserve = lines.find(
      (l) => l.accountCode === 'platform_compensation_reserve',
    );
    // Trust 100 × 3% = 3 penalty. Requestor gets 1000 + 70% of 3 = 1002.1. Platform keeps 0.9. Acceptor keeps 97.
    expect(Number(requestor?.amount)).toBe(1002.1);
    expect(Number(acceptor?.amount)).toBe(97);
    expect(Number(reserve?.amount)).toBe(0.9);
  });

  it('rejects unbalanced journal', async () => {
    expect(() =>
      service['assertBalanced']([
        { accountCode: 'a', side: 'debit', amount: 10 },
        { accountCode: 'b', side: 'credit', amount: 9 },
      ]),
    ).toThrow(BadRequestException);
  });
});
