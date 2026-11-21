import { describe, expect, it } from 'vitest';
import { PlaybackSessionRegistry } from './PlaybackSessionRegistry';

function registryAt(clock: { now: number }) {
  return new PlaybackSessionRegistry(45_000, () => clock.now);
}

describe('PlaybackSessionRegistry', () => {
  it('reports playing only while a playing heartbeat is fresh', () => {
    const clock = { now: 1_000 };
    const registry = registryAt(clock);
    registry.update({ mediaType: 'episode', mediaId: 7, state: 'playing', sessionId: 'tv' });
    expect(registry.isPlaying()).toBe(true);

    // Paused stops counting: heavy jobs may resume while the viewer is paused.
    registry.update({ mediaType: 'episode', mediaId: 7, state: 'paused', sessionId: 'tv' });
    expect(registry.isPlaying()).toBe(false);

    registry.update({ mediaType: 'episode', mediaId: 7, state: 'playing', sessionId: 'tv' });
    clock.now += 46_000;
    expect(registry.isPlaying(), 'a silent session must not hold the engine forever').toBe(false);
  });

  it('stop clears the session immediately', () => {
    const clock = { now: 5_000 };
    const registry = registryAt(clock);
    registry.update({ mediaType: 'movie', mediaId: 3, state: 'playing', sessionId: 'tv' });
    registry.update({ mediaType: 'movie', mediaId: 3, state: 'playing', sessionId: 'tv' }, 'stop');
    expect(registry.isPlaying()).toBe(false);
    expect(registry.active()).toHaveLength(0);
  });

  it('keeps separate clients independent', () => {
    const clock = { now: 9_000 };
    const registry = registryAt(clock);
    registry.update({ mediaType: 'episode', mediaId: 1, state: 'playing', sessionId: 'living-room' });
    registry.update({ mediaType: 'episode', mediaId: 2, state: 'paused', sessionId: 'bedroom' });
    expect(registry.isPlaying()).toBe(true);
    registry.update({ mediaType: 'episode', mediaId: 1, state: 'playing', sessionId: 'living-room' }, 'stop');
    expect(registry.isPlaying()).toBe(false);
  });
});
