/**
 * Corner-case tests for WantedSearchService.autoSearchAll.
 *
 * autoSearchAll() is the master orchestration method for the automated acquisition
 * pipeline. It fires a background loop (fire-and-forget via Promise.resolve().then())
 * that queries all wanted movies and series, searches each, then emits a completion event.
 *
 * Known bugs exercised here:
 *  1. Concurrent-execution race: calling autoSearchAll() while a prior run is in progress
 *     starts a duplicate background loop, causing every movie/series to be searched (and
 *     potentially grabbed) twice.
 *  2. Guard reset: after one run finishes the guard must clear so a subsequent call starts
 *     a fresh run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WantedSearchService } from './WantedSearchService';
import type { MediaSearchService } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildService(opts: {
  movies?: { id: number }[];
  series?: { id: number }[];
  findManyMoviesThrows?: boolean;
} = {}) {
  const movies = opts.movies ?? [];
  const series = opts.series ?? [];

  const movieFindMany = opts.findManyMoviesThrows
    ? vi.fn().mockRejectedValue(new Error('DB connection lost'))
    : vi.fn().mockResolvedValue(movies);
  const seriesFindMany = vi.fn().mockResolvedValue(series);

  const prisma = {
    movie: { findMany: movieFindMany, findUnique: vi.fn() },
    series: { findMany: seriesFindMany, findUnique: vi.fn() },
    episode: { findUnique: vi.fn() },
  } as unknown as ConstructorParameters<typeof WantedSearchService>[1];

  const emit = vi.fn().mockResolvedValue(undefined);
  const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

  const grabRelease = vi.fn().mockResolvedValue(undefined);
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] });
  const mediaSearchService = { grabRelease, searchAllIndexers } as unknown as MediaSearchService;

  const service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  return { service, emit, movieFindMany, seriesFindMany, grabRelease, searchAllIndexers };
}

/**
 * Flush the fire-and-forget Promise.resolve().then(...) microtask queue and
 * advance any setTimeout-based delays used inside autoSearchAll.
 */
async function flushAutoSearchAll(delayCount = 0) {
  // Flush the initial Promise.resolve().then() microtask
  await Promise.resolve();
  await Promise.resolve();
  // Advance fake timers past each 2 000 ms delay
  for (let i = 0; i < delayCount; i++) {
    await vi.advanceTimersByTimeAsync(2000);
  }
  // Final flush to let awaited work after the last delay settle
  await Promise.resolve();
  await Promise.resolve();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WantedSearchService — autoSearchAll start event', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits a SEARCH_EXECUTED start event synchronously before background work begins', async () => {
    const { service, emit } = buildService();

    service.autoSearchAll();

    // The start event is emitted at the TOP of autoSearchAll, before the
    // Promise.resolve().then(...) background task — it should already be queued.
    await Promise.resolve(); // flush .catch handler
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SEARCH_EXECUTED',
        summary: expect.stringContaining('Started'),
        success: true,
      }),
    );
  });
});

describe('WantedSearchService — autoSearchAll empty database', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits start + completion events when no wanted movies or series exist', async () => {
    const { service, emit } = buildService({ movies: [], series: [] });

    service.autoSearchAll();
    await flushAutoSearchAll(0);

    const calls = emit.mock.calls.map((c) => c[0] as { summary: string; success: boolean });
    const startCall = calls.find((c) => c.summary.includes('Started'));
    const completionCall = calls.find((c) => c.summary.includes('Completed'));

    expect(startCall).toBeDefined();
    expect(completionCall).toBeDefined();
    expect(completionCall!.success).toBe(true);
  });

  it('does not call autoSearchMovie or autoSearchSeries when DB is empty', async () => {
    const { service } = buildService({ movies: [], series: [] });

    const autoSearchMovieSpy = vi
      .spyOn(service, 'autoSearchMovie')
      .mockResolvedValue({ success: false });
    const autoSearchSeriesSpy = vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    service.autoSearchAll();
    await flushAutoSearchAll(0);

    expect(autoSearchMovieSpy).not.toHaveBeenCalled();
    expect(autoSearchSeriesSpy).not.toHaveBeenCalled();
  });
});

