import { describe, expect, it, vi } from 'vitest';
import { createMediaManageApi } from './mediaManageApi';
import { ApiHttpClient } from './httpClient';

vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
  }
  return { ApiHttpClient: MockHttpClient };
});

function setup() {
  const client = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
  };
  return { client, api: createMediaManageApi(client) };
}

describe('mediaManageApi', () => {
  it('rescans a movie through the movie rescan route', async () => {
    const { client, api } = setup();
    client.request.mockResolvedValue({ rescanned: true, id: 1, filesLinked: 2 });

    await expect(api.rescanMovie(1)).resolves.toMatchObject({ filesLinked: 2 });
    expect(client.request).toHaveBeenCalledWith(
      { path: '/api/movies/1/rescan', method: 'POST', body: {} },
      expect.anything(),
    );
  });

  it('deletes a series and requests file deletion explicitly', async () => {
    const { client, api } = setup();
    client.request.mockResolvedValue({ deleted: true, id: 55 });

    await api.deleteSeries(55, true);
    expect(client.request).toHaveBeenCalledWith(
      { path: '/api/series/55', method: 'DELETE', query: { deleteFiles: 'true' } },
      expect.anything(),
    );
  });

  it('scans series subtitles and returns found/new counts', async () => {
    const { client, api } = setup();
    client.request.mockResolvedValue({ success: true, subtitlesFound: 8, newSubtitles: 3 });

    await expect(api.scanSeriesSubtitles(55)).resolves.toMatchObject({
      subtitlesFound: 8,
      newSubtitles: 3,
    });
    expect(client.request).toHaveBeenCalledWith(
      { path: '/api/subtitles/series/55/scan', method: 'POST', body: {} },
      expect.anything(),
    );
  });

  it('previews sidecar matching by default and applies only when asked', async () => {
    const { client, api } = setup();
    client.request.mockResolvedValue({ success: true, dryRun: true, matched: [], unmatched: [] });

    await api.matchMovieSidecars(1);
    expect(client.request).toHaveBeenLastCalledWith(
      { path: '/api/subtitles/movie/1/match-sidecars', method: 'POST', body: { dryRun: true } },
      expect.anything(),
    );

    await api.matchSeriesSidecars(55, { apply: true });
    expect(client.request).toHaveBeenLastCalledWith(
      { path: '/api/subtitles/series/55/match-sidecars', method: 'POST', body: { apply: true } },
      expect.anything(),
    );
  });

  it('loads priority coverage for the requested day window', async () => {
    const { client, api } = setup();
    const coverage = {
      days: 14,
      items: [{ mediaType: 'MOVIE', mediaId: 1, title: 'Heat', status: 'en-only', languages: ['en'] }],
      counts: { dual: 0, 'zho-only': 0, 'en-only': 1, none: 0 },
      total: 1,
    };
    client.request.mockResolvedValue(coverage);

    await expect(api.getPriorityCoverage(14)).resolves.toEqual(coverage);
    expect(client.request).toHaveBeenCalledWith(
      { path: '/api/subtitles/priority-coverage', query: { days: 14 } },
      expect.anything(),
    );
  });

  it('posts an added-to-wanted body and auto-search type', async () => {
    const { client, api } = setup();
    client.request.mockResolvedValue({ id: 9 });

    await api.addToWanted({ mediaType: 'MOVIE', tmdbId: 949, title: 'Heat', year: 1995 });
    expect(client.request).toHaveBeenLastCalledWith(
      {
        path: '/api/wanted',
        method: 'POST',
        body: { mediaType: 'MOVIE', tmdbId: 949, title: 'Heat', year: 1995 },
      },
      expect.anything(),
    );

    await api.triggerAutoSearch(55, 'series');
    expect(client.request).toHaveBeenLastCalledWith(
      { path: '/api/media/55/auto-search', method: 'POST', body: { type: 'series' } },
      expect.anything(),
    );
  });
});
