import { describe, expect, it, vi } from 'vitest';
import { createNotificationsApi } from './notificationsApi';
import { ApiHttpClient } from './httpClient';

describe('Notifications API', () => {
  it('should list notifications', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: [
          {
            id: 1,
            name: 'Discord Notifications',
            type: 'Discord',
            webhookUrl: 'https://discord.com/api/webhooks/test',
            triggers: ['OnGrab', 'OnDownload'],
            enabled: true,
          },
        ],
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.list();

    expect(result).toEqual([
      {
        id: 1,
        name: 'Discord Notifications',
        type: 'Discord',
        webhookUrl: 'https://discord.com/api/webhooks/test',
        triggers: ['OnGrab', 'OnDownload'],
        enabled: true,
      },
    ]);
  });

  it('should create a notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: {
          id: 2,
          name: 'Telegram Alerts',
          type: 'Telegram',
          botToken: 'bot123:ABC',
          chatId: '123456789',
          triggers: ['OnHealthIssue'],
          enabled: true,
        },
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.create({
      name: 'Telegram Alerts',
      type: 'Telegram',
      botToken: 'bot123:ABC',
      chatId: '123456789',
      triggers: ['OnHealthIssue'],
      enabled: true,
    });

    expect(result).toEqual({
      id: 2,
      name: 'Telegram Alerts',
      type: 'Telegram',
      botToken: 'bot123:ABC',
      chatId: '123456789',
      triggers: ['OnHealthIssue'],
      enabled: true,
    });
  });

  it('should update a notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: {
          id: 1,
          name: 'Updated Discord',
          type: 'Discord',
          webhookUrl: 'https://discord.com/api/webhooks/updated',
          triggers: ['OnGrab', 'OnDownload', 'OnUpgrade'],
          enabled: false,
        },
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.update(1, {
      name: 'Updated Discord',
      webhookUrl: 'https://discord.com/api/webhooks/updated',
      triggers: ['OnGrab', 'OnDownload', 'OnUpgrade'],
      enabled: false,
    });

    expect(result).toEqual({
      id: 1,
      name: 'Updated Discord',
      type: 'Discord',
      webhookUrl: 'https://discord.com/api/webhooks/updated',
      triggers: ['OnGrab', 'OnDownload', 'OnUpgrade'],
      enabled: false,
    });
  });

  it('should delete a notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: { id: 1 },
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.remove(1);

    expect(result).toEqual({ id: 1 });
  });

  it('should test a notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: {
          success: true,
          message: 'Test notification sent successfully',
        },
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.test(1);

    expect(result).toEqual({
      success: true,
      message: 'Test notification sent successfully',
    });
  });

  it('should test a draft notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({
        ok: true,
        data: {
          success: true,
          message: 'Test notification sent successfully',
        },
      }),
    });

    const client = new ApiHttpClient({ fetchFn: mockFetch });
    const api = createNotificationsApi(client);

    const result = await api.testDraft({
      name: 'Test Draft',
      type: 'Discord',
      webhookUrl: 'https://discord.com/api/webhooks/test',
      triggers: ['OnGrab'],
      enabled: true,
    });

    expect(result).toEqual({
      success: true,
      message: 'Test notification sent successfully',
    });
  });
});
