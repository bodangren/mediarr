import { describe, expect, it } from 'vitest';
import { JELLYFIN_TICKS_PER_SECOND } from './playbackState';
import { sharedPlaybackStateToJellyfinUserData } from './userData';

describe('sharedPlaybackStateToJellyfinUserData', () => {
  const itemId = '5f6c2d32-45fc-4e9a-9f05-5c778cf1c263';

  it('maps the shared watched state to Jellyfin ticks and an ISO timestamp', () => {
    expect(sharedPlaybackStateToJellyfinUserData(itemId, {
      position: 123,
      duration: 600,
      isWatched: true,
      lastWatched: new Date('2026-07-29T04:05:06.000Z'),
    })).toEqual({
      Played: true,
      PlayCount: 1,
      PlaybackPositionTicks: 123 * JELLYFIN_TICKS_PER_SECOND,
      LastPlayedDate: '2026-07-29T04:05:06.000Z',
      ItemId: itemId,
    });
  });

  it('keeps an in-progress shared row unplayed while retaining its resume position', () => {
    expect(sharedPlaybackStateToJellyfinUserData(itemId, {
      position: 12,
      duration: 60,
      isWatched: false,
      lastWatched: null,
    })).toEqual({
      Played: false,
      PlayCount: 0,
      PlaybackPositionTicks: 12 * JELLYFIN_TICKS_PER_SECOND,
      LastPlayedDate: null,
      ItemId: itemId,
    });
  });

  it('returns a valid unplayed zero DTO when the shared playback row is absent', () => {
    expect(sharedPlaybackStateToJellyfinUserData(itemId, null)).toEqual({
      Played: false,
      PlayCount: 0,
      PlaybackPositionTicks: 0,
      LastPlayedDate: null,
      ItemId: itemId,
    });
  });
});
