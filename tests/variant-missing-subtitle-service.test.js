import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { VariantMissingSubtitleService } from '../server/src/services/VariantMissingSubtitleService';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const service = new VariantMissingSubtitleService(repository);

const makeItem = ({
  id,
  language,
  forced = 'False',
  hi = 'False',
  audio_exclude = 'False',
  audio_only_include = 'False',
}) => ({
  id,
  language,
  forced,
  hi,
  audio_exclude,
  audio_only_include,
});

const createMovieVariant = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `MissingProfile_${Date.now()}_${Math.random()}` },
  });
  const movie = await prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 3000,
      title: 'Dune',
      cleanTitle: 'dune',
      sortTitle: 'dune',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2021,
    },
  });

  return repository.upsertVariant({
    mediaType: 'MOVIE',
    movieId: movie.id,
    path: `/data/media/movies/Dune (2021)/dune.${Math.random()}.mkv`,
    fileSize: BigInt(5_500_000_000),
  });
};

describe('VariantMissingSubtitleService', () => {
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

  it('should compute and persist missing subtitles with audio filters', async () => {
    const variant = await createMovieVariant();

    await repository.replaceAudioTracks(variant.id, [
      { streamIndex: 0, languageCode: 'en', isDefault: true },
      {
        streamIndex: 1,
        languageCode: 'es',
        isCommentary: true,
        name: 'Commentary',
      },
    ]);
    await repository.replaceSubtitleTracks(variant.id, [
      { source: 'EXTERNAL', languageCode: 'fr', filePath: '/tmp/fr.srt' },
    ]);

    const result = await service.computeAndPersistForVariant(
      variant.id,
      [
        makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
        makeItem({ id: 2, language: 'es', audio_only_include: 'True' }),
        makeItem({ id: 3, language: 'fr' }),
      ],
      null,
    );

    expect(result.missingSubtitles).toEqual([]);

    const missing = await repository.listMissingSubtitles(variant.id);
    expect(missing).toEqual([]);
  });

  it('should persist missing state when cutoff is not met', async () => {
    const variant = await createMovieVariant();
    await repository.replaceAudioTracks(variant.id, [
      { streamIndex: 0, languageCode: 'en' },
    ]);
    await repository.replaceSubtitleTracks(variant.id, []);

    const result = await service.computeAndPersistForVariant(
      variant.id,
      [
        makeItem({ id: 1, language: 'en', forced: 'False', hi: 'False' }),
        makeItem({ id: 2, language: 'de' }),
      ],
      2,
    );

    expect(result.cutoffMet).toBe(false);
    expect(result.missingSubtitles).toEqual([
      { languageCode: 'en', isForced: false, isHi: false },
      { languageCode: 'de', isForced: false, isHi: false },
    ]);

    const missing = await repository.listMissingSubtitles(variant.id);
    expect(missing).toHaveLength(2);
  });
});
