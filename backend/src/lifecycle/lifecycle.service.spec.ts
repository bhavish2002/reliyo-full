import { LifecycleService } from './lifecycle.service';
import type { Task } from '@prisma/client';

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    publicId: 'RLY-TEST',
    title: 'Test',
    description: 'Test task',
    status: 'open',
    workType: 'Virtual',
    manpower: 1,
    location: 'Mumbai',
    country: 'India',
    deadline: new Date('2026-12-31'),
    extendedDeadline: null,
    updateFrequency: 'Daily',
    skills: [],
    domain: 'Technology',
    reward: 300 as unknown as Task['reward'],
    currency: 'INR',
    currencySymbol: '₹',
    requestorId: 'requestor-1',
    acceptorId: null,
    acceptedAt: null,
    rewardFundedAt: new Date(),
    trustDepositFundedAt: null,
    rewardFundHoldId: null,
    trustFundHoldId: null,
    statusEnteredAt: new Date(),
    disputeCount: 0,
    rating: null,
    ratingFeedback: null,
    dsp4ResolvedValid: false,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LifecycleService.computeAvailableActions', () => {
  const service = new LifecycleService();

  it('allows accept for non-participant on open funded task', () => {
    const actions = service.computeAvailableActions(
      baseTask(),
      'none',
      'acceptor-1',
      {},
    );
    expect(actions.canAccept).toBe(true);
  });

  it('denies accept when user is the requestor', () => {
    const actions = service.computeAvailableActions(
      baseTask(),
      'none',
      'requestor-1',
      {},
    );
    expect(actions.canAccept).toBe(false);
  });

  it('allows quit within 2h grace window', () => {
    const acceptedAt = new Date(Date.now() - 60 * 60 * 1000);
    const quitUntil = new Date(acceptedAt.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'committed',
        acceptorId: 'acceptor-1',
        acceptedAt,
      }),
      'acceptor',
      'acceptor-1',
      { quitUntil },
    );
    expect(actions.canQuit).toBe(true);
  });

  it('allows acceptor mark done from disputed before DSP4', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'disputed',
        acceptorId: 'acceptor-1',
        disputeCount: 2,
      }),
      'acceptor',
      'acceptor-1',
      {},
    );
    expect(actions.canMarkDone).toBe(true);
  });

  it('denies acceptor mark done on DSP4 unless resolved valid', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'disputed',
        acceptorId: 'acceptor-1',
        disputeCount: 4,
        dsp4ResolvedValid: false,
      }),
      'acceptor',
      'acceptor-1',
      {},
    );
    expect(actions.canMarkDone).toBe(false);
  });

  it('denies quit after grace window', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'committed',
        acceptorId: 'acceptor-1',
        acceptedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      }),
      'acceptor',
      'acceptor-1',
      {},
    );
    expect(actions.canQuit).toBe(false);
  });

  it('denies raising dispute while already disputed', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'disputed',
        disputeCount: 2,
      }),
      'requestor',
      'requestor-1',
      {},
    );
    expect(actions.canRaiseDispute).toBe(false);
  });
});

describe('LifecycleService.computeCooldowns', () => {
  const service = new LifecycleService();

  it('resets dispute cooldown after disputed -> done transition', () => {
    const now = Date.now();
    const task = baseTask({ status: 'done' });
    const events = [
      {
        id: 'e1',
        taskId: task.id,
        authorUserId: task.requestorId,
        authorName: 'Requestor',
        authorRole: 'requestor',
        message: 'Requestor raised dispute',
        entryType: 'alert',
        systemGenerated: false,
        metadata: { alertType: 'dispute_raised' },
        createdAt: new Date(now - 60 * 60 * 1000),
      },
      {
        id: 'e2',
        taskId: task.id,
        authorUserId: null,
        authorName: 'System',
        authorRole: 'system',
        message: 'Task moved to Done',
        entryType: 'status_change',
        systemGenerated: true,
        metadata: { fromStatus: 'disputed', toStatus: 'done' },
        createdAt: new Date(now - 10 * 60 * 1000),
      },
    ] as unknown as Parameters<LifecycleService['computeCooldowns']>[1];

    const cooldowns = service.computeCooldowns(task, events);
    expect(cooldowns.disputeAfter).toBeUndefined();
  });
});
