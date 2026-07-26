import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtitleProviderFactory, type SubtitleProviderConfig } from './SubtitleProviderFactory';
import type { ManualSubtitleProvider } from './SubtitleInventoryApiService';

function makeProvider(): ManualSubtitleProvider {
  return {
    search: vi.fn().mockResolvedValue([]),
    download: vi.fn(async c => c),
  };
}

describe('SubtitleProviderFactory', () => {
  let providers: Record<string, ManualSubtitleProvider>;
  let readConfig: () => SubtitleProviderConfig;

  beforeEach(() => {
    providers = {
      opensubtitles: makeProvider(),
      subdl: makeProvider(),
      assrt: makeProvider(),
    };
    readConfig = () => ({ manualProvider: 'opensubtitles' });
  });

  describe('getProviderNames', () => {
    it('returns the registered provider names', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.getProviderNames()).toEqual(['opensubtitles', 'subdl', 'assrt']);
    });

    it('returns empty array when no providers registered', () => {
      const factory = new SubtitleProviderFactory({}, readConfig);
      expect(factory.getProviderNames()).toEqual([]);
    });

    it('reports a registered provider as available', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.isProviderAvailable('opensubtitles')).toBe(true);
    });

    it('returns null unavailable reason for a registered provider with no unavailable entry', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.getProviderUnavailableReason('opensubtitles')).toBeNull();
    });

    it('includes explicitly unavailable providers for truthful status listing', () => {
      const factory = new SubtitleProviderFactory(
        providers,
        readConfig,
        { embedded: 'Embedded subtitle extraction is not available' },
      );

      expect(factory.getProviderNames()).toContain('embedded');
      expect(factory.isProviderAvailable('embedded')).toBe(false);
      expect(factory.getProviderUnavailableReason('embedded')).toBe(
        'Embedded subtitle extraction is not available',
      );
    });
  });

  describe('resolveAllManualProviders', () => {
    it('returns all name/provider pairs', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      const result = factory.resolveAllManualProviders();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'opensubtitles', provider: providers.opensubtitles });
      expect(result[1]).toEqual({ name: 'subdl', provider: providers.subdl });
      expect(result[2]).toEqual({ name: 'assrt', provider: providers.assrt });
    });

    it('returns empty array when no providers registered', () => {
      const factory = new SubtitleProviderFactory({}, readConfig);
      expect(factory.resolveAllManualProviders()).toEqual([]);
    });
  });

  describe('resolveManualProvider', () => {
    it('returns the provider matching the explicit name', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.resolveManualProvider('subdl')).toBe(providers.subdl);
    });

    it('falls back to readConfig when no explicit name given', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.resolveManualProvider()).toBe(providers.opensubtitles);
    });

    it('normalizes provider name to lowercase before lookup', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(factory.resolveManualProvider('SubDL')).toBe(providers.subdl);
    });

    it('throws when no explicit name and config has no manualProvider', () => {
      const factory = new SubtitleProviderFactory(providers, () => ({}));
      expect(() => factory.resolveManualProvider()).toThrow(
        'No manual subtitle provider is configured',
      );
    });

    it('throws when provider name is not registered', () => {
      const factory = new SubtitleProviderFactory(providers, readConfig);
      expect(() => factory.resolveManualProvider('unknown')).toThrow(
        "Subtitle provider 'unknown' is not registered",
      );
    });

    it('throws when providers record is empty', () => {
      const factory = new SubtitleProviderFactory({}, () => ({ manualProvider: 'opensubtitles' }));
      expect(() => factory.resolveManualProvider()).toThrow(
        "Subtitle provider 'opensubtitles' is not registered",
      );
    });

    it('rejects explicit resolution of an unavailable provider', () => {
      const factory = new SubtitleProviderFactory(
        providers,
        readConfig,
        { embedded: 'Embedded subtitle extraction is not available' },
      );

      expect(() => factory.resolveManualProvider('embedded')).toThrow(
        "Subtitle provider 'embedded' is unavailable: Embedded subtitle extraction is not available",
      );
      expect(factory.resolveAllManualProviders().map(entry => entry.name)).not.toContain('embedded');
    });
  });
});
