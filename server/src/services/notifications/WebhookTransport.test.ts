import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@prisma/client';
import { WebhookTransport } from './WebhookTransport';
import type { NotificationEvent } from './transport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Webhook transport',
    type: 'webhook',
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

const event: NotificationEvent = {
  type: 'download',
  title: 'Download Completed',
  message: 'Dune Part Two finished downloading',
  data: {
    mediaId: 42,
  },
};

afterEach(() => {
  vi.useRealTimers();
});

describe('WebhookTransport', () => {
  it('posts notification payload to webhook URL', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const transport = new WebhookTransport({ fetchFn, timeoutMs: 100 });

    await transport.send(makeNotification({ webhookUrl: 'https://example.com/hook' }), event);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/hook');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({
      event: 'download',
      title: 'Download Completed',
      message: 'Dune Part Two finished downloading',
      data: {
        mediaId: 42,
      },
    });
  });

  it('throws on non-2xx response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const transport = new WebhookTransport({ fetchFn, timeoutMs: 100 });

    await expect(
      transport.send(makeNotification({ webhookUrl: 'https://example.com/hook' }), event),
    ).rejects.toThrow('Webhook transport failed with status 500');
  });

  it('throws when request times out', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockImplementation(() => new Promise<Response>(() => {}));
    const transport = new WebhookTransport({ fetchFn, timeoutMs: 25 });

    const pending = transport.send(
      makeNotification({ webhookUrl: 'https://example.com/hook' }),
      event,
    );
    const assertion = expect(pending).rejects.toThrow('Webhook transport request timed out');

    await vi.advanceTimersByTimeAsync(30);

    await assertion;
  });
});
