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
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
}

interface ActivityRetentionRepository {
  cleanupOldEvents(retentionDays: number): Promise<number>;
}

/**
 * Manages cron-scheduled background jobs with named registration.
 */
export class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();

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

    const meta: ScheduledJob = {
      task: null as unknown as ScheduledTask,
      callback,
      cronExpression,
      lastRunAt: null,
      lastDurationMs: null,
    };

    const wrappedCallback = async () => {
      const start = Date.now();
      try {
        await callback();
      } catch (error) {
        console.error(`Scheduler job '${name}' failed:`, error);
      } finally {
        meta.lastRunAt = new Date().toISOString();
        meta.lastDurationMs = Date.now() - start;
      }
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
      // Parse the cron expression to determine next execution time
      // node-cron doesn't expose next-run directly; use a simple heuristic
      const parts = cronExpression.split(' ');
      if (parts.length < 5) return null;
      const minutePart = parts[0];
      const now = new Date();
      // For */N patterns, compute the next occurrence
      if (minutePart && minutePart.startsWith('*/')) {
        const interval = parseInt(minutePart.slice(2), 10);
        if (!isNaN(interval) && interval > 0) {
          const currentMinute = now.getMinutes();
          const minutesUntilNext = interval - (currentMinute % interval);
          const next = new Date(now.getTime() + minutesUntilNext * 60 * 1000);
          next.setSeconds(0, 0);
          return next.toISOString();
        }
      }
      // For 0 */H patterns (hourly-based)
      const hourPart = parts[1];
      if (minutePart === '0' && hourPart && hourPart.startsWith('*/')) {
        const interval = parseInt(hourPart.slice(2), 10);
        if (!isNaN(interval) && interval > 0) {
          const currentHour = now.getHours();
          const hoursUntilNext = interval - (currentHour % interval);
          const next = new Date(now.getTime() + hoursUntilNext * 60 * 60 * 1000);
          next.setMinutes(0, 0, 0);
          return next.toISOString();
        }
      }
      return null;
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
   * Run a job immediately (useful for testing and manual triggers).
   */
  async runNow(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job '${name}' is not scheduled`);
    }
    const start = Date.now();
    try {
      await job.callback();
    } finally {
      job.lastRunAt = new Date().toISOString();
      job.lastDurationMs = Date.now() - start;
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
