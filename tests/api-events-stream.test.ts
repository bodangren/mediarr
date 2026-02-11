import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';
import { ApiEventHub } from '../server/src/api/eventHub';

describe('SSE real-time transport', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ApiEventHub writes typed events and heartbeat frames', async () => {
    const writes: string[] = [];
    const mockClient = {
      write: (chunk: string) => {
        writes.push(chunk);
      },
      end: vi.fn(),
    };

    const eventHub = new ApiEventHub(40);
    eventHub.addClient(mockClient as any);

    eventHub.publish('torrent:stats', [{ infoHash: 'abc', size: '1000' }]);

    await new Promise(resolve => setTimeout(resolve, 70));

    eventHub.removeClient(mockClient as any);
    eventHub.close();

    expect(writes.some(chunk => chunk.includes('event: torrent:stats'))).toBe(true);
    expect(writes.some(chunk => chunk.includes('event: heartbeat'))).toBe(true);
  });

  it('createApiServer emits torrent/activity/health updates through event hub polling', async () => {
    vi.useFakeTimers();

    const publish = vi.fn();
    const eventHub = {
      addClient: vi.fn(),
      removeClient: vi.fn(),
      publish,
      close: vi.fn(),
    };

    let activityPoll = 0;
    let healthPoll = 0;

    const app = createApiServer(
      {
        prisma: {},
        eventHub: eventHub as any,
        torrentManager: {
          getTorrentsStatus: async () => ([{ infoHash: 'abc', size: '1000' }]),
          getTorrentStatus: async () => ({ infoHash: 'abc', size: '1000' }),
          addTorrent: async () => ({ infoHash: 'abc', name: 'Torrent' }),
          pauseTorrent: async () => undefined,
          resumeTorrent: async () => undefined,
          removeTorrent: async () => undefined,
          setSpeedLimits: () => undefined,
        },
        activityEventRepository: {
          query: async () => {
            activityPoll += 1;
            if (activityPoll === 1) {
              return {
                items: [],
                total: 0,
                page: 1,
                pageSize: 25,
              };
            }

            if (activityPoll === 2) {
              return {
                items: [{ id: 2, summary: 'Media added' }],
                total: 1,
                page: 1,
                pageSize: 25,
              };
            }

            return {
              items: [{ id: 3, summary: 'Release grabbed' }],
              total: 1,
              page: 1,
              pageSize: 25,
            };
          },
        },
        indexerRepository: {
          findAll: async () => ([{
            id: 1,
            name: 'Indexer One',
            implementation: 'Torznab',
            configContract: 'TorznabSettings',
            settings: '{}',
            protocol: 'torrent',
            enabled: true,
            supportsRss: true,
            supportsSearch: true,
            priority: 25,
            added: new Date('2026-02-11T00:00:00.000Z'),
          }]),
          findById: async () => null,
          create: async (data: any) => data,
          update: async (_id: number, data: any) => data,
          delete: async (_id: number) => ({ id: 1 }),
        },
        indexerHealthRepository: {
          getByIndexerId: async () => {
            healthPoll += 1;
            return {
              indexerId: 1,
              failureCount: healthPoll >= 2 ? 2 : 0,
              lastErrorMessage: healthPoll >= 2 ? 'timeout' : null,
            };
          },
        },
      } as any,
      {
        torrentStatsIntervalMs: 50,
        activityPollIntervalMs: 50,
        healthPollIntervalMs: 50,
      },
    );

    await app.ready();
    await vi.advanceTimersByTimeAsync(250);

    expect(publish).toHaveBeenCalledWith('torrent:stats', expect.any(Array));
    expect(publish).toHaveBeenCalledWith('activity:new', expect.objectContaining({ id: 3 }));
    expect(publish).toHaveBeenCalledWith('health:update', expect.any(Array));

    await app.close();
  });
});
