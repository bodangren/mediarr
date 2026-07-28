import { describe, expect, it } from 'vitest';
import { ProbeMetadataParser } from './ProbeMetadataParser';

// Sibling coverage for ProbeMetadataParser (chore_remaining_server_service_coverage_20260728).
//
// The service is pure — no DB, no filesystem, no network — so it needs no mocks.
// Baseline before this file: 75.51% branch, with the normalisation edge cases
// (lines 43, 48, 74, 95, 148) unreached by the indirect coverage it had.

const parser = new ProbeMetadataParser();

describe('ProbeMetadataParser', () => {
  describe('non-object input', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'not metadata'],
      ['a number', 42],
      ['a boolean', true],
    ])('returns empty tracks for %s', (_label, input) => {
      expect(parser.parse(input)).toEqual({
        audioTracks: [],
        embeddedSubtitleTracks: [],
      });
    });

    it('returns empty tracks for an object with neither streams nor tracks', () => {
      expect(parser.parse({ format: { duration: '1.0' } })).toEqual({
        audioTracks: [],
        embeddedSubtitleTracks: [],
      });
    });

    it('returns empty tracks when streams is present but not an array', () => {
      expect(parser.parse({ streams: { codec_type: 'audio' } })).toEqual({
        audioTracks: [],
        embeddedSubtitleTracks: [],
      });
    });
  });

  describe('ffprobe shape', () => {
    it('maps an audio stream with tags and disposition', () => {
      const result = parser.parse({
        streams: [
          {
            index: 1,
            codec_type: 'audio',
            codec_name: 'aac',
            channels: 6,
            tags: { language: 'eng', title: 'English 5.1' },
            disposition: { default: 1, forced: 0, comment: 0 },
          },
        ],
      });

      expect(result.audioTracks).toEqual([
        {
          streamIndex: 1,
          languageCode: 'en',
          codec: 'aac',
          channels: '6',
          isDefault: true,
          isForced: false,
          isCommentary: false,
          name: 'English 5.1',
        },
      ]);
      expect(result.embeddedSubtitleTracks).toEqual([]);
    });

    it('maps a subtitle stream and flags SDH from the title', () => {
      const result = parser.parse({
        streams: [
          {
            index: 3,
            codec_type: 'subtitle',
            codec_name: 'subrip',
            tags: { language: 'eng', title: 'English SDH' },
            disposition: { forced: 0, hearing_impaired: 0 },
          },
        ],
      });

      expect(result.embeddedSubtitleTracks).toEqual([
        {
          source: 'EMBEDDED',
          streamIndex: 3,
          languageCode: 'en',
          isForced: false,
          isHi: true,
          codec: 'subrip',
        },
      ]);
    });

    it('flags commentary from the disposition flag as well as the title', () => {
      const byDisposition = parser.parse({
        streams: [
          { index: 0, codec_type: 'audio', disposition: { comment: 1 }, tags: {} },
        ],
      });
      const byTitle = parser.parse({
        streams: [
          {
            index: 0,
            codec_type: 'audio',
            disposition: {},
            tags: { title: "Director's Commentary" },
          },
        ],
      });

      expect(byDisposition.audioTracks[0]?.isCommentary).toBe(true);
      expect(byTitle.audioTracks[0]?.isCommentary).toBe(true);
    });

    it('falls back to handler_name when no title tag is present', () => {
      const result = parser.parse({
        streams: [
          {
            index: 0,
            codec_type: 'audio',
            tags: { handler_name: 'SoundHandler' },
            disposition: {},
          },
        ],
      });

      expect(result.audioTracks[0]?.name).toBe('SoundHandler');
    });

    it('falls back to positional index when index is not an integer', () => {
      const result = parser.parse({
        streams: [
          { codec_type: 'audio', index: 'x', tags: {}, disposition: {} },
          { codec_type: 'audio', index: 1.5, tags: {}, disposition: {} },
          { codec_type: 'subtitle', index: null, tags: {}, disposition: {} },
        ],
      });

      expect(result.audioTracks.map(t => t.streamIndex)).toEqual([0, 1]);
      expect(result.embeddedSubtitleTracks[0]?.streamIndex).toBe(0);
    });

    it('skips stream entries that are not objects', () => {
      const result = parser.parse({
        streams: [
          null,
          'nonsense',
          42,
          { index: 0, codec_type: 'audio', tags: {}, disposition: {} },
        ],
      });

      expect(result.audioTracks).toHaveLength(1);
    });

    it('tolerates missing tags and disposition objects', () => {
      const result = parser.parse({ streams: [{ index: 0, codec_type: 'audio' }] });

      expect(result.audioTracks[0]).toMatchObject({
        streamIndex: 0,
        languageCode: undefined,
        isDefault: false,
        isForced: false,
        isCommentary: false,
        name: undefined,
      });
    });

    it('leaves codec and channels undefined when the fields are the wrong type', () => {
      const result = parser.parse({
        streams: [
          { index: 0, codec_type: 'audio', codec_name: 123, tags: {}, disposition: {} },
        ],
      });

      expect(result.audioTracks[0]?.codec).toBeUndefined();
      expect(result.audioTracks[0]?.channels).toBeUndefined();
    });

    it('ignores streams whose codec_type is neither audio nor subtitle', () => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'video', tags: {}, disposition: {} }],
      });

      expect(result).toEqual({ audioTracks: [], embeddedSubtitleTracks: [] });
    });
  });

  describe('mediainfo fallback', () => {
    it('is used only when ffprobe parsing yields nothing', () => {
      const result = parser.parse({
        streams: [],
        tracks: [
          {
            '@type': 'Audio',
            ID: '2',
            Language: 'spa',
            Format: 'AC-3',
            Channels: '6',
            Default: 'Yes',
            Forced: 'No',
          },
        ],
      });

      expect(result.audioTracks).toEqual([
        {
          streamIndex: 2,
          languageCode: 'es',
          codec: 'ac-3',
          channels: '6',
          isDefault: true,
          isForced: false,
          isCommentary: false,
          name: undefined,
        },
      ]);
    });

    it('is not consulted when ffprobe already produced tracks', () => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'audio', tags: {}, disposition: {} }],
        tracks: [{ '@type': 'Audio', ID: '9', Language: 'fra' }],
      });

      expect(result.audioTracks).toHaveLength(1);
      expect(result.audioTracks[0]?.streamIndex).toBe(0);
    });

    it('accepts both "text" and "subtitle" track types', () => {
      const asText = parser.parse({
        tracks: [{ '@type': 'Text', ID: '3', Language: 'eng' }],
      });
      const asSubtitle = parser.parse({
        tracks: [{ '@type': 'subtitle', ID: '3', Language: 'eng' }],
      });

      expect(asText.embeddedSubtitleTracks).toHaveLength(1);
      expect(asSubtitle.embeddedSubtitleTracks).toHaveLength(1);
    });

    it('reads the legacy Type key and StreamOrder fallback', () => {
      const result = parser.parse({
        tracks: [{ Type: 'Audio', StreamOrder: '4', Language: 'ita' }],
      });

      expect(result.audioTracks[0]).toMatchObject({
        streamIndex: 4,
        languageCode: 'it',
      });
    });

    it('falls back to positional index when the id is not numeric', () => {
      const result = parser.parse({
        tracks: [
          { '@type': 'Audio', ID: 'not-a-number' },
          { '@type': 'Audio', ID: 'also-not' },
          { '@type': 'Text', ID: 'nope' },
        ],
      });

      expect(result.audioTracks.map(t => t.streamIndex)).toEqual([0, 1]);
      expect(result.embeddedSubtitleTracks[0]?.streamIndex).toBe(0);
    });

    it('flags hearing-impaired subtitles from the field and from the title', () => {
      const byField = parser.parse({
        tracks: [{ '@type': 'Text', ID: '0', HearingImpaired: 'Yes' }],
      });
      const byTitle = parser.parse({
        tracks: [{ '@type': 'Text', ID: '0', Title: 'English (hearing impaired)' }],
      });

      expect(byField.embeddedSubtitleTracks[0]?.isHi).toBe(true);
      expect(byTitle.embeddedSubtitleTracks[0]?.isHi).toBe(true);
    });

    it('uses Title_More when Title is absent, and detects commentary from it', () => {
      const result = parser.parse({
        tracks: [{ '@type': 'Audio', ID: '0', Title_More: 'Cast commentary' }],
      });

      expect(result.audioTracks[0]?.name).toBe('Cast commentary');
      expect(result.audioTracks[0]?.isCommentary).toBe(true);
    });

    it('skips track entries that are not objects', () => {
      const result = parser.parse({
        tracks: [null, 'nonsense', 7, { '@type': 'Audio', ID: '0' }],
      });

      expect(result.audioTracks).toHaveLength(1);
    });

    it('ignores track types that are neither audio nor subtitle', () => {
      const result = parser.parse({ tracks: [{ '@type': 'Video', ID: '0' }] });

      expect(result).toEqual({ audioTracks: [], embeddedSubtitleTracks: [] });
    });

    // Line 151: neither '@type' nor 'Type' present falls back to the empty string.
    it('ignores a track that declares no type at all', () => {
      const result = parser.parse({ tracks: [{ ID: '0', Language: 'eng' }] });

      expect(result).toEqual({ audioTracks: [], embeddedSubtitleTracks: [] });
    });

    // Line 187: both sides of the subtitle branch's codec guard.
    it('lower-cases a string subtitle Format and drops a non-string one', () => {
      const withFormat = parser.parse({
        tracks: [{ '@type': 'Text', ID: '0', Format: 'UTF-8' }],
      });
      const withoutFormat = parser.parse({
        tracks: [{ '@type': 'Text', ID: '0', Format: 99 }],
      });

      expect(withFormat.embeddedSubtitleTracks[0]?.codec).toBe('utf-8');
      expect(withoutFormat.embeddedSubtitleTracks[0]?.codec).toBeUndefined();
    });

    it('returns empty tracks when tracks is present but not an array', () => {
      expect(parser.parse({ tracks: { '@type': 'Audio' } })).toEqual({
        audioTracks: [],
        embeddedSubtitleTracks: [],
      });
    });
  });

  describe('language normalisation', () => {
    it.each([
      ['eng', 'en'],
      ['spa', 'es'],
      ['fre', 'fr'],
      ['fra', 'fr'],
      ['deu', 'de'],
      ['ger', 'de'],
      ['ita', 'it'],
      ['jpn', 'ja'],
      ['por', 'pt'],
    ])('maps alpha-3 %s to %s', (input, expected) => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'audio', tags: { language: input }, disposition: {} }],
      });
      expect(result.audioTracks[0]?.languageCode).toBe(expected);
    });

    it('passes through an unmapped alpha-3 code unchanged', () => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'audio', tags: { language: 'nld' }, disposition: {} }],
      });
      expect(result.audioTracks[0]?.languageCode).toBe('nld');
    });

    it('passes through a two-letter code unchanged', () => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'audio', tags: { language: 'EN' }, disposition: {} }],
      });
      expect(result.audioTracks[0]?.languageCode).toBe('en');
    });

    // Line 43: codes of any other length are truncated to two characters.
    it('truncates a code longer than three characters', () => {
      const result = parser.parse({
        streams: [
          { index: 0, codec_type: 'audio', tags: { language: 'english' }, disposition: {} },
        ],
      });
      expect(result.audioTracks[0]?.languageCode).toBe('en');
    });

    it('truncates a one-character code to itself', () => {
      const result = parser.parse({
        streams: [{ index: 0, codec_type: 'audio', tags: { language: 'e' }, disposition: {} }],
      });
      expect(result.audioTracks[0]?.languageCode).toBe('e');
    });

    it.each([
      ['a non-string', 123],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['undefined', undefined],
    ])('returns undefined for %s', (_label, input) => {
      const result = parser.parse({
        streams: [
          { index: 0, codec_type: 'audio', tags: { language: input }, disposition: {} },
        ],
      });
      expect(result.audioTracks[0]?.languageCode).toBeUndefined();
    });
  });

  describe('boolean-like parsing', () => {
    // Line 48: a genuine boolean is returned as-is rather than coerced.
    it.each([
      ['boolean true', true, true],
      ['boolean false', false, false],
      ['positive number', 1, true],
      ['zero', 0, false],
      ['negative number', -1, false],
      ['"1"', '1', true],
      ['"true"', 'true', true],
      ['"TRUE"', 'TRUE', true],
      ['"yes"', 'yes', true],
      ['"y"', 'y', true],
      ['" Yes "', ' Yes ', true],
      ['"0"', '0', false],
      ['"false"', 'false', false],
      ['"maybe"', 'maybe', false],
      ['an object', {}, false],
      ['null', null, false],
      ['undefined', undefined, false],
    ])('treats %s as %s', (_label, input, expected) => {
      const result = parser.parse({
        streams: [
          {
            index: 0,
            codec_type: 'audio',
            tags: {},
            disposition: { default: input },
          },
        ],
      });
      expect(result.audioTracks[0]?.isDefault).toBe(expected);
    });
  });
});
