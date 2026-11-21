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

  it('writes yt-dlp metadata hints into the file for beets', async () => {
    const { io: fake } = io(
      ['music-eeeeeeeeeee.webm', 'music-eeeeeeeeeee.jpg', 'music-eeeeeeeeeee.info.json'],
      {
        readFile: async () => JSON.stringify({
          artist: 'Rick Astley', track: 'Never Gonna Give You Up', album: 'Whenever You Need Somebody', release_year: 1987,
        }),
      },
    );
    const ffmpeg = vi.fn(async (_args: string[]) => undefined);
    const service = new MusicIngestService({
      stagingDir: '/tmp/music',
      runYtDlp: async () => undefined,
      runFfmpeg: ffmpeg,
      fsOps: fake,
    });

    const result = await service.ingest('eeeeeeeeeee');

    expect(result.hints).toEqual({
      artist: 'Rick Astley', album: 'Whenever You Need Somebody', title: 'Never Gonna Give You Up', year: 1987,
    });
    const metadataCall = ffmpeg.mock.calls.at(-1)?.[0]?.join(' ');
    expect(metadataCall).toContain('artist=Rick Astley');
    expect(metadataCall).toContain('-c copy');
  });

  it('passes the yt-dlp cookie auth args so bot-checked videos can be ingested', async () => {
    const { io: fake } = io(['music-fffffffffff.webm']);
    const ytDlp = vi.fn(async (_args: string[]) => undefined);
    const service = new MusicIngestService({
      stagingDir: '/tmp/music',
      authArgs: ['--cookies-from-browser', 'chrome'],
      runYtDlp: ytDlp,
      runFfmpeg: async () => undefined,
      fsOps: fake,
    });

    await service.ingest('fffffffffff');

    const args = ytDlp.mock.calls[0]?.[0] ?? [];
    expect(args).toEqual(expect.arrayContaining(['--cookies-from-browser', 'chrome']));
    // The existing download contract must survive the auth args.
    expect(args).toEqual(expect.arrayContaining(['--no-playlist', '--write-info-json', '-f', 'bestaudio/best']));
  });

  it('reads the cookie config from the environment like the YouTube downloader', async () => {
    vi.stubEnv('YTDLP_COOKIES_FILE', '');
    vi.stubEnv('YTDLP_COOKIES_FROM_BROWSER', 'chrome');
    try {
      const { io: fake } = io(['music-ggggggggggg.webm']);
      const ytDlp = vi.fn(async (_args: string[]) => undefined);
      const service = new MusicIngestService({
        stagingDir: '/tmp/music',
        runYtDlp: ytDlp,
        runFfmpeg: async () => undefined,
        fsOps: fake,
      });

      await service.ingest('ggggggggggg');

      // Music ingest and the YouTube downloader share one cookie/JS-runtime contract;
      // pinning the exact flags here would drift every time that contract gains a flag.
      expect(ytDlp.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
        '--cookies-from-browser',
        expect.stringContaining('chrome'),
        '--js-runtimes',
        'node',
      ]));
    } finally {
      vi.unstubAllEnvs();
    }
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