describe('WantedSearchService — autoSearchAll movie + series iteration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls autoSearchMovie for each wanted movie', async () => {
    const movies = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { service } = buildService({ movies, series: [] });

    const spy = vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: false });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    service.autoSearchAll();
    // 3 movies × 1 delay each
    await flushAutoSearchAll(movies.length);

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith(1);
    expect(spy).toHaveBeenCalledWith(2);
    expect(spy).toHaveBeenCalledWith(3);
  });

  it('calls autoSearchSeries for each series with missing episodes', async () => {
    const series = [{ id: 10 }, { id: 20 }];
    const { service } = buildService({ movies: [], series });

    vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: false });
    const spy = vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    service.autoSearchAll();
    await flushAutoSearchAll(series.length);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(10);
    expect(spy).toHaveBeenCalledWith(20);
  });

  it('completion event includes correct moviesSearched / seriesSearched counts', async () => {
    const movies = [{ id: 1 }, { id: 2 }];
    const series = [{ id: 10 }];
    const { service, emit } = buildService({ movies, series });

    vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: true });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    service.autoSearchAll();
    await flushAutoSearchAll(movies.length + series.length);

    const completionCall = emit.mock.calls
      .map((c) => c[0] as { summary: string; details: { moviesSearched: number; seriesSearched: number } })
      .find((c) => c.summary.includes('Completed'));

    expect(completionCall).toBeDefined();
    expect(completionCall!.details.moviesSearched).toBe(2);
    expect(completionCall!.details.seriesSearched).toBe(1);
  });
});

// ─── BUG: concurrent execution guard ─────────────────────────────────────────

describe('WantedSearchService — autoSearchAll concurrent-execution guard (BUG)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('BUG: second call while first is running does NOT start a duplicate search loop', async () => {
    // Three movies, each incurs a 2 000 ms delay. The second autoSearchAll() is
    // called after the first has started but before it finishes — at this point
    // the isRunning guard must block a second loop from beginning.
    const movies = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { service } = buildService({ movies, series: [] });

    const searchSpy = vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: true });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    // Start first run
    service.autoSearchAll();
    // Flush microtasks so the background task begins, then let first movie be searched
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000); // first delay

    // First run is now mid-way. Start second run.
    service.autoSearchAll();

    // Advance timers to let both runs complete if both are active
    await flushAutoSearchAll(movies.length + 1);

    // Without a guard, searchSpy would be called 6 times (3 movies × 2 runs).
    // With a guard, it should be called exactly 3 times.
    // This assertion FAILS before the fix.
    expect(searchSpy).toHaveBeenCalledTimes(3);
  });

  it('after a run completes the guard resets and a fresh call starts a new run', async () => {
    const movies = [{ id: 1 }];
    const { service } = buildService({ movies, series: [] });

    const searchSpy = vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: true });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    // First run
    service.autoSearchAll();
    await flushAutoSearchAll(movies.length);

    // Second run — guard must have cleared
    service.autoSearchAll();
    await flushAutoSearchAll(movies.length);

    // Each run searches 1 movie → total 2 calls
    expect(searchSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── DB failure path ──────────────────────────────────────────────────────────

describe('WantedSearchService — autoSearchAll DB failure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit a completion event when the DB query throws', async () => {
    const { service, emit } = buildService({ findManyMoviesThrows: true });

    vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: false });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    service.autoSearchAll();
    await flushAutoSearchAll(0);

    const completionCall = emit.mock.calls
      .map((c) => c[0] as { summary: string })
      .find((c) => c.summary.includes('Completed'));

    // No completion event should be emitted on error
    expect(completionCall).toBeUndefined();
  });

  it('resets isRunning guard after a DB failure so subsequent calls succeed', async () => {
    const { service } = buildService({ findManyMoviesThrows: true });

    service.autoSearchAll();
    await flushAutoSearchAll(0);

    // Now set up a healthy service state and call again —
    // if the guard was not reset, this second call would be silently blocked.
    const searchSpy = vi.spyOn(service, 'autoSearchMovie').mockResolvedValue({ success: true });
    vi.spyOn(service, 'autoSearchSeries').mockResolvedValue();

    // Patch findMany to succeed for the second call
    const prisma = (service as any).prisma as {
      movie: { findMany: ReturnType<typeof vi.fn> };
      series: { findMany: ReturnType<typeof vi.fn> };
    };
    prisma.movie.findMany.mockResolvedValue([{ id: 99 }]);
    prisma.series.findMany.mockResolvedValue([]);

    service.autoSearchAll();
    await flushAutoSearchAll(1);

    expect(searchSpy).toHaveBeenCalledWith(99);
  });
});
