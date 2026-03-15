import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { VariantWantedService } from '../server/src/services/VariantWantedService';

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const service = new VariantWantedService(repository);

const createMovieAndVariants = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `WantedProfile_${Date.now()}_${Math.random()}` },
  });
  const movie = await prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 4000,
      title: 'Interstellar',
      cleanTitle: 'interstellar',
      sortTitle: 'interstellar',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2014,
    },
  });

  const variantOne = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: `/data/media/movies/Interstellar (2014)/interstellar.1080p.${Math.random()}.mkv`,
    fileSize: BigInt(4_000_000_000),
  });
  const variantTwo = await repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: `/data/media/movies/Interstellar (2014)/interstellar.2160p.${Math.random()}.mkv`,
    fileSize: BigInt(9_000_000_000),
  });

  return { variantOne, variantTwo };
};

describe('VariantWantedService', () => {
  beforeEach(async () => {
    await prisma.subtitleHistory.deleteMany();
    await prisma.wantedSubtitle.deleteMany();
    await prisma.variantMissingSubtitle.deleteMany();
    await prisma.variantSubtitleTrack.deleteMany();
    await prisma.variantAudioTrack.deleteMany();
    await prisma.mediaFileVariant.deleteMany();
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.series.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.media.deleteMany();
    await prisma.qualityProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create variant-scoped wanted subtitles without cross-variant collisions', async () => {
    const { variantOne, variantTwo } = await createMovieAndVariants();

    await repository.replaceMissingSubtitles(variantOne.id, [
      { languageCode: 'en', isForced: false, isHi: false },
    ]);
    await repository.replaceMissingSubtitles(variantTwo.id, [
      { languageCode: 'en', isForced: false, isHi: false },
      { languageCode: 'fr', isForced: false, isHi: false },
    ]);

    const wantedOne = await service.syncWantedForVariant(variantOne.id);
    const wantedTwo = await service.syncWantedForVariant(variantTwo.id);

    expect(wantedOne).toHaveLength(1);
    expect(wantedTwo).toHaveLength(2);

    const storedWanted = await prisma.wantedSubtitle.findMany({
      orderBy: [{ variantId: 'asc' }, { languageCode: 'asc' }],
    });

    expect(storedWanted).toHaveLength(3);
    expect(new Set(storedWanted.map(item => item.variantId)).size).toBe(2);
  });

  it('should remove stale wanted entries when missing set shrinks', async () => {
    const { variantOne } = await createMovieAndVariants();

    await repository.replaceMissingSubtitles(variantOne.id, [
      { languageCode: 'en', isForced: false, isHi: false },
      { languageCode: 'de', isForced: false, isHi: false },
    ]);
    await service.syncWantedForVariant(variantOne.id);

    await repository.replaceMissingSubtitles(variantOne.id, [
      { languageCode: 'en', isForced: false, isHi: false },
    ]);
    const current = await service.syncWantedForVariant(variantOne.id);

    expect(current).toHaveLength(1);
    expect(current[0].languageCode).toBe('en');

    const stored = await prisma.wantedSubtitle.findMany({
      where: { variantId: variantOne.id },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].languageCode).toBe('en');
  });
});
