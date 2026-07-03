/**
 * Browser Operator Queue — Priority-based task queue with concurrency control
 *
 * Tasks are sorted by priority (critical > high > normal > low),
 * then by creation time (FIFO within same priority).
 */

import type {
  BrowserTask,
  BrowserTaskInput,
  BrowserTaskOutput,
  BrowserTaskStatus,
  BrowserQueueEvent,
  BrowserQueueEventHandler,
  BrowserQueueEventType,
} from './BrowserOperatorTypes';

// ── Priority ordering ──────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ── Queue Class ────────────────────────────────────────────────
export class BrowserOperatorQueue {
  private queue: BrowserTask[] = [];
  private tasks: Map<string, BrowserTask> = new Map();
  private handlers: Map<BrowserQueueEventType, BrowserQueueEventHandler[]> = new Map();
  private maxConcurrent: number;
  private activeCount: number = 0;

  constructor(maxConcurrent: number = 1) {
    this.maxConcurrent = maxConcurrent;
  }

  // ── Event subscription ───────────────────────────────────────

  on(event: BrowserQueueEventType, handler: BrowserQueueEventHandler): void {
    const handlers = this.handlers.get(event) ?? [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  off(event: BrowserQueueEventType, handler: BrowserQueueEventHandler): void {
    const handlers = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      handlers.filter((h) => h !== handler),
    );
  }

  private emit(event: BrowserQueueEvent): void {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const h of handlers) {
      try {
        h(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  // ── Task CRUD ────────────────────────────────────────────────

  /** Enqueue a new task */
  enqueue(input: BrowserTaskInput): BrowserTask {
    const task: BrowserTask = {
      id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      input,
      output: {
        status: 'queued',
        provider: input.provider,
        screenshots: [],
        logs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    this.queue.push(task);
    this.sortQueue();

    this.emit({
      type: 'task:queued',
      taskId: task.id,
      timestamp: new Date().toISOString(),
      data: { priority: input.priority ?? 'normal', mode: input.mode },
    });

    return task;
  }

  /** Get task by ID */
  get(taskId: string): BrowserTask | undefined {
    return this.tasks.get(taskId);
  }

  /** Get all tasks (optionally filtered by status) */
  list(status?: BrowserTaskStatus): BrowserTask[] {
    const all = Array.from(this.tasks.values());
    if (status) return all.filter((t) => t.output.status === status);
    return all;
  }

  /** Get next task to process (highest priority, first in) */
  dequeue(): BrowserTask | undefined {
    // Only dequeue if we have capacity
    if (this.activeCount >= this.maxConcurrent) return undefined;

    // Find first queued task
    const idx = this.queue.findIndex((t) => t.output.status === 'queued');
    if (idx === -1) return undefined;

    const task = this.queue.splice(idx, 1)[0];
    return task;
  }

  /** Update task status */
  updateStatus(taskId: string, status: BrowserTaskStatus, extra?: Partial<BrowserTaskOutput>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const now = new Date().toISOString();
    task.output.status = status;
    task.updatedAt = now;
    task.output.updatedAt = now;

    if (status === 'running') {
      task.startedAt = now;
      this.activeCount++;
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = now;
      this.activeCount = Math.max(0, this.activeCount - 1);
    }

    if (status === 'needs_human') {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }

    if (extra) {
      Object.assign(task.output, extra);
    }

    // Emit event
    const eventType: BrowserQueueEventType =
      status === 'completed' ? 'task:completed' :
      status === 'failed' ? 'task:failed' :
      status === 'needs_human' ? 'task:needs_human' :
      status === 'cancelled' ? 'task:cancelled' :
      status === 'running' ? 'task:started' :
      'task:queued';

    this.emit({
      type: eventType,
      taskId: task.id,
      timestamp: now,
    });
  }

  /** Mark task for retry */
  retry(taskId: string): BrowserTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (task.retryCount >= task.maxRetries) return null;
    if (task.output.status !== 'failed') return null;

    task.retryCount++;
    task.output.status = 'queued';
    task.output.screenshots = [];
    task.output.logs = [];
    task.output.error = undefined;
    task.updatedAt = new Date().toISOString();

    this.queue.push(task);
    this.sortQueue();

    this.emit({
      type: 'task:retried',
      taskId: task.id,
      timestamp: new Date().toISOString(),
      data: { retryCount: task.retryCount },
    });

    return task;
  }

  /** Cancel a task */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.output.status === 'completed' || task.output.status === 'running') return false;

    this.updateStatus(taskId, 'cancelled');
    // Remove from queue
    this.queue = this.queue.filter((t) => t.id !== taskId);
    return true;
  }

  /** Resume a needs_human task */
  markResumable(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.output.status !== 'needs_human') return false;

    task.output.status = 'queued';
    task.output.needsHumanReason = undefined;
    task.updatedAt = new Date().toISOString();

    this.queue.push(task);
    this.sortQueue();

    this.emit({
      type: 'task:queued',
      taskId: task.id,
      timestamp: new Date().toISOString(),
      data: { resumed: true },
    });

    return true;
  }

  /** Get queue stats */
  getStats(): {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    needsHuman: number;
    cancelled: number;
    activeConcurrent: number;
  } {
    const all = Array.from(this.tasks.values());
    return {
      total: all.length,
      queued: all.filter((t) => t.output.status === 'queued').length,
      running: all.filter((t) => t.output.status === 'running').length,
      completed: all.filter((t) => t.output.status === 'completed').length,
      failed: all.filter((t) => t.output.status === 'failed').length,
      needsHuman: all.filter((t) => t.output.status === 'needs_human').length,
      cancelled: all.filter((t) => t.output.status === 'cancelled').length,
      activeConcurrent: this.activeCount,
    };
  }

  /** Clean up old completed/failed/cancelled tasks */
  cleanup(maxAge: number = 3600_000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const [id, task] of this.tasks.entries()) {
      const terminal = ['completed', 'failed', 'cancelled'].includes(task.output.status);
      if (terminal && task.completedAt && new Date(task.completedAt).getTime() < cutoff) {
        this.tasks.delete(id);
        removed++;
      }
    }

    return removed;
  }

  // ── Internal ─────────────────────────────────────────────────

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.input.priority ?? 'normal'] ?? 2;
      const pb = PRIORITY_ORDER[b.input.priority ?? 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
}
