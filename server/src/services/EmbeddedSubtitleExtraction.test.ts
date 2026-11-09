import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  extractEmbeddedChineseSubtitles,
  isExtractableChineseTrack,
  sidecarPathFor,
} from './EmbeddedSubtitleExtraction';

describe('isExtractableChineseTrack', () => {
  const base = { trackId: 1, videoPath: '/tv/a.mkv', streamIndex: 3, languageCode: 'chi', codec: 'subrip' };
  it('accepts text Chinese tracks with a stream index', () => {
    expect(isExtractableChineseTrack(base)).toBe(true);
    expect(isExtractableChineseTrack({ ...base, codec: 'mov_text' })).toBe(true);
  });
  it('rejects bitmap, non-Chinese, or index-less tracks', () => {
    expect(isExtractableChineseTrack({ ...base, codec: 'hdmv_pgs_subtitle' })).toBe(false);
    expect(isExtractableChineseTrack({ ...base, codec: 'dvd_subtitle' })).toBe(false);
    expect(isExtractableChineseTrack({ ...base, languageCode: 'eng' })).toBe(false);
    expect(isExtractableChineseTrack({ ...base, streamIndex: null })).toBe(false);
  });
});

describe('sidecarPathFor', () => {
  it('replaces the container extension with .zho.srt', () => {
    expect(sidecarPathFor('/tv/Show S01E01.mkv')).toBe('/tv/Show S01E01.zho.srt');
    expect(sidecarPathFor('/tv/Movie (2024).mp4')).toBe('/tv/Movie (2024).zho.srt');
  });
});

describe('extractEmbeddedChineseSubtitles', () => {
  const dirs: string[] = [];
  afterAll(async () => {
    for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
  });

  it('extracts text tracks, records file size, and skips bitmap tracks', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sub-extract-'));
    dirs.push(dir);
    const videoPath = path.join(dir, 'episode.mkv');
    await fs.writeFile(videoPath, 'video');
    const execCalls: string[][] = [];
    const updated: Array<{ trackId: number; filePath: string; fileSize: number }> = [];
    const warnings: string[] = [];

    const result = await extractEmbeddedChineseSubtitles([
      { trackId: 10, videoPath, streamIndex: 2, languageCode: 'chi', codec: 'subrip' },
      { trackId: 11, videoPath, streamIndex: 3, languageCode: 'chi', codec: 'hdmv_pgs_subtitle' },
    ], {
      limit: 5,
      exec: async (args) => {
        execCalls.push(args);
        const output = args[args.length - 1]!;
        await fs.writeFile(output, '1\n00:00:01,000 --> 00:00:02,000\n你好\n');
      },
      fileSize: async (filePath) => (await fs.stat(filePath)).size,
      updateTrack: async (trackId, filePath, fileSize) => { updated.push({ trackId, filePath, fileSize }); },
      warn: (message) => warnings.push(message),
    });

    expect(result).toMatchObject({ attempted: 1, extracted: 1, skipped: 1, failed: [] });
    expect(execCalls[0]).toEqual([
      '-nostdin', '-y', '-i', videoPath, '-map', '0:2', '-c:s', 'srt', path.join(dir, 'episode.zho.srt'),
    ]);
    expect(updated).toEqual([{
      trackId: 10,
      filePath: path.join(dir, 'episode.zho.srt'),
      fileSize: expect.any(Number),
    }]);
    expect(warnings).toEqual([]);
  });

  it('adopts an existing sidecar instead of re-extracting the same video', async () => {
    const execCalls: string[][] = [];
    const updated: Array<{ trackId: number; fileSize: number }> = [];
    const result = await extractEmbeddedChineseSubtitles([
      { trackId: 40, videoPath: '/tv/b.mkv', streamIndex: 1, languageCode: 'chi', codec: 'subrip' },
    ], {
      limit: 2,
      exec: async (args) => { execCalls.push(args); },
      fileSize: async () => 500,
      updateTrack: async (trackId, _filePath, fileSize) => { updated.push({ trackId, fileSize }); },
      warn: () => undefined,
    });
    expect(result).toMatchObject({ attempted: 1, extracted: 1, skipped: 0, failed: [] });
    expect(execCalls).toEqual([]);
    expect(updated).toEqual([{ trackId: 40, fileSize: 500 }]);
  });

  it('skips duplicate output paths and tracks that exhausted their attempts', async () => {
    const result = await extractEmbeddedChineseSubtitles([
      { trackId: 30, videoPath: '/tv/a.mkv', streamIndex: 1, languageCode: 'chi', codec: 'subrip' },
      { trackId: 31, videoPath: '/tv/a.mkv', streamIndex: 2, languageCode: 'chi', codec: 'subrip' },
      { trackId: 32, videoPath: '/tv/b.mkv', streamIndex: 1, languageCode: 'chi', codec: 'subrip' },
    ], {
      limit: 5,
      attempts: new Map([[32, 3]]),
      exec: async () => undefined,
      fileSize: async () => 100,
      updateTrack: async () => undefined,
      warn: () => undefined,
    });
    // 30 owns a.zho.srt; 31 is skipped as a duplicate; 32 exhausted its attempts.
    expect(result).toMatchObject({ attempted: 1, extracted: 1, skipped: 2, failed: [] });
  });

  it('reports a failed extraction with the process error and keeps going', async () => {
    const failures: Array<{ trackId: number; error: string }> = [];
    const result = await extractEmbeddedChineseSubtitles([
      { trackId: 20, videoPath: '/tv/a.mkv', streamIndex: 1, languageCode: 'zho', codec: 'ass' },
    ], {
      limit: 2,
      exec: async () => { throw new Error('ffmpeg exited 1'); },
      fileSize: async () => 0,
      updateTrack: async () => undefined,
      warn: () => undefined,
    });
    expect(result.extracted).toBe(0);
    expect(result.failed).toEqual([{ trackId: 20, error: 'ffmpeg exited 1' }]);
    expect(failures).toEqual([]);
  });
});
