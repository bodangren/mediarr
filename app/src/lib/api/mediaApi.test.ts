import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createMediaApi } from './mediaApi';

describe('mediaApi searchMetadata', () => {
  it('accepts a provider-backed result without a local database id', async () => {
    const providerResult = {
      mediaType: 'TV' as const,
      tvdbId: 72_102,
      title: 'Threat Matrix',
      year: 2003,
      overview: 'A team of federal agents combat threats.',
    };
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: [providerResult] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const api = createMediaApi(new ApiHttpClient({ fetchFn }));

    await expect(api.searchMetadata({ term: 'Matrix' })).resolves.toEqual([
      providerResult,
    ]);
  });
});
