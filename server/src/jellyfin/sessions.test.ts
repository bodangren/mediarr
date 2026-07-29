import { describe, expect, it } from 'vitest';
import {
  JELLYFIN_TICKS_PER_SECOND,
  JellyfinSessionRegistry,
  secondsToTicks,
  ticksToSeconds,
} from './sessions';

describe('Jellyfin tick conversions', () => {
  it('converts between Mediarr seconds and Jellyfin ticks without a unit mismatch', () => {
    expect(JELLYFIN_TICKS_PER_SECOND).toBe(10_000_000);
    expect(secondsToTicks(12.5)).toBe(125_000_000);
    expect(ticksToSeconds(125_000_000)).toBe(12.5);
  });

  it('rejects negative and non-finite time values instead of silently corrupting progress', () => {
    expect(() => secondsToTicks(-1)).toThrow(RangeError);
    expect(() => secondsToTicks(Number.NaN)).toThrow(RangeError);
    expect(() => ticksToSeconds(-1)).toThrow(RangeError);
    expect(() => ticksToSeconds(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('JellyfinSessionRegistry', () => {
  it('tracks a client session, preserves identity, and exposes the newest session first', () => {
    const times = [
      new Date('2026-07-29T10:00:00.000Z'),
      new Date('2026-07-29T10:00:01.000Z'),
    ];
    const registry = new JellyfinSessionRegistry({ now: () => times.shift()! });

    registry.touch({
      id: 'session-tv',
      userId: 'lan-default',
      deviceId: 'tv-1',
      deviceName: 'Living Room TV',
      client: 'Jellyfin for WebOS',
      applicationVersion: '1.2.3',
    });
    registry.touch({ id: 'session-phone', userId: 'lan-default' });

    expect(registry.list()).toEqual([
      expect.objectContaining({ id: 'session-phone', userId: 'lan-default' }),
      expect.objectContaining({
        id: 'session-tv',
        deviceId: 'tv-1',
        deviceName: 'Living Room TV',
        client: 'Jellyfin for WebOS',
        applicationVersion: '1.2.3',
      }),
    ]);
  });

  it('records capabilities and playback state without leaking mutable caller objects', () => {
    const registry = new JellyfinSessionRegistry({ now: () => new Date('2026-07-29T10:00:00.000Z') });
    const capabilities = { SupportsMediaControl: true };

    registry.setCapabilities({ id: 'session-tv', userId: 'lan-default' }, capabilities);
    capabilities.SupportsMediaControl = false;
    registry.startPlayback(
      { id: 'session-tv', userId: 'lan-default' },
      { itemId: 'episode-guid', playSessionId: 'play-1', positionTicks: 10_000_000 },
    );
    registry.updatePlayback(
      { id: 'session-tv', userId: 'lan-default' },
      { positionTicks: 25_000_000 },
    );

    expect(registry.get('session-tv')).toMatchObject({
      capabilities: { SupportsMediaControl: true },
      nowPlayingItemId: 'episode-guid',
      playSessionId: 'play-1',
      positionTicks: 25_000_000,
      isPlaying: true,
    });
  });

  it('clears only live playback state when a session stops', () => {
    const registry = new JellyfinSessionRegistry({ now: () => new Date('2026-07-29T10:00:00.000Z') });
    const identity = { id: 'session-tv', userId: 'lan-default', deviceName: 'Living Room TV' };

    registry.startPlayback(identity, {
      itemId: 'episode-guid',
      playSessionId: 'play-1',
      positionTicks: 30_000_000,
    });
    registry.stopPlayback(identity, { positionTicks: 35_000_000 });

    expect(registry.get('session-tv')).toMatchObject({
      id: 'session-tv',
      userId: 'lan-default',
      deviceName: 'Living Room TV',
      nowPlayingItemId: undefined,
      playSessionId: undefined,
      positionTicks: 35_000_000,
      isPlaying: false,
    });
  });

  it('rejects missing session identity and invalid playback positions', () => {
    const registry = new JellyfinSessionRegistry();

    expect(() => registry.touch({ id: ' ', userId: 'lan-default' })).toThrow(RangeError);
    expect(() => registry.touch({ id: 'session-tv', userId: ' ' })).toThrow(RangeError);
    expect(() => registry.startPlayback(
      { id: 'session-tv', userId: 'lan-default' },
      { itemId: 'episode-guid', positionTicks: -1 },
    )).toThrow(RangeError);
  });
});
