import { describe, expect, it, vi } from 'vitest';
import { VariantMissingSubtitleService } from './VariantMissingSubtitleService';
import {
  SubtitleRequirementEngine,
  type LanguageProfileItem,
} from './SubtitleRequirementEngine';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

const makeRepositoryMock = () => ({
  getVariantInventory: vi.fn(),
  replaceMissingSubtitles: vi.fn().mockResolvedValue([]),
});

const buildService = () => {
  const repositoryMock = makeRepositoryMock();
  const service = new VariantMissingSubtitleService(
    repositoryMock as unknown as SubtitleVariantRepository,
    new SubtitleRequirementEngine(),
  );
  return { service, repositoryMock };
};

const makeProfileItem = (
  overrides: Partial<LanguageProfileItem> & Pick<LanguageProfileItem, 'id' | 'language'>,
): LanguageProfileItem => ({
  forced: 'False',
  hi: 'False',
  audio_exclude: 'False',
  audio_only_include: 'False',
  ...overrides,
});

const makeInventory = (overrides: {
  variantId?: number;
  audioTracks?: Array<{ languageCode: string | null; isCommentary?: boolean }>;
  subtitleTracks?: Array<{
    languageCode: string | null;
    isForced?: boolean;
    isHi?: boolean;
  }>;
}) => ({
  variant: { id: overrides.variantId ?? 1, mediaType: 'MOVIE' },
  audioTracks: overrides.audioTracks ?? [],
  subtitleTracks: (overrides.subtitleTracks ?? []).map(track => ({
    languageCode: track.languageCode,
    isForced: track.isForced ?? false,
    isHi: track.isHi ?? false,
  })),
  missingSubtitles: [],
});

describe('VariantMissingSubtitleService', () => {
  describe('computeAndPersistForVariant', () => {
    it('persists missing subtitles for languages absent from the variant', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variantId: 7,
          subtitleTracks: [{ languageCode: 'en' }],
        }),
      );

      const profileItems: LanguageProfileItem[] = [
        makeProfileItem({ id: 1, language: 'en' }),
        makeProfileItem({ id: 2, language: 'fr' }),
      ];

      const result = await service.computeAndPersistForVariant(7, profileItems, null);

      expect(repositoryMock.getVariantInventory).toHaveBeenCalledWith(7);
      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledTimes(1);
      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledWith(7, [
        { languageCode: 'fr', isForced: false, isHi: false },
      ]);
      expect(result.missingSubtitles).toEqual([
        { languageCode: 'fr', isForced: false, isHi: false },
      ]);
    });

    it('persists an empty list when every desired language is already present', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variantId: 11,
          subtitleTracks: [
            { languageCode: 'en' },
            { languageCode: 'fr' },
          ],
        }),
      );

      const profileItems: LanguageProfileItem[] = [
        makeProfileItem({ id: 1, language: 'en' }),
        makeProfileItem({ id: 2, language: 'fr' }),
      ];

      const result = await service.computeAndPersistForVariant(11, profileItems, null);

      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledTimes(1);
      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledWith(11, []);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('returns cutoffMet and persists no missing entries when cutoff is satisfied', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variantId: 21,
          subtitleTracks: [{ languageCode: 'en' }],
        }),
      );

      const profileItems: LanguageProfileItem[] = [
        makeProfileItem({ id: 1, language: 'en' }),
        makeProfileItem({ id: 2, language: 'fr' }),
      ];

      const result = await service.computeAndPersistForVariant(21, profileItems, 1);

      expect(result.cutoffMet).toBe(true);
      expect(result.missingSubtitles).toEqual([]);
      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledWith(21, []);
    });

    it('persists an empty list when the profile is empty', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({ variantId: 33 }),
      );

      const result = await service.computeAndPersistForVariant(33, [], null);

      expect(repositoryMock.replaceMissingSubtitles).toHaveBeenCalledWith(33, []);
      expect(result.desiredSubtitles).toEqual([]);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('returns a RequirementResult with desiredSubtitles, missingSubtitles, and cutoffMet', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue(
        makeInventory({
          variantId: 44,
          subtitleTracks: [{ languageCode: 'en' }],
        }),
      );

      const profileItems: LanguageProfileItem[] = [
        makeProfileItem({ id: 1, language: 'en' }),
        makeProfileItem({ id: 2, language: 'fr' }),
      ];

      const result = await service.computeAndPersistForVariant(44, profileItems, null);

      expect(result).toEqual({
        desiredSubtitles: [
          { languageCode: 'en', isForced: false, isHi: false },
          { languageCode: 'fr', isForced: false, isHi: false },
        ],
        missingSubtitles: [{ languageCode: 'fr', isForced: false, isHi: false }],
        cutoffMet: false,
      });
    });

    it('throws when the variant is not found', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.getVariantInventory.mockResolvedValue({
        variant: null,
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      });

      await expect(
        service.computeAndPersistForVariant(42, [], null),
      ).rejects.toThrow('Variant 42 not found');
      expect(repositoryMock.replaceMissingSubtitles).not.toHaveBeenCalled();
    });
  });
});
