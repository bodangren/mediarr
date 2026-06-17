import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scheduler } from './Scheduler';

// Spy on node-cron so we can assert call args and inspect the registered task handles.
const cronSpy = vi.hoisted(() => {
  const tasks: Array<{ stop: ReturnType<typeof vi.fn> }> = [];
  return {
    scheduleMock: vi.fn((_expr: string, _cb: () => void) => {
      const task = { stop: vi.fn() };
      tasks.push(task);
      return task;
    }),
    validateMock: vi.fn((expr: string) => /^\S+ \S+ \S+ \S+ \S+/.test(expr)),
    tasks,
  };
});

vi.mock('node-cron', () => ({
  schedule: cronSpy.scheduleMock,
  validate: cronSpy.validateMock,
}));

describe('Scheduler core contract', () => {
  let scheduler: Scheduler;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.tasks.length = 0;
    scheduler = new Scheduler();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('rejects duplicate job names', () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    expect(() =>
      scheduler.schedule('rss-sync', '*/30 * * * *', () => undefined),
    ).toThrow(/already scheduled/);
    expect(cronSpy.scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid cron expressions', () => {
    expect(() => scheduler.schedule('bad', 'not-a-cron', () => undefined)).toThrow(
      /Invalid cron expression/,
    );
    expect(cronSpy.scheduleMock).not.toHaveBeenCalled();
  });

  describe('per-helper default cron registration', () => {
    it('scheduleActivityCleanup registers activity-cleanup with daily 03:00', () => {
      const repository = { cleanupOldEvents: vi.fn().mockResolvedValue(0) };
      scheduler.scheduleActivityCleanup(repository);
      expect(scheduler.isScheduled('activity-cleanup')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function),
      );
    });

    it('scheduleWantedSearch registers wanted-search with every-6-hours by default', () => {
      scheduler.scheduleWantedSearch({ autoSearchAll: vi.fn().mockResolvedValue(undefined) });
      expect(scheduler.isScheduled('wanted-search')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function),
      );
    });

    it('scheduleSubtitleWantedSearch registers subtitle-wanted-search with every-6-hours', () => {
      scheduler.scheduleSubtitleWantedSearch({ runAutomationCycle: vi.fn().mockResolvedValue({}) });
      expect(scheduler.isScheduled('subtitle-wanted-search')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function),
      );
    });

    it('scheduleLibraryScan registers library-scan with daily 02:00 and passes root folders to scanAll', async () => {
      const libraryScanService = { scanAll: vi.fn().mockResolvedValue(undefined) };
      const settingsProvider = {
        get: vi.fn().mockResolvedValue({
          mediaManagement: { movieRootFolder: '/movies', tvRootFolder: '/tv' },
        }),
      };
      scheduler.scheduleLibraryScan(libraryScanService, settingsProvider);
      expect(scheduler.isScheduled('library-scan')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
      );
      await scheduler.runNow('library-scan');
      expect(libraryScanService.scanAll).toHaveBeenCalledWith({
        movieRootFolder: '/movies',
        tvRootFolder: '/tv',
      });
    });

    it('scheduleTargetedSubtitleSearch registers subtitle-targeted-search with daily 03:00 and passes recentDays=7', async () => {
      const subtitleAutomationService = {
        runTargetedAutomationCycle: vi.fn().mockResolvedValue(undefined),
      };
      scheduler.scheduleTargetedSubtitleSearch(subtitleAutomationService);
      expect(scheduler.isScheduled('subtitle-targeted-search')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function),
      );
      await scheduler.runNow('subtitle-targeted-search');
      expect(subtitleAutomationService.runTargetedAutomationCycle).toHaveBeenCalledWith({
        recentDays: 7,
      });
    });
  });

  describe('per-helper overrides', () => {
    it('scheduleActivityCleanup accepts custom retentionDays, name, and cronExpression', () => {
      const repository = { cleanupOldEvents: vi.fn().mockResolvedValue(7) };
      scheduler.scheduleActivityCleanup(repository, 7, 'cleanup-job', '0 4 * * 0');
      expect(scheduler.isScheduled('cleanup-job')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '0 4 * * 0',
        expect.any(Function),
      );
    });

    it('scheduleWantedSearch accepts custom cron expression', () => {
      scheduler.scheduleWantedSearch(
        { autoSearchAll: vi.fn().mockResolvedValue(undefined) },
        'wanted-custom',
        '*/20 * * * *',
      );
      expect(scheduler.isScheduled('wanted-custom')).toBe(true);
      expect(cronSpy.scheduleMock).toHaveBeenCalledWith(
        '*/20 * * * *',
        expect.any(Function),
      );
    });
  });

  describe('cron-wrapped callback behavior', () => {
    it('captures lastRunAt and lastDurationMs after a successful cron tick', async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      scheduler.schedule('tick-job', '*/5 * * * *', callback);
      const wrapped = cronSpy.scheduleMock.mock.calls[0]?.[1] as () => Promise<void>;
      expect(wrapped).toBeTypeOf('function');
      await wrapped();
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'tick-job');
      expect(meta?.lastRunAt).not.toBeNull();
      expect(typeof meta?.lastDurationMs).toBe('number');
      expect((meta?.lastDurationMs ?? -1) as number).toBeGreaterThanOrEqual(0);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('swallows and logs errors thrown from the cron callback, then still records meta', async () => {
      const boom = new Error('upstream blew up');
      scheduler.schedule('flaky-job', '*/5 * * * *', vi.fn().mockRejectedValue(boom));
      const wrapped = cronSpy.scheduleMock.mock.calls[0]?.[1] as () => Promise<void>;
      await wrapped();
      expect(errorSpy).toHaveBeenCalledWith(
        "Scheduler job 'flaky-job' failed:",
        boom,
      );
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'flaky-job');
      expect(meta?.lastRunAt).not.toBeNull();
      expect(meta?.lastDurationMs).not.toBeNull();
    });

    it('runNow uses the same wrapped callback and swallows/logging errors', async () => {
      const boom = new Error('runNow blew up');
      scheduler.schedule('runnow-flaky', '*/5 * * * *', vi.fn().mockRejectedValue(boom));
      await scheduler.runNow('runnow-flaky');
      expect(errorSpy).toHaveBeenCalledWith(
        "Scheduler job 'runnow-flaky' failed:",
        boom,
      );
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'runnow-flaky');
      expect(meta?.lastRunAt).not.toBeNull();
      expect(meta?.lastDurationMs).not.toBeNull();
    });
  });

  describe('stop / stopAll / listJobs / isScheduled', () => {
    it('stop(name) stops the underlying task and removes the job', () => {
      scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
      const registered = cronSpy.tasks[0];
      expect(registered).toBeDefined();
      scheduler.stop('rss-sync');
      expect(registered?.stop).toHaveBeenCalledTimes(1);
      expect(scheduler.isScheduled('rss-sync')).toBe(false);
      expect(scheduler.listJobs()).not.toContain('rss-sync');
    });

    it('stop(unknownName) is a no-op and does not throw', () => {
      expect(() => scheduler.stop('never-registered')).not.toThrow();
    });

    it('stopAll stops every registered task and clears the registry', () => {
      scheduler.schedule('a', '*/5 * * * *', () => undefined);
      scheduler.schedule('b', '*/10 * * * *', () => undefined);
      scheduler.schedule('c', '*/15 * * * *', () => undefined);
      expect(cronSpy.tasks).toHaveLength(3);
      scheduler.stopAll();
      for (const task of cronSpy.tasks) {
        expect(task.stop).toHaveBeenCalledTimes(1);
      }
      expect(scheduler.listJobs()).toEqual([]);
      expect(scheduler.isScheduled('a')).toBe(false);
      expect(scheduler.isScheduled('b')).toBe(false);
      expect(scheduler.isScheduled('c')).toBe(false);
    });

    it('isScheduled and listJobs reflect additions and removals', () => {
      expect(scheduler.isScheduled('a')).toBe(false);
      expect(scheduler.listJobs()).toEqual([]);
      scheduler.schedule('a', '*/5 * * * *', () => undefined);
      scheduler.schedule('b', '*/10 * * * *', () => undefined);
      expect(scheduler.isScheduled('a')).toBe(true);
      expect(scheduler.isScheduled('b')).toBe(true);
      expect(scheduler.listJobs().sort()).toEqual(['a', 'b']);
      scheduler.stop('a');
      expect(scheduler.isScheduled('a')).toBe(false);
      expect(scheduler.listJobs()).toEqual(['b']);
    });
  });

  describe('nextRunAt computation', () => {
    it('returns a valid ISO timestamp for daily cron "0 3 * * *"', () => {
      scheduler.schedule('daily-job', '0 3 * * *', () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'daily-job');
      expect(meta?.nextRunAt).not.toBeNull();
      expect(() => new Date(meta!.nextRunAt!)).not.toThrow();
    });

    it('returns tomorrow for a daily cron when today\'s run has already passed', () => {
      const now = new Date();
      const passedHour = now.getHours() === 0 ? 0 : now.getHours() - 1;
      const expression = `0 ${passedHour} * * *`;
      scheduler.schedule('passed-daily', expression, () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'passed-daily');
      const next = new Date(meta!.nextRunAt!);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(next.getDate()).toBe(tomorrow.getDate());
    });

    it('returns today for a daily cron when today\'s run has not yet passed', () => {
      const now = new Date();
      const futureHour = now.getHours() >= 23 ? 0 : now.getHours() + 1;
      const expression = `0 ${futureHour} * * *`;
      scheduler.schedule('future-daily', expression, () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'future-daily');
      const next = new Date(meta!.nextRunAt!);
      const expectedDate = futureHour > now.getHours() ? now.getDate() : now.getDate() + 1;
      expect(next.getDate()).toBe(expectedDate);
    });

    it('returns the next */N minute boundary', () => {
      scheduler.schedule('frequent-job', '*/15 * * * *', () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'frequent-job');
      const next = new Date(meta!.nextRunAt!);
      expect(next.getMinutes() % 15).toBe(0);
      expect(next.getSeconds()).toBe(0);
    });

    it('returns the next 0 */H hour boundary', () => {
      scheduler.schedule('hourly-job', '0 */6 * * *', () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'hourly-job');
      const next = new Date(meta!.nextRunAt!);
      expect(next.getMinutes()).toBe(0);
      expect(next.getSeconds()).toBe(0);
      expect(next.getHours() % 6).toBe(0);
    });

    it('returns a future timestamp for every-minute cron', () => {
      scheduler.schedule('every-minute', '* * * * *', () => undefined);
      const meta = scheduler.listJobsMeta().find((m) => m.name === 'every-minute');
      const next = new Date(meta!.nextRunAt!);
      const now = new Date();
      expect(next.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });
});
