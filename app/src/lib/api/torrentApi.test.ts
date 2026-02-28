import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTorrentApi } from './torrentApi';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

describe('torrentApi', () => {
  let mockClient: any;
  let api: ReturnType<typeof createTorrentApi>;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
      requestPaginated: vi.fn(),
    };
    api = createTorrentApi(mockClient as unknown as ApiHttpClient);
  });

  it('list should call requestPaginated with correct path', async () => {
    const mockResult = {
      items: [],
      meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
    };
    mockClient.requestPaginated.mockResolvedValue(mockResult);

    const result = await api.list({ page: 1, pageSize: 10 });

    expect(mockClient.requestPaginated).toHaveBeenCalledWith(
      {
        path: routeMap.torrents,
        query: { page: 1, pageSize: 10 },
      },
      expect.any(Object)
    );
    expect(result).toEqual(mockResult);
  });

  it('get should call request with correct path', async () => {
    const mockTorrent = { infoHash: 'abc', name: 'test', size: '100', downloaded: '0', uploaded: '0' };
    mockClient.request.mockResolvedValue(mockTorrent);

    const result = await api.get('abc');

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrentDetail('abc'),
      },
      expect.any(Object)
    );
    expect(result).toEqual(mockTorrent);
  });

  it('add should call request with POST and body', async () => {
    const input = { magnetUrl: 'magnet:?xt=urn:btih:abc' };
    mockClient.request.mockResolvedValue({ infoHash: 'abc' });

    const result = await api.add(input);

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrents,
        method: 'POST',
        body: input,
      },
      expect.any(Object)
    );
    expect(result).toEqual({ infoHash: 'abc' });
  });

  it('pause should call request with PATCH to pause endpoint', async () => {
    mockClient.request.mockResolvedValue({ infoHash: 'abc', status: 'paused' });

    const result = await api.pause('abc');

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrentPause('abc'),
        method: 'PATCH',
      },
      expect.any(Object)
    );
    expect(result).toEqual({ infoHash: 'abc', status: 'paused' });
  });

  it('resume should call request with PATCH to resume endpoint', async () => {
    mockClient.request.mockResolvedValue({ infoHash: 'abc', status: 'downloading' });

    const result = await api.resume('abc');

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrentResume('abc'),
        method: 'PATCH',
      },
      expect.any(Object)
    );
    expect(result).toEqual({ infoHash: 'abc', status: 'downloading' });
  });

  it('remove should call request with DELETE', async () => {
    mockClient.request.mockResolvedValue({ infoHash: 'abc', removed: true });

    const result = await api.remove('abc');

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrentDelete('abc'),
        method: 'DELETE',
      },
      expect.any(Object)
    );
    expect(result).toEqual({ infoHash: 'abc', removed: true });
  });

  it('setSpeedLimits should call request with PATCH and limits body', async () => {
    const limits = { download: 1000, upload: 500 };
    mockClient.request.mockResolvedValue({ updated: true, limits });

    const result = await api.setSpeedLimits(limits);

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        path: routeMap.torrentSpeedLimits,
        method: 'PATCH',
        body: limits,
      },
      expect.any(Object)
    );
    expect(result).toEqual({ updated: true, limits });
  });
});
