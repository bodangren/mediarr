import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scheduler, type SchedulerStateRepository } from './Scheduler';

/**
 * Phase 7 — Toggle enabled persistence (completion-audit residual).
 *
 * Spec: "Enable/Disable Toggle: Per-task on/off switch with persistent storage
 * in AppSettings." Reviews 2026-06-22/23 rejected archive until toggle state
 * survives process restart via AppSettings.schedulerEnabled.
 */

const cronSpy = vi.hoisted(() => {
  const callbacks: Array<() => Promise<void>> = [];
  return {
    scheduleMock: vi.fn((_expr: string, cb: () => Promise<void>) => {
      callbacks.push(cb);
      return { stop: vi.fn() };
    }),
    validateMock: vi.fn((expr: string) => /^\S+ \S+ \S+ \S+ \S+/.test(expr)),
    callbacks,
  };
});

vi.mock('node-cron', () => ({
  schedule: cronSpy.scheduleMock,
  validate: cronSpy.validateMock,
}));

interface SchedulerStateRepositoryMock extends SchedulerStateRepository {
  getTaskState: ReturnType<typeof vi.fn<(taskName: string) => Promise<string | null>>>;
  setTaskState: ReturnType<typeof vi.fn<(taskName: string, nextRunAt: string) => Promise<void>>>;
  getAllTaskStates: ReturnType<typeof vi.fn<() => Promise<Record<string, string>>>>;
  setEnabledState: ReturnType<typeof vi.fn<(taskName: string, enabled: boolean) => Promise<void>>>;
  getAllEnabledStates: ReturnType<typeof vi.fn<() => Promise<Record<string, boolean>>>>;
}

function createStateRepoMock(
  enabledStore: Record<string, boolean> = {},
  taskStates: Record<string, string> = {},
): SchedulerStateRepositoryMock {
  return {
    getTaskState: vi.fn().mockResolvedValue(null),
    setTaskState: vi.fn().mockResolvedValue(undefined),
    getAllTaskStates: vi.fn().mockResolvedValue(taskStates),
    setEnabledState: vi.fn(async (taskName: string, enabled: boolean) => {
      enabledStore[taskName] = enabled;
    }),
    getAllEnabledStates: vi.fn(async () => ({ ...enabledStore })),
  };
}

describe('Scheduler toggle persistence (Phase 7)', () => {
  let scheduler: Scheduler;
  let stateRepo: SchedulerStateRepositoryMock;
  let enabledStore: Record<string, boolean>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cronSpy.scheduleMock.mockClear();
    cronSpy.validateMock.mockClear();
    cronSpy.callbacks.length = 0;
    enabledStore = {};
    scheduler = new Scheduler();
    stateRepo = createStateRepoMock(enabledStore);
    scheduler.setSchedulerStateRepository(stateRepo);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('toggleEnabled() persists the enabled flag via SchedulerStateRepository.setEnabledState', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);

    await scheduler.toggleEnabled('rss-sync', false);

    expect(stateRepo.setEnabledState).toHaveBeenCalledWith('rss-sync', false);
    expect(enabledStore['rss-sync']).toBe(false);

    const meta = scheduler.listJobsMeta().find((j) => j.name === 'rss-sync');
    expect(meta?.enabled).toBe(false);
    expect(meta?.status).toBe('disabled');
  });

  it('toggleEnabled(true) persists re-enable', async () => {
    scheduler.schedule('wanted-search', '*/60 * * * *', () => undefined);
    await scheduler.toggleEnabled('wanted-search', false);
    expect(stateRepo.setEnabledState).toHaveBeenCalledWith('wanted-search', false);

    await scheduler.toggleEnabled('wanted-search', true);
    expect(stateRepo.setEnabledState).toHaveBeenCalledWith('wanted-search', true);
    expect(enabledStore['wanted-search']).toBe(true);
    expect(scheduler.listJobsMeta().find((j) => j.name === 'wanted-search')?.enabled).toBe(true);
  });

  it('start() reloads persisted enabled flags so disabled tasks stay disabled after restart', async () => {
    // Simulate prior process: enabled map stored in AppSettings
    enabledStore['rss-sync'] = false;
    enabledStore['wanted-search'] = true;

    // Fresh scheduler (restart): jobs re-registered with default enabled=true
    const restarted = new Scheduler();
    restarted.setSchedulerStateRepository(stateRepo);
    restarted.schedule('rss-sync', '*/15 * * * *', () => undefined);
    restarted.schedule('wanted-search', '*/60 * * * *', () => undefined);

    // Before start(), defaults apply
    expect(restarted.listJobsMeta().find((j) => j.name === 'rss-sync')?.enabled).toBe(true);

    await restarted.start();

    expect(stateRepo.getAllEnabledStates).toHaveBeenCalled();
    expect(restarted.listJobsMeta().find((j) => j.name === 'rss-sync')?.enabled).toBe(false);
    expect(restarted.listJobsMeta().find((j) => j.name === 'rss-sync')?.status).toBe('disabled');
    expect(restarted.listJobsMeta().find((j) => j.name === 'wanted-search')?.enabled).toBe(true);
  });

  it('does not recover a missed task disabled in persisted state', async () => {
    enabledStore['rss-sync'] = false;
    stateRepo = createStateRepoMock(enabledStore, {
      'rss-sync': new Date(Date.now() - 60_000).toISOString(),
    });
    const callback = vi.fn();
    const restarted = new Scheduler();
    restarted.setSchedulerStateRepository(stateRepo);
    restarted.schedule('rss-sync', '*/15 * * * *', callback);

    await restarted.start();

    expect(callback).not.toHaveBeenCalled();
    expect(restarted.getHealth().missedTaskCount).toBe(0);
  });

  it('start() does not invent enabled=false for tasks without a stored flag', async () => {
    // Empty store — all tasks default to enabled
    const restarted = new Scheduler();
    restarted.setSchedulerStateRepository(stateRepo);
    restarted.schedule('rss-sync', '*/15 * * * *', () => undefined);

    await restarted.start();

    expect(restarted.listJobsMeta().find((j) => j.name === 'rss-sync')?.enabled).toBe(true);
  });

  it('toggleEnabled throws for unknown job and does not call setEnabledState', async () => {
    await expect(scheduler.toggleEnabled('no-such-job', false)).rejects.toThrow(/not scheduled/);
    expect(stateRepo.setEnabledState).not.toHaveBeenCalled();
  });

  it('rejects a failed persistence write without changing the live enabled state', async () => {
    scheduler.schedule('rss-sync', '*/15 * * * *', () => undefined);
    stateRepo.setEnabledState.mockRejectedValue(new Error('database is read-only'));

    await expect(scheduler.toggleEnabled('rss-sync', false)).rejects.toThrow(
      'database is read-only',
    );

    expect(scheduler.listJobsMeta().find((job) => job.name === 'rss-sync')?.enabled).toBe(true);
  });
});
