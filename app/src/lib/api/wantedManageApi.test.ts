import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { ApiClientError } from './errors';
import { createWantedManageApi, WANTED_FETCH_LIMIT } from './wantedManageApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeApi(fetchFn: ReturnType<typeof vi.fn>) {
  return createWantedManageApi(new ApiHttpClient({ fetchFn: fetchFn as unknown as typeof fetch }));
}

describe('wantedManageApi', () => {
  it('asks for the whole wanted list in one server-paginated request', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [
          {
            type: 'movie',
            id: 101,
            title: 'Dune: Part Two',
            year: 2024,
            status: 'Released',
            monitored: true,
            addedAt: '2024-06-01T00:00:00.000Z',
            priority: { bucket: 'continue-watching', rank: 0 },
          },
        ],
        meta: { page: 1, pageSize: WANTED_FETCH_LIMIT, totalCount: 1, totalPages: 1 },
      }),
    );
    const api = makeApi(fetchFn);

    const result = await api.listMediaWanted();

    expect(result.items[0]).toMatchObject({ type: 'movie', title: 'Dune: Part Two' });
    expect(fetchFn).toHaveBeenCalledWith(
      `/api/media/wanted?page=1&pageSize=${WANTED_FETCH_LIMIT}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('posts the media type to the real per-item auto-search route', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { success: true, release: { title: 'Dune.2024.1080p' } } }),
    );
    const api = makeApi(fetchFn);

    const result = await api.searchMediaItem(101, 'movie');

    expect(result.release?.title).toBe('Dune.2024.1080p');
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/media/101/auto-search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'movie' }),
      }),
    );
  });

  it('surfaces the legacy short error envelope verbatim instead of a contract error', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ ok: false, error: 'No releases found' }, 404)));
    const api = makeApi(fetchFn);

    await expect(api.searchMediaItem(101, 'movie')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'No releases found',
    });
    await expect(api.searchMediaItem(101, 'movie')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('parses the priority-coverage report and asks for the requested window', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          days: 14,
          items: [
            {
              mediaType: 'EPISODE',
              mediaId: 4771,
              title: 'The Beating',
              status: 'dual',
              languages: ['en', 'zho'],
            },
          ],
          counts: { dual: 1, 'zho-only': 0, 'en-only': 0, none: 0 },
          total: 1,
        },
      }),
    );
    const api = makeApi(fetchFn);

    const report = await api.getPriorityCoverage(14);

    expect(report.items[0].status).toBe('dual');
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/subtitles/priority-coverage?days=14',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
