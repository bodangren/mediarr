import { describe, expect, it } from 'vitest';
import { planNextUp, planNextUpList, type NextUpSeriesInput } from './NextUpPlanner';

function series(overrides: Partial<NextUpSeriesInput> & { seriesId: number }): NextUpSeriesInput {
  const base: NextUpSeriesInput = {
    seriesId: overrides.seriesId,
    title: `Series ${overrides.seriesId}`,
    posterUrl: null,
    backdropUrl: null,
    year: 2020,
    episodes: [
      { episodeId: overrides.seriesId * 100 + 1, seasonNumber: 1, episodeNumber: 1, title: 'Pilot' },
      { episodeId: overrides.seriesId * 100 + 2, seasonNumber: 1, episodeNumber: 2, title: 'Second' },
      { episodeId: overrides.seriesId * 100 + 3, seasonNumber: 1, episodeNumber: 3, title: 'Third' },
    ],
    progress: new Map(),
  };
  return { ...base, ...overrides };
}

describe('planNextUp', () => {
  it('skips a fully watched series and a series with no progress', () => {
    const allWatched = new Map(
      [1, 2, 3].map((n) => [100 + n, { episodeId: 100 + n, isWatched: true, position: 0, updatedAt: 10 }]),
    );
    expect(planNextUp(series({ seriesId: 1, progress: allWatched }))).toBeNull();
    expect(planNextUp(series({ seriesId: 2 }))).toBeNull();
  });

  it('returns the first unwatched episode and the watched count', () => {
    const progress = new Map([[101, { episodeId: 101, isWatched: true, position: 0, updatedAt: 500 }]]);
    const item = planNextUp(series({ seriesId: 1, progress }));
    expect(item?.nextEpisode.episodeNumber).toBe(2);
    expect(item?.watchedCount).toBe(1);
    expect(item?.totalCount).toBe(3);
  });

  it('orders by most recent watch activity', () => {
    const items = planNextUpList([
      series({ seriesId: 1, progress: new Map([[101, { episodeId: 101, isWatched: true, position: 0, updatedAt: 100 }]]) }),
      series({ seriesId: 2, progress: new Map([[201, { episodeId: 201, isWatched: true, position: 0, updatedAt: 900 }]]) }),
      series({ seriesId: 3, progress: new Map([[301, { episodeId: 301, isWatched: true, position: 0, updatedAt: 500 }]]) }),
    ]);
    expect(items.map((item) => item.seriesId)).toEqual([2, 3, 1]);
  });

  it('treats a partially played episode as the next up and counts its watch time', () => {
    const progress = new Map([
      [101, { episodeId: 101, isWatched: true, position: 0, updatedAt: 100 }],
      [102, { episodeId: 102, isWatched: false, position: 420, updatedAt: 950 }],
    ]);
    const item = planNextUp(series({ seriesId: 1, progress }));
    expect(item?.nextEpisode.episodeNumber).toBe(2);
    expect(item?.lastWatchedAt).toBe(950);
  });
});
