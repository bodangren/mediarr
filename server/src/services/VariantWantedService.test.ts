import { describe, expect, it, vi } from 'vitest';
import { VariantWantedService } from './VariantWantedService';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

const makeRepositoryMock = () => ({
  listMissingSubtitles: vi.fn().mockResolvedValue([]),
  deleteWantedSubtitlesNotInTargets: vi.fn().mockResolvedValue(undefined),
  upsertWantedSubtitle: vi.fn(),
});

const buildService = () => {
  const repositoryMock = makeRepositoryMock();
  const service = new VariantWantedService(
    repositoryMock as unknown as SubtitleVariantRepository,
  );
  return { service, repositoryMock };
};

const makeMissing = (
  overrides: Partial<{
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
  }> = {},
) => ({
  languageCode: 'en',
  isForced: false,
  isHi: false,
  ...overrides,
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
  variantId: 42,
  languageCode: 'en',
  isForced: false,
  isHi: false,
  state: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('VariantWantedService', () => {
  describe('syncWantedForVariant', () => {
    it('returns wanted subtitles from repository', async () => {
      const { service, repositoryMock } = buildService();
      const wanted1 = makeWanted({ id: 1, languageCode: 'en' });
      const wanted2 = makeWanted({ id: 2, languageCode: 'fr' });

      repositoryMock.listMissingSubtitles.mockResolvedValue([
        makeMissing({ languageCode: 'en' }),
        makeMissing({ languageCode: 'fr' }),
      ]);
      repositoryMock.upsertWantedSubtitle
        .mockResolvedValueOnce(wanted1)
        .mockResolvedValueOnce(wanted2);

      const result = await service.syncWantedForVariant(42);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(wanted1);
      expect(result[1]).toEqual(wanted2);
    });

    it('returns empty array when no missing subtitles exist', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.listMissingSubtitles.mockResolvedValue([]);

      const result = await service.syncWantedForVariant(42);

      expect(result).toEqual([]);
      expect(repositoryMock.upsertWantedSubtitle).not.toHaveBeenCalled();
    });

    it('propagates repository errors', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.listMissingSubtitles.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.syncWantedForVariant(42)).rejects.toThrow(
        'DB connection lost',
      );
    });

    it('passes variantId to repository', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.listMissingSubtitles.mockResolvedValue([]);
      repositoryMock.deleteWantedSubtitlesNotInTargets.mockResolvedValue(
        undefined,
      );

      await service.syncWantedForVariant(99);

      expect(repositoryMock.listMissingSubtitles).toHaveBeenCalledWith(99);
      expect(
        repositoryMock.deleteWantedSubtitlesNotInTargets,
      ).toHaveBeenCalledWith(99, []);
    });

    it('delegates stale wanted cleanup before upserting', async () => {
      const { service, repositoryMock } = buildService();

      repositoryMock.listMissingSubtitles.mockResolvedValue([
        makeMissing({ languageCode: 'en', isForced: false, isHi: false }),
        makeMissing({ languageCode: 'fr', isForced: true, isHi: false }),
      ]);
      repositoryMock.upsertWantedSubtitle
        .mockResolvedValueOnce(makeWanted({ id: 1, languageCode: 'en' }))
        .mockResolvedValueOnce(makeWanted({ id: 2, languageCode: 'fr' }));

      await service.syncWantedForVariant(42);

      expect(
        repositoryMock.deleteWantedSubtitlesNotInTargets,
      ).toHaveBeenCalledWith(42, [
        { languageCode: 'en', isForced: false, isHi: false },
        { languageCode: 'fr', isForced: true, isHi: false },
      ]);

      expect(repositoryMock.upsertWantedSubtitle).toHaveBeenCalledTimes(2);
      expect(repositoryMock.upsertWantedSubtitle).toHaveBeenCalledWith({
        variantId: 42,
        languageCode: 'en',
        isForced: false,
        isHi: false,
      });
      expect(repositoryMock.upsertWantedSubtitle).toHaveBeenCalledWith({
        variantId: 42,
        languageCode: 'fr',
        isForced: true,
        isHi: false,
      });
    });
  });
});
