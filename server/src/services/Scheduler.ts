import { schedule as cronSchedule, validate as cronValidate } from 'node-cron';
import type { ScheduledTask } from 'node-cron';

type JobCallback = () => Promise<void> | void;

export type SchedulerTaskStatus = 'healthy' | 'warning' | 'error' | 'disabled';

export const SCHEDULER_TASK_STATUS_VALUES: readonly SchedulerTaskStatus[] = ['healthy', 'warning', 'error', 'disabled'] as const;

export interface ScheduledJobMeta {
  name: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  nextRunAt: string | null;
  enabled: boolean;
  status: SchedulerTaskStatus;
}

interface ScheduledJob {
  task: ScheduledTask;
  callback: JobCallback;
  wrappedCallback: () => Promise<void>;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  enabled: boolean;
  running: boolean;
}

interface ActivityRetentionRepository {
  cleanupOldEvents(retentionDays: number): Promise<number>;
}

export interface TaskExecutionsRepository {
  create: (input: {
    taskName: string;
    startedAt: Date;
    status: string;
  }) => Promise<{ id: number }>;
  update: (id: number, input: {
    status: string;
    completedAt: Date;
    durationMs: number;
    errorMessage: string | null;
  }) => Promise<void>;
  prune: (taskName: string, retainCount: number) => Promise<number>;
}

export interface SchedulerStateRepository {
  getTaskState(taskName: string): Promise<string | null>;
  setTaskState(taskName: string, nextRunAt: string): Promise<void>;
  getAllTaskStates(): Promise<Record<string, string>>;
}

/**
 * Snapshot of scheduler runtime health for observability surfaces.
 *
 * - `scheduledTaskCount` is the number of jobs currently registered, which
 *   reflects the live `Map<name, ScheduledJob>` and updates whenever a job
 *   is added (`schedule`) or removed (`stop`/`stopAll`).
 * - `missedTaskCount` is the number of tasks recovered during the most
 *   recent call to `start()`. It is reset on each call so subsequent calls
 *   always report the delta of the latest recovery rather than the cumulative
 *   total.
 * - `lastRecoveryAt` is an ISO timestamp of when the most recent `start()`
 *   recovery run completed. It is only present after the first `start()` call.
 */
export interface SchedulerHealth {
  scheduledTaskCount: number;
  missedTaskCount: number;
  lastRecoveryAt?: string;
}

/**
 * Manages cron-scheduled background jobs with named registration.
 */
