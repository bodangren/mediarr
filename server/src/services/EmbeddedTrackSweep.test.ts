import { describe, expect, it } from 'vitest';
import { sweepEmbeddedTracks } from './EmbeddedTrackSweep';

/**
 * Regression cover for 2026-11-19: OITNB S07's 13 linked episodes carry an
 * embedded English subrip stream, but only the EXTERNAL `zho` sidecar was in the
 * DB, so the client could not see or offer the English track.
 */
describe('sweepEmbeddedTracks', () => {
  const ffprobeJson = {
    streams: [
      { index: 0, codec_type: 'video', codec_name: 'h264' },
      { index: 1, codec_type: 'audio', codec_name: 'aac', tags: { language: 'eng' } },
      { index: 2, codec_type: 'subtitle', codec_name: 'subrip', tags: { language: 'eng' } },
      { index: 3, codec_type: 'subtitle', codec_name: 'subrip', tags: { language: 'ger' } },
    ],
  };

  it('registers every embedded subtitle stream as a track', async () => {
    const created: any[] = [];
    const result = await sweepEmbeddedTracks(
      {
        listVariantsWithoutEmbeddedTracks: async () => [{ id: 5834, path: '/tv/s07e01.mkv' }],
        probe: async () => ffprobeJson,
        createTrack: async (track) => { created.push(track); },
      },
      { limit: 10 },
    );

    expect(result.registered).toBe(2);
    // The parser normalises ISO 639-2 codes to the short form the API and UI use.
    expect(created.map((track) => track.languageCode)).toEqual(['en', 'de']);
    expect(created[0].source).toBe('EMBEDDED');
    expect(created[0].variantId).toBe(5834);
    expect(created[0].streamIndex).toBe(2);
  });

  it('keeps going after one film fails to probe', async () => {
    const created: any[] = [];
    const result = await sweepEmbeddedTracks({
      listVariantsWithoutEmbeddedTracks: async () => [
        { id: 1, path: '/tv/broken.mkv' },
        { id: 2, path: '/tv/fine.mkv' },
      ],
      probe: async (file) => {
        if (file.includes('broken')) throw new Error('ffprobe: no such file');
        return ffprobeJson;
      },
      createTrack: async (track) => { created.push(track); },
    });

    expect(result.failed).toEqual([{ id: 1, error: 'ffprobe: no such file' }]);
    expect(result.registered).toBe(2);
    expect(created.every((track) => track.variantId === 2)).toBe(true);
  });

  it('does no work when every variant already has embedded rows', async () => {
    const result = await sweepEmbeddedTracks({
      listVariantsWithoutEmbeddedTracks: async () => [],
      probe: async () => { throw new Error('must not probe'); },
      createTrack: async () => { throw new Error('must not create'); },
    });
    expect(result.checked).toBe(0);
    expect(result.registered).toBe(0);
  });
});
