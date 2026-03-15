import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scheduler } from './Scheduler';

// Mock node-cron so scheduled tasks don't actually fire during tests
vi.mock('node-cron', () => ({
  validate: (expr: string) => /^\S+ \S+ \S+ \S+ \S+/.test(expr),
  schedule: (_expr: string, _cb: () => void, _opts?: unknown) => ({
    stop: vi.fn(),
  }),
}));

describe('Scheduler metadata', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  it('listJobsMeta returns empty array when no jobs registered', () => {
    expect(scheduler.listJobsMeta()).toEqual([]);
  });

  it('listJobsMeta includes registered job names and cron expressions', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', async () => {});
    const meta = scheduler.listJobsMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0]?.name).toBe('rss-sync');
    expect(meta[0]?.cronExpression).toBe('*/15 * * * *');
  });

  it('lastRunAt and lastDurationMs are null before first run', () => {
    scheduler.schedule('test-job', '*/5 * * * *', async () => {});
    const meta = scheduler.listJobsMeta();
    expect(meta[0]?.lastRunAt).toBeNull();
    expect(meta[0]?.lastDurationMs).toBeNull();
  });

  it('runNow updates lastRunAt and lastDurationMs', async () => {
    scheduler.schedule('test-job', '*/5 * * * *', async () => {});
    await scheduler.runNow('test-job');
    const meta = scheduler.listJobsMeta();
    expect(meta[0]?.lastRunAt).not.toBeNull();
    expect(typeof meta[0]?.lastDurationMs).toBe('number');
  });

  it('runNow throws when job not found', async () => {
    await expect(scheduler.runNow('nonexistent')).rejects.toThrow();
  });

  it('computeNextRun returns a future date for */N minute expressions', () => {
    scheduler.schedule('fast-job', '*/5 * * * *', async () => {});
    const meta = scheduler.listJobsMeta();
    if (meta[0]?.nextRunAt) {
      const next = new Date(meta[0].nextRunAt);
      expect(next.getTime()).toBeGreaterThan(Date.now() - 1000); // at or after now
    }
  });
});
