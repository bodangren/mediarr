import cron from 'node-cron';

type JobCallback = () => Promise<void> | void;

interface ScheduledJob {
  task: cron.ScheduledTask;
  callback: JobCallback;
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

    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`Scheduler job '${name}' failed:`, error);
      }
    }, { scheduled: true });

    this.jobs.set(name, { task, callback });
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
    for (const [name, job] of this.jobs) {
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
    await job.callback();
  }
}
