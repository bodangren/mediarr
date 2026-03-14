import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '../../server/src/indexers/HttpClient';
import { OpenSubtitlesProvider } from '../../server/src/services/providers/OpenSubtitlesProvider';
import { SettingsService } from '../../server/src/services/SettingsService';

class MockHttpClient extends HttpClient {
  async get(url: string, options: any) {
     if (url.includes('api.opensubtitles.com') && options.headers['Api-Key'] === 'valid-key') {
        return { 
            ok: true, 
            status: 200, 
            body: JSON.stringify({ 
                data: [
                    {
                        attributes: {
                            language: 'en',
                            foreign_parts_only: false,
                            hearing_impaired: true,
                            votes: 10,
                            files: [{ file_id: 123, file_name: 'Movie.2024.1080p.en.srt' }]
                        }
                    }
                ]
            }), 
            headers: {} 
        };
     }
     return { ok: false, status: 401, body: 'Unauthorized', headers: {} };
  }
}

describe('OpenSubtitlesProvider', () => {
    it('should search using release name and API key from settings', async () => {
        const client = new MockHttpClient();
        const mockSettingsService = {
            get: async () => ({
                apiKeys: { openSubtitlesApiKey: 'valid-key' }
            })
        } as unknown as SettingsService;

        const provider = new OpenSubtitlesProvider(client, mockSettingsService);
        
        const results = await provider.search({
            variant: { id: 1, path: '/video.mkv', releaseName: 'Movie.2024.1080p' },
            audioTracks: []
        });

        expect(results).toHaveLength(1);
        expect(results[0].provider).toBe('opensubtitles');
        expect(results[0].isHi).toBe(true);
    });

    it('should throw if API key is missing in settings', async () => {
        const client = new MockHttpClient();
        const mockSettingsService = {
            get: async () => ({
                apiKeys: { openSubtitlesApiKey: null }
            })
        } as unknown as SettingsService;

        const provider = new OpenSubtitlesProvider(client, mockSettingsService);
        
        await expect(provider.search({
            variant: { id: 1, path: '/video.mkv', releaseName: 'Movie.2024.1080p' },
            audioTracks: []
        })).rejects.toThrow(/OpenSubtitles API Key is missing/);
    });

    it('should throw on API error', async () => {
        const client = new MockHttpClient();
        const mockSettingsService = {
            get: async () => ({
                apiKeys: { openSubtitlesApiKey: 'invalid-key' }
            })
        } as unknown as SettingsService;

        const provider = new OpenSubtitlesProvider(client, mockSettingsService);
        
        await expect(provider.search({
            variant: { id: 1, path: '/video.mkv', releaseName: 'Movie.2024.1080p' },
            audioTracks: []
        })).rejects.toThrow(/OpenSubtitles search failed: 401/);
    });
});
