import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler } from '../server/src/services/Scheduler';

describe('Scheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  afterEach(() => {
    scheduler.stopAll();
  });

  it('should register a named job with a cron expression', () => {
    const callback = vi.fn();
    scheduler.schedule('test-job', '*/5 * * * *', callback);

    expect(scheduler.isScheduled('test-job')).toBe(true);
  });

  it('should list all scheduled jobs', () => {
    scheduler.schedule('job1', '*/5 * * * *', vi.fn());
    scheduler.schedule('job2', '*/10 * * * *', vi.fn());

    const jobs = scheduler.listJobs();
    expect(jobs).toHaveLength(2);
    expect(jobs).toContain('job1');
    expect(jobs).toContain('job2');
  });

  it('should stop a specific job', () => {
    scheduler.schedule('removable', '*/5 * * * *', vi.fn());
    expect(scheduler.isScheduled('removable')).toBe(true);

    scheduler.stop('removable');
    expect(scheduler.isScheduled('removable')).toBe(false);
  });

  it('should stop all jobs', () => {
    scheduler.schedule('j1', '*/5 * * * *', vi.fn());
    scheduler.schedule('j2', '*/10 * * * *', vi.fn());

    scheduler.stopAll();
    expect(scheduler.listJobs()).toHaveLength(0);
  });

  it('should not allow duplicate job names', () => {
    scheduler.schedule('dup', '*/5 * * * *', vi.fn());
    expect(() => scheduler.schedule('dup', '*/10 * * * *', vi.fn())).toThrow(/already scheduled/i);
  });

  it('should validate cron expressions', () => {
    expect(() => scheduler.schedule('bad', 'not a cron', vi.fn())).toThrow(/invalid/i);
  });

  it('should allow running a job manually (for testing)', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    scheduler.schedule('manual', '*/5 * * * *', callback);

    await scheduler.runNow('manual');
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should schedule activity cleanup job and execute retention purge', async () => {
    const activityRepository = {
      cleanupOldEvents: vi.fn().mockResolvedValue(7),
    };

    scheduler.scheduleActivityCleanup(activityRepository, 45, 'activity-cleanup');
    await scheduler.runNow('activity-cleanup');

    expect(activityRepository.cleanupOldEvents).toHaveBeenCalledWith(45);
  });
});
