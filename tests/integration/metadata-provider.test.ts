import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '../../server/src/indexers/HttpClient';
import { MetadataProvider } from '../../server/src/services/MetadataProvider';
import { SettingsService } from '../../server/src/services/SettingsService';

class MockHttpClient extends HttpClient {
  async get(url: string) {
     if (url.includes('api_key=valid-key')) {
        return { ok: true, status: 200, body: JSON.stringify({ results: [] }), headers: {} };
     }
     return { ok: false, status: 401, body: 'Unauthorized', headers: {} };
  }
}

describe('Metadata Key Management', () => {
    it('should throw if TMDB API key is missing', async () => {
        const client = new MockHttpClient();
        
        const mockSettingsService = {
            get: async () => ({
                apiKeys: { tmdbApiKey: null }
            })
        } as unknown as SettingsService;

        const provider = new MetadataProvider(client, mockSettingsService);
        
        await expect(provider.searchMedia({ mediaType: 'MOVIE', term: 'test' }))
            .rejects.toThrow(/TMDB API Key is missing/);
    });

    it('should use provided API key from settings', async () => {
        const client = new MockHttpClient();
        
        const mockSettingsService = {
            get: async () => ({
                apiKeys: { tmdbApiKey: 'valid-key' }
            })
        } as unknown as SettingsService;

        const provider = new MetadataProvider(client, mockSettingsService);
        await expect(provider.searchMedia({ mediaType: 'MOVIE', term: 'test' })).resolves.toBeDefined();
    });
});
