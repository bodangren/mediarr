import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@prisma/client';
import { GotifyTransport } from './GotifyTransport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Gotify transport',
    type: 'gotify',
    enabled: true,
    onGrab: true,
    onDownload: true,
    onUpgrade: false,
    onRename: false,
    onSeriesAdd: false,
    onEpisodeDelete: false,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('GotifyTransport', () => {
  it('sends expected payload and auth header', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const transport = new GotifyTransport({ fetchFn, timeoutMs: 100 });

    await transport.send(
      makeNotification({ serverUrl: 'https://gotify.example', appToken: 'token123' }),
      {
        type: 'download',
        title: 'Download Completed',
        message: 'Done',
      },
    );

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gotify.example/message');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Gotify-Key': 'token123',
    });
    const body = JSON.parse(String(init.body));
    expect(body.priority).toBe(7);
    expect(body.title).toBe('Download Completed');
  });

  it('throws when app token is missing', async () => {
    const transport = new GotifyTransport({
      fetchFn: vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response),
      timeoutMs: 100,
    });

    await expect(
      transport.send(makeNotification({ serverUrl: 'https://gotify.example' }), {
        type: 'download',
        title: 'x',
        message: 'y',
      }),
    ).rejects.toThrow('Gotify transport is missing app token');
  });

  it('throws on non-2xx response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    const transport = new GotifyTransport({ fetchFn, timeoutMs: 100 });

    await expect(
      transport.send(
        makeNotification({ serverUrl: 'https://gotify.example', appToken: 'token123' }),
        { type: 'download', title: 'x', message: 'y' },
      ),
    ).rejects.toThrow('Gotify transport failed with status 503');
  });
});
