import { describe, expect, it, vi } from 'vitest';
import { DiscoveryService } from './DiscoveryService';

describe('DiscoveryService', () => {
  it('publishes a mediarr tcp service announcement', () => {
    const publication = {
      start: vi.fn(),
      stop: vi.fn(),
    };

    const bonjour = {
      publish: vi.fn().mockReturnValue(publication),
      unpublishAll: vi.fn((callback?: () => void) => callback?.()),
      destroy: vi.fn(),
    };

    const service = new DiscoveryService(() => bonjour as any);
    const announcement = service.start({
      name: 'Mediarr API',
      port: 3001,
      txt: { version: '1.0.0' },
    });

    expect(announcement).toEqual({
      name: 'Mediarr API',
      type: 'mediarr',
      aliases: ['http'],
      port: 3001,
      txt: { version: '1.0.0' },
    });
    expect(bonjour.publish).toHaveBeenNthCalledWith(1, {
      name: 'Mediarr API',
      type: 'mediarr',
      protocol: 'tcp',
      port: 3001,
      txt: { version: '1.0.0' },
    });
    expect(bonjour.publish).toHaveBeenNthCalledWith(2, {
      name: 'Mediarr API',
      type: 'http',
      protocol: 'tcp',
      port: 3001,
      txt: { version: '1.0.0' },
    });
    expect(publication.start).toHaveBeenCalledTimes(2);
    expect(service.isStarted()).toBe(true);
  });

  it('is idempotent when start is called multiple times', () => {
    const bonjour = {
      publish: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() }),
      unpublishAll: vi.fn((callback?: () => void) => callback?.()),
      destroy: vi.fn(),
    };

    const service = new DiscoveryService(() => bonjour as any);

    const first = service.start({ port: 3001 });
    const second = service.start({ port: 9999, name: 'ignored' });

    expect(first).toEqual(second);
    expect(first.port).toBe(3001);
    expect(bonjour.publish).toHaveBeenCalledTimes(2);
  });

  it('stops publication and destroys bonjour instance', async () => {
    const publication = {
      start: vi.fn(),
      stop: vi.fn(),
    };

    const bonjour = {
      publish: vi.fn().mockReturnValue(publication),
      unpublishAll: vi.fn((callback?: () => void) => callback?.()),
      destroy: vi.fn(),
    };

    const service = new DiscoveryService(() => bonjour as any);
    service.start({ port: 3001 });

    await service.stop();

    expect(publication.stop).toHaveBeenCalledTimes(2);
    expect(bonjour.unpublishAll).toHaveBeenCalledTimes(1);
    expect(bonjour.destroy).toHaveBeenCalledTimes(1);
    expect(service.isStarted()).toBe(false);
    expect(service.getAnnouncement()).toBeNull();
  });

  it('rejects invalid port values', () => {
    const service = new DiscoveryService(() => ({
      publish: vi.fn(),
      unpublishAll: vi.fn(),
      destroy: vi.fn(),
    } as any));

    expect(() => service.start({ port: 0 })).toThrow('DiscoveryService port must be a positive integer');
    expect(() => service.start({ port: -1 })).toThrow('DiscoveryService port must be a positive integer');
  });

  it('publishes configured alias types and skips duplicate aliases', () => {
    const bonjour = {
      publish: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() }),
      unpublishAll: vi.fn((callback?: () => void) => callback?.()),
      destroy: vi.fn(),
    };
    const service = new DiscoveryService(() => bonjour as any);

    const announcement = service.start({
      name: 'Mediarr API',
      type: 'mediarr',
      aliases: ['http', 'mediarr', '  ', 'http', 'webdav'],
      port: 3001,
    });

    expect(announcement.aliases).toEqual(['http', 'webdav']);
    expect(bonjour.publish).toHaveBeenCalledTimes(3);
    expect(bonjour.publish).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'mediarr' }));
    expect(bonjour.publish).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'http' }));
    expect(bonjour.publish).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'webdav' }));
  });
});
