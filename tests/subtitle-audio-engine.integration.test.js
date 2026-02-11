import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { VariantInventoryIndexer } from '../server/src/services/VariantInventoryIndexer';
import { VariantMissingSubtitleService } from '../server/src/services/VariantMissingSubtitleService';
import { VariantWantedService } from '../server/src/services/VariantWantedService';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const indexer = new VariantInventoryIndexer(repository);
const missingService = new VariantMissingSubtitleService(repository);
const wantedService = new VariantWantedService(repository);

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

describe('Subtitle Audio Engine Integration', () => {
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

  it('should keep wanted subtitles isolated across movie variants', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: `IntegrationProfile_${Date.now()}_${Math.random()}` },
    });
    const movie = await prisma.movie.create({
      data: {
        tmdbId: Math.floor(Math.random() * 1000000) + 8000,
        title: 'Heat',
        cleanTitle: 'heat',
        sortTitle: 'heat',
        status: 'released',
        monitored: true,
        qualityProfileId: profile.id,
        year: 1995,
      },
    });

    await indexer.syncMovieVariants(movie.id, [
      {
        path: '/data/media/movies/Heat (1995)/heat.1080p.mp4',
        fileSize: BigInt(2_000_000_000),
        probeMetadata: {
          streams: [{ index: 0, codec_type: 'audio', tags: { language: 'eng' } }],
        },
      },
      {
        path: '/data/media/movies/Heat (1995)/heat.2160p.mkv',
        fileSize: BigInt(7_000_000_000),
        probeMetadata: {
          streams: [{ index: 0, codec_type: 'audio', tags: { language: 'fra' } }],
        },
        externalSubtitles: [
          {
            languageCode: 'fr',
            filePath: '/data/media/movies/Heat (1995)/heat.2160p.fr.srt',
          },
        ],
      },
    ]);

    const variants = await repository.listMovieVariants(movie.id);
    expect(variants).toHaveLength(2);

    const profileItems = [
      makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
      makeItem({ id: 2, language: 'fr' }),
    ];

    for (const variant of variants) {
      await missingService.computeAndPersistForVariant(
        variant.id,
        profileItems,
        null,
      );
      await wantedService.syncWantedForVariant(variant.id);
    }

    const wantedByVariant = await Promise.all(
      variants.map(async variant => ({
        id: variant.id,
        wanted: await repository.listWantedSubtitlesByVariant(variant.id),
      })),
    );

    const wantedCounts = wantedByVariant.map(item => item.wanted.length).sort();
    expect(wantedCounts).toEqual([1, 1]);
    expect(
      wantedByVariant.every(item =>
        item.wanted.every(wanted => wanted.variantId === item.id),
      ),
    ).toBe(true);
  });

  it('should handle single-file multi-audio variant requirements', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: `IntegrationSeriesProfile_${Date.now()}_${Math.random()}` },
    });
    const series = await prisma.series.create({
      data: {
        tvdbId: Math.floor(Math.random() * 1000000) + 9000,
        title: 'Andor',
        cleanTitle: 'andor',
        sortTitle: 'andor',
        status: 'continuing',
        monitored: true,
        qualityProfileId: profile.id,
        year: 2022,
      },
    });
    const episode = await prisma.episode.create({
      data: {
        seriesId: series.id,
        tvdbId: Math.floor(Math.random() * 1000000) + 9001,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Kassa',
        monitored: true,
      },
    });

    await indexer.syncEpisodeVariants(episode.id, [
      {
        path: '/data/media/tv/Andor/S01E01.mkv',
        fileSize: BigInt(1_500_000_000),
        probeMetadata: {
          streams: [
            { index: 0, codec_type: 'audio', tags: { language: 'eng' } },
            { index: 1, codec_type: 'audio', tags: { language: 'spa' } },
          ],
        },
      },
    ]);

    const [variant] = await repository.listEpisodeVariants(episode.id);

    const result = await missingService.computeAndPersistForVariant(
      variant.id,
      [
        makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
        makeItem({ id: 2, language: 'es', audio_only_include: 'True' }),
      ],
      null,
    );
    await wantedService.syncWantedForVariant(variant.id);

    expect(result.missingSubtitles).toEqual([
      { languageCode: 'es', isForced: false, isHi: false },
    ]);

    const wanted = await repository.listWantedSubtitlesByVariant(variant.id);
    expect(wanted).toHaveLength(1);
    expect(wanted[0].languageCode).toBe('es');
  });
});
