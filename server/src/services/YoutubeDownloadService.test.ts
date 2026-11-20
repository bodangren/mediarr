import { describe, expect, it, vi } from 'vitest';
import { targetName, youtubeAuthArgs, YoutubeDownloadService, type DownloadStore, type DownloadableVideo } from './YoutubeDownloadService';

const video: DownloadableVideo = { id: 1, videoId: 'aaaaaaaaaaa', title: 'A/B: unsafe? title', channel: 'Dave Gray' };

function store(): { store: DownloadStore; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    store: {
      claim: async (id) => { calls.push(`claim:${id}`); },
      markAvailable: async (id, result) => { calls.push(`available:${id}:${result.path}`); },
      markFailed: async (id, error) => { calls.push(`failed:${id}:${error}`); },
    },
  };
}

function fakeIo(files: string[], overrides: Partial<NonNullable<ConstructorParameters<typeof YoutubeDownloadService>[0]['fsOps']>> = {}) {
  const unlinked: string[] = [];
  return {
    unlinked,
    io: {
      mkdir: vi.fn(async () => undefined),
      readdir: vi.fn(async () => files),
      unlink: vi.fn(async (file: string) => { unlinked.push(file); }),
      stat: vi.fn(async () => ({ size: 1024 })),
      readFile: vi.fn(async () => JSON.stringify({ duration: 1875.4, channel: 'Dave Gray' })),
      rename: vi.fn(async () => undefined),
      ...overrides,
    },
  };
}

describe('targetName', () => {
  it('sanitises the title and always includes the video id', () => {
    const name = targetName(video);
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    expect(name).toContain('[aaaaaaaaaaa]');
    expect(name).toContain('A B');
  });
});

describe('youtubeAuthArgs', () => {
  it('prefers an explicit cookies file over a browser profile', () => {
    expect(youtubeAuthArgs({ YTDLP_COOKIES_FILE: '/config/yt-cookies.txt' })).toEqual(['--cookies', '/config/yt-cookies.txt']);
    // Chrome stores v11 cookies in gnome-keyring here; without the explicit
    // backend yt-dlp guesses BASICTEXT and every download hits the bot wall.
    expect(youtubeAuthArgs({ YTDLP_COOKIES_FROM_BROWSER: 'chrome' })).toEqual([
      '--cookies-from-browser',
      'chrome+gnomekeyring',
    ]);
    expect(youtubeAuthArgs({ YTDLP_COOKIES_FROM_BROWSER: 'chrome', YTDLP_COOKIES_KEYRING: 'kwallet' })).toEqual([
      '--cookies-from-browser',
      'chrome+kwallet',
    ]);
    expect(youtubeAuthArgs({ YTDLP_COOKIES_FROM_BROWSER: 'firefox' })).toEqual(['--cookies-from-browser', 'firefox']);
    expect(youtubeAuthArgs({})).toEqual([]);
  });
});

