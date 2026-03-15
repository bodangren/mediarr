import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClients } from '../app/src/lib/api';
import { ApiClientError, ContractViolationError } from '../app/src/lib/api/errors';
import { createEventsApi } from '../app/src/lib/api/eventsApi';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('typed SDK contracts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses typed request method/path/payload for media and release modules', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/api/series')) {
        return jsonResponse({
          ok: true,
          data: [{ id: 1, title: 'Andor' }],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 1,
            totalPages: 1,
          },
        });
      }

      return jsonResponse({
        ok: true,
        data: {
          success: true,
          downloadId: 'abc123',
          message: 'Grabbed successfully',
        },
      });
    });

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const series = await api.mediaApi.listSeries({ page: 1, pageSize: 25 });
    expect(series.items[0].title).toBe('Andor');

    await api.releaseApi.grabCandidate({
      indexer: 'Indexer',
      title: 'Result',
      size: 1000,
      seeders: 10,
      magnetUrl: 'magnet:?xt=urn:btih:abc',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3001/api/series?page=1&pageSize=25',
      expect.objectContaining({
        method: 'GET',
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3001/api/releases/grab-candidate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          indexer: 'Indexer',
          title: 'Result',
          size: 1000,
          seeders: 10,
          magnetUrl: 'magnet:?xt=urn:btih:abc',
        }),
      }),
    );
  });

  it('throws CONTRACT_VIOLATION when response shape does not match schema', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      ok: true,
      data: {
        wrong: true,
      },
    }));

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    await expect(api.settingsApi.get()).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('normalizes API error envelopes into typed ApiClientError', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Already exists',
        retryable: false,
      },
    }, 409));

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    await expect(api.mediaApi.addMedia({
      mediaType: 'MOVIE',
      tmdbId: 603,
      title: 'The Matrix',
      year: 1999,
    })).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      retryable: false,
    });

    try {
      await api.mediaApi.addMedia({
        mediaType: 'MOVIE',
        tmdbId: 603,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
    }
  });

  it('eventsApi decodes typed payloads and reconnects with backoff', async () => {
    vi.useFakeTimers();

    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      readonly url: string;
      readonly listeners: Record<string, Array<(event: MessageEvent) => void>> = {};
      closed = false;

      constructor(url: string) {
        this.url = url;
        FakeEventSource.instances.push(this);
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void): void {
        if (!this.listeners[type]) {
          this.listeners[type] = [];
        }

        this.listeners[type].push(listener);
      }

      emit(type: string, data?: unknown): void {
        const handlers = this.listeners[type] ?? [];
        const event = {
          data: typeof data === 'string' ? data : JSON.stringify(data),
        } as MessageEvent;

        for (const handler of handlers) {
          handler(event);
        }
      }

      close(): void {
        this.closed = true;
      }
    }

    const received: unknown[] = [];

    const eventsApi = createEventsApi({
      baseUrl: 'http://127.0.0.1:3001',
      maxReconnectDelayMs: 25,
      eventSourceFactory: url => new FakeEventSource(url) as unknown as EventSource,
    });

    eventsApi.on('torrent:stats', payload => {
      received.push(payload);
    });

    eventsApi.connect();

    expect(FakeEventSource.instances).toHaveLength(1);
    const first = FakeEventSource.instances[0];
    first.emit('open', {});
    first.emit('torrent:stats', [{ infoHash: 'abc', size: '1000', downloaded: '10', uploaded: '1' }]);

    expect(received).toHaveLength(1);

    first.emit('error', {});
    await vi.advanceTimersByTimeAsync(30);

    expect(FakeEventSource.instances.length).toBeGreaterThan(1);

    eventsApi.disconnect();
  });

  it('uses typed request method/path/payload for activity management actions', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/activity/export')) {
        return jsonResponse({
          ok: true,
          data: {
            items: [
              {
                id: 1,
                eventType: 'RELEASE_GRABBED',
                summary: 'Grabbed release',
                success: true,
              },
            ],
            totalCount: 1,
            exportedAt: '2026-02-15T00:00:00.000Z',
          },
        });
      }

      if ((init?.method ?? 'GET') === 'PATCH') {
        return jsonResponse({
          ok: true,
          data: {
            id: 1,
            eventType: 'RELEASE_GRABBED',
            summary: 'Marked failed',
            success: false,
          },
        });
      }

      return jsonResponse({
        ok: true,
        data: {
          deletedCount: 4,
        },
      });
    });

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const cleared = await api.activityApi.clear();
    expect(cleared.deletedCount).toBe(4);

    const failed = await api.activityApi.markFailed(1);
    expect(failed.success).toBe(false);

    const exported = await api.activityApi.export();
    expect(exported.totalCount).toBe(1);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3001/api/activity',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3001/api/activity/1/fail',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:3001/api/activity/export',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });
});
