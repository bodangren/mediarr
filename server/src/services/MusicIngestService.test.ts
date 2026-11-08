import { describe, expect, it, vi } from 'vitest';
import { MusicIngestService } from './MusicIngestService';

function io(files: string[], overrides: Partial<NonNullable<ConstructorParameters<typeof MusicIngestService>[0]['fsOps']>> = {}) {
  const unlinked: string[] = [];
  return {
    unlinked,
    io: {
      mkdir: vi.fn(async () => undefined),
      readdir: vi.fn(async () => files),
      unlink: vi.fn(async (file: string) => { unlinked.push(file); }),
      stat: vi.fn(async () => ({ size: 9_000_000 })),
      ...overrides,
    },
  };
}

describe('MusicIngestService', () => {
  it('downloads best audio and converts to AAC 256k m4a with a thumbnail', async () => {
    const { io: fake } = io(['music-aaaaaaaaaaa.webm', 'music-aaaaaaaaaaa.jpg']);
    const ytDlp = vi.fn(async (args: string[]) => {
      expect(args.join(' ')).toContain('bestaudio');
      expect(args.join(' ')).toContain('watch?v=aaaaaaaaaaa');
    });
    const ffmpeg = vi.fn(async (args: string[]) => {
      expect(args.join(' ')).toContain('-b:a 256k');
      expect(args.join(' ')).toContain('aac');
      expect(args.at(-1)).toMatch(/music-aaaaaaaaaaa\.m4a$/);
    });
    const service = new MusicIngestService({ stagingDir: '/data/Music/_incoming', runYtDlp: ytDlp, runFfmpeg: ffmpeg, fsOps: fake });

    const result = await service.ingest('aaaaaaaaaaa');

    expect(result).toMatchObject({ ok: true, sizeBytes: 9_000_000 });
    expect(result.audioPath).toMatch(/music-aaaaaaaaaaa\.m4a$/);
    expect(result.thumbnailPath).toMatch(/music-aaaaaaaaaaa\.jpg$/);
  });

  it('reports the yt-dlp error and removes partial files', async () => {
    const { io: fake, unlinked } = io(['music-bbbbbbbbbbb.part']);
    const service = new MusicIngestService({
      stagingDir: '/tmp/music',
      runYtDlp: async () => { throw new Error('video unavailable'); },
      runFfmpeg: async () => undefined,
      fsOps: fake,
    });

    const result = await service.ingest('bbbbbbbbbbb');

    expect(result).toEqual({ ok: false, error: 'video unavailable' });
    expect(unlinked.some((file) => file.endsWith('.part'))).toBe(true);
  });

  it('does not leave a converted file when ffmpeg fails', async () => {
    const { io: fake } = io(['music-ccccccccccc.webm']);
    const service = new MusicIngestService({
      stagingDir: '/tmp/music',
      runYtDlp: async () => undefined,
      runFfmpeg: async () => { throw new Error('encoder missing'); },
      fsOps: fake,
    });

    const result = await service.ingest('ccccccccccc');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('ffmpeg convert failed');
  });

  it('fails honestly when yt-dlp writes no audio', async () => {
    const { io: fake } = io([]);
    const service = new MusicIngestService({
      stagingDir: '/tmp/music',
      runYtDlp: async () => undefined,
      runFfmpeg: async () => undefined,
      fsOps: fake,
    });

    const result = await service.ingest('ddddddddddd');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no audio file');
  });
});
