import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import { registerSubtitleRoutes } from './subtitleRoutes';
import { SubtitleInventoryApiService } from '../../services/SubtitleInventoryApiService';
import type { ApiDependencies } from '../types';

interface TestVariant {
  id: number;
  mediaType: 'MOVIE' | 'EPISODE';
  movieId?: number;
  episodeId?: number;
  path: string;
  fileSize: bigint;
  monitored: boolean;
  probeFingerprint: string | null;
  releaseName: string | null;
  quality: string | null;
}

class InMemorySubtitleRepository {
  constructor(private readonly variants: TestVariant[]) {}

  async listMovieVariants(movieId: number): Promise<TestVariant[]> {
    return this.variants.filter(variant => variant.movieId === movieId);
  }

  async listEpisodeVariants(episodeId: number): Promise<TestVariant[]> {
    return this.variants.filter(variant => variant.episodeId === episodeId);
  }

  async getVariantInventory(variantId: number): Promise<{
    variant: TestVariant | null;
    audioTracks: [];
    subtitleTracks: [];
    missingSubtitles: [];
  }> {
    return {
      variant: this.variants.find(variant => variant.id === variantId) ?? null,
      audioTracks: [],
      subtitleTracks: [],
      missingSubtitles: [],
    };
  }
}

function createApp(input: {
  repository: InMemorySubtitleRepository;
  episodeIdsBySeries?: Record<number, number[]>;
}): FastifyInstance {
  const subtitleInventoryApiService = new SubtitleInventoryApiService(input.repository as any);
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSubtitleRoutes(app, {
    prisma: {
      episode: {
        findMany: async ({ where: { seriesId } }: { where: { seriesId: number } }) =>
          (input.episodeIdsBySeries?.[seriesId] ?? []).map(id => ({ id })),
      },
      variantMissingSubtitle: { findMany: async () => [] },
      subtitleHistory: {
        findMany: async () => [],
        deleteMany: async () => ({ count: 0 }),
      },
    },
    subtitleInventoryApiService,
  } as ApiDependencies);
  return app;
}

describe('subtitleRoutes match orphaned sidecars', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map(dir => fs.rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('previews by default and applies the copy to the variant stem when asked', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-sidecar-movie-'));
    tempDirs.push(tempDir);

    const videoPath = path.join(tempDir, 'Wrong.Version.Movie.2024.1080p.mkv');
    await fs.writeFile(videoPath, 'video');
    const orphanPath = path.join(tempDir, 'Wrong Version Movie 2024 1080p.zho.srt');
    await fs.writeFile(orphanPath, '1\n00:00:01,000 --> 00:00:02,000\n你好\n');
    const targetPath = path.join(tempDir, 'Wrong.Version.Movie.2024.1080p.zho.srt');

    const repository = new InMemorySubtitleRepository([
      {
        id: 11,
        mediaType: 'MOVIE',
        movieId: 7,
        path: videoPath,
        fileSize: BigInt(5),
        monitored: true,
        probeFingerprint: null,
        releaseName: null,
        quality: null,
      },
    ]);
    const app = createApp({ repository });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/7/match-sidecars',
      payload: {},
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data).toEqual({
      success: true,
      dryRun: true,
      matched: [{ from: orphanPath, to: targetPath }],
      unmatched: [],
    });
    await expect(fs.access(targetPath)).rejects.toBeTruthy();

    const applied = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/7/match-sidecars',
      payload: { apply: true },
    });
    expect(applied.statusCode).toBe(200);
    expect(applied.json().data).toMatchObject({ dryRun: false });
    expect(await fs.readFile(targetPath, 'utf8')).toContain('你好');

    // Idempotent: a second preview finds nothing to copy.
    const repeat = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/7/match-sidecars',
      payload: {},
    });
    expect(repeat.json().data.matched).toEqual([]);

    await app.close();
  });

  it('matches series sidecars by SxxExx when the exact stem differs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-sidecar-series-'));
    tempDirs.push(tempDir);

    const episodeOne = path.join(
      tempDir,
      'Special Ops: Lioness - S01E01 - Sacrificial Soldiers.mkv',
    );
    const episodeTwo = path.join(
      tempDir,
      'Special Ops: Lioness - S01E02 - The Breaking Point.mkv',
    );
    await fs.writeFile(episodeOne, 'video-1');
    await fs.writeFile(episodeTwo, 'video-2');

    const orphanOne = path.join(
      tempDir,
      'Special.Ops.Lioness - S01E01 - Sacrificial Soldiers.1080p.zho.srt',
    );
    const orphanTwo = path.join(
      tempDir,
      'Special.Ops.Lioness - S01E02 - The Breaking Point.1080p.zho.srt',
    );
    await fs.writeFile(orphanOne, '1');
    await fs.writeFile(orphanTwo, '2');
    const unrelated = path.join(tempDir, 'Random.Release.Without.Tag.zho.srt');
    await fs.writeFile(unrelated, '3');

    const repository = new InMemorySubtitleRepository([
      {
        id: 21,
        mediaType: 'EPISODE',
        episodeId: 101,
        path: episodeOne,
        fileSize: BigInt(7),
        monitored: true,
        probeFingerprint: null,
        releaseName: null,
        quality: null,
      },
      {
        id: 22,
        mediaType: 'EPISODE',
        episodeId: 102,
        path: episodeTwo,
        fileSize: BigInt(7),
        monitored: true,
        probeFingerprint: null,
        releaseName: null,
        quality: null,
      },
    ]);
    const app = createApp({ repository, episodeIdsBySeries: { 55: [101, 102] } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/series/55/match-sidecars',
      payload: { apply: true },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(data.dryRun).toBe(false);
    expect(data.matched).toEqual([
      {
        from: orphanOne,
        to: path.join(
          tempDir,
          'Special Ops: Lioness - S01E01 - Sacrificial Soldiers.zho.srt',
        ),
      },
      {
        from: orphanTwo,
        to: path.join(
          tempDir,
          'Special Ops: Lioness - S01E02 - The Breaking Point.zho.srt',
        ),
      },
    ]);
    expect(data.unmatched).toEqual([unrelated]);

    await app.close();
  });
});
