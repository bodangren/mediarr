import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { SubtitleInventoryApiService } from '../server/src/services/SubtitleInventoryApiService';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const service = new SubtitleInventoryApiService(repository);

const createMovieWithVariants = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `ApiProfile_${Date.now()}_${Math.random()}` },
  });
  const movie = await prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 6000,
      title: 'Blade Runner 2049',
      cleanTitle: 'bladerunner2049',
      sortTitle: 'blade runner 2049',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2017,
    },
  });

  const v1 = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: '/data/media/movies/Blade Runner 2049 (2017)/br2049.mp4',
    fileSize: BigInt(3_000_000_000),
    releaseName: 'BR2049.1080p',
  });
  const v2 = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: '/data/media/movies/Blade Runner 2049 (2017)/br2049.mkv',
    fileSize: BigInt(8_000_000_000),
    releaseName: 'BR2049.2160p',
  });

  await repository.replaceAudioTracks(v1.id, [
    { streamIndex: 0, languageCode: 'en', isDefault: true },
  ]);
  await repository.replaceSubtitleTracks(v1.id, [
    {
      source: 'EXTERNAL',
      languageCode: 'en',
      filePath: '/data/media/movies/Blade Runner 2049 (2017)/br2049.en.srt',
    },
  ]);
  await repository.replaceMissingSubtitles(v1.id, [
    { languageCode: 'fr', isForced: false, isHi: false },
  ]);

  return { movie, v1, v2 };
};

describe('SubtitleInventoryApiService', () => {
  beforeEach(async () => {
    await prisma.subtitleHistory.deleteMany();
    await prisma.wantedSubtitle.deleteMany();
    await prisma.variantMissingSubtitle.deleteMany();
    await prisma.variantSubtitleTrack.deleteMany();
    await prisma.variantAudioTrack.deleteMany();
    await prisma.mediaFileVariant.deleteMany();
    await prisma.episode.deleteMany();
    await prisma.series.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.media.deleteMany();
    await prisma.qualityProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should list movie variant inventory with missing subtitle state', async () => {
    const { movie } = await createMovieWithVariants();
    const items = await service.listMovieVariantInventory(movie.id);

    expect(items).toHaveLength(2);
    const first = items.find(item => item.audioTracks.length > 0);
    expect(first).toBeDefined();
    expect(first?.missingSubtitles).toContainEqual({
      languageCode: 'fr',
      isForced: false,
      isHi: false,
    });
  });

  it('should require explicit variant selection for manual search when multiple variants exist', async () => {
    const { movie } = await createMovieWithVariants();

    await expect(
      service.manualSearch({ movieId: movie.id }, {
        search: vi.fn(),
      }),
    ).rejects.toThrow(
      'variantId is required when multiple variants exist for this movie',
    );
  });

  it('should run manual search when explicit variant is provided', async () => {
    const { v1 } = await createMovieWithVariants();
    const provider = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 90,
        },
      ]),
    };

    const result = await service.manualSearch({ variantId: v1.id }, provider);
    expect(result).toHaveLength(1);
    expect(provider.search).toHaveBeenCalledOnce();
  });

  it('should perform manual download with collision-safe naming', async () => {
    const { movie, v1 } = await createMovieWithVariants();
    const provider = {
      search: vi.fn().mockResolvedValue([]),
      download: vi.fn().mockImplementation(async candidate => candidate),
    };

    const result = await service.manualDownload(
      {
        movieId: movie.id,
        variantId: v1.id,
        candidate: {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'manual-provider',
          score: 88.5,
        },
      },
      provider,
    );

    expect(result.storedPath).toContain('br2049.br2049-1080p.en.srt');

    const inventory = await repository.getVariantInventory(v1.id);
    expect(
      inventory.subtitleTracks.some(
        track => track.filePath === result.storedPath && track.source === 'EXTERNAL',
      ),
    ).toBe(true);
  });
});
