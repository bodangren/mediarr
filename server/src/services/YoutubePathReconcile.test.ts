import { describe, expect, it } from 'vitest';
import {
  indexYoutubeFiles,
  reconcileYoutubePaths,
  youtubeIdFromPath,
} from './YoutubePathReconcile';

/**
 * Regression cover for 2026-11-19: video 315 was listed as AVAILABLE while its
 * file had been re-organised into a channel folder, so the TV offered a title
 * that could not play ("Couldn't play this video").
 */
describe('YoutubePathReconcile', () => {
  const organised = '/data/Youtube/Dave Gray/Nextjs 15 Project/9 - Search [dgDFPRol0cw].webm';
  const stale = '/data/Youtube/Uncategorized/Search in Next.js [dgDFPRol0cw].f299.mp4';

  it('reads the youtube id out of the file name', () => {
    expect(youtubeIdFromPath(stale)).toBe('dgDFPRol0cw');
    expect(youtubeIdFromPath(organised)).toBe('dgDFPRol0cw');
    expect(youtubeIdFromPath('/data/Youtube/loose.mp4')).toBeNull();
  });

  it('prefers mp4 over webm and sidecars are not candidates for playback', () => {
    const index = indexYoutubeFiles([
      '/root/a/Talk [aaaaaaaaaaa].jpg',
      '/root/a/Talk [aaaaaaaaaaa].webm',
      '/root/b/Talk [aaaaaaaaaaa].mp4',
    ]);
    const bucket = index.get('aaaaaaaaaaa')!;
    expect(bucket[0]).toBe('/root/b/Talk [aaaaaaaaaaa].mp4');
  });

  it('repoints a row whose file moved instead of hiding playable content', async () => {
    const updates: Array<{ id: number; path: string }> = [];
    const unavailable: number[] = [];
    const result = await reconcileYoutubePaths(
      {
        listRows: async () => [{ id: 315, path: stale }],
        fileExists: async (file) => file === organised,
        listFiles: async () => [organised, `${organised}.nfo`, organised.replace('.webm', '.jpg')],
        updatePath: async (id, path) => { updates.push({ id, path }); },
        markUnavailable: async (id) => { unavailable.push(id); },
      },
      { mediaRoot: '/data/Youtube' },
    );

    expect(result.repointed).toEqual([{ id: 315, from: stale, to: organised }]);
    expect(updates).toEqual([{ id: 315, path: organised }]);
    expect(unavailable).toEqual([]);
  });

  it('retires a row whose file is really gone', async () => {
    const unavailable: Array<{ id: number; error: string }> = [];
    const result = await reconcileYoutubePaths(
      {
        listRows: async () => [{ id: 7, path: '/data/Youtube/Uncategorized/Gone [bbbbbbbbbbb].mp4' }],
        fileExists: async () => false,
        listFiles: async () => [],
        updatePath: async () => { throw new Error('must not repoint'); },
        markUnavailable: async (id, error) => { unavailable.push({ id, error }); },
      },
      { mediaRoot: '/data/Youtube' },
    );

    expect(result.unavailable).toHaveLength(1);
    expect(unavailable[0]!.id).toBe(7);
    expect(unavailable[0]!.error).toContain('missing');
  });

  it('leaves healthy rows untouched and does no disk walk', async () => {
    let walked = false;
    const result = await reconcileYoutubePaths(
      {
        listRows: async () => [{ id: 1, path: '/data/Youtube/A/Fine [ccccccccccc].mp4' }],
        fileExists: async () => true,
        listFiles: async () => { walked = true; return []; },
        updatePath: async () => { throw new Error('must not repoint'); },
        markUnavailable: async () => { throw new Error('must not retire'); },
      },
      { mediaRoot: '/data/Youtube' },
    );

    expect(result.repointed).toEqual([]);
    expect(result.unavailable).toEqual([]);
    expect(walked).toBe(false);
  });
});
