import type { Task, TaskEvent, User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { CooldownMeta, TaskActionSummary } from '../lifecycle/lifecycle.types';

export interface TaskDto {
  id: string;
  taskId: string;
  title: string;
  description: string;
  status: string;
  workType: string;
  manpower: number;
  location: string;
  country?: string;
  deadline: string;
  extendedDeadline?: string;
  updateFrequency: string;
  skills: string[];
  domain: string;
  reward: number;
  currency?: string;
  currencySymbol?: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
  acceptedAt?: string;
  acceptedBy?: string;
  acceptedById?: string;
  paymentStatus?: string;
  disputeCount?: number;
  rating?: number;
  ratingFeedback?: string;
  statusEnteredAt?: string;
  dsp4ResolvedValid?: boolean;
}

export interface TimelineEntryDto {
  id: string;
  taskId: string;
  author: string;
  authorRole: string;
  message: string;
  timestamp: string;
  systemGenerated: boolean;
  entryType: string;
  metadata?: Record<string, unknown>;
}

export interface TaskDetailDto {
  task: TaskDto;
  timeline: TimelineEntryDto[];
  availableActions: TaskActionSummary;
  cooldowns: CooldownMeta;
}

function decimalToNumber(value: Decimal | null | undefined): number | undefined {
  if (value == null) return undefined;
  return Number(value);
}

export function toTaskDto(
  task: Task & { requestor: User; acceptor?: User | null },
): TaskDto {
  return {
    id: task.id,
    taskId: task.publicId,
    title: task.title,
    description: task.description,
    status: task.status,
    workType: task.workType,
    manpower: task.manpower,
    location: task.location,
    country: task.country ?? undefined,
    deadline: task.deadline.toISOString(),
    extendedDeadline: task.extendedDeadline?.toISOString(),
    updateFrequency: task.updateFrequency,
    skills: task.skills,
    domain: task.domain,
    reward: Number(task.reward),
    currency: task.currency,
    currencySymbol: task.currencySymbol ?? undefined,
    createdAt: task.createdAt.toISOString(),
    createdBy: task.requestor.name ?? 'Requestor',
    createdById: task.requestorId,
    acceptedAt: task.acceptedAt?.toISOString(),
    acceptedBy: task.acceptor?.name ?? undefined,
    acceptedById: task.acceptorId ?? undefined,
    paymentStatus:
      task.rewardFundedAt && task.trustDepositFundedAt
        ? 'funded'
        : task.rewardFundedAt
          ? 'reward_funded'
          : 'pending',
    disputeCount: task.disputeCount,
    rating: decimalToNumber(task.rating),
    ratingFeedback: task.ratingFeedback ?? undefined,
    statusEnteredAt: task.statusEnteredAt.toISOString(),
    dsp4ResolvedValid: task.dsp4ResolvedValid,
  };
}

export function toTimelineEntryDto(event: TaskEvent): TimelineEntryDto {
  return {
    id: event.id,
    taskId: event.taskId,
    author: event.authorName,
    authorRole: event.authorRole,
    message: event.message,
    timestamp: event.createdAt.toISOString(),
    systemGenerated: event.systemGenerated,
    entryType: event.entryType,
    metadata: (event.metadata as Record<string, unknown>) ?? undefined,
  };
}
