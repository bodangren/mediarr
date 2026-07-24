import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TorrentManager } from './TorrentManager';

const HASH = 'c'.repeat(40);

type RepoMock = ReturnType<typeof makeRepo>;

function makeRepo() {
  return {
    update: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findOldestQueued: vi.fn().mockResolvedValue(null),
  };
}

function makeTorrent(overrides: Record<string, unknown> = {}) {
  return {
    infoHash: HASH,
    name: 'Display Name',
    path: '',
    files: [] as Array<{ path: string; length: number }>,
    ...overrides,
  };
}

function makeManager(repo: RepoMock, incomplete: string, complete: string) {
  const manager = TorrentManager.getInstance(repo as never);
  const internals = manager as unknown as {
    incompleteDownloadPath: string;
    completeDownloadPath: string;
  };
  internals.incompleteDownloadPath = incomplete;
  internals.completeDownloadPath = complete;
  return manager;
}

async function complete(manager: TorrentManager, torrent: ReturnType<typeof makeTorrent>) {
  const internals = manager as unknown as {
    handleTorrentCompletion: (value: ReturnType<typeof makeTorrent>) => Promise<void>;
  };
  await internals.handleTorrentCompletion(torrent);
}

describe('TorrentManager completion path safety (real filesystem)', () => {
  let root: string;
  let incomplete: string;
  let completeRoot: string;

  beforeEach(async () => {
    TorrentManager.resetInstance();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-completion-'));
    incomplete = path.join(root, 'incomplete');
    completeRoot = path.join(root, 'complete');
    await fs.mkdir(incomplete, { recursive: true });
    await fs.mkdir(completeRoot, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    TorrentManager.resetInstance();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('does not mistake a similarly-prefixed incomplete sibling for the complete directory', async () => {
    incomplete = `${completeRoot}-incoming`;
    await fs.mkdir(incomplete, { recursive: true });
    const source = path.join(incomplete, 'Movie.mkv');
    await fs.writeFile(source, 'payload');
    const repo = makeRepo();
    const manager = makeManager(repo, incomplete, completeRoot);
    const events: Array<{ path: string }> = [];
    manager.on('torrent:completed', event => events.push(event));

    await complete(manager, makeTorrent({
      path: incomplete,
      files: [{ path: 'Movie.mkv', length: 7 }],
    }));

    const destination = path.join(completeRoot, 'Movie.mkv');
    await expect(fs.readFile(destination, 'utf8')).resolves.toBe('payload');
    await expect(fs.stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(repo.update).toHaveBeenCalledOnce();
    expect(events).toEqual([{ infoHash: HASH, name: 'Display Name', path: destination }]);
  });

  it('moves only the explicit multi-file payload root and leaves shared-root siblings untouched', async () => {
    const payloadRoot = path.join(incomplete, 'Actual.Pack');
    const sibling = path.join(incomplete, 'unrelated.keep');
    await fs.mkdir(payloadRoot, { recursive: true });
    await fs.writeFile(path.join(payloadRoot, 'one.mkv'), 'one');
    await fs.writeFile(path.join(payloadRoot, 'two.srt'), 'two');
    await fs.writeFile(sibling, 'keep');
    const repo = makeRepo();
    const manager = makeManager(repo, incomplete, completeRoot);

    await complete(manager, makeTorrent({
      path: incomplete,
      name: 'Display Name Does Not Identify Disk Root',
      files: [
        { path: 'Actual.Pack/one.mkv', length: 3 },
        { path: 'Actual.Pack/two.srt', length: 3 },
      ],
    }));

    await expect(fs.readFile(path.join(completeRoot, 'Actual.Pack', 'one.mkv'), 'utf8')).resolves.toBe('one');
    await expect(fs.readFile(sibling, 'utf8')).resolves.toBe('keep');
    await expect(fs.stat(payloadRoot)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('rejects ambiguous flat multi-file layouts without moving the shared incomplete root', async () => {
    await fs.writeFile(path.join(incomplete, 'one.mkv'), 'one');
    await fs.writeFile(path.join(incomplete, 'two.srt'), 'two');
    const repo = makeRepo();
    const manager = makeManager(repo, incomplete, completeRoot);
    const rename = vi.spyOn(fs, 'rename');
    const events: unknown[] = [];
    manager.on('torrent:completed', event => events.push(event));

    await complete(manager, makeTorrent({
      path: incomplete,
      files: [
        { path: 'one.mkv', length: 3 },
        { path: 'two.srt', length: 3 },
      ],
    }));

    expect(rename).not.toHaveBeenCalled();
    await expect(fs.readFile(path.join(incomplete, 'one.mkv'), 'utf8')).resolves.toBe('one');
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.updateStatus).toHaveBeenCalledWith(HASH, 'error');
    expect(events).toHaveLength(0);
  });

  it('refuses to overwrite an existing destination and leaves both payloads intact', async () => {
    const source = path.join(incomplete, 'Movie.mkv');
    const destination = path.join(completeRoot, 'Movie.mkv');
    await fs.writeFile(source, 'new');
    await fs.writeFile(destination, 'existing');
    const repo = makeRepo();
    const manager = makeManager(repo, incomplete, completeRoot);
    const rename = vi.spyOn(fs, 'rename');

    await complete(manager, makeTorrent({
      path: incomplete,
      files: [{ path: 'Movie.mkv', length: 3 }],
    }));

    expect(rename).not.toHaveBeenCalled();
    await expect(fs.readFile(source, 'utf8')).resolves.toBe('new');
    await expect(fs.readFile(destination, 'utf8')).resolves.toBe('existing');
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.updateStatus).toHaveBeenCalledWith(HASH, 'error');
  });

  it('handles EXDEV by copying, verifying, then cleaning the source before persistence and emission', async () => {
    const source = path.join(incomplete, 'Movie.mkv');
    const destination = path.join(completeRoot, 'Movie.mkv');
    await fs.writeFile(source, 'cross-device');
    const repo = makeRepo();
    repo.update.mockImplementation(async () => {
      await expect(fs.readFile(destination, 'utf8')).resolves.toBe('cross-device');
      await expect(fs.stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
    });
    const manager = makeManager(repo, incomplete, completeRoot);
    const events: Array<{ path: string }> = [];
    manager.on('torrent:completed', event => events.push(event));
    const exdev = Object.assign(new Error('cross-device'), { code: 'EXDEV' });
    const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(exdev);

    await complete(manager, makeTorrent({
      path: incomplete,
      files: [{ path: 'Movie.mkv', length: 12 }],
    }));

    expect(rename).toHaveBeenCalledWith(source, destination);
    expect(repo.update).toHaveBeenCalledOnce();
    expect(events).toEqual([{ infoHash: HASH, name: 'Display Name', path: destination }]);
  });

  it('rejects missing payload metadata and never falls back to moving currentPath', async () => {
    await fs.writeFile(path.join(incomplete, 'unrelated.keep'), 'keep');
    const repo = makeRepo();
    const manager = makeManager(repo, incomplete, completeRoot);
    const rename = vi.spyOn(fs, 'rename');

    await complete(manager, makeTorrent({ path: incomplete, files: [] }));

    expect(rename).not.toHaveBeenCalled();
    await expect(fs.readFile(path.join(incomplete, 'unrelated.keep'), 'utf8')).resolves.toBe('keep');
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.updateStatus).toHaveBeenCalledWith(HASH, 'error');
  });
});
