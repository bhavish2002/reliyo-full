import { CronExpression } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { InactivityService } from './inactivity.service';
import { PaymentWebhookService } from '../payments/payment-webhook.service';
import { ScheduledJobsService } from './scheduled-jobs.service';

describe('ScheduledJobsService', () => {
  const inactivity = { processDue: jest.fn() };
  const webhooks = { retryDueEvents: jest.fn() };

  async function createModule() {
    return Test.createTestingModule({
      providers: [
        ScheduledJobsService,
        { provide: InactivityService, useValue: inactivity },
        { provide: PaymentWebhookService, useValue: webhooks },
      ],
    }).compile();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INACTIVITY_JOB_ENABLED;
    delete process.env.WEBHOOK_RETRY_JOB_ENABLED;
  });

  it('skips inactivity when INACTIVITY_JOB_ENABLED is false', async () => {
    process.env.INACTIVITY_JOB_ENABLED = 'false';
    const module = await createModule();
    const service = module.get(ScheduledJobsService);
    await service.runInactivityJob();
    expect(inactivity.processDue).not.toHaveBeenCalled();
  });

  it('runs inactivity when INACTIVITY_JOB_ENABLED is true', async () => {
    process.env.INACTIVITY_JOB_ENABLED = 'true';
    inactivity.processDue.mockResolvedValue({ processed: 1, strikes: 0, closed: 0 });
    const module = await createModule();
    const service = module.get(ScheduledJobsService);
    await service.runInactivityJob();
    expect(inactivity.processDue).toHaveBeenCalledTimes(1);
    expect(service.getStatus().lastInactivityRun?.result).toEqual({
      processed: 1,
      strikes: 0,
      closed: 0,
    });
  });

  it('skips webhook retry when WEBHOOK_RETRY_JOB_ENABLED is false', async () => {
    process.env.WEBHOOK_RETRY_JOB_ENABLED = 'false';
    const module = await createModule();
    const service = module.get(ScheduledJobsService);
    await service.runWebhookRetryJob();
    expect(webhooks.retryDueEvents).not.toHaveBeenCalled();
  });

  it('runs webhook retry when WEBHOOK_RETRY_JOB_ENABLED is true', async () => {
    process.env.WEBHOOK_RETRY_JOB_ENABLED = 'true';
    webhooks.retryDueEvents.mockResolvedValue({ attempted: 2, processed: 1 });
    const module = await createModule();
    const service = module.get(ScheduledJobsService);
    await service.runWebhookRetryJob();
    expect(webhooks.retryDueEvents).toHaveBeenCalledWith(50);
  });

  it('exposes job status with schedules', async () => {
    const module = await createModule();
    const service = module.get(ScheduledJobsService);
    const status = service.getStatus();
    expect(status.schedules.inactivity).toBe(CronExpression.EVERY_HOUR);
    expect(status.schedules.webhookRetry).toBe(CronExpression.EVERY_10_MINUTES);
    expect(status.inactivityJobEnabled).toBe(false);
  });
});
