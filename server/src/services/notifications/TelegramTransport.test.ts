import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../types/modelTypes';
import { TelegramTransport } from './TelegramTransport';
import type { NotificationEvent } from './transport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Telegram transport',
    type: 'telegram',
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

describe('TelegramTransport', () => {
  it('sends formatted markdown message to Bot API endpoint', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const transport = new TelegramTransport({ fetchFn, timeoutMs: 100 });

    const event: NotificationEvent = {
      type: 'download',
      title: 'Download Completed',
      message: 'Dune Part Two finished',
      data: { quality: '2160p' },
    };

    await transport.send(
      makeNotification({ botToken: 'abc123', chatId: 'chat-1' }),
      event,
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/botabc123/sendMessage');
    const body = JSON.parse(String(init.body));
    expect(body.chat_id).toBe('chat-1');
    expect(body.parse_mode).toBe('Markdown');
    expect(body.text).toContain('*Download Completed*');
    expect(body.text).toContain('quality: 2160p');
  });

  it('throws when required config is missing', async () => {
    const transport = new TelegramTransport({
      fetchFn: vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response),
      timeoutMs: 100,
    });

    await expect(
      transport.send(makeNotification({ chatId: 'chat-1' }), {
        type: 'download',
        title: 'x',
        message: 'y',
      }),
    ).rejects.toThrow('Telegram transport is missing bot token');
  });

  it('throws on non-2xx response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
    const transport = new TelegramTransport({ fetchFn, timeoutMs: 100 });

    await expect(
      transport.send(
        makeNotification({ botToken: 'abc123', chatId: 'chat-1' }),
        { type: 'download', title: 'x', message: 'y' },
      ),
    ).rejects.toThrow('Telegram transport failed with status 401');
  });
});
