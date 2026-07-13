import { describe, expect, it, vi } from 'vitest';
import { VariantInventoryIndexer } from './VariantInventoryIndexer';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { ProbeMetadataParser } from './ProbeMetadataParser';

const makeRepositoryMock = () => ({
  upsertVariant: vi.fn().mockResolvedValue({ id: 1 }),
  replaceAudioTracks: vi.fn().mockResolvedValue([]),
  replaceSubtitleTracks: vi.fn().mockResolvedValue([]),
  deleteMovieVariantsNotInPaths: vi.fn().mockResolvedValue(undefined),
  deleteEpisodeVariantsNotInPaths: vi.fn().mockResolvedValue(undefined),
});

const makeParserMock = () => ({
  parse: vi.fn().mockReturnValue({ audioTracks: [], embeddedSubtitleTracks: [] }),
});

const buildService = () => {
  const repositoryMock = makeRepositoryMock();
  const parserMock = makeParserMock();
  const service = new VariantInventoryIndexer(
    repositoryMock as unknown as SubtitleVariantRepository,
    parserMock as unknown as ProbeMetadataParser,
  );
  return { service, repositoryMock, parserMock };
};

describe('VariantInventoryIndexer', () => {
  describe('syncMovieVariants', () => {
    it('upserts variant with file metadata', async () => {
      const { service, repositoryMock } = buildService();

      await service.syncMovieVariants(42, [
        { path: '/data/movie.mkv', fileSize: 1024 },
      ]);

      expect(repositoryMock.upsertVariant).toHaveBeenCalledWith({
        mediaType: 'MOVIE',
        movieId: 42,
        path: '/data/movie.mkv',
        fileSize: 1024,
        monitored: undefined,
        probeFingerprint: undefined,
        releaseName: undefined,
        quality: undefined,
      });
    });

    it('upserts external subtitle tracks', async () => {
      const { service, repositoryMock } = buildService();

      await service.syncMovieVariants(42, [
        {
          path: '/data/movie.mkv',
          fileSize: 1024,
          externalSubtitles: [
            { languageCode: 'en', filePath: '/subs/en.srt', fileSize: 100 },
          ],
        },
      ]);

      expect(repositoryMock.replaceSubtitleTracks).toHaveBeenCalledWith(1, [
        {
          source: 'EXTERNAL',
          streamIndex: undefined,
          languageCode: 'en',
          isForced: false,
          isHi: false,
          filePath: '/subs/en.srt',
          fileSize: 100,
        },
      ]);
    });

    it('calls ProbeMetadataParser when probeMetadata is provided', async () => {
      const { service, repositoryMock, parserMock } = buildService();

      const probeMetadata = { streams: [{ codec_type: 'audio', codec_name: 'aac' }] };
      parserMock.parse.mockReturnValue({
        audioTracks: [{ streamIndex: 0, languageCode: 'en', codec: 'aac' }],
        embeddedSubtitleTracks: [],
      });

      await service.syncMovieVariants(42, [
        { path: '/data/movie.mkv', fileSize: 1024, probeMetadata },
      ]);

      expect(parserMock.parse).toHaveBeenCalledWith(probeMetadata);
      expect(repositoryMock.replaceAudioTracks).toHaveBeenCalledWith(1, [
        { streamIndex: 0, languageCode: 'en', codec: 'aac' },
      ]);
    });

    it('handles empty files array', async () => {
      const { service, repositoryMock } = buildService();

      await service.syncMovieVariants(42, []);

      expect(repositoryMock.deleteMovieVariantsNotInPaths).toHaveBeenCalledWith(42, []);
      expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
    });

    it('handles file with no external subtitles', async () => {
      const { service, repositoryMock } = buildService();

      await service.syncMovieVariants(42, [
        { path: '/data/movie.mkv', fileSize: 1024 },
      ]);

      expect(repositoryMock.replaceSubtitleTracks).toHaveBeenCalledWith(1, []);
    });
  });

  describe('syncEpisodeVariants', () => {
    it('upserts variant with episodeId', async () => {
      const { service, repositoryMock } = buildService();

      await service.syncEpisodeVariants(99, [
        { path: '/data/ep.mkv', fileSize: 500 },
      ]);

      expect(repositoryMock.upsertVariant).toHaveBeenCalledWith({
        mediaType: 'EPISODE',
        episodeId: 99,
        path: '/data/ep.mkv',
        fileSize: 500,
        monitored: undefined,
        probeFingerprint: undefined,
        releaseName: undefined,
        quality: undefined,
      });
    });
  });
});
