import { describe, expect, it } from 'vitest';
import {
  backfillYoutubeDates,
  infoJsonPathFor,
  publishedAtFromInfo,
} from './YoutubeDates';

/**
 * Regression cover for 2026-11-20: all 629 AVAILABLE YouTube rows had
 * `publishedAt = NULL`, so the library could not show "today" or prune by age.
 */
describe('publishedAtFromInfo', () => {
  it('reads the unix timestamp', () => {
    expect(publishedAtFromInfo({ timestamp: 1642168831 })?.toISOString()).toBe('2022-01-14T14:00:31.000Z');
  });

  it('falls back to upload_date when no timestamp is present', () => {
    expect(publishedAtFromInfo({ upload_date: '20220114' })?.toISOString()).toBe('2022-01-14T00:00:00.000Z');
  });

  it('prefers release_timestamp over upload_date (podcast release dates)', () => {
    const date = publishedAtFromInfo({ release_timestamp: 1700000000, upload_date: '20220114' });
    expect(date?.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('rejects impossible or missing values', () => {
    expect(publishedAtFromInfo({})).toBeNull();
    expect(publishedAtFromInfo(null)).toBeNull();
    expect(publishedAtFromInfo({ upload_date: 'not-a-date' })).toBeNull();
    expect(publishedAtFromInfo({ timestamp: 100 })).toBeNull(); // 1970, before YouTube
    expect(publishedAtFromInfo({ timestamp: Date.now() / 1000 + 86400 * 400 })).toBeNull(); // far future
  });

  it('derives the info sidecar path from the media path', () => {
    expect(infoJsonPathFor('/data/Youtube/A/Talk [aaaaaaaaaaa].mp4')).toBe('/data/Youtube/A/Talk [aaaaaaaaaaa].info.json');
    expect(infoJsonPathFor('/data/Youtube/no-extension')).toBe('/data/Youtube/no-extension.info.json');
  });
});

describe('backfillYoutubeDates', () => {
  it('fills every row that has a parseable info sidecar', async () => {
    const updates: Array<{ id: number; iso: string }> = [];
    const result = await backfillYoutubeDates({
      listRows: async () => [
        { id: 1, path: '/yt/a.mp4', publishedAt: null },
        { id: 2, path: '/yt/b.mp4', publishedAt: null },
      ],
      readFile: async (file) => {
        if (file === '/yt/a.info.json') return JSON.stringify({ timestamp: 1642168831 });
        if (file === '/yt/b.info.json') return JSON.stringify({ upload_date: '20200508' });
        throw new Error('ENOENT');
      },
      updateRow: async (id, date) => { updates.push({ id, iso: date.toISOString() }); },
    });

    expect(result).toMatchObject({ checked: 2, filled: 2, missingInfo: 0, unreadable: 0 });
    expect(updates).toEqual([
      { id: 1, iso: '2022-01-14T14:00:31.000Z' },
      { id: 2, iso: '2020-05-08T00:00:00.000Z' },
    ]);
  });

  it('counts missing and corrupt sidecars without touching rows', async () => {
    const updates: number[] = [];
    const result = await backfillYoutubeDates({
      listRows: async () => [
        { id: 1, path: '/yt/no-info.mp4', publishedAt: null },
        { id: 2, path: '/yt/broken.mp4', publishedAt: null },
        { id: 3, path: '/yt/undated.mp4', publishedAt: null },
      ],
      readFile: async (file) => {
        if (file === '/yt/broken.info.json') return '{not json';
        if (file === '/yt/undated.info.json') return JSON.stringify({ title: 'no date' });
        throw new Error('ENOENT');
      },
      updateRow: async (id) => { updates.push(id); },
    });

    expect(result).toMatchObject({ checked: 3, filled: 0, missingInfo: 1, unreadable: 2 });
    expect(updates).toEqual([]);
  });
});
