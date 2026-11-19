import { describe, expect, it } from 'vitest';
import { dedupeYoutubeRows } from './YoutubeDedupe';

/**
 * Regression cover for 2026-11-19: rows 7, 288 and 315 all referred to YouTube
 * video `dgDFPRol0cw`, so the library could list one video three times.
 */
describe('dedupeYoutubeRows', () => {
  const id = 'dgDFPRol0cw';
  const missingBookmark = `/data/Youtube/Uncategorized/Search [${id}].f299.mp4`;
  const organised = `/data/Youtube/Dave Gray/Nextjs 15 Project/9 - Search [${id}].webm`;
  const looseCopy = `/data/Youtube/Uncategorized/Search [${id}].mp4`;

  it('keeps the row whose file exists and retires the rest', async () => {
    const retired: Array<{ id: number; reason: string }> = [];
    const result = await dedupeYoutubeRows({
      listRows: async () => [
        { id: 7, path: looseCopy, isWatched: false, position: 0, watchedAt: null },
        { id: 288, path: organised, isWatched: false, position: 0, watchedAt: null },
        { id: 315, path: missingBookmark, isWatched: false, position: 0, watchedAt: null },
      ],
      fileExists: async (file) => file !== missingBookmark,
      updateRow: async () => { throw new Error('nothing to merge'); },
      retireRow: async (rowId, reason) => { retired.push({ id: rowId, reason }); },
    });

    expect(result.groups).toBe(1);
    expect(result.retired).toHaveLength(2);
    // Rows 7 and 288 both have files on disk; the tie is settled by list order.
    expect(retired.map((row) => row.id).sort()).toEqual([288, 315]);
    expect(result.retired.every((row) => row.keptId === 7)).toBe(true);
  });

  it('merges watch state from a retired duplicate into the surviving row', async () => {
    const retired: number[] = [];
    // The surviving row is the one whose file exists; a duplicate whose file is
    // missing may still be the row the owner actually watched.
    const updates: Array<{ id: number; patch: any }> = [];
    const result = await dedupeYoutubeRows({
      listRows: async () => [
        { id: 5, path: organised, isWatched: false, position: 0, watchedAt: null },
        { id: 6, path: missingBookmark, isWatched: true, position: 120, watchedAt: 1_700_000_000 },
      ],
      fileExists: async (file) => file !== missingBookmark,
      updateRow: async (rowId, patch) => { updates.push({ id: rowId, patch }); },
      retireRow: async (rowId) => { retired.push(rowId); },
    });

    expect(result.groups).toBe(1);
    expect(result.retired).toHaveLength(1);
    expect(retired).toEqual([6]);
    expect(updates).toHaveLength(1);
    expect(updates[0]!.id).toBe(5);
    expect(updates[0]!.patch.isWatched).toBe(true);
    expect(updates[0]!.patch.position).toBe(120);
  });

  it('leaves videos with a single row and untagged files alone', async () => {
    let touched = 0;
    const result = await dedupeYoutubeRows({
      listRows: async () => [
        { id: 1, path: '/data/Youtube/Solo [aaaaaaaaaaa].mp4', isWatched: false, position: 0, watchedAt: null },
        { id: 2, path: '/data/Youtube/loose-file.mp4', isWatched: false, position: 0, watchedAt: null },
      ],
      fileExists: async () => true,
      updateRow: async () => { touched += 1; },
      retireRow: async () => { touched += 1; },
    });

    expect(result.groups).toBe(0);
    expect(touched).toBe(0);
  });
});
