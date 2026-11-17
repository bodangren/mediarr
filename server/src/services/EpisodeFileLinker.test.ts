import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EpisodeFileLinker } from './EpisodeFileLinker';

/**
 * Regression cover for the gap measured on 2026-11-17: an unattended import moved
 * files into /data but nothing registered them, so the client reported "Missing"
 * for content that was on disk (American Dad! S22 0/13, Lioness S03 0/8, OITNB
 * S05 0/13 — all present). The scheduled pass now links those files itself.
 */

function fakePrisma(overrides: {
  danglingVariants?: Array<{ id: number; path: string; episodeId: number | null }>;
  episodes?: Array<{ id: number; seriesId: number; seasonNumber: number; episodeNumber: number }>;
  variants?: Array<{ episodeId: number | null }>;
  series?: Array<{ id: number; path: string | null }>;
  movies?: Array<{ id: number; path: string | null }>;
  movieVariants?: Array<{ movieId: number | null }>;
}) {
  const updates: Array<{ id: number; path: string }> = [];
  const variantUpdates: Array<{ id: number; path: string }> = [];
  const variantDeletes: number[] = [];
  return {
    updates,
    variantUpdates,
    variantDeletes,
    episode: {
      findMany: async (args: any) => {
        const all = overrides.episodes ?? [];
        if (args?.where?.id?.in) {
          const ids: number[] = args.where.id.in;
          return all
            .filter(episode => ids.includes(episode.id))
            .map(({ id, seriesId, seasonNumber, episodeNumber }) => ({
              id,
              seriesId,
              seasonNumber,
              episodeNumber,
            }));
        }
        if (args?.where?.seriesId != null) {
          return all
            .filter(episode => episode.seriesId === args.where.seriesId)
            .map(({ id, seasonNumber, episodeNumber }) => ({ id, seasonNumber, episodeNumber }));
        }
        return all.map(({ id, seriesId, seasonNumber }) => ({ id, seriesId, seasonNumber }));
      },
      update: async ({ where, data }: any) => {
        updates.push({ id: where.id, path: data.path });
        return { id: where.id };
      },
    },
    mediaFileVariant: {
      findMany: async (args: any) => {
        if (args?.where?.mediaType === 'MOVIE') return overrides.movieVariants ?? [];
        if (args?.where?.episodeId) {
          // linkSeries asks for the variants of specific episodes.
          return overrides.variants ?? [];
        }
        if (args?.select?.path && args?.select?.movieId !== undefined) {
          // The dangling scan asks for both id columns.
          return overrides.danglingVariants ?? [];
        }
        if (args?.select?.path && args?.select?.episodeId && args?.select?.movieId === undefined) {
          // The live-sibling scan: every episode variant in the library.
          return [...(overrides.danglingVariants ?? []), ...(overrides.variants ?? [])];
        }
        return overrides.variants ?? [];
      },
      update: async (args: any) => {
        variantUpdates.push({ id: args.where.id, path: args.data.path });
        return { id: args.where.id };
      },
      delete: async (args: any) => {
        variantDeletes.push(args.where.id);
        return { id: args.where.id };
      },
    },
    movie: {
      findMany: async () => (overrides.movies ?? []).map(({ id }) => ({ id })),
      findUnique: async ({ where }: any) =>
        (overrides.movies ?? []).find(movie => movie.id === where.id) ?? null,
    },
    series: {
      findMany: async (args: any) => {
        const all = overrides.series ?? [];
        const ids: number[] | undefined = args?.where?.id?.in;
        return (ids ? all.filter(row => ids.includes(row.id)) : all).map(row => ({
          id: row.id,
          path: row.path,
        }));
      },
      findUnique: async ({ where }: any) =>
        (overrides.series ?? []).find(series => series.id === where.id) ?? null,
    },
  };
}

