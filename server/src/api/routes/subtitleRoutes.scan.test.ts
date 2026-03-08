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

interface StoredSubtitleTrack {
  variantId: number;
  source: 'EXTERNAL' | 'EMBEDDED';
  streamIndex?: number;
  languageCode?: string | null;
  isForced: boolean;
  isHi: boolean;
  codec?: string | null;
  filePath?: string | null;
  fileSize?: bigint | null;
}

class InMemorySubtitleRepository {
  constructor(
    private readonly variants: TestVariant[],
    private readonly subtitleTracks = new Map<number, StoredSubtitleTrack[]>(),
  ) {}

  async listMovieVariants(movieId: number): Promise<TestVariant[]> {
    return this.variants.filter(variant => variant.movieId === movieId);
  }

  async listEpisodeVariants(episodeId: number): Promise<TestVariant[]> {
    return this.variants.filter(variant => variant.episodeId === episodeId);
  }

  async getVariantInventory(variantId: number): Promise<{
    variant: TestVariant | null;
    audioTracks: [];
    subtitleTracks: StoredSubtitleTrack[];
    missingSubtitles: [];
  }> {
    return {
      variant: this.variants.find(variant => variant.id === variantId) ?? null,
      audioTracks: [],
      subtitleTracks: [...(this.subtitleTracks.get(variantId) ?? [])],
      missingSubtitles: [],
    };
  }

  async replaceSubtitleTracks(
    variantId: number,
    tracks: StoredSubtitleTrack[],
  ): Promise<StoredSubtitleTrack[]> {
    this.subtitleTracks.set(
      variantId,
      tracks.map(track => ({
        ...track,
        variantId,
      })),
    );
    return [...(this.subtitleTracks.get(variantId) ?? [])];
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

describe('subtitleRoutes disk scan import', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map(dir => fs.rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('imports movie sidecar subtitles from disk and reports new subtitles', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-subscan-movie-'));
    tempDirs.push(tempDir);

    const videoPath = path.join(tempDir, 'Movie.2024.mkv');
    await fs.writeFile(videoPath, 'video');
    await fs.writeFile(path.join(tempDir, 'Movie.2024.en.srt'), '1');
    await fs.writeFile(path.join(tempDir, 'Movie.2024.th.forced.vtt'), 'WEBVTT');

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

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/7/scan',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      success: true,
      subtitlesFound: 2,
      newSubtitles: 2,
    });

    const inventory = await repository.getVariantInventory(11);
    expect(inventory.subtitleTracks.map(track => path.basename(track.filePath ?? ''))).toEqual(
      expect.arrayContaining(['Movie.2024.en.srt', 'Movie.2024.th.forced.vtt']),
    );

    await app.close();
  });

  it('imports series episode sidecar subtitles across variants', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-subscan-series-'));
    tempDirs.push(tempDir);

    const episodeOnePath = path.join(tempDir, 'Show.S01E01.mkv');
    const episodeTwoPath = path.join(tempDir, 'Show.S01E02.mkv');
    await fs.writeFile(episodeOnePath, 'video-1');
    await fs.writeFile(episodeTwoPath, 'video-2');
    await fs.writeFile(path.join(tempDir, 'Show.S01E01.en.srt'), '1');
    await fs.writeFile(path.join(tempDir, 'Show.S01E02.zh.ass'), '1');

    const repository = new InMemorySubtitleRepository([
      {
        id: 21,
        mediaType: 'EPISODE',
        episodeId: 101,
        path: episodeOnePath,
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
        path: episodeTwoPath,
        fileSize: BigInt(7),
        monitored: true,
        probeFingerprint: null,
        releaseName: null,
        quality: null,
      },
    ]);
    const app = createApp({
      repository,
      episodeIdsBySeries: { 55: [101, 102] },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/series/55/scan',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      success: true,
      subtitlesFound: 2,
      newSubtitles: 2,
    });

    expect((await repository.getVariantInventory(21)).subtitleTracks).toHaveLength(1);
    expect((await repository.getVariantInventory(22)).subtitleTracks).toHaveLength(1);

    await app.close();
  });

  it('keeps disk scan idempotent for unchanged subtitle files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-subscan-repeat-'));
    tempDirs.push(tempDir);

    const videoPath = path.join(tempDir, 'Repeat.Movie.mkv');
    await fs.writeFile(videoPath, 'video');
    await fs.writeFile(path.join(tempDir, 'Repeat.Movie.en.srt'), '1');

    const repository = new InMemorySubtitleRepository([
      {
        id: 31,
        mediaType: 'MOVIE',
        movieId: 9,
        path: videoPath,
        fileSize: BigInt(5),
        monitored: true,
        probeFingerprint: null,
        releaseName: null,
        quality: null,
      },
    ]);
    const app = createApp({ repository });

    const first = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/9/scan',
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/9/scan',
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().data.newSubtitles).toBe(1);
    expect(second.statusCode).toBe(200);
    expect(second.json().data).toMatchObject({
      subtitlesFound: 1,
      newSubtitles: 0,
    });
    expect((await repository.getVariantInventory(31)).subtitleTracks).toHaveLength(1);

    await app.close();
  });
});
