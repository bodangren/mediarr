import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubtitleRequirementEngine,
  ANY_CUTOFF_ID,
  type VariantRequirementInput,
  type LanguageProfileItem,
  type AudioTrackContext,
  type SubtitleTrackState,
} from './SubtitleRequirementEngine';

describe('SubtitleRequirementEngine', () => {
  let engine: SubtitleRequirementEngine;

  const makeProfileItem = (
    overrides: Partial<LanguageProfileItem> = {},
  ): LanguageProfileItem => ({
    id: 1,
    language: 'en',
    forced: 'False',
    hi: 'False',
    audio_exclude: 'False',
    audio_only_include: 'False',
    ...overrides,
  });

  const makeInput = (
    overrides: Partial<VariantRequirementInput> = {},
  ): VariantRequirementInput => ({
    variantId: 1,
    profileItems: [makeProfileItem()],
    cutoffId: null,
    audioTracks: [{ languageCode: 'en' }],
    existingSubtitles: [],
    ...overrides,
  });

  beforeEach(() => {
    engine = new SubtitleRequirementEngine();
  });

  describe('compute', () => {
    it('returns missing for languages without existing tracks', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [makeProfileItem({ id: 1, language: 'en' })],
          existingSubtitles: [],
        }),
      );

      expect(result.missingSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
      expect(result.cutoffMet).toBe(false);
    });

    it('returns empty missing when all desired are covered by existing', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [makeProfileItem({ id: 1, language: 'en' })],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.missingSubtitles).toEqual([]);
      expect(result.cutoffMet).toBe(false);
    });

    it('returns desiredSubtitles matching profile items', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 1, language: 'en' }),
            makeProfileItem({ id: 2, language: 'fr' }),
          ],
          audioTracks: [
            { languageCode: 'en' },
            { languageCode: 'fr' },
          ],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
        { languageCode: 'fr', isForced: false, isHi: false },
      ]);
    });

    it('handles empty profile (no desired subtitles)', () => {
      const result = engine.compute(makeInput({ profileItems: [] }));

      expect(result.desiredSubtitles).toEqual([]);
      expect(result.missingSubtitles).toEqual([]);
      expect(result.cutoffMet).toBe(false);
    });

    it('skips profile item when audio_exclude matches audio language', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_exclude: 'True',
            }),
          ],
          audioTracks: [{ languageCode: 'en' }],
        }),
      );

      expect(result.desiredSubtitles).toEqual([]);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('includes profile item when audio_exclude is set but audio does not match', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_exclude: 'True',
            }),
          ],
          audioTracks: [{ languageCode: 'fr' }],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
    });

    it('skips profile item when audio_only_include is set and audio does not match', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_only_include: 'True',
            }),
          ],
          audioTracks: [{ languageCode: 'fr' }],
        }),
      );

      expect(result.desiredSubtitles).toEqual([]);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('includes profile item when audio_only_include is set and audio matches', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_only_include: 'True',
            }),
          ],
          audioTracks: [{ languageCode: 'en' }],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
    });

    it('returns cutoffMet false when cutoffId is null', () => {
      const result = engine.compute(
        makeInput({
          cutoffId: null,
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.cutoffMet).toBe(false);
    });

    it('returns cutoffMet true when specific cutoffId matches existing subtitle', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 10, language: 'en' }),
            makeProfileItem({ id: 20, language: 'fr' }),
          ],
          cutoffId: 10,
          audioTracks: [{ languageCode: 'en' }, { languageCode: 'fr' }],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.cutoffMet).toBe(true);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('returns cutoffMet false when specific cutoffId does not match', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 10, language: 'en' }),
            makeProfileItem({ id: 20, language: 'fr' }),
          ],
          cutoffId: 20,
          audioTracks: [{ languageCode: 'en' }, { languageCode: 'fr' }],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.cutoffMet).toBe(false);
    });

    it('returns cutoffMet true when ANY_CUTOFF_ID and any profile item is satisfied', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 1, language: 'en' }),
            makeProfileItem({ id: 2, language: 'fr' }),
          ],
          cutoffId: ANY_CUTOFF_ID,
          audioTracks: [{ languageCode: 'en' }, { languageCode: 'fr' }],
          existingSubtitles: [
            { languageCode: 'fr', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.cutoffMet).toBe(true);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('short-circuits missingSubtitles to empty when cutoffMet is true', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 1, language: 'en' }),
            makeProfileItem({ id: 2, language: 'fr' }),
          ],
          cutoffId: 1,
          audioTracks: [{ languageCode: 'en' }, { languageCode: 'fr' }],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.cutoffMet).toBe(true);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('HI subtitle satisfies non-HI requirement (Bazarr fallback)', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [makeProfileItem({ id: 1, language: 'en', hi: 'False' })],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: true },
          ],
        }),
      );

      expect(result.missingSubtitles).toEqual([]);
    });

    it('HI subtitle does not satisfy forced requirement', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 1, language: 'en', forced: 'True' }),
          ],
          existingSubtitles: [
            { languageCode: 'en', isForced: false, isHi: true },
          ],
        }),
      );

      expect(result.missingSubtitles).toEqual([
        { languageCode: 'en', isForced: true, isHi: false },
      ]);
    });

    it('normalizes language codes to lowercase', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [makeProfileItem({ id: 1, language: 'PT-BR' })],
          existingSubtitles: [
            { languageCode: 'pt-br', isForced: false, isHi: false },
          ],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'pt-br', isForced: false, isHi: false },
      ]);
      expect(result.missingSubtitles).toEqual([]);
    });

    it('skips commentary audio tracks in audio matching', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_exclude: 'True',
            }),
          ],
          audioTracks: [
            { languageCode: 'en', isCommentary: true },
            { languageCode: 'fr' },
          ],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
    });

    it('handles null audio languageCode in audio tracks', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({
              id: 1,
              language: 'en',
              audio_exclude: 'True',
            }),
          ],
          audioTracks: [{ languageCode: null }],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
    });

    it('handles forced and HI flags in profile items', () => {
      const result = engine.compute(
        makeInput({
          profileItems: [
            makeProfileItem({ id: 1, language: 'en', forced: 'True', hi: 'True' }),
          ],
          existingSubtitles: [],
        }),
      );

      expect(result.desiredSubtitles).toEqual([
        { languageCode: 'en', isForced: true, isHi: true },
      ]);
      expect(result.missingSubtitles).toEqual([
        { languageCode: 'en', isForced: true, isHi: true },
      ]);
    });
  });

  describe('computeByVariant', () => {
    it('returns keyed record by variantId', () => {
      const inputs: VariantRequirementInput[] = [
        makeInput({
          variantId: 100,
          profileItems: [makeProfileItem({ id: 1, language: 'en' })],
          existingSubtitles: [],
        }),
        makeInput({
          variantId: 200,
          profileItems: [makeProfileItem({ id: 1, language: 'fr' })],
          audioTracks: [{ languageCode: 'fr' }],
          existingSubtitles: [
            { languageCode: 'fr', isForced: false, isHi: false },
          ],
        }),
      ];

      const result = engine.computeByVariant(inputs);

      expect(Object.keys(result)).toEqual(['100', '200']);
      expect(result[100].missingSubtitles).toEqual([
        { languageCode: 'en', isForced: false, isHi: false },
      ]);
      expect(result[200].missingSubtitles).toEqual([]);
    });

    it('returns empty record for empty inputs', () => {
      const result = engine.computeByVariant([]);
      expect(result).toEqual({});
    });
  });
});