describe('EpisodeFileLinker.seriesWithMissingFiles', () => {
  it('returns only series that still have an episode without a file', async () => {
    const prisma = fakePrisma({
      episodes: [
        { id: 1, seriesId: 10, seasonNumber: 1, episodeNumber: 1 },
        { id: 2, seriesId: 10, seasonNumber: 1, episodeNumber: 2 },
        { id: 3, seriesId: 20, seasonNumber: 1, episodeNumber: 1 },
      ],
      variants: [{ episodeId: 1 }, { episodeId: 3 }],
    });
    const linker = new EpisodeFileLinker(prisma);
    expect(await linker.seriesWithMissingFiles()).toEqual([10]);
  });

  it('ignores season 0 specials, which have no episode files', async () => {
    const prisma = fakePrisma({
      episodes: [
        { id: 1, seriesId: 10, seasonNumber: 1, episodeNumber: 1 },
        { id: 2, seriesId: 10, seasonNumber: 0, episodeNumber: 1 },
      ],
      variants: [{ episodeId: 1 }],
    });
    expect(await new EpisodeFileLinker(prisma).seriesWithMissingFiles()).toEqual([]);
  });

  it('returns nothing when every episode has a file', async () => {
    const prisma = fakePrisma({
      episodes: [{ id: 1, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      variants: [{ episodeId: 1 }],
    });
    expect(await new EpisodeFileLinker(prisma).seriesWithMissingFiles()).toEqual([]);
  });
});

describe('EpisodeFileLinker.linkSeries', () => {
  it('links the files on disk to their episode rows and writes variants', async () => {
    const prisma = fakePrisma({
      episodes: [
        { id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 },
        { id: 102, seriesId: 10, seasonNumber: 1, episodeNumber: 2 },
      ],
      variants: [],
      series: [{ id: 10, path: '/tv/Show' }],
    });
    const written: Array<{ episodeId: number; path: string }> = [];
    const linker = new EpisodeFileLinker(prisma, {
      scanner: {
        scan: async () => ({
          folders: [
            {
              files: [
                {
                  path: '/tv/Show/Season 1/Show - S01E01 - Pilot.mkv',
                  size: 1000,
                  parsedInfo: { seasonNumber: 1, episodeNumbers: [1] },
                },
                {
                  path: '/tv/Show/Season 1/Show - S01E02 - Second.mkv',
                  size: 2000,
                  parsedInfo: { seasonNumber: 1, episodeNumbers: [2] },
                },
              ],
            },
          ],
        }),
      },
      variants: {
        upsertVariant: async input => {
          written.push({ episodeId: input.episodeId, path: input.path });
          return input;
        },
      },
    });

    expect(await linker.linkSeries(10)).toBe(2);
    expect(prisma.updates).toEqual([
      { id: 101, path: '/tv/Show/Season 1/Show - S01E01 - Pilot.mkv' },
      { id: 102, path: '/tv/Show/Season 1/Show - S01E02 - Second.mkv' },
    ]);
    expect(written.map(entry => entry.episodeId)).toEqual([101, 102]);
  });

  it('ignores files whose episode number is not in the library', async () => {
    const prisma = fakePrisma({
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      variants: [],
      series: [{ id: 10, path: '/tv/Show' }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: {
        scan: async () => ({
          folders: [
            { files: [{ path: '/tv/Show/S01E09.mkv', size: 1, parsedInfo: { seasonNumber: 1, episodeNumbers: [9] } }] },
          ],
        }),
      },
      variants: { upsertVariant: async input => input },
    });
    expect(await linker.linkSeries(10)).toBe(0);
    expect(prisma.updates).toEqual([]);
  });

  it('is a no-op for a series with no library path', async () => {
    const prisma = fakePrisma({ series: [{ id: 10, path: null }], episodes: [] });
    expect(await new EpisodeFileLinker(prisma).linkSeries(10)).toBe(0);
  });
});

describe('EpisodeFileLinker.run', () => {
  it('reports what it scanned and linked', async () => {
    const prisma = fakePrisma({
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      variants: [],
      series: [{ id: 10, path: '/tv/Show' }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: {
        scan: async () => ({
          folders: [{ files: [{ path: '/tv/Show/S01E01.mkv', size: 5, parsedInfo: { seasonNumber: 1, episodeNumbers: [1] } }] }],
        }),
      },
      variants: { upsertVariant: async input => input },
    });

    const summary = await linker.run();
    expect(summary.seriesWithMissingFiles).toBe(1);
    expect(summary.seriesScanned).toBe(1);
    expect(summary.filesLinked).toBe(1);
    expect(summary.failures).toBe(0);
  });
});

describe('EpisodeFileLinker movies', () => {
  it('lists movies with no file variant', async () => {
    const prisma = fakePrisma({
      movies: [
        { id: 500, path: '/movies/A' },
        { id: 501, path: '/movies/B' },
      ],
      movieVariants: [{ movieId: 500 }],
    });
    expect(await new EpisodeFileLinker(prisma).moviesWithMissingFiles()).toEqual([501]);
  });

  it('links the largest video in the movie folder', async () => {
    const root = await mkdtemp(join(tmpdir(), 'movie-link-'));
    const folder = join(root, 'The Blues Brothers (1980)');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'sample.mkv'), 'x'.repeat(10));
    await writeFile(join(folder, 'The.Blues.Brothers.mkv'), 'x'.repeat(500));

    const prisma = fakePrisma({ movies: [{ id: 501, path: folder }], movieVariants: [] });
    const written: Array<{ movieId: number; path: string }> = [];
    const linker = new EpisodeFileLinker(prisma, {
      // Default folder scan (real fs) is exercised here on purpose.
      variants: {
        upsertVariant: async (input: any) => {
          written.push({ movieId: input.movieId, path: input.path });
          return input;
        },
      },
    });

    expect(await linker.linkMovie(501)).toBe(1);
    expect(written).toHaveLength(1);
    expect(written[0]!.movieId).toBe(501);
    expect(written[0]!.path).toContain('The.Blues.Brothers.mkv');
  });

  it('does nothing for a movie with no path or an empty folder', async () => {
    const prisma = fakePrisma({
      movies: [
        { id: 501, path: null },
        { id: 502, path: '/movies/empty' },
      ],
    });
    const linker = new EpisodeFileLinker(prisma, {
      movieVideos: async () => [],
      variants: { upsertVariant: async input => input },
    });
    expect(await linker.linkMovie(501)).toBe(0);
    expect(await linker.linkMovie(502)).toBe(0);
  });
});

describe('EpisodeFileLinker dangling variant repair', () => {
  it('repoints a variant whose file moved to the real file on disk', async () => {
    // Measured 2026-11-18: Justified: City Primeval reported 8/8 filed while the
    // variants pointed at a folder that did not exist; the files were on disk
    // under a different naming scheme.
    const root = await mkdtemp(join(tmpdir(), 'dangling-'));
    await mkdir(join(root, 'Season 1'), { recursive: true });
    const real = join(root, 'Season 1', 'Show - S01E01 - Pilot.mkv');
    await writeFile(real, 'x'.repeat(64));

    const prisma = fakePrisma({
      danglingVariants: [{ id: 900, path: join(root, 'Season 01', 'Gone - S01E01.mkv'), episodeId: 101 }],
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      series: [{ id: 10, path: root }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: {
        scan: async () => ({
          folders: [
            {
              files: [
                {
                  path: real,
                  size: 64,
                  parsedInfo: { seasonNumber: 1, episodeNumbers: [1] },
                },
              ],
            },
          ],
        }),
      },
    });

    const result = await linker.repairDanglingVariants();
    expect(result.repaired).toBe(1);
    expect(result.unresolved).toBe(0);
    expect(prisma.variantUpdates).toEqual([{ id: 900, path: real }]);
    expect(prisma.updates).toEqual([{ id: 101, path: real }]);
  });

  it('counts a variant as unresolved when no matching file exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dangling-'));
    const prisma = fakePrisma({
      danglingVariants: [{ id: 901, path: '/nope/gone.mkv', episodeId: 101 }],
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      series: [{ id: 10, path: root }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: { scan: async () => ({ folders: [] }) },
    });

    const result = await linker.repairDanglingVariants();
    expect(result.repaired).toBe(0);
    expect(result.unresolved).toBe(1);
    expect(prisma.variantUpdates).toEqual([]);
  });

  it('does nothing when every recorded path still exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dangling-'));
    const real = join(root, 'Show - S01E01.mkv');
    await writeFile(real, 'x');
    const prisma = fakePrisma({
      danglingVariants: [{ id: 902, path: real, episodeId: 101 }],
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      series: [{ id: 10, path: root }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: { scan: async () => ({ folders: [] }) },
    });
    expect(await linker.repairDanglingVariants()).toEqual({
      repaired: 0,
      unresolved: 0,
      removedStale: 0,
    });
  });
});

