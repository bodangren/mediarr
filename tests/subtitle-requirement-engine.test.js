import { describe, it, expect } from 'vitest';
import {
  ANY_CUTOFF_ID,
  SubtitleRequirementEngine,
} from '../server/src/services/SubtitleRequirementEngine';

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

describe('SubtitleRequirementEngine', () => {
  it('should apply audio include/exclude rules and ignore commentary tracks', () => {
    const engine = new SubtitleRequirementEngine();

    const result = engine.compute({
      variantId: 1,
      profileItems: [
        makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
        makeItem({ id: 2, language: 'es', audio_only_include: 'True' }),
        makeItem({ id: 3, language: 'fr' }),
      ],
      cutoffId: null,
      audioTracks: [
        { languageCode: 'en', isCommentary: false },
        { languageCode: 'es', isCommentary: true },
      ],
      existingSubtitles: [],
    });

    expect(result.desiredSubtitles).toEqual([
      { languageCode: 'fr', isForced: false, isHi: false },
    ]);
    expect(result.missingSubtitles).toEqual([
      { languageCode: 'fr', isForced: false, isHi: false },
    ]);
    expect(result.cutoffMet).toBe(false);
  });

  it('should treat HI subtitles as satisfying non-HI requirements', () => {
    const engine = new SubtitleRequirementEngine();

    const result = engine.compute({
      variantId: 1,
      profileItems: [makeItem({ id: 1, language: 'en' })],
      cutoffId: null,
      audioTracks: [],
      existingSubtitles: [
        { languageCode: 'en', isForced: false, isHi: true },
      ],
    });

    expect(result.missingSubtitles).toEqual([]);
  });

  it('should meet cutoff when a cutoff subtitle is present', () => {
    const engine = new SubtitleRequirementEngine();

    const result = engine.compute({
      variantId: 1,
      profileItems: [
        makeItem({ id: 1, language: 'en' }),
        makeItem({ id: 2, language: 'de' }),
      ],
      cutoffId: 2,
      audioTracks: [],
      existingSubtitles: [
        { languageCode: 'de', isForced: false, isHi: false },
      ],
    });

    expect(result.cutoffMet).toBe(true);
    expect(result.missingSubtitles).toEqual([]);
  });

  it('should meet "Any" cutoff via audio_exclude when audio matches', () => {
    const engine = new SubtitleRequirementEngine();

    const result = engine.compute({
      variantId: 1,
      profileItems: [
        makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
        makeItem({ id: 2, language: 'fr' }),
      ],
      cutoffId: ANY_CUTOFF_ID,
      audioTracks: [{ languageCode: 'en', isCommentary: false }],
      existingSubtitles: [],
    });

    expect(result.cutoffMet).toBe(true);
    expect(result.missingSubtitles).toEqual([]);
  });

  it('should compute requirements per variant independently', () => {
    const engine = new SubtitleRequirementEngine();
    const profileItems = [
      makeItem({ id: 1, language: 'en', audio_exclude: 'True' }),
      makeItem({ id: 2, language: 'es', audio_only_include: 'True' }),
      makeItem({ id: 3, language: 'fr' }),
    ];

    const results = engine.computeByVariant([
      {
        variantId: 10,
        profileItems,
        cutoffId: null,
        audioTracks: [{ languageCode: 'en', isCommentary: false }],
        existingSubtitles: [],
      },
      {
        variantId: 11,
        profileItems,
        cutoffId: null,
        audioTracks: [{ languageCode: 'es', isCommentary: false }],
        existingSubtitles: [],
      },
    ]);

    expect(results[10].missingSubtitles).toEqual([
      { languageCode: 'fr', isForced: false, isHi: false },
    ]);
    expect(results[11].missingSubtitles).toEqual([
      { languageCode: 'en', isForced: false, isHi: false },
      { languageCode: 'es', isForced: false, isHi: false },
      { languageCode: 'fr', isForced: false, isHi: false },
    ]);
  });
});
