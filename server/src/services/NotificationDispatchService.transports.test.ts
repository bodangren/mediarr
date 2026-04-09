import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@prisma/client';
import {
  NotificationDispatchService,
  type EventPublisher,
  type NotificationRepositoryLike,
  type NotificationTransportRegistryLike,
} from './NotificationDispatchService';
import type { NotificationTransport, NotificationEvent } from './notifications/transport';

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 1,
    name: 'Notification',
    type: 'webhook',
    enabled: true,
    onGrab: false,
    onDownload: false,
    onUpgrade: false,
    onRename: false,
    onSeriesAdd: false,
    onEpisodeDelete: false,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeHub(): EventPublisher & { publish: ReturnType<typeof vi.fn> } {
  const publish = vi.fn() as unknown as EventPublisher['publish'] & ReturnType<typeof vi.fn>;
  return { publish };
}

function makeTransport(): NotificationTransport & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn().mockResolvedValue(undefined) as unknown as NotificationTransport['send'] & ReturnType<typeof vi.fn>;
  return { send };
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationDispatchService external transports', () => {
  it('dispatches grab events to enabled grab notifications only', async () => {
    const hub = makeHub();
    const repository: NotificationRepositoryLike = {
      findAllEnabled: vi.fn().mockResolvedValue([
        makeNotification({ id: 1, type: 'webhook', onGrab: true }),
        makeNotification({ id: 2, type: 'email', onGrab: false }),
      ]),
    };

    const webhookTransport = makeTransport();
    const registry: NotificationTransportRegistryLike = {
      getTransport: vi.fn((type: string) => {
        if (type === 'webhook') return webhookTransport;
        return null;
      }),
    };

    const service = new NotificationDispatchService(hub, repository, registry);

    service.notifyGrab({ title: 'The Matrix', indexer: 'Nyaa', quality: '1080p' });
    await flushAsyncWork();

    expect(hub.publish).toHaveBeenCalledWith(
      'notification:grab',
      expect.objectContaining({ title: 'The Matrix' }),
    );
    expect(webhookTransport.send).toHaveBeenCalledTimes(1);

    const [notification, event] = webhookTransport.send.mock.calls[0] as [Notification, NotificationEvent];
    expect(notification.id).toBe(1);
    expect(event.type).toBe('grab');
    expect(event.title).toBe('Release Grabbed');

    expect((registry.getTransport as ReturnType<typeof vi.fn>).mock.calls).toEqual([
      ['webhook'],
    ]);
  });

  it('continues dispatching when one transport throws', async () => {
    const hub = makeHub();
    const repository: NotificationRepositoryLike = {
      findAllEnabled: vi.fn().mockResolvedValue([
        makeNotification({ id: 1, type: 'webhook', onDownload: true }),
        makeNotification({ id: 2, type: 'discord', onDownload: true }),
      ]),
    };

    const failingTransport = {
      send: vi.fn().mockRejectedValue(new Error('webhook down')),
    } satisfies NotificationTransport;
    const healthyTransport = makeTransport();

    const registry: NotificationTransportRegistryLike = {
      getTransport: vi.fn((type: string) => {
        if (type === 'webhook') return failingTransport;
        if (type === 'discord') return healthyTransport;
        return null;
      }),
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const service = new NotificationDispatchService(hub, repository, registry);
    service.notifyDownload({ title: 'The Matrix', mediaType: 'movie' });

    await flushAsyncWork();

    expect((failingTransport.send as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect(healthyTransport.send).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[NotificationDispatchService] Transport send failed for notification 1 (webhook):',
      expect.any(Error),
    );
  });

  it('routes upgrade downloads to onUpgrade notifications', async () => {
    const hub = makeHub();
    const repository: NotificationRepositoryLike = {
      findAllEnabled: vi.fn().mockResolvedValue([
        makeNotification({
          id: 9,
          type: 'webhook',
          onDownload: false,
          onUpgrade: true,
        }),
      ]),
    };

    const webhookTransport = makeTransport();
    const registry: NotificationTransportRegistryLike = {
      getTransport: vi.fn().mockReturnValue(webhookTransport),
    };

    const service = new NotificationDispatchService(hub, repository, registry);
    service.notifyDownload({ title: 'The Matrix', mediaType: 'movie', isUpgrade: true });

    await flushAsyncWork();

    expect(webhookTransport.send).toHaveBeenCalledTimes(1);
    const [, event] = webhookTransport.send.mock.calls[0] as [Notification, NotificationEvent];
    expect(event.type).toBe('download');
    expect(event.title).toBe('Upgrade Completed');
    expect(event.data?.isUpgrade).toBe(true);
  });
});
