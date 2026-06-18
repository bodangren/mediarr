import { schedule as cronSchedule, validate as cronValidate } from 'node-cron';
import type { ScheduledTask } from 'node-cron';

type JobCallback = () => Promise<void> | void;

export interface ScheduledJobMeta {
  name: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  nextRunAt: string | null;
}

interface ScheduledJob {
  task: ScheduledTask;
  callback: JobCallback;
  wrappedCallback: () => Promise<void>;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
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

/**
 * Manages cron-scheduled background jobs with named registration.
 */
export class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private taskExecutionsRepository: TaskExecutionsRepository | null = null;

  setTaskExecutionsRepository(repo: TaskExecutionsRepository): void {
    this.taskExecutionsRepository = repo;
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
    };

    const task = cronSchedule(cronExpression, wrappedCallback);
    meta.task = task;

    this.jobs.set(name, meta);
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
   * Prune old task execution records, keeping only the last `retainCount` per task.
   */
  async pruneTaskExecutions(taskName: string, retainCount = 100): Promise<number> {
    if (!this.taskExecutionsRepository) {
      return 0;
    }
    return this.taskExecutionsRepository.prune(taskName, retainCount);
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
