import { describe, expect, it, vi } from 'vitest';
import { NotificationTransportRegistry } from './NotificationTransportRegistry';
import type { NotificationTransport } from './transport';

describe('NotificationTransportRegistry', () => {
  it('returns built-in transport for known type', () => {
    const registry = new NotificationTransportRegistry();
    expect(registry.getTransport('webhook')).not.toBeNull();
    expect(registry.getTransport('discord')).not.toBeNull();
    expect(registry.getTransport('telegram')).not.toBeNull();
    expect(registry.getTransport('gotify')).not.toBeNull();
    expect(registry.getTransport('email')).not.toBeNull();
    expect(registry.getTransport('slack')).not.toBeNull();
    expect(registry.getTransport('pushover')).not.toBeNull();
  });

  it('matches types case-insensitively', () => {
    const registry = new NotificationTransportRegistry();
    expect(registry.getTransport('DiScOrD')).not.toBeNull();
  });

  it('supports transport overrides', () => {
    const custom = {
      send: vi.fn().mockResolvedValue(undefined),
    } satisfies NotificationTransport;

    const registry = new NotificationTransportRegistry({ webhook: custom });
    expect(registry.getTransport('webhook')).toBe(custom);
  });

  it('returns null for unknown type', () => {
    const registry = new NotificationTransportRegistry();
    expect(registry.getTransport('matrix')).toBeNull();
  });
});
