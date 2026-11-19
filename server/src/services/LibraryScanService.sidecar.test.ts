import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibraryScanService } from './LibraryScanService';

/**
 * Regression cover for 2026-11-19: an operator placed
 * `The.Running.Man.2025...zho.srt` next to its video, but only the nightly
 * library scan (02:00) registered sidecars, so the TV kept showing 无字幕 for
 * hours. `registerPendingSidecars` is the bounded pass that runs every 10
 * minutes instead.
 */
describe('LibraryScanService.registerPendingSidecars', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sidecar-register-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function fakePrisma(variants: Array<{ id: number; path: string | null }>, existingTracks: string[]) {
    const created: any[] = [];
    const deleted: number[] = [];
    const prisma = {
      mediaFileVariant: {
        findMany: async () => variants,
      },
      variantSubtitleTrack: {
        findMany: async () => existingTracks.map((filePath, index) => ({ id: index + 1, variantId: 7, filePath })),
        create: async (args: any) => {
          created.push(args.data);
          return args.data;
        },
        delete: async (args: any) => {
          deleted.push(args.where.id);
          return args;
        },
      },
    } as any;
    return { prisma, created, deleted };
  }

  it('registers a sidecar that appeared after the variant was created', async () => {
    const video = join(root, 'The.Running.Man.2025.1080p.mp4');
    await writeFile(video, 'x');
    await writeFile(
      join(root, 'The.Running.Man.2025.1080p.zho.srt'),
      '1\n00:00:01,000 --> 00:00:02,000\n你好\n',
    );

    const { prisma, created } = fakePrisma([{ id: 7, path: video }], []);
    const service = new LibraryScanService(prisma);

    const result = await service.registerPendingSidecars(10);

    expect(result.checked).toBe(1);
    expect(result.registered).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0].source).toBe('EXTERNAL');
    expect(created[0].filePath).toBe(join(root, 'The.Running.Man.2025.1080p.zho.srt'));
    expect(created[0].languageCode).toBe('zho');
  });

  it('does not duplicate a sidecar that is already recorded', async () => {
    const video = join(root, 'movie.mkv');
    await writeFile(video, 'x');
    const sidecar = join(root, 'movie.zho.srt');
    await writeFile(sidecar, 'x');

    const { prisma, created } = fakePrisma([{ id: 7, path: video }], [sidecar]);
    const service = new LibraryScanService(prisma);

    const result = await service.registerPendingSidecars(10);

    expect(result.registered).toBe(0);
    expect(created).toHaveLength(0);
  });


  it('never registers ffsubsync working files or operator backups as tracks', async () => {
    // ffsubsync writes `<sidecar>.sync.srt` and renames it over the sidecar when
    // it finishes; `.orig`/`.bak` are backups. Measured 2026-11-19: a
    // `.zho.srt.sync.srt` artifact was registered as a second Chinese track.
    const video = join(root, 'movie.mkv');
    await writeFile(video, 'x');
    await writeFile(join(root, 'movie.zho.srt'), 'x');
    await writeFile(join(root, 'movie.zho.srt.sync.srt'), 'x');
    await writeFile(join(root, 'movie.zho.srt.orig'), 'x');

    const { prisma, created } = fakePrisma([{ id: 7, path: video }], []);
    const service = new LibraryScanService(prisma);

    const result = await service.registerPendingSidecars(10);

    expect(result.registered).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0].filePath).toBe(join(root, 'movie.zho.srt'));
  });

  it('prunes an external track whose file is gone, but keeps the video in place', async () => {
    // ffsubsync renames <sidecar>.sync.srt over the sidecar when it finishes, so
    // a row created for the working file dangles. Measured 2026-11-19 on
    // The Running Man (2025).
    const video = join(root, 'movie.mkv');
    await writeFile(video, 'x');
    await writeFile(join(root, 'movie.zho.srt'), 'x');
    const gone = join(root, 'movie.zho.srt.sync.srt');

    const { prisma, deleted } = fakePrisma([{ id: 7, path: video }], [join(root, 'movie.zho.srt'), gone]);
    const service = new LibraryScanService(prisma);

    const result = await service.registerPendingSidecars(10);

    expect(result.pruned).toBe(1);
    expect(deleted).toEqual([2]);
  });

  it('never prunes track rows while the video itself is missing (unmounted library)', async () => {
    const goneVideo = join(root, 'unmounted', 'movie.mkv');
    const { prisma, deleted } = fakePrisma([{ id: 7, path: goneVideo }], [join(root, 'nowhere.zho.srt')]);
    const service = new LibraryScanService(prisma);

    const result = await service.registerPendingSidecars(10);

    expect(result.pruned).toBe(0);
    expect(deleted).toEqual([]);
  });
});
