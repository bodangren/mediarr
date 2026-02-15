import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexerFactory } from '../server/src/indexers/IndexerFactory';
import { MetadataProvider } from '../server/src/services/MetadataProvider';
import { HttpClient } from '../server/src/indexers/HttpClient';

// Mock HttpClient to intercept requests and check URLs
const mockGet = vi.fn();
const mockHttpClient = {
  get: mockGet,
} as unknown as HttpClient;

describe('Track 9 Phase 2 Backend Probes (Gemini)', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('PROBE: IndexerFactory is initialized with empty definitions (Simulating main.ts)', () => {
    // Evidence: server/src/main.ts calls new IndexerFactory([])
    const factory = new IndexerFactory([]);
    
    expect(factory.availableDefinitions).toEqual([]);
    expect(factory.availableDefinitions.length).toBe(0);
    
    // Verify it cannot create a Cardigann indexer
    expect(() => factory.fromDefinition('ipt', {})).toThrow(/Definition not found/);
  });

  it('PROBE: MetadataProvider rejects movie lookup when TMDB key is not configured', async () => {
    const provider = new MetadataProvider(mockHttpClient, {
      get: vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: null },
      }),
    } as unknown as any);

    await expect(provider['searchMovies']('test query')).rejects.toThrow(
      'TMDB API Key is missing. Please configure it in settings.',
    );
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('PROBE: MetadataProvider uses configured key when provided', async () => {
    const provider = new MetadataProvider(mockHttpClient, {
      get: vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: 'actual-secret-key' },
      }),
    } as unknown as any);
    
    mockGet.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ results: [] }) });
    
    await provider['searchMovies']('test query');
    
    expect(mockGet).toHaveBeenCalledTimes(1);
    const url = mockGet.mock.calls[0][0];
    expect(url).toContain('api_key=actual-secret-key');
  });
  
  it('PROBE: TV Search via SkyHook does not support API key', async () => {
      const provider = new MetadataProvider(mockHttpClient, {
        get: vi.fn().mockResolvedValue({
          apiKeys: { tmdbApiKey: 'unused-for-tv' },
        }),
      } as unknown as any);
      mockGet.mockResolvedValueOnce({ ok: true, body: JSON.stringify([]) });
      
      await provider.searchSeries('test series');
      
      const url = mockGet.mock.calls[0][0];
      expect(url).toContain('skyhook.sonarr.tv');
      expect(url).not.toContain('api_key');
  });
});
