import { describe, expect, it } from 'vitest';
import { BrowserAcceptanceMetadataProvider } from './BrowserAcceptanceMetadataProvider';

describe('BrowserAcceptanceMetadataProvider', () => {
  const provider = new BrowserAcceptanceMetadataProvider(null as never, null as never);

  it('returns a deterministic local movie search result without remote artwork', async () => {
    await expect(provider.searchMedia({ term: 'Browser Search', mediaType: 'MOVIE' })).resolves.toEqual([
      expect.objectContaining({
        mediaType: 'MOVIE',
        tmdbId: 990_000_007,
        title: 'Browser Search Movie',
        images: [],
      }),
    ]);
  });

  it('does not return external-provider results for unrelated search terms', async () => {
    await expect(provider.searchMedia({ term: 'Matrix' })).resolves.toEqual([]);
  });

  it('models a retryable local provider outage without contacting an external provider', async () => {
    await expect(provider.searchMedia({ term: 'Browser Provider Failure' })).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Browser acceptance metadata provider is temporarily unavailable',
      retryable: true,
    });
  });
});
