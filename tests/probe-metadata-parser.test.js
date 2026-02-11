import { describe, it, expect } from 'vitest';
import { ProbeMetadataParser } from '../server/src/services/ProbeMetadataParser';

describe('ProbeMetadataParser', () => {
  it('should parse ffprobe audio/subtitle tracks including commentary', () => {
    const parser = new ProbeMetadataParser();
    const result = parser.parse({
      streams: [
        {
          index: 0,
          codec_type: 'audio',
          codec_name: 'dts',
          channels: 6,
          tags: { language: 'eng', title: 'Main Audio' },
          disposition: { default: 1, forced: 0, comment: 0 },
        },
        {
          index: 1,
          codec_type: 'audio',
          codec_name: 'aac',
          channels: 2,
          tags: { language: 'eng', title: 'Director Commentary' },
          disposition: { default: 0, forced: 0, comment: 0 },
        },
        {
          index: 3,
          codec_type: 'subtitle',
          codec_name: 'subrip',
          tags: { language: 'spa', title: 'Spanish SDH' },
          disposition: { forced: 0, hearing_impaired: 1 },
        },
      ],
    });

    expect(result.audioTracks).toHaveLength(2);
    expect(result.audioTracks[0]).toEqual(
      expect.objectContaining({
        streamIndex: 0,
        languageCode: 'en',
        isDefault: true,
        isCommentary: false,
      }),
    );
    expect(result.audioTracks[1]).toEqual(
      expect.objectContaining({
        streamIndex: 1,
        languageCode: 'en',
        isCommentary: true,
      }),
    );

    expect(result.embeddedSubtitleTracks).toHaveLength(1);
    expect(result.embeddedSubtitleTracks[0]).toEqual(
      expect.objectContaining({
        source: 'EMBEDDED',
        streamIndex: 3,
        languageCode: 'es',
        isHi: true,
      }),
    );
  });

  it('should parse mediainfo tracks and keep undefined language when absent', () => {
    const parser = new ProbeMetadataParser();
    const result = parser.parse({
      tracks: [
        {
          '@type': 'Audio',
          ID: '2',
          Language: 'jpn',
          Format: 'AAC',
          Channels: '2',
          Default: 'Yes',
        },
        {
          '@type': 'Audio',
          ID: '3',
          Title: 'Commentary Track',
          Format: 'AAC',
          Channels: '2',
          Default: 'No',
        },
        {
          '@type': 'Text',
          ID: '5',
          Language: 'eng',
          Forced: 'Yes',
        },
      ],
    });

    expect(result.audioTracks).toHaveLength(2);
    expect(result.audioTracks[0].languageCode).toBe('ja');
    expect(result.audioTracks[1].languageCode).toBeUndefined();
    expect(result.audioTracks[1].isCommentary).toBe(true);

    expect(result.embeddedSubtitleTracks).toEqual([
      expect.objectContaining({
        streamIndex: 5,
        languageCode: 'en',
        isForced: true,
      }),
    ]);
  });
});