describe('EpisodeFileLinker duplicate variants', () => {
  it('does not create a second variant for an episode that already has one', async () => {
    // The real library ended up with 16 variant rows for 8 episodes.
    const root = await mkdtemp(join(tmpdir(), 'dupe-'));
    await mkdir(join(root, 'Season 1'), { recursive: true });
    const real = join(root, 'Season 1', 'Show - S01E01.mkv');
    await writeFile(real, 'x'.repeat(20));
    const prisma = fakePrisma({
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      variants: [{ episodeId: 101 }],
      series: [{ id: 10, path: root }],
    });
    const written: number[] = [];
    const linker = new EpisodeFileLinker(prisma, {
      scanner: {
        scan: async () => ({
          folders: [
            { files: [{ path: real, size: 20, parsedInfo: { seasonNumber: 1, episodeNumbers: [1] } }] },
          ],
        }),
      },
      variants: { upsertVariant: async input => { written.push(input.episodeId); return input; } },
    });

    expect(await linker.linkSeries(10)).toBe(1);
    expect(written, 'The episode was already linked; a second row is a duplicate').toEqual([]);
  });

  it('removes a stale dangling row when the episode is already playable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stale-'));
    const live = join(root, 'Show - S01E01.mkv');
    await writeFile(live, 'y'.repeat(10));
    const prisma = fakePrisma({
      danglingVariants: [
        { id: 700, path: '/gone/old.mkv', episodeId: 101 },
        { id: 701, path: live, episodeId: 101 },
      ],
      episodes: [{ id: 101, seriesId: 10, seasonNumber: 1, episodeNumber: 1 }],
      series: [{ id: 10, path: root }],
    });
    const linker = new EpisodeFileLinker(prisma, {
      scanner: { scan: async () => ({ folders: [] }) },
    });

    const result = await linker.repairDanglingVariants();
    expect(result.removedStale).toBe(1);
    expect(result.repaired).toBe(0);
    expect(prisma.variantDeletes).toEqual([700]);
  });
});
