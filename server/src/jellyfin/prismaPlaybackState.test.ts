import { describe, expect, it, vi } from 'vitest';
import { encodeJellyfinId } from './ids';
import {
  createPrismaJellyfinPlaybackState,
  derivePrismaNextUpCatalogItems,
  type PrismaJellyfinPlaybackStateDelegates,
} from './prismaPlaybackState';

function episode(
  id: number,
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
) {
  return {
    id,
    seriesId,
    seasonId: seriesId * 10 + seasonNumber,
    tvdbId: id * 100,
    seasonNumber,
    episodeNumber,
    title: `Episode ${id}`,
  };
}

function createDelegates(
  episodes: readonly ReturnType<typeof episode>[],
  progressByMediaId = new Map<number, { isWatched: boolean }>(),
): PrismaJellyfinPlaybackStateDelegates {
  return {
    episode: {
      findMany: vi.fn().mockResolvedValue(episodes),
    },
    playbackProgress: {
      findFirst: vi.fn().mockImplementation(({ where }: { where: { mediaId: number } }) => (
        Promise.resolve(progressByMediaId.get(where.mediaId) ?? null)
      )),
    },
  };
}

describe('createPrismaJellyfinPlaybackState', () => {
  it('requests ordered episode rows and applies deterministic order even for a loose delegate mock', async () => {
    const delegates = createDelegates([
      episode(4, 2, 1, 2),
      episode(3, 2, 1, 1),
      episode(2, 1, 2, 1),
      episode(1, 1, 1, 1),
    ]);
    const adapter = createPrismaJellyfinPlaybackState(delegates);

    await expect(adapter.getOrderedEpisodes()).resolves.toEqual([
      { id: 1, seriesId: 1 },
      { id: 2, seriesId: 1 },
      { id: 3, seriesId: 2 },
      { id: 4, seriesId: 2 },
    ]);
    expect(delegates.episode.findMany).toHaveBeenCalledWith({
      orderBy: [
        { seriesId: 'asc' },
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' },
        { id: 'asc' },
      ],
    });
  });

  it('filters the ordered episode query by series and resolves playback by media type, id, and user', async () => {
    const delegates = createDelegates([episode(10, 7, 1, 1)], new Map([[10, { isWatched: true }]]));
    const adapter = createPrismaJellyfinPlaybackState(delegates);

    await expect(adapter.getOrderedEpisodes(7)).resolves.toEqual([{ id: 10, seriesId: 7 }]);
    await expect(adapter.getProgress(10, 'living-room')).resolves.toEqual({ isWatched: true });
    expect(delegates.episode.findMany).toHaveBeenCalledWith({
      where: { seriesId: 7 },
      orderBy: [
        { seriesId: 'asc' },
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' },
        { id: 'asc' },
      ],
    });
    expect(delegates.playbackProgress.findFirst).toHaveBeenCalledWith({
      where: { mediaType: 'EPISODE', mediaId: 10, userId: 'living-room' },
    });
  });
});

describe('derivePrismaNextUpCatalogItems', () => {
  it('maps the first unwatched ordered episode in each series to Jellyfin catalog DTOs', async () => {
    const delegates = createDelegates(
      [episode(12, 2, 1, 2), episode(11, 2, 1, 1), episode(2, 1, 1, 2), episode(1, 1, 1, 1)],
      new Map([
        [1, { isWatched: true }],
        [2, { isWatched: false }],
        [11, { isWatched: false }],
      ]),
    );
    const adapter = createPrismaJellyfinPlaybackState(delegates);

    const items = await derivePrismaNextUpCatalogItems(adapter, { userId: 'lan-default' });

    expect(items).toHaveLength(2);
    expect(items.map(item => item.Id)).toEqual([
      encodeJellyfinId('episode', 2),
      encodeJellyfinId('episode', 11),
    ]);
    expect(items.map(item => item.Type)).toEqual(['Episode', 'Episode']);
    expect(items[0]).toMatchObject({
      ParentIndexNumber: 1,
      IndexNumber: 2,
      SeriesId: encodeJellyfinId('series', 1),
    });
  });

  it('keeps a requested series bounded and honors the requested item limit', async () => {
    const delegates = createDelegates([
      episode(1, 1, 1, 1),
      episode(2, 2, 1, 1),
      episode(3, 3, 1, 1),
    ]);
    const adapter = createPrismaJellyfinPlaybackState(delegates);

    await expect(derivePrismaNextUpCatalogItems(adapter, { seriesId: 2, limit: 1 }))
      .resolves.toMatchObject([{ Id: encodeJellyfinId('episode', 2) }]);
  });
});
