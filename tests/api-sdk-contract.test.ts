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
          infoHash: 'abc123',
          name: 'Result',
        },
      });
    });

    const api = createApiClients({
      baseUrl: 'http://127.0.0.1:3001',
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const series = await api.mediaApi.listSeries({ page: 1, pageSize: 25 });
    expect(series.items[0].title).toBe('Andor');

    await api.releaseApi.grabRelease({
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
      'http://127.0.0.1:3001/api/releases/grab',
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
});
