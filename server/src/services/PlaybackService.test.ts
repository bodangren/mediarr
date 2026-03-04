import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PlaybackService } from './PlaybackService';

interface PrismaMock {
  movie: { findUnique: ReturnType<typeof vi.fn> };
  episode: { findUnique: ReturnType<typeof vi.fn> };
  variantSubtitleTrack: { findUnique: ReturnType<typeof vi.fn> };
}

function createPrismaMock(): PrismaMock {
  return {
    movie: {
      findUnique: vi.fn(),
    },
    episode: {
      findUnique: vi.fn(),
    },
    variantSubtitleTrack: {
      findUnique: vi.fn(),
    },
  };
}

describe('PlaybackService', () => {
  let prisma: PrismaMock;
  let playbackRepository: {
    getProgress: ReturnType<typeof vi.fn>;
    getLatestProgressForMedia: ReturnType<typeof vi.fn>;
    upsertProgress: ReturnType<typeof vi.fn>;
  };
  let tempDir: string;

  beforeEach(async () => {
    prisma = createPrismaMock();
    playbackRepository = {
      getProgress: vi.fn(),
      getLatestProgressForMedia: vi.fn(),
      upsertProgress: vi.fn(),
    };
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-playback-service-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function createService() {
    return new PlaybackService(
      prisma as any,
      playbackRepository as any,
      {
        get: vi.fn().mockResolvedValue({
          mediaManagement: {
            movieRootFolder: tempDir,
            tvRootFolder: tempDir,
          },
        }),
      } as any,
    );
  }

  it('builds movie manifest with subtitle URLs and resume payload', async () => {
    const moviePath = path.join(tempDir, 'movie.mp4');
    const subtitlePath = path.join(tempDir, 'movie.en.srt');
    await fs.writeFile(moviePath, 'movie-content');
    await fs.writeFile(subtitlePath, 'subtitle-content');

    prisma.movie.findUnique.mockResolvedValue({
      id: 1,
      title: 'The Movie',
      overview: 'Overview',
      posterUrl: 'https://poster.test/poster.jpg',
      fileVariants: [
        {
          path: moviePath,
          subtitleTracks: [
            {
              id: 101,
              filePath: subtitlePath,
              languageCode: 'en',
              isForced: false,
              isHi: false,
            },
          ],
        },
      ],
    });
    playbackRepository.getProgress.mockResolvedValue({
      userId: 'living-room',
      position: 300,
      duration: 1000,
      progress: 0.3,
      isWatched: false,
      lastWatched: new Date('2026-03-05T00:00:00.000Z'),
    });

    const service = createService();
    const manifest = await service.buildManifest({
      mediaType: 'MOVIE',
      mediaId: 1,
      userId: 'living-room',
    });

    expect(manifest.streamUrl).toBe('/api/stream/1?type=movie');
    expect(manifest.subtitles).toEqual([
      {
        id: 101,
        languageCode: 'en',
        isForced: false,
        isHi: false,
        format: 'srt',
        url: '/api/playback/subtitles/101',
      },
    ]);
    expect(manifest.resume).toMatchObject({
      userId: 'living-room',
      position: 300,
      duration: 1000,
      progress: 0.3,
      isWatched: false,
    });
    expect(playbackRepository.getProgress).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      mediaId: 1,
      userId: 'living-room',
    });
  });

  it('records progress with lan-default user when userId is not provided', async () => {
    playbackRepository.upsertProgress.mockResolvedValue({
      mediaType: 'EPISODE',
      mediaId: 4,
      userId: 'lan-default',
      position: 90,
      duration: 300,
      progress: 0.3,
      isWatched: false,
      lastWatched: new Date('2026-03-05T00:00:00.000Z'),
    });

    const service = createService();

    const result = await service.recordHeartbeat({
      mediaType: 'EPISODE',
      mediaId: 4,
      position: 90,
      duration: 300,
    });

    expect(playbackRepository.upsertProgress).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      mediaId: 4,
      userId: 'lan-default',
      position: 90,
      duration: 300,
      watchedThreshold: 0.9,
    });
    expect(result.userId).toBe('lan-default');
  });

  it('resolves subtitle track only for sidecar srt/vtt files', async () => {
    const moviePath = path.join(tempDir, 'movie.mp4');
    const subtitlePath = path.join(tempDir, 'movie.zh.vtt');
    await fs.writeFile(moviePath, 'movie');
    await fs.writeFile(subtitlePath, 'WEBVTT');

    prisma.variantSubtitleTrack.findUnique.mockResolvedValue({
      id: 20,
      filePath: subtitlePath,
      languageCode: 'zh',
      isForced: false,
      isHi: false,
      variant: {
        path: moviePath,
      },
    });

    const service = createService();
    const subtitle = await service.resolveSubtitleTrack(20);

    expect(subtitle).toEqual({
      id: 20,
      filePath: subtitlePath,
      languageCode: 'zh',
      isForced: false,
      isHi: false,
      format: 'vtt',
    });
  });
});
