import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../types/modelTypes';
import { SlackTransport } from './SlackTransport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Slack',
    type: 'slack',
    enabled: true,
    onGrab: true,
    onDownload: false,
    onUpgrade: false,
    onRename: false,
    onSeriesAdd: false,
    onEpisodeDelete: false,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('SlackTransport', () => {
  it('uses the text payload required by Slack incoming webhooks', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const transport = new SlackTransport({ fetchFn });

    await transport.send(
      makeNotification({ webhookUrl: 'https://hooks.slack.com/services/test' }),
      { type: 'health', title: 'Mediarr test', message: 'Delivery works' },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: '*Mediarr test*\nDelivery works' }),
      }),
    );
  });

  it('reports Slack HTTP failures explicitly', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 400 }));
    const transport = new SlackTransport({ fetchFn });

    await expect(transport.send(
      makeNotification({ webhookUrl: 'https://hooks.slack.com/services/test' }),
      { type: 'health', title: 'Mediarr test', message: 'Delivery works' },
    )).rejects.toThrow('Slack transport failed with status 400');
  });
});
