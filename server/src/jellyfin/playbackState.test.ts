import { describe, expect, it, vi } from 'vitest';
import type { ContinueWatchingItem } from '../repositories/PlaybackRepository';
import { encodeJellyfinId } from './ids';
import {
  continueWatchingToJellyfinResume,
  deriveAllNextUp,
  deriveNextUp,
  jellyfinMarkWatchedIntent,
  jellyfinProgressToHeartbeat,
  jellyfinTicksToSeconds,
  JELLYFIN_SHARED_USER_ID,
  JELLYFIN_TICKS_PER_SECOND,
  playbackSecondsToJellyfinTicks,
} from './playbackState';

const episodeId = encodeJellyfinId('episode', 42);

function continueWatching(overrides: Partial<ContinueWatchingItem> = {}): ContinueWatchingItem {
  return {
    mediaType: 'EPISODE',
    mediaId: 42,
    seriesId: 7,
    title: 'Firefly',
    episodeTitle: 'Serenity',
    seasonNumber: 1,
    episodeNumber: 1,
    posterUrl: null,
    backdropUrl: null,
    position: 3600,
    duration: 7200,
    progress: 0.5,
    isWatched: false,
    lastWatched: new Date('2026-07-29T00:00:00.000Z'),
    ...overrides,
  };
}

describe('Jellyfin shared playback state adapter', () => {
  it('converts between Jellyfin ticks and existing integer seconds without negative state', () => {
    expect(jellyfinTicksToSeconds(72 * JELLYFIN_TICKS_PER_SECOND)).toBe(72);
    expect(playbackSecondsToJellyfinTicks(72)).toBe(72 * JELLYFIN_TICKS_PER_SECOND);
    expect(jellyfinTicksToSeconds(-1)).toBe(0);
    expect(playbackSecondsToJellyfinTicks(-1)).toBe(0);
  });

  it('adapts Jellyfin progress into the PlaybackService heartbeat using lan-default', () => {
    expect(jellyfinProgressToHeartbeat({
      ItemId: episodeId,
      PositionTicks: 120 * JELLYFIN_TICKS_PER_SECOND,
      RunTimeTicks: 600 * JELLYFIN_TICKS_PER_SECOND,
    })).toEqual({
      mediaType: 'EPISODE',
      mediaId: 42,
      userId: JELLYFIN_SHARED_USER_ID,
      position: 120,
      duration: 600,
    });
  });

  it('rejects foreign and non-playable ids instead of creating a shared progress row', () => {
    expect(jellyfinProgressToHeartbeat({ ItemId: 'foreign', PositionTicks: 1, RunTimeTicks: 1 })).toBeNull();
    expect(jellyfinProgressToHeartbeat({ ItemId: encodeJellyfinId('series', 7) })).toBeNull();
  });

  it('keeps mark-watched separate from heartbeat duration mutation', () => {
    expect(jellyfinMarkWatchedIntent(episodeId)).toEqual({
      mediaType: 'EPISODE',
      mediaId: 42,
      userId: JELLYFIN_SHARED_USER_ID,
    });
    expect(jellyfinMarkWatchedIntent(encodeJellyfinId('series', 7))).toBeNull();
  });

  it('maps shared continue-watching episode state into Jellyfin resume ticks and ids', () => {
    expect(continueWatchingToJellyfinResume([continueWatching()])).toEqual({
      Items: [{
        Id: episodeId,
        Type: 'Episode',
        Name: 'Serenity',
        SeriesName: 'Firefly',
        SeriesId: encodeJellyfinId('series', 7),
        RunTimeTicks: 7200 * JELLYFIN_TICKS_PER_SECOND,
        UserData: {
          Played: false,
          PlaybackPositionTicks: 3600 * JELLYFIN_TICKS_PER_SECOND,
          ItemId: episodeId,
        },
      }],
      TotalRecordCount: 1,
      StartIndex: 0,
    });
  });

  it('maps movie resume state without episode-only fields', () => {
    const result = continueWatchingToJellyfinResume([
      continueWatching({ mediaType: 'MOVIE', mediaId: 8, seriesId: null, episodeTitle: null, title: 'Arrival' }),
    ]);

    expect(result.Items[0]).toMatchObject({
      Id: encodeJellyfinId('movie', 8),
      Type: 'Movie',
      Name: 'Arrival',
    });
    expect(result.Items[0]).not.toHaveProperty('SeriesName');
    expect(result.Items[0]).not.toHaveProperty('SeriesId');
  });

  it('derives one ordered unplayed episode per series using lan-default progress', async () => {
    const getOrderedEpisodes = vi.fn().mockResolvedValue([
      { id: 101, seriesId: 1 },
      { id: 102, seriesId: 1 },
      { id: 201, seriesId: 2 },
      { id: 202, seriesId: 2 },
    ]);
    const getProgress = vi.fn()
      .mockResolvedValueOnce({ isWatched: true })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(deriveNextUp({ getOrderedEpisodes, getProgress })).resolves.toEqual([
      { id: 102, seriesId: 1 },
      { id: 201, seriesId: 2 },
    ]);
    expect(getProgress).toHaveBeenCalledWith(101, JELLYFIN_SHARED_USER_ID);
    expect(getProgress).toHaveBeenCalledWith(102, JELLYFIN_SHARED_USER_ID);
  });

  it('restricts NextUp to the requested series without leaking another series', async () => {
    const getOrderedEpisodes = vi.fn().mockResolvedValue([
      { id: 101, seriesId: 1 },
      { id: 201, seriesId: 2 },
    ]);
    const getProgress = vi.fn().mockResolvedValue(null);

    await expect(deriveNextUp({ getOrderedEpisodes, getProgress }, { seriesId: 2 })).resolves.toEqual([
      { id: 201, seriesId: 2 },
    ]);
    expect(getOrderedEpisodes).toHaveBeenCalledWith(2);
  });

  it('derives every eligible series for a route layer that must count before paging', async () => {
    const getOrderedEpisodes = vi.fn().mockResolvedValue([
      { id: 1, seriesId: 1 }, { id: 2, seriesId: 2 }, { id: 3, seriesId: 3 },
    ]);
    const getProgress = vi.fn().mockResolvedValue(null);

    await expect(deriveAllNextUp({ getOrderedEpisodes, getProgress })).resolves.toEqual([
      { id: 1, seriesId: 1 }, { id: 2, seriesId: 2 }, { id: 3, seriesId: 3 },
    ]);
  });
});
