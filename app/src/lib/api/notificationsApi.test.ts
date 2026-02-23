import { describe, expect, it, vi } from 'vitest';
import { createNotificationsApi } from './notificationsApi';

describe('notificationsApi', () => {
  const mockClient = {
    request: vi.fn(),
  };

  const api = createNotificationsApi(mockClient as any);

  it('maps backend payload to UI shape', async () => {
    mockClient.request.mockResolvedValue([
      {
        id: 1,
        name: 'Discord',
        type: 'discord',
        enabled: true,
        onGrab: true,
        onDownload: false,
        onUpgrade: false,
        onRename: false,
        onSeriesAdd: false,
        onEpisodeDelete: false,
        config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
      },
    ]);

    const result = await api.list();
    expect(result[0]).toEqual(
      expect.objectContaining({
        type: 'Discord',
        triggers: ['OnGrab'],
        webhookUrl: 'https://discord.com/api/webhooks/test',
      }),
    );
  });

  it('maps draft test payload to backend schema', async () => {
    mockClient.request.mockResolvedValue({ success: true, message: 'ok' });

    await api.testDraft({
      name: 'Discord Draft',
      type: 'Discord',
      webhookUrl: 'https://discord.com/api/webhooks/test',
      triggers: ['OnGrab'],
      enabled: true,
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/notifications/test',
        method: 'POST',
        body: {
          type: 'discord',
          config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
        },
      }),
      expect.anything(),
    );
  });
});
