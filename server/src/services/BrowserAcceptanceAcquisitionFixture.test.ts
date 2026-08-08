import { describe, expect, it } from 'vitest';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  BROWSER_ACCEPTANCE_INFO_HASH,
  BrowserAcceptanceIndexer,
  BrowserAcceptanceTorrentManager,
} from './BrowserAcceptanceAcquisitionFixture';

describe('BrowserAcceptanceAcquisitionFixture', () => {
  it('returns one deterministic local release only for the acceptance movie query', async () => {
    const indexer = new BrowserAcceptanceIndexer(null as never);

    await expect(indexer.search({ q: 'Browser Search Movie' })).resolves.toEqual([
      expect.objectContaining({
        title: 'Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER',
        magnetUrl: `magnet:?xt=urn:btih:${BROWSER_ACCEPTANCE_INFO_HASH}`,
        indexerName: 'Browser Acceptance Indexer',
      }),
    ]);
    await expect(indexer.search({ q: 'unrelated title' })).resolves.toEqual([]);
  });

  it('persists a contextual grab and exposes the queue-compatible status shape', async () => {
    const entries: Array<Record<string, unknown>> = [];
    const repository = {
      async upsert(entry: Record<string, unknown>) {
        entries.splice(0, entries.length, entry);
        return entry;
      },
      async findAll() {
        return entries.map((entry) => ({
          ...entry,
          size: BigInt(entry.size as number),
          downloaded: BigInt(entry.downloaded as number),
          uploaded: BigInt(entry.uploaded as number),
          completedAt: null,
        }));
      },
      async updateStatus(infoHash: string, status: string) {
        const entry = entries.find((candidate) => candidate.infoHash === infoHash);
        if (!entry) throw new Error('missing fixture torrent');
        entry.status = status;
        return entry;
      },
      async delete(infoHash: string) {
        const index = entries.findIndex((candidate) => candidate.infoHash === infoHash);
        if (index < 0) throw new Error('missing fixture torrent');
        return entries.splice(index, 1)[0];
      },
    };
    const manager = new BrowserAcceptanceTorrentManager(repository as never, '/tmp/incomplete');

    await expect(manager.addTorrent({ magnetUrl: 'magnet:?xt=urn:btih:unexpected' })).rejects.toThrow(
      'Unexpected browser acceptance torrent',
    );

    await manager.addTorrent({
      magnetUrl: `magnet:?xt=urn:btih:${BROWSER_ACCEPTANCE_INFO_HASH}`,
      name: 'Browser Search Movie release',
      movieId: 42,
    });

    await expect(manager.getTorrentsStatus()).resolves.toEqual([
      expect.objectContaining({
        infoHash: BROWSER_ACCEPTANCE_INFO_HASH,
        name: 'Browser Search Movie release',
        status: 'downloading',
        progress: 0.42,
        size: '100000000',
        downloaded: '42000000',
        path: '/tmp/incomplete',
      }),
    ]);

    await manager.pauseTorrent(BROWSER_ACCEPTANCE_INFO_HASH);
    await expect(manager.getTorrentStatus(BROWSER_ACCEPTANCE_INFO_HASH)).resolves.toEqual(
      expect.objectContaining({ status: 'paused' }),
    );
    await manager.removeTorrent(BROWSER_ACCEPTANCE_INFO_HASH);
    await expect(manager.getTorrentsStatus()).resolves.toEqual([]);
  });

  it('copies an isolated MP4, persists completion, and only then emits the importer payload', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'browser-acceptance-acquisition-'));
    const sourceFile = path.join(root, 'fixture.mp4');
    const incompleteDirectory = path.join(root, 'incomplete');
    const completeDirectory = path.join(root, 'complete');
    const entries: Array<Record<string, unknown>> = [];
    const repository = {
      async upsert(entry: Record<string, unknown>) {
        entries.splice(0, entries.length, { ...entry });
        return entry;
      },
      async update(infoHash: string, data: Record<string, unknown>) {
        const entry = entries.find(candidate => candidate.infoHash === infoHash);
        if (!entry) throw new Error('missing fixture torrent');
        Object.assign(entry, data);
        return entry;
      },
      async findAll() {
        return entries.map(entry => ({
          ...entry,
          size: BigInt(entry.size as number),
          downloaded: BigInt(entry.downloaded as number),
          uploaded: BigInt(entry.uploaded as number),
        }));
      },
      async updateStatus(infoHash: string, status: string) {
        return this.update(infoHash, { status });
      },
      async delete(infoHash: string) {
        const index = entries.findIndex(candidate => candidate.infoHash === infoHash);
        if (index < 0) throw new Error('missing fixture torrent');
        return entries.splice(index, 1)[0];
      },
    };

    try {
      await writeFile(sourceFile, 'browser acceptance MP4 fixture');
      const manager = new BrowserAcceptanceTorrentManager(repository as never, {
        incompleteDirectory,
        completeDirectory,
        sourceFile,
        completionDelayMs: 0,
      });
      const completed = once(manager, 'torrent:completed');

      await manager.addTorrent({
        magnetUrl: `magnet:?xt=urn:btih:${BROWSER_ACCEPTANCE_INFO_HASH}`,
        name: 'Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER',
        movieId: 42,
      });

      const [payload] = await completed as [{ infoHash: string; name: string; path: string }];
      expect(payload).toMatchObject({
        infoHash: BROWSER_ACCEPTANCE_INFO_HASH,
        name: 'Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER',
      });
      await expect(readFile(payload.path, 'utf8')).resolves.toBe('browser acceptance MP4 fixture');
      expect(entries).toEqual([
        expect.objectContaining({
          status: 'seeding',
          progress: 1,
          downloaded: 100000000,
          downloadSpeed: 0,
          eta: 0,
          path: completeDirectory,
          completedAt: expect.any(Date),
        }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
