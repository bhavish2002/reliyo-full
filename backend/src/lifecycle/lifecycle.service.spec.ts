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
    dsp4Status: null,
    dsp4ReworkDeadline: null,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
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
        dsp4Status: 'open',
      }),
      'acceptor',
      'acceptor-1',
      {},
    );
    expect(actions.canMarkDone).toBe(false);
  });

  it('allows acceptor mark done on DSP4 within active rework window', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'disputed',
        acceptorId: 'acceptor-1',
        disputeCount: 4,
        dsp4ResolvedValid: true,
        dsp4Status: 'resolved_valid',
        dsp4ReworkDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }),
      'acceptor',
      'acceptor-1',
      {},
    );
    expect(actions.canMarkDone).toBe(true);
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

  it('allows raising the next dispute while already disputed (subject to cooldown)', () => {
    const actions = service.computeAvailableActions(
      baseTask({
        status: 'disputed',
        disputeCount: 2,
      }),
      'requestor',
      'requestor-1',
      {},
    );
    expect(actions.canRaiseDispute).toBe(true);
  });
});

describe('LifecycleService dispute cooldown', () => {
  const service = new LifecycleService();
  const HOUR = 60 * 60 * 1000;

  const disputeEvent = (hoursAgo: number, taskId: string, requestorId: string) =>
    ({
      id: 'e-dispute',
      taskId,
      authorUserId: requestorId,
      authorName: 'Requestor',
      authorRole: 'requestor',
      message: 'Requestor raised dispute',
      entryType: 'alert',
      systemGenerated: false,
      metadata: { alertType: 'dispute_raised' },
      createdAt: new Date(Date.now() - hoursAgo * HOUR),
    }) as unknown as Parameters<LifecycleService['computeCooldowns']>[1][number];

  const doneEvent = (hoursAgo: number, taskId: string) =>
    ({
      id: 'e-done',
      taskId,
      authorUserId: null,
      authorName: 'System',
      authorRole: 'system',
      message: 'Task moved to Done',
      entryType: 'status_change',
      systemGenerated: true,
      metadata: { fromStatus: 'disputed', toStatus: 'done' },
      createdAt: new Date(Date.now() - hoursAgo * HOUR),
    }) as unknown as Parameters<LifecycleService['computeCooldowns']>[1][number];

  const hoursLeft = (task: ReturnType<typeof baseTask>, events: Parameters<LifecycleService['computeCooldowns']>[1]) => {
    const { disputeAfter } = service.computeCooldowns(task, events);
    if (!disputeAfter) return 0;
    return Math.round((new Date(disputeAfter).getTime() - Date.now()) / HOUR);
  };

  it('has no cooldown before the first dispute', () => {
    const task = baseTask({ status: 'done', disputeCount: 0 });
    expect(service.computeCooldowns(task, []).disputeAfter).toBeUndefined();
  });

  it('applies 48h, then 24h, then 12h after each raise while still disputed', () => {
    expect(
      hoursLeft(
        baseTask({ status: 'disputed', disputeCount: 1 }),
        [disputeEvent(1, 'task-1', 'requestor-1')],
      ),
    ).toBe(47);
    expect(
      hoursLeft(
        baseTask({ status: 'disputed', disputeCount: 2 }),
        [disputeEvent(1, 'task-1', 'requestor-1')],
      ),
    ).toBe(23);
    expect(
      hoursLeft(
        baseTask({ status: 'disputed', disputeCount: 3 }),
        [disputeEvent(1, 'task-1', 'requestor-1')],
      ),
    ).toBe(11);
  });

  it('resets the cooldown when the acceptor returns work to done', () => {
    const task = baseTask({
      status: 'done',
      disputeCount: 1,
      statusEnteredAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    const events = [
      disputeEvent(1, task.id, task.requestorId),
      doneEvent(0.1, task.id),
    ];
    expect(service.computeCooldowns(task, events).disputeAfter).toBeUndefined();
  });

  it('keeps canRaiseDispute true during cooldown so the UI can grey the button', () => {
    const task = baseTask({ status: 'disputed', disputeCount: 1 });
    const events = [disputeEvent(1, task.id, task.requestorId)];
    const cooldowns = service.computeCooldowns(task, events);
    expect(cooldowns.disputeAfter).toBeDefined();
    const actions = service.computeAvailableActions(
      task,
      'requestor',
      'requestor-1',
      cooldowns,
    );
    expect(actions.canRaiseDispute).toBe(true);
  });

  it('allows raising from done immediately after a reset', () => {
    const task = baseTask({ status: 'done', disputeCount: 1 });
    const actions = service.computeAvailableActions(
      task,
      'requestor',
      'requestor-1',
      {},
    );
    expect(actions.canRaiseDispute).toBe(true);
  });
});
