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
  episodes?: Array<{ id: number; seriesId: number; seasonNumber: number; episodeNumber: number }>;
  variants?: Array<{ episodeId: number | null }>;
  series?: Array<{ id: number; path: string | null }>;
  movies?: Array<{ id: number; path: string | null }>;
  movieVariants?: Array<{ movieId: number | null }>;
}) {
  const updates: Array<{ id: number; path: string }> = [];
  return {
    updates,
    episode: {
      findMany: async (args: any) => {
        const all = overrides.episodes ?? [];
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
      findMany: async (args: any) =>
        args?.where?.mediaType === 'MOVIE'
          ? (overrides.movieVariants ?? [])
          : (overrides.variants ?? []),
    },
    movie: {
      findMany: async () => (overrides.movies ?? []).map(({ id }) => ({ id })),
      findUnique: async ({ where }: any) =>
        (overrides.movies ?? []).find(movie => movie.id === where.id) ?? null,
    },
    series: {
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
