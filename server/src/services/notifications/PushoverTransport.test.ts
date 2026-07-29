import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../types/modelTypes';
import { PushoverTransport } from './PushoverTransport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Pushover',
    type: 'pushover',
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

describe('PushoverTransport', () => {
  it('sends the configured app and user keys to the real Pushover endpoint shape', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const transport = new PushoverTransport({ fetchFn });

    await transport.send(
      makeNotification({ appToken: 'app-token', userKey: 'user-key' }),
      { type: 'health', title: 'Mediarr test', message: 'Delivery works' },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.pushover.net/1/messages.json',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetchFn.mock.calls[0]![1] as RequestInit;
    expect(String(init.body)).toContain('token=app-token');
    expect(String(init.body)).toContain('user=user-key');
    expect(String(init.body)).toContain('title=Mediarr+test');
    expect(String(init.body)).toContain('message=Delivery+works');
  });

  it('fails explicitly when a required key is absent', async () => {
    const transport = new PushoverTransport();
    await expect(
      transport.send(
        makeNotification({ appToken: 'app-token' }),
        { type: 'health', title: 'Test', message: 'Test' },
      ),
    ).rejects.toThrow('Pushover transport is missing user key');
  });
});
