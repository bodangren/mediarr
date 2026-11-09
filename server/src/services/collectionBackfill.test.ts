import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { backfillMovieCollections } from './collectionBackfill';

const dirs: string[] = [];
afterAll(async () => {
  for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

describe('backfillMovieCollections', () => {
  it('links members, remembers standalone films, and reports the remainder', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'collections-'));
    dirs.push(dir);
    const statePath = path.join(dir, 'state.json');
    const findMany = async () => [
      { id: 1, tmdbId: 603 },
      { id: 2, tmdbId: 999 },
    ];
    const linkMovieToCollection = async () => undefined;
    const detectMovieCollection = async (tmdbId: number) =>
      tmdbId === 603 ? { tmdbCollectionId: 2344 } : null;

    const first = await backfillMovieCollections({
      movieStore: { findMany, count: async () => 7 },
      collectionService: { detectMovieCollection, linkMovieToCollection },
    }, { statePath, limit: 10 });
    expect(first).toMatchObject({ linked: 1, noCollection: 1, remaining: 7 });

    // Second pass must not ask TMDB about the known standalone film again.
    const calls: number[] = [];
    const second = await backfillMovieCollections({
      movieStore: { findMany, count: async () => 7 },
      collectionService: {
        detectMovieCollection: async (tmdbId) => { calls.push(tmdbId); return null; },
        linkMovieToCollection,
      },
    }, { statePath, limit: 10 });
    expect(second.skipped).toBe(1);
    expect(calls).not.toContain(999);
  });
});