export class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private taskExecutionsRepository: TaskExecutionsRepository | null = null;
  private schedulerStateRepository: SchedulerStateRepository | null = null;
  private lastMissedTaskCount: number = 0;
  private lastRecoveryAt: string | null = null;

  setTaskExecutionsRepository(repo: TaskExecutionsRepository): void {
    this.taskExecutionsRepository = repo;
  }

  setSchedulerStateRepository(repo: SchedulerStateRepository): void {
    this.schedulerStateRepository = repo;
  }

  /**
   * Schedule a named job with a cron expression.
   */
  schedule(name: string, cronExpression: string, callback: JobCallback): void {
    if (this.jobs.has(name)) {
      throw new Error(`Job '${name}' is already scheduled`);
    }

    if (!cronValidate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const wrappedCallback = () => this.executeRecorded(name, callback);

    const meta: ScheduledJob = {
      task: null as unknown as ScheduledTask,
      callback,
      wrappedCallback,
      cronExpression,
      lastRunAt: null,
      lastDurationMs: null,
      enabled: true,
      running: false,
    };

    const task = cronSchedule(cronExpression, wrappedCallback);
    meta.task = task;

    this.jobs.set(name, meta);

    const nextRun = this.computeNextRun(cronExpression);
    if (nextRun && this.schedulerStateRepository) {
      this.schedulerStateRepository.setTaskState(name, nextRun);
    }
  }

  /**
   * Return metadata for all scheduled jobs.
   */
  listJobsMeta(): ScheduledJobMeta[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      cronExpression: job.cronExpression,
      lastRunAt: job.lastRunAt,
      lastDurationMs: job.lastDurationMs,
      nextRunAt: this.computeNextRun(job.cronExpression),
      enabled: job.enabled,
      status: job.enabled ? 'healthy' : 'disabled',
    }));
  }

  private computeNextRun(cronExpression: string): string | null {
    try {
      const parts = cronExpression.split(' ') as [string, string, string, string, string];
      if (parts.length !== 5) return null;
      const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts;

      // This implementation covers the cron patterns used by the scheduler.
      // Day-of-month, month, and day-of-week are expected to be wildcards.
      if (dayPart !== '*' || monthPart !== '*' || weekdayPart !== '*') {
        return null;
      }

      const now = new Date();

      // Every minute: * * * * *
      if (minutePart === '*') {
        const next = new Date(now.getTime() + 60 * 1000);
        next.setSeconds(0, 0);
        return next.toISOString();
      }

      // Every N minutes: */N * * * *
      if (minutePart.startsWith('*/')) {
        const interval = parseInt(minutePart.slice(2), 10);
        if (!isNaN(interval) && interval > 0) {
          const currentMinute = now.getMinutes();
          const minutesUntilNext = interval - (currentMinute % interval);
          const next = new Date(now.getTime() + minutesUntilNext * 60 * 1000);
          next.setSeconds(0, 0);
          return next.toISOString();
        }
      }

      // Specific minute value
      const minute = parseInt(minutePart, 10);
      if (isNaN(minute) || minute < 0 || minute >= 60) {
        return null;
      }

      // Every N hours at minute M: M */N * * *
      if (hourPart.startsWith('*/')) {
        const interval = parseInt(hourPart.slice(2), 10);
        if (!isNaN(interval) && interval > 0) {
          const currentHour = now.getHours();
          let hoursUntilNext = interval - (currentHour % interval);
          if (hoursUntilNext === 0 && now.getMinutes() >= minute) {
            hoursUntilNext = interval;
          }
          const next = new Date(now.getTime() + hoursUntilNext * 60 * 60 * 1000);
          next.setMinutes(minute, 0, 0);
          return next.toISOString();
        }
      }

      // Every hour at minute M: M * * * *
      if (hourPart === '*') {
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minute, 0, 0);
        if (candidate.getTime() <= now.getTime()) {
          candidate.setHours(candidate.getHours() + 1);
        }
        return candidate.toISOString();
      }

      // Specific hour value: M H * * * (daily at H:M)
      const hour = parseInt(hourPart, 10);
      if (isNaN(hour) || hour < 0 || hour >= 24) {
        return null;
      }

      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
      if (candidate.getTime() <= now.getTime()) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Check if a job is scheduled.
   */
  isScheduled(name: string): boolean {
    return this.jobs.has(name);
  }

  /**
   * Toggle a job's enabled state.
   */
  toggleEnabled(name: string, enabled: boolean): void {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job '${name}' is not scheduled`);
    }
    job.enabled = enabled;
  }

  /**
   * List all scheduled job names.
   */
  listJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Stop and remove a specific job.
   */
  stop(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.task.stop();
      // Fire-and-forget: tests verify the call via synchronous mock recording
      if (this.schedulerStateRepository) {
        this.schedulerStateRepository.setTaskState(name, '');
      }
      this.jobs.delete(name);
    }
  }

  /**
   * Stop and remove all jobs.
   */
  stopAll(): void {
    for (const [, job] of this.jobs) {
      job.task.stop();
    }
    this.jobs.clear();
  }

  /**
   * Reschedule a job with a new cron expression.
   */
  reschedule(name: string, cronExpression: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job '${name}' is not scheduled`);
    }
    if (!cronValidate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    if (job.cronExpression === cronExpression) {
      return;
    }
    job.task.stop();
    const newTask = cronSchedule(cronExpression, job.wrappedCallback);
    job.task = newTask;
    job.cronExpression = cronExpression;

    const nextRun = this.computeNextRun(cronExpression);
    if (nextRun && this.schedulerStateRepository) {
      this.schedulerStateRepository.setTaskState(name, nextRun);
    }
  }

  /**
   * Run a job immediately (useful for testing and manual triggers).
   */
  async runNow(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job '${name}' is not scheduled`);
    }
    await job.wrappedCallback();
  }

  /**
   * Manually trigger a scheduled job, recording the execution in the
   * taskExecutionsRepository.  Creates a RUNNING record before invoking
   * the callback, then updates the record to SUCCESS or FAILED.
   */
  async triggerTask(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job '${name}' is not scheduled`);
    }
    await this.executeRecorded(name, job.callback, { rethrow: true });
  }

  /**
   * Recover missed tasks on startup. Loads all persisted nextRun timestamps
   * from the state repository and runs each task whose stored nextRun is in
   * the past. Tasks whose stored nextRun is in the future, or for which no
   * persisted nextRun exists, are skipped. Per-task running guards prevent
   * a normal cron tick from double-executing while recovery is in flight.
   */
  async start(): Promise<void> {
    if (!this.schedulerStateRepository) {
      return;
    }

    const pendingRecovery = new Set<string>();
    for (const [name, job] of this.jobs) {
      if (job.enabled) {
        job.running = true;
        pendingRecovery.add(name);
      }
    }

    let states: Record<string, string>;
    try {
      states = await this.schedulerStateRepository.getAllTaskStates();
    } catch (error) {
      console.error('Scheduler failed to load persisted task states:', error);
      for (const name of pendingRecovery) {
        const job = this.jobs.get(name);
        if (job) {
          job.running = false;
        }
      }
      throw error;
    }

    const now = Date.now();
    const recoveryPromises: Promise<void>[] = [];
    let missedTaskCount = 0;

    for (const [name, nextRunAt] of Object.entries(states)) {
      const job = this.jobs.get(name);
      pendingRecovery.delete(name);
      if (!job || !job.enabled) {
        if (job) {
          job.running = false;
        }
        continue;
      }

      const nextRunDate = new Date(nextRunAt);
      if (Number.isNaN(nextRunDate.getTime())) {
        job.running = false;
        continue;
      }

      if (nextRunDate.getTime() < now) {
        job.running = false;
        missedTaskCount += 1;
        recoveryPromises.push(this.executeRecorded(name, job.callback));
      } else {
        job.running = false;
      }
    }

    for (const name of pendingRecovery) {
      const job = this.jobs.get(name);
      if (job) {
        job.running = false;
      }
    }

    await Promise.all(recoveryPromises);

    // Record recovery metrics for the health endpoint. These reflect the
    // most-recent recovery run only — a subsequent start() that recovers a
    // different set of tasks will overwrite them rather than accumulate.
    this.lastMissedTaskCount = missedTaskCount;
    this.lastRecoveryAt = new Date().toISOString();
  }

  /**
   * Prune old task execution records, keeping only the last `retainCount` per task.
   */
  async pruneTaskExecutions(taskName: string, retainCount = 100): Promise<number> {
    if (!this.taskExecutionsRepository) {
      return 0;
    }
    return this.taskExecutionsRepository.prune(taskName, retainCount);
  }

  /**
   * Return an additive health snapshot for `/api/health` and
   * `/api/system/status`. The shape is stable and read-only — health
   * consumers may safely destructure the optional `lastRecoveryAt` field.
   */
  getHealth(): SchedulerHealth {
    const health: SchedulerHealth = {
      scheduledTaskCount: this.jobs.size,
      missedTaskCount: this.lastMissedTaskCount,
    };
    if (this.lastRecoveryAt !== null) {
      health.lastRecoveryAt = this.lastRecoveryAt;
    }
    return health;
  }

  /**
   * Shared execution harness used by both cron-fired callbacks and manual
   * triggers. Records a RUNNING taskExecution, runs the callback, updates the
   * record to SUCCESS/FAILED, refreshes the job's last-run metadata, and
   * prunes old executions to keep history bounded.
   */
  private async executeRecorded(
    name: string,
    callback: JobCallback,
    options: { rethrow?: boolean } = {},
  ): Promise<void> {
    const job = this.jobs.get(name);
    if (!job || !job.enabled || job.running) {
      return;
    }
    job.running = true;
    const start = Date.now();
    let record: { id: number } | undefined;
    try {
      if (this.taskExecutionsRepository) {
        record = await this.taskExecutionsRepository.create({
          taskName: name,
          startedAt: new Date(),
          status: 'RUNNING',
        });
      }
      await callback();
      if (this.taskExecutionsRepository && record) {
        await this.taskExecutionsRepository.update(record.id, {
          status: 'SUCCESS',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          errorMessage: null,
        });
      }
    } catch (error) {
      console.error(`Scheduler job '${name}' failed:`, error);
      if (this.taskExecutionsRepository && record) {
        await this.taskExecutionsRepository.update(record.id, {
          status: 'FAILED',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      if (options.rethrow) {
        throw error;
      }
    } finally {
      const job = this.jobs.get(name);
      if (job) {
        job.lastRunAt = new Date().toISOString();
        job.lastDurationMs = Date.now() - start;
        job.running = false;
      }
      if (this.schedulerStateRepository && job) {
        const nextRun = this.computeNextRun(job.cronExpression);
        if (nextRun) {
          await this.schedulerStateRepository.setTaskState(name, nextRun);
        }
      }
      if (this.taskExecutionsRepository) {
        try {
          await this.pruneTaskExecutions(name, 100);
        } catch (pruneError) {
          console.error(`Scheduler failed to prune executions for '${name}':`, pruneError);
        }
      }
    }
  }

  /**
   * Schedule daily cleanup for expired activity events.
   */
  scheduleActivityCleanup(
    repository: ActivityRetentionRepository,
    retentionDays = 30,
    name = 'activity-cleanup',
    cronExpression = '0 3 * * *',
  ): void {
    this.schedule(name, cronExpression, async () => {
      await repository.cleanupOldEvents(retentionDays);
    });
  }

  /**
   * Schedule periodic searches for all missing wanted media.
   */
  scheduleWantedSearch(
    wantedSearchService: { autoSearchAll: () => Promise<void> },
    name = 'wanted-search',
    cronExpression = '0 */6 * * *', // Every 6 hours by default
  ): void {
    this.schedule(name, cronExpression, async () => {
      await wantedSearchService.autoSearchAll();
    });
  }

  /**
   * Schedule periodic subtitle automation scans for missing wanted subtitles.
   */
  scheduleSubtitleWantedSearch(
    subtitleAutomationService: { runAutomationCycle: () => Promise<unknown> },
    name = 'subtitle-wanted-search',
    cronExpression = '0 */6 * * *',
  ): void {
    this.schedule(name, cronExpression, async () => {
      await subtitleAutomationService.runAutomationCycle();
    });
  }

  /**
   * Schedule daily library scan to reconcile DB with filesystem.
   */
  scheduleLibraryScan(
    libraryScanService: {
      scanAll: (settings: { movieRootFolder: string; tvRootFolder: string }) => Promise<unknown>;
    },
    settingsProvider: { get: () => Promise<{ mediaManagement?: { movieRootFolder?: string; tvRootFolder?: string } }> },
    name = 'library-scan',
    cronExpression = '0 2 * * *',
  ): void {
    this.schedule(name, cronExpression, async () => {
      const settings = await settingsProvider.get();
      const movieRootFolder = settings.mediaManagement?.movieRootFolder ?? '';
      const tvRootFolder = settings.mediaManagement?.tvRootFolder ?? '';
      await libraryScanService.scanAll({ movieRootFolder, tvRootFolder });
    });
  }

  /**
   * Schedule periodic targeted subtitle search — only processes recently-added and failed items.
   */
  scheduleTargetedSubtitleSearch(
    subtitleAutomationService: { runTargetedAutomationCycle: (options?: { recentDays?: number; limit?: number }) => Promise<unknown> },
    name = 'subtitle-targeted-search',
    cronExpression = '0 3 * * *', // Daily at 3 AM
  ): void {
    this.schedule(name, cronExpression, async () => {
      await subtitleAutomationService.runTargetedAutomationCycle({ recentDays: 7 });
    });
  }
}
