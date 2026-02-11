import { describe, expect, it, vi } from 'vitest';
import { createApiClients } from '../app/src/lib/api';

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('SDK payload snapshots', () => {
  it('stabilizes series, movie, torrent, and wanted list contract shapes', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/api/series')) {
        return jsonResponse({
          ok: true,
          data: [{ id: 1, title: 'Andor', monitored: true, year: 2022, status: 'continuing' }],
          meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
      }

      if (url.includes('/api/movies')) {
        return jsonResponse({
          ok: true,
          data: [{ id: 2, title: 'The Matrix', tmdbId: 603, monitored: true, year: 1999, status: 'released' }],
          meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
      }

      if (url.includes('/api/torrents')) {
        return jsonResponse({
          ok: true,
          data: [{ infoHash: 'abc123', name: 'Result', status: 'downloading', size: '1000', downloaded: '250', uploaded: '25' }],
          meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
        });
      }

      return jsonResponse({
        ok: true,
        data: [{ type: 'episode', id: 11, title: 'Episode 2', seriesTitle: 'Andor' }],
        meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
      });
    });

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const series = await api.mediaApi.listSeries({ page: 1, pageSize: 25 });
    const movies = await api.mediaApi.listMovies({ page: 1, pageSize: 25 });
    const torrents = await api.torrentApi.list({ page: 1, pageSize: 25 });
    const wanted = await api.mediaApi.listWanted({ page: 1, pageSize: 25 });

    expect({
      series,
      movies,
      torrents,
      wanted,
    }).toMatchInlineSnapshot(`
      {
        "movies": {
          "items": [
            {
              "id": 2,
              "monitored": true,
              "status": "released",
              "title": "The Matrix",
              "tmdbId": 603,
              "year": 1999,
            },
          ],
          "meta": {
            "page": 1,
            "pageSize": 25,
            "totalCount": 1,
            "totalPages": 1,
          },
        },
        "series": {
          "items": [
            {
              "id": 1,
              "monitored": true,
              "status": "continuing",
              "title": "Andor",
              "year": 2022,
            },
          ],
          "meta": {
            "page": 1,
            "pageSize": 25,
            "totalCount": 1,
            "totalPages": 1,
          },
        },
        "torrents": {
          "items": [
            {
              "downloaded": "250",
              "infoHash": "abc123",
              "name": "Result",
              "size": "1000",
              "status": "downloading",
              "uploaded": "25",
            },
          ],
          "meta": {
            "page": 1,
            "pageSize": 25,
            "totalCount": 1,
            "totalPages": 1,
          },
        },
        "wanted": {
          "items": [
            {
              "id": 11,
              "seriesTitle": "Andor",
              "title": "Episode 2",
              "type": "episode",
            },
          ],
          "meta": {
            "page": 1,
            "pageSize": 25,
            "totalCount": 1,
            "totalPages": 1,
          },
        },
      }
    `);
  });
});
