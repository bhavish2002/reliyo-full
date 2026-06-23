import type { Task, User } from '@prisma/client';
import { NotificationsService } from './notifications.service';

type TaskWithUsers = Task & {
  requestor: User;
  acceptor?: User | null;
};

export async function notifyTaskAccepted(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  if (!task.acceptorId) return;
  await notifications.createIfNew({
    userId: task.requestorId,
    targetRole: 'requestor',
    type: 'task_accepted',
    priority: 'high',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Task accepted',
    message: `${task.acceptor?.name ?? 'An acceptor'} accepted your task.`,
    idempotencyKey: `${task.id}:task_accepted:requestor`,
  });
}

export async function notifyTaskQuit(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  await notifications.createIfNew({
    userId: task.requestorId,
    targetRole: 'requestor',
    type: 'acceptor_quit',
    priority: 'high',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Acceptor quit task',
    message: 'The acceptor quit within the grace window. The task is open again.',
    idempotencyKey: `${task.id}:acceptor_quit:requestor`,
  });
}

export async function notifyDisputeRaised(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  if (!task.acceptorId) return;
  await notifications.createIfNew({
    userId: task.acceptorId,
    targetRole: 'acceptor',
    type: 'dispute_raised',
    priority: 'critical',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Dispute raised',
    message: 'The requestor raised a dispute on this task.',
    idempotencyKey: `${task.id}:dispute_raised:${task.disputeCount}:acceptor`,
  });
}

export async function notifyMarkDone(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  await notifications.createIfNew({
    userId: task.requestorId,
    targetRole: 'requestor',
    type: 'task_marked_done',
    priority: 'high',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Task marked done',
    message: 'Review the work and accept it or raise a dispute.',
    idempotencyKey: `${task.id}:task_marked_done:requestor`,
  });
}

export async function notifyRatingRequired(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  await notifications.createIfNew({
    userId: task.requestorId,
    targetRole: 'requestor',
    type: 'rating_required',
    priority: 'critical',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Rating required',
    message: 'Please rate the acceptor to close this task.',
    idempotencyKey: `${task.id}:rating_required:requestor`,
  });
}

export async function notifyForceCloseRequested(
  notifications: NotificationsService,
  task: TaskWithUsers,
) {
  await notifications.notifyAdmins({
    type: 'admin_force_close_request',
    priority: 'critical',
    taskId: task.id,
    taskDisplayId: task.publicId,
    taskTitle: task.title,
    title: 'Force-close request',
    message: `Requestor requested force-close on ${task.publicId}.`,
    idempotencyKey: `${task.id}:admin_force_close_request`,
  });
}
