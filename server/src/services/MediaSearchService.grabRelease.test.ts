import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';
import { TorrentRejectedError } from '../errors/domainErrors';

function makeService() {
  const indexerRepository = { findAllEnabled: vi.fn().mockResolvedValue([]) };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn() };
  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
  );
  return { service, torrentManager };
}

function makeCandidate(overrides: Partial<{
  magnetUrl: string | undefined;
  downloadUrl: string | undefined;
}> = {}) {
  return {
    indexer: 'TestIndexer',
    indexerId: 1,
    title: 'Show.S01E01.1080p',
    guid: 'guid-1',
    size: 1_000_000,
    seeders: 10,
    ...overrides,
  };
}

describe('MediaSearchService.grabRelease — URL normalisation', () => {
  let service: MediaSearchService;
  let torrentManager: { addTorrent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ({ service, torrentManager } = makeService());
  });

  it('throws TorrentRejectedError when both magnetUrl and downloadUrl are absent', async () => {
    const candidate = makeCandidate({ magnetUrl: undefined, downloadUrl: undefined });

    await expect(service.grabRelease(candidate)).rejects.toThrow(TorrentRejectedError);
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('throws TorrentRejectedError when magnetUrl is non-magnet HTTPS URL and downloadUrl is absent', async () => {
    // magnetUrl is truthy but does NOT start with 'magnet:',
    // downloadUrl is absent — URL normalisation resolves both to undefined
    // and addTorrent must NOT be called (bug: previously it was called with no URL)
    const candidate = makeCandidate({
      magnetUrl: 'https://example.com/download/torrent.torrent',
      downloadUrl: undefined,
    });

    await expect(service.grabRelease(candidate)).rejects.toThrow(TorrentRejectedError);
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('uses magnetUrl when it starts with magnet:', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
      downloadUrl: undefined,
    });

    const result = await service.grabRelease(candidate);

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ magnetUrl: candidate.magnetUrl }),
    );
    expect(result.infoHash).toBe('aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111');
  });

  it('falls back to downloadUrl when magnetUrl is absent', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: undefined,
      downloadUrl: 'https://example.com/torrent.torrent',
    });

    await service.grabRelease(candidate);

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ downloadUrl: candidate.downloadUrl }),
    );
  });

  it('prefers magnetUrl over downloadUrl when magnetUrl starts with magnet:', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'cccc3333cccc3333cccc3333cccc3333cccc3333',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:cccc3333cccc3333cccc3333cccc3333cccc3333',
      downloadUrl: 'https://example.com/torrent.torrent',
    });

    await service.grabRelease(candidate);

    const callArgs = torrentManager.addTorrent.mock.calls[0][0];
    expect(callArgs.magnetUrl).toBe(candidate.magnetUrl);
    expect(callArgs.downloadUrl).toBeUndefined();
  });

  it('uses downloadUrl when it starts with magnet: and magnetUrl is absent', async () => {
    torrentManager.addTorrent.mockResolvedValue({
      infoHash: 'dddd4444dddd4444dddd4444dddd4444dddd4444',
      name: 'Show.S01E01.1080p',
    });
    const candidate = makeCandidate({
      magnetUrl: undefined,
      downloadUrl: 'magnet:?xt=urn:btih:dddd4444dddd4444dddd4444dddd4444dddd4444',
    });

    await service.grabRelease(candidate);

    const callArgs = torrentManager.addTorrent.mock.calls[0][0];
    expect(callArgs.magnetUrl).toBe(candidate.downloadUrl);
    expect(callArgs.downloadUrl).toBeUndefined();
  });
});
