import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EpisodeThumbnailService } from './EpisodeThumbnailService';

describe('EpisodeThumbnailService', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-thumbs-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  function episodes(rows: Array<{ id: number; path: string | null }>) {
    return { episode: { findMany: vi.fn().mockResolvedValue(rows) } } as any;
  }

  it('generates only the stills that are missing', async () => {
    const generated: number[] = [];
    const service = new EpisodeThumbnailService(episodes([
      { id: 1, path: '/media/a.mkv' },
      { id: 2, path: '/media/b.mkv' },
      { id: 3, path: null },
    ]), { directory });
    // Pre-existing still for episode 1.
    await fs.writeFile(path.join(directory, 'episode-1.jpg'), 'x');
    vi.spyOn(service, 'generate').mockImplementation(async (id: number) => {
      generated.push(id);
      await fs.writeFile(path.join(directory, `episode-${id}.jpg`), 'x');
      return path.join(directory, `episode-${id}.jpg`);
    });

    const stats = await service.generateMissing(10);

    expect(generated).toEqual([2]);
    expect(stats.generated).toBe(1);
    expect(stats.skipped).toBe(1);
  });

  it('bounds total attempts so a failing library cannot loop forever', async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ id: index + 1, path: `/media/${index}.mkv` }));
    const service = new EpisodeThumbnailService(episodes(rows), { directory });
    // Every extraction fails (e.g. unreadable media): without the bound this
    // walked the whole library on every run.
    vi.spyOn(service, 'generate').mockRejectedValue(new Error('ffmpeg exited with code 1'));

    const stats = await service.generateMissing(5);

    expect(stats.generated).toBe(0);
    expect(stats.failed).toBe(5);
  });

  it('reports a cached still after generation and exposes its path', async () => {
    const service = new EpisodeThumbnailService(episodes([]), { directory });
    expect(await service.hasThumbnail(7)).toBe(false);
    await fs.writeFile(service.thumbnailPath(7), 'jpeg');
    expect(await service.hasThumbnail(7)).toBe(true);
    expect(service.thumbnailPath(7)).toBe(path.join(directory, 'episode-7.jpg'));
  });
});
