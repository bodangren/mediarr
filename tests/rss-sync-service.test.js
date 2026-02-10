import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssSyncService } from '../server/src/services/RssSyncService';

describe('RssSyncService', () => {
  let mockPrisma;
  let mockHttpClient;
  let service;

  const TORZNAB_RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <item>
      <title>New.Movie.2025.1080p</title>
      <guid>guid-1</guid>
      <link>https://example.com/dl/1.torrent</link>
      <pubDate>Mon, 10 Feb 2025 12:00:00 +0000</pubDate>
      <size>2147483648</size>
      <torznab:attr name="category" value="2040"/>
      <torznab:attr name="seeders" value="100"/>
      <torznab:attr name="peers" value="20"/>
    </item>
    <item>
      <title>New.Show.S01E01.720p</title>
      <guid>guid-2</guid>
      <link>https://example.com/dl/2.torrent</link>
      <pubDate>Sun, 09 Feb 2025 08:00:00 +0000</pubDate>
      <size>500000000</size>
      <torznab:attr name="category" value="5040"/>
      <torznab:attr name="seeders" value="50"/>
      <torznab:attr name="peers" value="10"/>
    </item>
  </channel>
</rss>`;

  beforeEach(() => {
    mockPrisma = {
      indexer: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Test Indexer',
            implementation: 'Torznab',
            configContract: 'TorznabSettings',
            settings: JSON.stringify({ apiKey: 'key', url: 'https://tz.example.com' }),
            protocol: 'torrent',
            enabled: true,
            supportsRss: true,
            supportsSearch: true,
            priority: 25,
            added: new Date(),
          },
        ]),
      },
      indexerRelease: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve(create)),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: TORZNAB_RSS,
        headers: {},
      }),
      buildHeaders: vi.fn().mockReturnValue({}),
    };

    service = new RssSyncService(mockPrisma, mockHttpClient);
  });

  it('should fetch enabled RSS-capable indexers', async () => {
    await service.sync();
    expect(mockPrisma.indexer.findMany).toHaveBeenCalledWith({
      where: { enabled: true, supportsRss: true },
    });
  });

  it('should make HTTP request to indexer RSS URL', async () => {
    await service.sync();
    expect(mockHttpClient.get).toHaveBeenCalledOnce();
    const [url] = mockHttpClient.get.mock.calls[0];
    expect(url).toContain('https://tz.example.com');
    expect(url).toContain('t=search');
  });

  it('should store parsed releases in the database via upsert', async () => {
    await service.sync();
    // 2 items in the RSS feed
    expect(mockPrisma.indexerRelease.upsert).toHaveBeenCalledTimes(2);
  });

  it('should upsert with correct release data', async () => {
    await service.sync();
    const firstCall = mockPrisma.indexerRelease.upsert.mock.calls[0][0];
    expect(firstCall.where.guid).toBe('guid-1');
    expect(firstCall.create.title).toBe('New.Movie.2025.1080p');
    expect(firstCall.create.indexerId).toBe(1);
    expect(firstCall.create.seeders).toBe(100);
  });

  it('should return sync summary with counts', async () => {
    const summary = await service.sync();
    expect(summary.indexersProcessed).toBe(1);
    expect(summary.releasesStored).toBe(2);
    expect(summary.errors).toHaveLength(0);
  });

  it('should handle HTTP errors gracefully and continue', async () => {
    mockHttpClient.get.mockResolvedValue({
      ok: false, status: 500, body: 'Server Error', headers: {},
    });

    const summary = await service.sync();
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain('500');
  });

  it('should handle network errors gracefully', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const summary = await service.sync();
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain('ECONNREFUSED');
  });

  it('should skip disabled or non-RSS indexers', async () => {
    mockPrisma.indexer.findMany.mockResolvedValue([]);

    const summary = await service.sync();
    expect(summary.indexersProcessed).toBe(0);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });
});
