import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Shared Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const BROWSER_TASKS_QUEUE = 'browser-tasks';

// Create the Queue
export const browserTasksQueue = new Queue(BROWSER_TASKS_QUEUE, { connection: connection as any });

// Queue events for tracking status
export const browserQueueEvents = new QueueEvents(BROWSER_TASKS_QUEUE, { connection: connection as any });

export async function addBrowserTask(taskId: string, payload: any) {
  return await browserTasksQueue.add('execute-browser', payload, {
    jobId: taskId,
    removeOnComplete: true,
    removeOnFail: 10,
  });
}
