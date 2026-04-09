import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@prisma/client';
import { DiscordTransport } from './DiscordTransport';
import type { NotificationEvent } from './transport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Discord transport',
    type: 'discord',
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

describe('DiscordTransport', () => {
  it('sends embed payload with expected color for grab events', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    const transport = new DiscordTransport({ fetchFn, timeoutMs: 100 });

    const event: NotificationEvent = {
      type: 'grab',
      title: 'Release Grabbed',
      message: 'Dune Part Two grabbed from indexer',
      data: { indexer: 'Nyaa' },
    };

    await transport.send(makeNotification({ webhookUrl: 'https://discord.example/hook' }), event);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.embeds[0].title).toBe('Release Grabbed');
    expect(body.embeds[0].description).toBe('Dune Part Two grabbed from indexer');
    expect(body.embeds[0].color).toBe(0x3498db);
    expect(body.embeds[0].fields).toEqual([
      { name: 'indexer', value: 'Nyaa', inline: false },
    ]);
  });

  it('uses download color for download events', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    const transport = new DiscordTransport({ fetchFn, timeoutMs: 100 });

    await transport.send(
      makeNotification({ webhookUrl: 'https://discord.example/hook' }),
      {
        type: 'download',
        title: 'Download Completed',
        message: 'Finished',
      },
    );

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.embeds[0].color).toBe(0x2ecc71);
  });

  it('throws on non-2xx response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response);
    const transport = new DiscordTransport({ fetchFn, timeoutMs: 100 });

    await expect(
      transport.send(
        makeNotification({ webhookUrl: 'https://discord.example/hook' }),
        { type: 'grab', title: 'Grab', message: 'Grabbed' },
      ),
    ).rejects.toThrow('Discord transport failed with status 403');
  });
});
