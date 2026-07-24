import { describe, expect, it, vi, beforeEach } from 'vitest';
import path from 'node:path';
import {
  VariantSubtitleFetchService,
  type SubtitleFetchCandidate,
  type SubtitleFetchProvider,
} from './VariantSubtitleFetchService';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SubtitleNamingService } from './SubtitleNamingService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  writeFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  unlink: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: fsMocks,
}));

type RepositoryMock = Pick<
  SubtitleVariantRepository,
  | 'getWantedSubtitleById'
  | 'updateWantedSubtitleState'
  | 'getVariantInventory'
  | 'listSiblingSubtitlePaths'
  | 'createSubtitleTrack'
  | 'createSubtitleHistory'
  | 'deleteSubtitleTrack'
  | 'deleteSubtitleHistory'
>;

const makeRepositoryMock = (): RepositoryMock & {
  getWantedSubtitleById: ReturnType<typeof vi.fn>;
  updateWantedSubtitleState: ReturnType<typeof vi.fn>;
  getVariantInventory: ReturnType<typeof vi.fn>;
  listSiblingSubtitlePaths: ReturnType<typeof vi.fn>;
  createSubtitleTrack: ReturnType<typeof vi.fn>;
  createSubtitleHistory: ReturnType<typeof vi.fn>;
  deleteSubtitleTrack: ReturnType<typeof vi.fn>;
  deleteSubtitleHistory: ReturnType<typeof vi.fn>;
} => ({
  getWantedSubtitleById: vi.fn<
    (id: number) => Promise<ReturnType<typeof makeWanted> | null>
  >(),
  updateWantedSubtitleState: vi.fn().mockResolvedValue({}),
  getVariantInventory: vi.fn<
    (variantId: number) => Promise<ReturnType<typeof makeInventory>>
  >(),
  listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
  createSubtitleTrack: vi.fn().mockResolvedValue({ id: 1 }),
  createSubtitleHistory: vi.fn().mockResolvedValue({ id: 1 }),
  deleteSubtitleTrack: vi.fn().mockResolvedValue(undefined),
  deleteSubtitleHistory: vi.fn().mockResolvedValue(undefined),
});

const makeNamingMock = () => ({
  buildSubtitlePath: vi.fn().mockReturnValue('/data/movie.en.srt'),
});

