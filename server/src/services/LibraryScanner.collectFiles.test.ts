import { describe, expect, it } from 'vitest';
import { collectFiles, type ScanIo } from './LibraryScanner';

describe('collectFiles', () => {
  it('continues past an unreadable subdirectory instead of aborting the scan', async () => {
    const tree: Record<string, string[]> = {
      '/tv': ['good.mkv', 'broken', 'nested'],
      '/tv/broken': [],
      '/tv/nested': ['deep.mp4'],
    };
    const io: ScanIo = {
      readdir: async (dir) => {
        if (dir === '/tv/broken') throw new Error('EACCES');
        return tree[dir] ?? [];
      },
      stat: async (file) => ({ isDirectory: () => file === '/tv/broken' || file === '/tv/nested' }),
    };
    const warnings: string[] = [];
    const files = await collectFiles('/tv', io, (message) => warnings.push(message));
    expect(files.sort()).toEqual(['/tv/good.mkv', '/tv/nested/deep.mp4'].sort());
    expect(warnings.some((message) => message.includes('broken'))).toBe(true);
  });

  it('skips an entry whose stat fails and keeps the rest', async () => {
    const io: ScanIo = {
      readdir: async () => ['a.mkv', 'ghost', 'b.mkv'],
      stat: async (file) => {
        if (file.endsWith('ghost')) throw new Error('ENOENT');
        return { isDirectory: () => false };
      },
    };
    const files = await collectFiles('/tv', io, () => undefined);
    expect(files).toEqual(['/tv/a.mkv', '/tv/b.mkv']);
  });

  it('returns an empty list when the root itself is unreadable', async () => {
    const io: ScanIo = { readdir: async () => { throw new Error('EACCES'); }, stat: async () => ({ isDirectory: () => false }) };
    expect(await collectFiles('/missing', io, () => undefined)).toEqual([]);
  });
});
