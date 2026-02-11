import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { ProbeMetadataParser } from '../server/src/services/ProbeMetadataParser';
import { VariantInventoryIndexer } from '../server/src/services/VariantInventoryIndexer';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new SubtitleVariantRepository(prisma);
const indexer = new VariantInventoryIndexer(repository, new ProbeMetadataParser());

const createMovieFixture = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `IndexerMovieProfile_${Date.now()}_${Math.random()}` },
  });

  return prisma.movie.create({
    data: {
      tmdbId: Math.floor(Math.random() * 1000000) + 2000,
      title: 'Arrival',
      cleanTitle: 'arrival',
      sortTitle: 'arrival',
      status: 'released',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2016,
    },
  });
};

const createEpisodeFixture = async () => {
  const profile = await prisma.qualityProfile.create({
    data: { name: `IndexerSeriesProfile_${Date.now()}_${Math.random()}` },
  });

  const series = await prisma.series.create({
    data: {
      tvdbId: Math.floor(Math.random() * 1000000) + 2000,
      title: 'Dark Matter',
      cleanTitle: 'darkmatter',
      sortTitle: 'dark matter',
      status: 'continuing',
      monitored: true,
      qualityProfileId: profile.id,
      year: 2024,
    },
  });

  return prisma.episode.create({
    data: {
      seriesId: series.id,
      tvdbId: Math.floor(Math.random() * 1000000) + 2000,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot',
      monitored: true,
    },
  });
};

describe('VariantInventoryIndexer', () => {
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

  it('should index multiple movie file variants with parsed tracks', async () => {
    const movie = await createMovieFixture();

    await indexer.syncMovieVariants(movie.id, [
      {
        path: '/data/media/movies/Arrival (2016)/arrival.2016.1080p.mkv',
        fileSize: BigInt(2_100_000_000),
        probeMetadata: {
          streams: [
            {
              index: 0,
              codec_type: 'audio',
              tags: { language: 'eng' },
              disposition: { default: 1 },
            },
          ],
        },
      },
      {
        path: '/data/media/movies/Arrival (2016)/arrival.2016.2160p.mkv',
        fileSize: BigInt(6_000_000_000),
        probeMetadata: {
          streams: [
            {
              index: 0,
              codec_type: 'audio',
              tags: { language: 'eng' },
              disposition: { default: 1 },
            },
            {
              index: 1,
              codec_type: 'audio',
              tags: { language: 'spa', title: 'Latino' },
              disposition: {},
            },
          ],
        },
      },
    ]);

    const variants = await repository.listMovieVariants(movie.id);
    expect(variants).toHaveLength(2);

    const inventoryOne = await repository.getVariantInventory(variants[0].id);
    const inventoryTwo = await repository.getVariantInventory(variants[1].id);
    const audioCounts = [inventoryOne.audioTracks.length, inventoryTwo.audioTracks.length].sort();

    expect(audioCounts).toEqual([1, 2]);
  });

  it('should refresh variants on file changes and remove stale variants', async () => {
    const movie = await createMovieFixture();

    await indexer.syncMovieVariants(movie.id, [
      {
        path: '/data/media/movies/Arrival (2016)/arrival.2016.1080p.mkv',
        fileSize: BigInt(2_100_000_000),
        probeMetadata: { streams: [] },
      },
      {
        path: '/data/media/movies/Arrival (2016)/arrival.2016.720p.mkv',
        fileSize: BigInt(1_300_000_000),
        probeMetadata: { streams: [] },
      },
    ]);

    await indexer.syncMovieVariants(movie.id, [
      {
        path: '/data/media/movies/Arrival (2016)/arrival.2016.1080p.mkv',
        fileSize: BigInt(2_200_000_000),
        probeMetadata: { streams: [] },
      },
    ]);

    const variants = await repository.listMovieVariants(movie.id);
    expect(variants).toHaveLength(1);
    expect(variants[0].fileSize).toBe(BigInt(2_200_000_000));
  });

  it('should index multiple episode variants under a single episode', async () => {
    const episode = await createEpisodeFixture();

    await indexer.syncEpisodeVariants(episode.id, [
      {
        path: '/data/media/tv/Dark Matter/S01E01.1080p.WEB.mkv',
        fileSize: BigInt(1_100_000_000),
        probeMetadata: {
          streams: [
            { index: 0, codec_type: 'audio', tags: { language: 'eng' } },
          ],
        },
        externalSubtitles: [
          {
            languageCode: 'en',
            filePath: '/data/media/tv/Dark Matter/S01E01.1080p.WEB.en.srt',
            fileSize: BigInt(45678),
          },
        ],
      },
      {
        path: '/data/media/tv/Dark Matter/S01E01.2160p.WEB.mkv',
        fileSize: BigInt(3_900_000_000),
        probeMetadata: {
          streams: [
            { index: 0, codec_type: 'audio', tags: { language: 'eng' } },
            {
              index: 1,
              codec_type: 'audio',
              tags: { language: 'eng', title: 'Audio Commentary' },
            },
          ],
        },
      },
    ]);

    const variants = await repository.listEpisodeVariants(episode.id);
    expect(variants).toHaveLength(2);

    const inventory = await repository.getVariantInventory(variants[0].id);
    const merged = [
      ...inventory.audioTracks.map(track => ({
        languageCode: track.languageCode,
        isCommentary: track.isCommentary,
      })),
      ...inventory.subtitleTracks.map(track => ({
        languageCode: track.languageCode,
        source: track.source,
      })),
    ];

    expect(merged.length).toBeGreaterThan(0);
  });
});
