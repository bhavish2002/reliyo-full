import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentWebhookService } from '../payments/payment-webhook.service';
import {
  isInactivityJobEnabled,
  isWebhookRetryJobEnabled,
} from './job-env';
import { InactivityService } from './inactivity.service';

export interface JobRunSnapshot {
  at: string;
  result: unknown;
}

export interface ScheduledJobsStatus {
  inactivityJobEnabled: boolean;
  webhookRetryJobEnabled: boolean;
  schedules: {
    inactivity: string;
    webhookRetry: string;
  };
  lastInactivityRun: JobRunSnapshot | null;
  lastWebhookRetryRun: JobRunSnapshot | null;
}

@Injectable()
export class ScheduledJobsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledJobsService.name);

  private lastInactivityRun: JobRunSnapshot | null = null;
  private lastWebhookRetryRun: JobRunSnapshot | null = null;

  constructor(
    private readonly inactivity: InactivityService,
    private readonly webhooks: PaymentWebhookService,
  ) {}

  onModuleInit(): void {
    const inactivityOn = isInactivityJobEnabled();
    this.logger.log(
      `Scheduled jobs: inactivity=${inactivityOn ? 'on' : 'off'}, webhookRetry=${isWebhookRetryJobEnabled() ? 'on' : 'off'}`,
    );
    if (inactivityOn) {
      void this.runInactivityJob();
    }
  }

  getStatus(): ScheduledJobsStatus {
    return {
      inactivityJobEnabled: isInactivityJobEnabled(),
      webhookRetryJobEnabled: isWebhookRetryJobEnabled(),
      schedules: {
        inactivity: CronExpression.EVERY_HOUR,
        webhookRetry: CronExpression.EVERY_10_MINUTES,
      },
      lastInactivityRun: this.lastInactivityRun,
      lastWebhookRetryRun: this.lastWebhookRetryRun,
    };
  }

  /** Hourly — 3-strike requestor inactivity on `done` tasks (PRODUCT-WORKFLOW §8). */
  @Cron(CronExpression.EVERY_HOUR, { name: 'inactivity-process-due' })
  async runInactivityJob(): Promise<void> {
    if (!isInactivityJobEnabled()) {
      return;
    }

    try {
      const result = await this.inactivity.processDue();
      this.lastInactivityRun = { at: new Date().toISOString(), result };
      this.logger.log(
        `Inactivity job complete: processed=${result.processed} strikes=${result.strikes} closed=${result.closed}`,
      );
    } catch (err) {
      this.logger.error(
        `Inactivity job failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Retry failed payment webhook events that are due. */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'payment-webhook-retry-due' })
  async runWebhookRetryJob(): Promise<void> {
    if (!isWebhookRetryJobEnabled()) {
      return;
    }

    try {
      const result = await this.webhooks.retryDueEvents(50);
      this.lastWebhookRetryRun = { at: new Date().toISOString(), result };
      if (result.attempted > 0) {
        this.logger.log(
          `Webhook retry job: attempted=${result.attempted} processed=${result.processed}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Webhook retry job failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
