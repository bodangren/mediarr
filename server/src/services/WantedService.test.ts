import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WantedService } from './WantedService';

// Sibling coverage for WantedService (chore_remaining_server_service_coverage_20260728).
//
// SCOPE HONESTY — read before trusting a coverage number on this file.
// WantedService contains ZERO branches, so its "≥80% branch coverage" acceptance
// criterion was already satisfied at 0 tests and is unfalsifiable. This is the
// same defect as the SettingsService/AppSettingsRepository target recorded in
// lessons-learned.md. Its real risk lives one layer down, in the Drizzle
// DatabaseClient shim that has to honour the Prisma-shaped query below.
//
// What these tests genuinely pin is therefore the QUERY CONTRACT, not branches:
// the filter must keep asking for unmonitored-series exclusion and null paths,
// because that query is what the /wanted/missing route renders.

const makeDb = () => {
  const findMany = vi.fn().mockResolvedValue([]);
  return { db: { episode: { findMany } }, findMany };
};

describe('WantedService', () => {
  let db: ReturnType<typeof makeDb>['db'];
  let findMany: ReturnType<typeof makeDb>['findMany'];

  beforeEach(() => {
    ({ db, findMany } = makeDb());
  });

  describe('getMissingEpisodes', () => {
    it('asks only for monitored episodes of monitored series with no file', async () => {
      await new WantedService(db).getMissingEpisodes();

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0]?.[0]).toMatchObject({
        where: {
          path: null,
          monitored: true,
          series: { monitored: true },
        },
      });
    });

    // Regression guard: dropping the nested series filter would surface episodes
    // from series the user has stopped monitoring.
    it('requires the parent series to be monitored, not just the episode', async () => {
      await new WantedService(db).getMissingEpisodes();

      const where = findMany.mock.calls[0]?.[0]?.where;
      expect(where?.series).toEqual({ monitored: true });
    });

    it('includes the series relation so the UI can render titles', async () => {
      await new WantedService(db).getMissingEpisodes();

      expect(findMany.mock.calls[0]?.[0]?.include).toEqual({ series: true });
    });

    it('orders by air date, newest first', async () => {
      await new WantedService(db).getMissingEpisodes();

      expect(findMany.mock.calls[0]?.[0]?.orderBy).toEqual({ airDateUtc: 'desc' });
    });

    it('returns the rows the client produced', async () => {
      const rows = [{ id: 1, title: 'Pilot' }];
      findMany.mockResolvedValue(rows);

      await expect(new WantedService(db).getMissingEpisodes()).resolves.toBe(rows);
    });

    it('returns an empty list when nothing is missing', async () => {
      await expect(new WantedService(db).getMissingEpisodes()).resolves.toEqual([]);
    });

    it('propagates a client failure rather than swallowing it', async () => {
      findMany.mockRejectedValue(new Error('db down'));

      await expect(new WantedService(db).getMissingEpisodes()).rejects.toThrow('db down');
    });
  });

  describe('getCutoffUnmetEpisodes', () => {
    // CHARACTERISATION TEST, not an endorsement. The method's name and the API it
    // backs promise "episodes whose file quality is below the profile cutoff",
    // but the implementation is a documented stub that returns the MISSING list —
    // episodes with no file at all, which is a disjoint set. Pinned so the
    // divergence is visible and any future fix is a deliberate, failing-test
    // change rather than a silent behaviour swap.
    it('currently returns the missing-episode list, not a cutoff comparison', async () => {
      const rows = [{ id: 7, path: null }];
      findMany.mockResolvedValue(rows);
      const service = new WantedService(db);

      const cutoff = await service.getCutoffUnmetEpisodes();
      const missing = await service.getMissingEpisodes();

      expect(cutoff).toEqual(missing);
      expect(findMany.mock.calls[0]?.[0]).toEqual(findMany.mock.calls[1]?.[0]);
    });

    it('issues exactly one query, via the missing-episode path', async () => {
      await new WantedService(db).getCutoffUnmetEpisodes();

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0]?.[0]?.where).toMatchObject({ path: null });
    });
  });
});
