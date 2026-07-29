import { describe, expect, it } from 'vitest';
import { DEFAULT_JELLYFIN_PORT, resolveJellyfinConfig } from './jellyfin';

describe('resolveJellyfinConfig', () => {
  it('is disabled by default and selects the collision-aware default port', () => {
    expect(resolveJellyfinConfig({})).toEqual({ enabled: false, port: DEFAULT_JELLYFIN_PORT });
  });

  it.each(['true', '1', 'YES', 'on'])('accepts explicit opt-in value %s', (value) => {
    expect(resolveJellyfinConfig({ JELLYFIN_ENABLED: value })).toMatchObject({ enabled: true });
  });

  it('uses only a complete valid port number', () => {
    expect(resolveJellyfinConfig({ JELLYFIN_PORT: '18096' }).port).toBe(18096);
    for (const value of ['0', '-1', '8096junk', '65536']) {
      expect(() => resolveJellyfinConfig({ JELLYFIN_PORT: value })).toThrow('JELLYFIN_PORT');
    }
  });
});