const makeActivityMock = () => ({
  emit: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

const makeWanted = (
  overrides: Partial<{
    id: number;
    variantId: number;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    state: string;
  }> = {},
) => ({
  id: 1,
  variantId: 2,
  languageCode: 'en',
  isForced: false,
  isHi: false,
  state: 'PENDING',
  ...overrides,
});

const makeVariant = (
  overrides: Partial<{ id: number; path: string; releaseName: string | null }> = {},
) => ({
  id: 2,
  path: '/data/movie.mkv',
  releaseName: null,
  ...overrides,
});

const makeAudioTrack = (
  overrides: Partial<{
    languageCode: string | null;
    isCommentary: boolean;
    isDefault: boolean;
  }> = {},
) => ({
  languageCode: 'en',
  isCommentary: false,
  isDefault: true,
  ...overrides,
});

const makeSubtitleTrack = (overrides: Partial<{ filePath: string | null }> = {}) => ({
  filePath: null,
  ...overrides,
});

const makeInventory = (overrides: {
  variant?: ReturnType<typeof makeVariant> | null;
  audioTracks?: Array<ReturnType<typeof makeAudioTrack>>;
  subtitleTracks?: Array<ReturnType<typeof makeSubtitleTrack>>;
} = {}) => ({
  variant: overrides.variant === undefined ? makeVariant() : overrides.variant,
  audioTracks: overrides.audioTracks ?? [],
  subtitleTracks: overrides.subtitleTracks ?? [],
  missingSubtitles: [],
});

const makeCandidate = (
  overrides: Partial<SubtitleFetchCandidate> = {},
): SubtitleFetchCandidate => ({
  languageCode: 'en',
  isForced: false,
  isHi: false,
  provider: 'openSubtitles',
  score: 85,
  content: Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nHi\n'),
  extension: '.srt',
  ...overrides,
});

const makeProvider = (
  overrides: { candidate?: SubtitleFetchCandidate | null } = {},
): SubtitleFetchProvider => ({
  searchBestSubtitle: vi
    .fn<SubtitleFetchProvider['searchBestSubtitle']>()
    .mockResolvedValue(
      overrides.candidate === undefined ? makeCandidate() : overrides.candidate,
    ),
});

const buildService = (
  opts: {
    namingMock?: ReturnType<typeof makeNamingMock>;
    activityMock?: ReturnType<typeof makeActivityMock>;
  } = {},
) => {
  const repositoryMock = makeRepositoryMock();
  const namingMock = opts.namingMock ?? makeNamingMock();
  const activityMock = opts.activityMock;
  const service = new VariantSubtitleFetchService(
    repositoryMock as unknown as SubtitleVariantRepository,
    namingMock as unknown as SubtitleNamingService,
    activityMock as unknown as ActivityEventEmitter | undefined,
  );
  return { service, repositoryMock, namingMock, activityMock };
};

const WEBVTT_CONTENT = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHi\n');

describe('VariantSubtitleFetchService', () => {
  beforeEach(() => {
    fsMocks.mkdir.mockClear();
    fsMocks.writeFile.mockClear();
    fsMocks.unlink.mockClear();
  });

  describe('fetchWantedSubtitle', () => {
    it('calls provider with the correct FetchProviderContext on success', async () => {
      const { service, repositoryMock } = buildService();
      const provider = makeProvider();

      repositoryMock.getWantedSubtitleById.mockResolvedValue(
        makeWanted({ id: 1, languageCode: 'en', isForced: false, isHi: false }),
      );
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variant: makeVariant({ id: 2, path: '/data/movie.mkv' }),
          audioTracks: [
            makeAudioTrack({
              languageCode: 'en',
              isCommentary: false,
              isDefault: true,
            }),
          ],
        }),
      );

      await service.fetchWantedSubtitle(1, provider);

      expect(provider.searchBestSubtitle).toHaveBeenCalledTimes(1);
      expect(provider.searchBestSubtitle).toHaveBeenCalledWith({
        wantedSubtitle: {
          id: 1,
          languageCode: 'en',
          isForced: false,
          isHi: false,
        },
        variant: {
          id: 2,
          path: '/data/movie.mkv',
          releaseName: null,
        },
        audioTracks: [
          { languageCode: 'en', isCommentary: false, isDefault: true },
        ],
      });
    });

    it('returns FetchWantedResult on success', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider({
        candidate: makeCandidate({
          provider: 'openSubtitles',
          score: 85,
          content: WEBVTT_CONTENT,
        }),
      });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      const result = await service.fetchWantedSubtitle(1, provider);

      expect(result).toEqual({
        storedPath: '/data/movie.en.srt',
        provider: 'openSubtitles',
        score: 85,
      });
    });

    it('persists the subtitle track via createSubtitleTrack and writes the file to disk', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider({
        candidate: makeCandidate({
          languageCode: 'en',
          isForced: false,
          isHi: false,
          content: WEBVTT_CONTENT,
        }),
      });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({ variant: makeVariant({ id: 2, path: '/data/movie.mkv' }) }),
      );

      await service.fetchWantedSubtitle(1, provider);

      expect(fsMocks.mkdir).toHaveBeenCalledWith(
        path.dirname('/data/movie.en.srt'),
        { recursive: true },
      );
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        '/data/movie.en.srt',
        WEBVTT_CONTENT,
      );
      expect(repositoryMock.createSubtitleTrack).toHaveBeenCalledTimes(1);
      expect(repositoryMock.createSubtitleTrack).toHaveBeenCalledWith({
        variantId: 2,
        source: 'EXTERNAL',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        filePath: '/data/movie.en.srt',
        fileSize: Number(WEBVTT_CONTENT.byteLength),
      });
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledTimes(1);
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledWith({
        variantId: 2,
        wantedSubtitleId: 1,
        languageCode: 'en',
        provider: 'openSubtitles',
        score: 85,
        storedPath: '/data/movie.en.srt',
        message: 'Subtitle downloaded for variant',
      });
    });

    it('transitions wanted state SEARCHING → DOWNLOADED on success', async () => {
      const { service, repositoryMock } = buildService();
      const provider = makeProvider();

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      await service.fetchWantedSubtitle(1, provider);

      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenCalledTimes(2);
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenNthCalledWith(
        1,
        1,
        'SEARCHING',
      );
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenNthCalledWith(
        2,
        1,
        'DOWNLOADED',
      );
    });

    it('returns null and marks wanted FAILED when the provider returns null', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider({ candidate: null });

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      const result = await service.fetchWantedSubtitle(1, provider);

      expect(result).toBeNull();
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenCalledTimes(2);
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenNthCalledWith(
        2,
        1,
        'FAILED',
      );
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
      expect(repositoryMock.createSubtitleTrack).not.toHaveBeenCalled();
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          wantedSubtitleId: 1,
          message: 'Subtitle download failed: No subtitle found for en',
        }),
      );
      expect(namingMock.buildSubtitlePath).not.toHaveBeenCalled();
    });

    it('throws when the wanted subtitle is not found', async () => {
      const { service, repositoryMock } = buildService();
      const provider = makeProvider();
      repositoryMock.getWantedSubtitleById.mockResolvedValue(null);

      await expect(
        service.fetchWantedSubtitle(99, provider),
      ).rejects.toThrow('Wanted subtitle 99 not found');

      expect(repositoryMock.updateWantedSubtitleState).not.toHaveBeenCalled();
      expect(repositoryMock.getVariantInventory).not.toHaveBeenCalled();
      expect(provider.searchBestSubtitle).not.toHaveBeenCalled();
    });

    it('marks wanted FAILED then throws when the variant is missing', async () => {
      const { service, repositoryMock } = buildService();
      const provider = makeProvider();

      repositoryMock.getWantedSubtitleById.mockResolvedValue(
        makeWanted({ id: 1, variantId: 42 }),
      );
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({ variant: null }),
      );

      await expect(
        service.fetchWantedSubtitle(1, provider),
      ).rejects.toThrow('Variant 42 not found');

      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenCalledTimes(2);
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenNthCalledWith(
        1,
        1,
        'SEARCHING',
      );
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenNthCalledWith(
        2,
        1,
        'FAILED',
      );
      expect(provider.searchBestSubtitle).not.toHaveBeenCalled();
    });

    it('calls the naming service with the correct parameters', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider({
        candidate: makeCandidate({
          languageCode: 'en',
          isForced: false,
          isHi: false,
          extension: '.srt',
        }),
      });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variant: makeVariant({
            id: 2,
            path: '/data/movie.mkv',
            releaseName: 'My.Release-GROUP',
          }),
          subtitleTracks: [
            makeSubtitleTrack({ filePath: '/data/existing.en.srt' }),
          ],
        }),
      );
      repositoryMock.listSiblingSubtitlePaths.mockResolvedValue([
        '/data/sibling.fr.srt',
      ]);

      await service.fetchWantedSubtitle(1, provider);

      expect(namingMock.buildSubtitlePath).toHaveBeenCalledTimes(1);
      expect(namingMock.buildSubtitlePath).toHaveBeenCalledWith({
        videoPath: '/data/movie.mkv',
        languageCode: 'en',
        isForced: false,
        isHi: false,
        extension: '.srt',
        variantToken: 'My.Release-GROUP',
        existingPaths: ['/data/sibling.fr.srt', '/data/existing.en.srt'],
      });
    });

    it('uses the default .srt extension and variant-<id> token when unset', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider({
        candidate: makeCandidate({ extension: undefined }),
      });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variant: makeVariant({ id: 7, path: '/data/movie.mkv', releaseName: null }),
        }),
      );

      await service.fetchWantedSubtitle(1, provider);

      expect(namingMock.buildSubtitlePath).toHaveBeenCalledWith(
        expect.objectContaining({
          extension: '.srt',
          variantToken: 'variant-7',
        }),
      );
    });

    it.each([
      ['missing', undefined],
      ['zero-byte', Buffer.alloc(0)],
    ])('rejects %s provider content before filesystem or subtitle-record mutation', async (_label, content) => {
      const activityMock = makeActivityMock();
      const { service, repositoryMock, namingMock } = buildService({ activityMock });
      const provider = makeProvider({
        candidate: makeCandidate({ content }),
      });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variant: makeVariant({ id: 2, path: '/data/movie.mkv' }),
        }),
      );

      await expect(service.fetchWantedSubtitle(1, provider)).rejects.toThrow(
        'Subtitle provider returned missing or empty content',
      );

      expect(fsMocks.mkdir).not.toHaveBeenCalled();
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
      expect(repositoryMock.createSubtitleTrack).not.toHaveBeenCalled();
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenLastCalledWith(1, 'FAILED');
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          wantedSubtitleId: 1,
          message: expect.stringContaining('failed'),
        }),
      );
      expect(activityMock.emit).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('propagates fs.writeFile errors, cleans partial output, and leaves FAILED metadata', async () => {
      fsMocks.writeFile.mockRejectedValueOnce(new Error('disk full'));

      const activityMock = makeActivityMock();
      const { service, repositoryMock, namingMock } = buildService({ activityMock });
      const provider = makeProvider();
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variant: makeVariant({ id: 2, path: '/data/movie.mkv' }),
        }),
      );

      await expect(service.fetchWantedSubtitle(1, provider)).rejects.toThrow(
        'disk full',
      );

      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenLastCalledWith(1, 'FAILED');
      expect(fsMocks.unlink).toHaveBeenCalledWith('/data/movie.en.srt');
      expect(repositoryMock.createSubtitleTrack).not.toHaveBeenCalled();
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('disk full') }),
      );
      expect(activityMock.emit).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('records provider exceptions as retryable FAILED state and failure metadata', async () => {
      const activityMock = makeActivityMock();
      const { service, repositoryMock } = buildService({ activityMock });
      const provider = makeProvider();
      vi.mocked(provider.searchBestSubtitle).mockRejectedValueOnce(new Error('provider offline'));
      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      await expect(service.fetchWantedSubtitle(1, provider)).rejects.toThrow('provider offline');

      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenLastCalledWith(1, 'FAILED');
      expect(repositoryMock.createSubtitleHistory).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('provider offline') }),
      );
      expect(activityMock.emit).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('compensates a persisted track when history persistence fails', async () => {
      const activityMock = makeActivityMock();
      const { service, repositoryMock, namingMock } = buildService({ activityMock });
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');
      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());
      repositoryMock.createSubtitleTrack.mockResolvedValue({ id: 91 });
      repositoryMock.createSubtitleHistory
        .mockRejectedValueOnce(new Error('history database unavailable'))
        .mockResolvedValueOnce({ id: 92 });

      await expect(service.fetchWantedSubtitle(1, makeProvider())).rejects.toThrow(
        'history database unavailable',
      );

      expect(repositoryMock.deleteSubtitleTrack).toHaveBeenCalledWith(91);
      expect(fsMocks.unlink).toHaveBeenCalledWith('/data/movie.en.srt');
      expect(repositoryMock.updateWantedSubtitleState).toHaveBeenLastCalledWith(1, 'FAILED');
      expect(repositoryMock.createSubtitleHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: expect.stringContaining('history database unavailable') }),
      );
    });

    it('emits a success activity event when ActivityEventEmitter is provided', async () => {
      const activityMock = makeActivityMock();
      const { service, repositoryMock, namingMock } = buildService({
        activityMock,
      });
      const provider = makeProvider();
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(
        makeWanted({ id: 7, languageCode: 'en' }),
      );
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      await service.fetchWantedSubtitle(7, provider);

      expect(activityMock.emit).toHaveBeenCalledTimes(1);
      expect(activityMock.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUBTITLE_DOWNLOADED',
          sourceModule: 'subtitle-fetch-service',
          entityRef: 'wanted:7',
          summary: 'Subtitle downloaded (en)',
          success: true,
        }),
      );
    });

    it('emits a failure activity event when the provider returns null and ActivityEventEmitter is provided', async () => {
      const activityMock = makeActivityMock();
      const { service, repositoryMock, namingMock } = buildService({
        activityMock,
      });
      const provider = makeProvider({ candidate: null });

      repositoryMock.getWantedSubtitleById.mockResolvedValue(
        makeWanted({ id: 8, languageCode: 'fr' }),
      );
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      await service.fetchWantedSubtitle(8, provider);

      expect(activityMock.emit).toHaveBeenCalledTimes(1);
      expect(activityMock.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUBTITLE_DOWNLOADED',
          sourceModule: 'subtitle-fetch-service',
          entityRef: 'wanted:8',
          summary: 'Subtitle download failed (fr): No subtitle found for fr',
          success: false,
        }),
      );
      expect(namingMock.buildSubtitlePath).not.toHaveBeenCalled();
    });

    it('does not throw when ActivityEventEmitter is omitted on the success path', async () => {
      const { service, repositoryMock, namingMock } = buildService();
      const provider = makeProvider();
      namingMock.buildSubtitlePath.mockReturnValue('/data/movie.en.srt');

      repositoryMock.getWantedSubtitleById.mockResolvedValue(makeWanted());
      repositoryMock.getVariantInventory.mockResolvedValue(makeInventory());

      await expect(service.fetchWantedSubtitle(1, provider)).resolves.toEqual(
        expect.objectContaining({
          storedPath: '/data/movie.en.srt',
          provider: 'openSubtitles',
          score: 85,
        }),
      );
    });
  });
});