describe('YoutubeDownloadService format fallback', () => {
  it('retries once with a tolerant selector when YouTube hides the preferred formats', async () => {
    const { store: s } = store();
    const { io } = fakeIo(['A B unsafe title [aaaaaaaaaaa].mp4', 'A B unsafe title [aaaaaaaaaaa].jpg']);
    const formats: string[] = [];
    const run = vi.fn(async (args: string[]) => {
      const index = args.indexOf('-f');
      formats.push(args[index + 1]!);
      if (formats.length === 1) {
        throw new Error('Command failed: yt-dlp ... ERROR: [youtube] aaaaaaaaaaa: Requested format is not available.');
      }
    });
    const runFfmpeg = vi.fn(async () => undefined);
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run, runFfmpeg, fsOps: io });

    const result = await service.downloadOne(video, s);

    expect(result.ok).toBe(true);
    expect(formats).toHaveLength(2);
    expect(formats[0]).toContain('vcodec^=avc1');
    expect(formats[1]).toContain('vcodec!*=av01');
  });

  it('falls back to the web+android clients when YouTube hides every format', async () => {
    const { store: s } = store();
    const { io } = fakeIo(['A B unsafe title [aaaaaaaaaaa].mp4', 'A B unsafe title [aaaaaaaaaaa].jpg']);
    const attempts: string[][] = [];
    const run = vi.fn(async (args: string[]) => {
      attempts.push(args);
      const joined = args.join(' ');
      if (!joined.includes('player_client=web,android')) {
        throw new Error('ERROR: [youtube] aaaaaaaaaaa: Requested format is not available. Use --list-formats');
      }
    });
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run, runFfmpeg: async () => undefined, fsOps: io });

    const result = await service.downloadOne(video, s);

    expect(result.ok).toBe(true);
    expect(attempts).toHaveLength(3);
    expect(attempts[2]!.join(' ')).toContain('--extractor-args youtube:player_client=web,android');
  });

  it('does not retry a different failure', async () => {
    const { store: s } = store();
    const { io } = fakeIo([]);
    const run = vi.fn(async () => {
      throw new Error('ERROR: [youtube] aaaaaaaaaaa: Video unavailable');
    });
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run, runFfmpeg: async () => undefined, fsOps: io });

    const result = await service.downloadOne(video, s);

    expect(result.ok).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('YoutubeDownloadService', () => {
  it('claims, downloads and marks AVAILABLE with path and thumbnail', async () => {
    const { store: s, calls } = store();
    const { io } = fakeIo(['A B unsafe title [aaaaaaaaaaa].mp4', 'A B unsafe title [aaaaaaaaaaa].jpg']);
    const run = vi.fn(async (args: string[]) => {
      expect(args).toContain('--no-playlist');
      expect(args.join(' ')).toContain('vcodec^=avc1');
      expect(args.join(' ')).not.toContain('acodec^=mp4a');
    });
    const runFfmpeg = vi.fn(async (args: string[]) => {
      // Device profile: 30 fps cap, H.264 high@4.0, AAC, faststart.
      expect(args.join(' ')).toContain('fps=30');
      expect(args.join(' ')).toContain('level');
      expect(args.join(' ')).toContain('+faststart');
    });
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run, runFfmpeg, fsOps: io });

    const result = await service.downloadOne(video, s);

    expect(result.ok).toBe(true);
    expect(calls[0]).toBe('claim:1');
    expect(calls[1]).toBe('available:1:/data/Youtube/Dave Gray/A B unsafe title [aaaaaaaaaaa].mp4');
  });

  it('maps duration and channel from the yt-dlp info sidecar', async () => {
    const calls: Array<[string, unknown]> = [];
    const s: DownloadStore = {
      claim: async () => {},
      markAvailable: async (id, result) => { calls.push([String(id), result]); },
      markFailed: async () => {},
    };
    const { io } = fakeIo([
      'A B unsafe title [aaaaaaaaaaa].mp4',
      'A B unsafe title [aaaaaaaaaaa].jpg',
      'A B unsafe title [aaaaaaaaaaa].info.json',
    ]);
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run: async () => undefined, runFfmpeg: async () => undefined, fsOps: io });

    await service.downloadOne(video, s);

    expect(calls[0]?.[1]).toMatchObject({ durationSeconds: 1875, channel: 'Dave Gray' });
  });

  it('marks FAILED with the tool error and removes partial files', async () => {
    const { store: s, calls } = store();
    const { io, unlinked } = fakeIo(['A B unsafe title [aaaaaaaaaaa].mp4.part']);
    const service = new YoutubeDownloadService({
      root: '/data/Youtube',
      run: async () => { throw new Error('sign in to confirm your age'); },
      runFfmpeg: async () => undefined,
      fsOps: io,
    });

    const result = await service.downloadOne(video, s);

    expect(result).toEqual({ ok: false, error: 'sign in to confirm your age' });
    expect(calls.at(-1)).toContain('failed:1:sign in to confirm your age');
    expect(unlinked).toHaveLength(1);
  });

  it('does not mark AVAILABLE when yt-dlp silently writes no file', async () => {
    const { store: s, calls } = store();
    const { io } = fakeIo([]);
    const service = new YoutubeDownloadService({ root: '/data/Youtube', run: async () => undefined, runFfmpeg: async () => undefined, fsOps: io });

    const result = await service.downloadOne(video, s);

    expect(result.ok).toBe(false);
    expect(calls.at(-1)).toContain('failed:1:');
  });

  it('bounds a batch and reports each failure separately', async () => {
    const calls: string[] = [];
    const s: DownloadStore = {
      claim: async () => {},
      markAvailable: async (id) => { calls.push(`ok:${id}`); },
      markFailed: async (id) => { calls.push(`fail:${id}`); },
    };
    const service = new YoutubeDownloadService({
      root: '/data/Youtube',
      run: async () => { throw new Error('network'); },
      runFfmpeg: async () => undefined,
      fsOps: fakeIo([]).io,
    });
    const result = await service.run(2, [video, { ...video, id: 2, videoId: 'bbbbbbbbbbb' }, { ...video, id: 3 }], s);
    expect(result.attempted).toBe(2);
    expect(result.downloaded).toBe(0);
    expect(result.failed.map((item) => item.id)).toEqual([1, 2]);
  });
});
