import { playbackSecondsToJellyfinTicks } from './playbackState';

/**
 * Playback values supplied by Mediarr's shared playback store. Duration is
 * intentionally retained in this generic input even though Jellyfin places
 * runtime on the parent Item DTO rather than UserData.
 */
export interface SharedPlaybackUserDataState {
  position: number;
  duration: number;
  isWatched: boolean;
  lastWatched: Date | string | null;
}

/** The Jellyfin-compatible per-user fields attached to an Item response. */
export interface JellyfinUserData {
  Played: boolean;
  PlayCount: number;
  PlaybackPositionTicks: number;
  LastPlayedDate: string | null;
  ItemId: string;
}

function lastPlayedDate(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Maps the shared playback store to Jellyfin's UserData contract without
 * owning persistence. A missing row is a valid, deterministic unplayed state,
 * allowing an HTTP route to use the real shared service later without keeping
 * Jellyfin-only playback state.
 */
export function sharedPlaybackStateToJellyfinUserData(
  itemId: string,
  state: SharedPlaybackUserDataState | null | undefined,
): JellyfinUserData {
  if (state === null || state === undefined) {
    return {
      Played: false,
      PlayCount: 0,
      PlaybackPositionTicks: 0,
      LastPlayedDate: null,
      ItemId: itemId,
    };
  }

  return {
    Played: state.isWatched,
    PlayCount: state.isWatched ? 1 : 0,
    PlaybackPositionTicks: playbackSecondsToJellyfinTicks(state.position),
    LastPlayedDate: lastPlayedDate(state.lastWatched),
    ItemId: itemId,
  };
}
