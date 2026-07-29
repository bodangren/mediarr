import { describe, expect, it } from 'vitest';
import { decodeJellyfinId, encodeJellyfinId } from './ids';

describe('Jellyfin item ids', () => {
  it('are stable UUID-shaped and reversible across colliding table primary keys', () => {
    const movie = encodeJellyfinId('movie', 42);
    expect(movie).toMatch(/^[0-9a-f]{8}-/);
    expect(decodeJellyfinId(movie)).toEqual({ kind: 'movie', id: 42 });
    expect(decodeJellyfinId(encodeJellyfinId('episode', 42))).toEqual({ kind: 'episode', id: 42 });
  });
  it('rejects foreign identifiers', () => {
    expect(decodeJellyfinId('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
