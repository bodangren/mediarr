import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { VariantSubtitleFetchService } from '../server/src/services/VariantSubtitleFetchService';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ size: 100 }),
  },
}));

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const fetchService = new VariantSubtitleFetchService(repository);

const createMovieFixture = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `FetchProfile_${Date.now()}_${Math.random()}` },
  });
  const movie = await prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 5000,
      title: 'Memento',
      cleanTitle: 'memento',
      sortTitle: 'memento',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2000,
    },
  });

  const mainVariant = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: '/data/media/movies/Memento (2000)/memento.mp4',
    fileSize: BigInt(2_000_000_000),
    releaseName: 'Memento.2000.1080p',
  });
  const siblingVariant = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: '/data/media/movies/Memento (2000)/memento.mkv',
    fileSize: BigInt(3_000_000_000),
    releaseName: 'Memento.2000.2160p',
  });

  await repository.createSubtitleTrack({
    variantId: siblingVariant.id,
    source: 'EXTERNAL',
    languageCode: 'en',
    filePath: '/data/media/movies/Memento (2000)/memento.en.srt',
  });
  await repository.replaceAudioTracks(mainVariant.id, [
    { streamIndex: 0, languageCode: 'en', isDefault: true },
    { streamIndex: 1, languageCode: 'en', isCommentary: true },
  ]);

  const wanted = await repository.upsertWantedSubtitle({
    variantId: mainVariant.id,
    languageCode: 'en',
    isForced: false,
    isHi: false,
  });

  return { mainVariant, wanted };
};

describe('VariantSubtitleFetchService', () => {
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

  it('should fetch subtitle with variant-aware context and collision-safe naming', async () => {
    const { mainVariant, wanted } = await createMovieFixture();
    const provider = {
      searchBestSubtitle: vi.fn().mockResolvedValue({
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 94.8,
      }),
    };

    const result = await fetchService.fetchWantedSubtitle(wanted.id, provider);
    expect(result).not.toBeNull();

    expect(provider.searchBestSubtitle).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: expect.objectContaining({ id: mainVariant.id }),
        audioTracks: expect.arrayContaining([
          expect.objectContaining({ languageCode: 'en', isCommentary: false }),
          expect.objectContaining({ languageCode: 'en', isCommentary: true }),
        ]),
      }),
    );

    const storedWanted = await repository.getWantedSubtitleById(wanted.id);
    expect(storedWanted?.state).toBe('DOWNLOADED');

    const inventory = await repository.getVariantInventory(mainVariant.id);
    const externalPaths = inventory.subtitleTracks
      .filter(track => track.source === 'EXTERNAL')
      .map(track => track.filePath);

    expect(externalPaths.length).toBeGreaterThan(0);
    expect(externalPaths[0]).toContain('memento.memento-2000-1080p.en.srt');

    const histories = await prisma.subtitleHistory.findMany({
      where: { variantId: mainVariant.id },
    });
    expect(histories).toHaveLength(1);
    expect(histories[0].provider).toBe('opensubtitles');
  });

  it('should mark wanted subtitle as failed when provider returns no candidate', async () => {
    const { wanted } = await createMovieFixture();
    const provider = {
      searchBestSubtitle: vi.fn().mockResolvedValue(null),
    };

    const result = await fetchService.fetchWantedSubtitle(wanted.id, provider);
    expect(result).toBeNull();

    const storedWanted = await repository.getWantedSubtitleById(wanted.id);
    expect(storedWanted?.state).toBe('FAILED');
  });
});
