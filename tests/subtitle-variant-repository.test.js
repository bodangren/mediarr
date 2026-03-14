import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);

const createMovieFixture = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `MovieProfile_${Date.now()}_${Math.random()}` },
  });

  return prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 1000,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      sortTitle: 'forrest gump',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 1994,
    },
  });
};

const createEpisodeFixture = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `SeriesProfile_${Date.now()}_${Math.random()}` },
  });

  const series = await prisma.series.create({
    data: {
      tvdbId: Math.floor(Math.random() * 1000000) + 1000,
      title: 'The Boys',
      cleanTitle: 'theboys',
      sortTitle: 'the boys',
      status: 'continuing',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2019,
    },
  });

  return prisma.episode.create({
    data: {
      seriesId: series.id,
      tvdbId: Math.floor(Math.random() * 1000000) + 1000,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'The Name of the Game',
      monitored: true,
    },
  });
};

describe('SubtitleVariantRepository', () => {
  beforeEach(async () => {
    await prisma.subtitleHistory.deleteMany();
    await prisma.wantedSubtitle.deleteMany();
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

  it('should persist movie variant inventory and wanted dedupe', async () => {
    const movie = await createMovieFixture();

    const variant = await repository.upsertVariant({
      mediaType: 'MOVIE',
      movieId: movie.id,
      path: '/data/media/movies/Forrest Gump (1994)/forrest.gump.1994.bluray.mkv',
      fileSize: BigInt(4_000_000_000),
      releaseName: 'FG.1994.1080p.BluRay',
      quality: '1080p',
    });

    const audioTracks = await repository.replaceAudioTracks(variant.id, [
      {
        streamIndex: 0,
        languageCode: 'en',
        codec: 'dts',
        channels: '5.1',
        isDefault: true,
      },
      {
        streamIndex: 1,
        languageCode: 'en',
        codec: 'aac',
        channels: '2.0',
        isCommentary: true,
        name: 'Director commentary',
      },
    ]);

    const subtitleTracks = await repository.replaceSubtitleTracks(variant.id, [
      {
        source: 'EMBEDDED',
        streamIndex: 0,
        languageCode: 'en',
      },
      {
        source: 'EXTERNAL',
        filePath:
          '/data/media/movies/Forrest Gump (1994)/forrest.gump.1994.bluray.en.srt',
        languageCode: 'en',
      },
    ]);

    const wantedOne = await repository.upsertWantedSubtitle({
      variantId: variant.id,
      languageCode: 'en',
      isForced: false,
      isHi: false,
    });

    const wantedTwo = await repository.upsertWantedSubtitle({
      variantId: variant.id,
      languageCode: 'en',
      isForced: false,
      isHi: false,
    });

    const history = await repository.createSubtitleHistory({
      variantId: variant.id,
      wantedSubtitleId: wantedOne.id,
      languageCode: 'en',
      provider: 'opensubtitles',
      score: 94.2,
      storedPath:
        '/data/media/movies/Forrest Gump (1994)/forrest.gump.1994.bluray.en.srt',
      message: 'Subtitle downloaded',
    });

    expect(audioTracks).toHaveLength(2);
    expect(audioTracks[1].isCommentary).toBe(true);
    expect(subtitleTracks).toHaveLength(2);
    expect(wantedOne.id).toBe(wantedTwo.id);
    expect(history.provider).toBe('opensubtitles');
  });

  it('should support episode variants and variant inventory query', async () => {
    const episode = await createEpisodeFixture();

    const variant = await repository.upsertVariant({
      mediaType: 'EPISODE',
      episodeId: episode.id,
      path: '/data/media/tv/The Boys/Season 01/the.boys.s01e01.web.h264.mkv',
      fileSize: BigInt(1_400_000_000),
      quality: '1080p',
    });

    await repository.replaceAudioTracks(variant.id, [
      { streamIndex: 0, languageCode: 'en', isDefault: true },
      { streamIndex: 1, languageCode: 'es' },
    ]);

    await repository.replaceSubtitleTracks(variant.id, [
      { source: 'EXTERNAL', languageCode: 'en', filePath: '/tmp/s01e01.en.srt' },
    ]);

    const inventory = await repository.getVariantInventory(variant.id);
    const list = await repository.listEpisodeVariants(episode.id);

    expect(inventory.variant?.id).toBe(variant.id);
    expect(inventory.audioTracks).toHaveLength(2);
    expect(inventory.subtitleTracks).toHaveLength(1);
    expect(list.map(item => item.id)).toContain(variant.id);
  });

  it('should reject invalid media type ownership', async () => {
    await expect(
      repository.upsertVariant({
        mediaType: 'MOVIE',
        path: '/tmp/broken.mkv',
        fileSize: BigInt(100),
      }),
    ).rejects.toThrow('movieId is required for MOVIE variants');

    await expect(
      repository.upsertVariant({
        mediaType: 'EPISODE',
        path: '/tmp/broken-ep.mkv',
        fileSize: BigInt(100),
      }),
    ).rejects.toThrow('episodeId is required for EPISODE variants');
  });
});
