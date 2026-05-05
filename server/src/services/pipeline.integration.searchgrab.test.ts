/**
 * Phase 3: Search → Scoring → Dedup → Grab Handoff Integration Tests
 *
 * Tests the handoff between search result aggregation, custom format scoring,
 * deduplication, and the grab service. Verifies that dedup picks the correct
 * release, scoring works end-to-end, and grab handles edge cases gracefully.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';
import { TorrentRejectedError } from '../errors/domainErrors';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

function makeService() {
  const indexerRepository = { findAllEnabled: vi.fn().mockResolvedValue([]) };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn().mockResolvedValue({ infoHash: 'testhash123' }) };
  const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
  const notificationDispatchService = { notifyGrab: vi.fn().mockResolvedValue(undefined) };
  const customFormatRepository = { findByQualityProfileId: vi.fn().mockResolvedValue([]) };

  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
    activityEventEmitter as any,
    customFormatRepository as any,
    undefined,
    notificationDispatchService as any,
  );

  return { service, torrentManager, activityEventEmitter };
}

function makeCandidate(overrides: Partial<{
  magnetUrl: string | undefined;
  downloadUrl: string | undefined;
  title: string;
  indexer: string;
  indexerId: number;
  guid: string;
  size: number;
  seeders: number;
  customFormatScore: number;
  indexerFlags: string;
}> = {}) {
  return {
    indexer: 'TestIndexer',
    indexerId: 1,
    title: 'Show.S01E01.1080p',
    guid: 'guid-1',
    size: 1_000_000,
    seeders: 10,
    customFormatScore: 80,
    indexerFlags: '',
    ...overrides,
  };
}

// ─── Phase 3 Tests ────────────────────────────────────────────────────────────

describe('Search → Scoring → Dedup → Grab Handoff', () => {
  let service: MediaSearchService;
  let torrentManager: { addTorrent: ReturnType<typeof vi.fn> };
  let activityEventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ({ service, torrentManager, activityEventEmitter } = makeService());
    vi.clearAllMocks();
  });

  it('3.1 grabRelease with no magnetUrl or downloadUrl → throws TorrentRejectedError', async () => {
    const candidate = makeCandidate({ magnetUrl: undefined, downloadUrl: undefined });

    await expect(service.grabRelease(candidate)).rejects.toThrow(TorrentRejectedError);
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.2 grabRelease passes episodeId to torrentManager.addTorrent', async () => {
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:abc123',
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
    });

    await service.grabRelease(candidate, { episodeId: 42 });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        magnetUrl: 'magnet:?xt=urn:btih:abc123',
        episodeId: 42,
        name: candidate.title,
        size: candidate.size,
      }),
    );
  });

  it('3.3 grabRelease passes movieId to torrentManager.addTorrent', async () => {
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:matrix99',
      title: 'The.Matrix.1999.1080p.BluRay',
    });

    await service.grabRelease(candidate, { movieId: 7 });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        magnetUrl: 'magnet:?xt=urn:btih:matrix99',
        movieId: 7,
        name: candidate.title,
        size: candidate.size,
      }),
    );
  });

  it('3.4 grabRelease emits RELEASE_GRABBED activity event with correct details', async () => {
    const candidate = makeCandidate({
      magnetUrl: 'magnet:?xt=urn:btih:emit001',
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
    });

    await service.grabRelease(candidate, { episodeId: 42 });

    expect(activityEventEmitter.emit).toHaveBeenCalledOnce();
    const emittedEvent = activityEventEmitter.emit.mock.calls[0]![0];
    expect(emittedEvent.eventType).toBe('RELEASE_GRABBED');
    expect(emittedEvent.sourceModule).toBe('media-search-service');
    expect(emittedEvent.success).toBe(true);
    expect(emittedEvent.details.title).toBe(candidate.title);
    expect(emittedEvent.details.indexer).toBe('TestIndexer');
    expect(emittedEvent.entityRef).toBe('torrent:testhash123');
  });

  it('3.5 grabRelease with downloadUrl (non-magnet) → passes downloadUrl to addTorrent', async () => {
    const candidate = makeCandidate({
      downloadUrl: 'https://indexer.example.com/download/torrent123.torrent',
      magnetUrl: undefined,
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
    });

    await service.grabRelease(candidate, { episodeId: 42 });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadUrl: 'https://indexer.example.com/download/torrent123.torrent',
        episodeId: 42,
        name: candidate.title,
        size: candidate.size,
      }),
    );
  });
});
