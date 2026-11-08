import { describe, expect, it, vi } from 'vitest';
import { createAdultLibraryApi } from './adultLibraryApi';

function fakeClient() {
  const request = vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 24,
    totalCount: 0,
    needsReview: 0,
  });
  return { client: { request } as never, request };
}

describe('adultLibraryApi', () => {
  it('sends the search and paging parameters it was given', async () => {
    const { client, request } = fakeClient();
    await createAdultLibraryApi(client).listItems({ q: 'asian', page: 2, pageSize: 10 });
    expect(request).toHaveBeenCalledWith(
      { path: '/api/adult/items', query: { q: 'asian', page: 2, pageSize: 10 } },
      expect.anything(),
    );
  });

  it('omits empty parameters so the server defaults apply', async () => {
    const { client, request } = fakeClient();
    await createAdultLibraryApi(client).listItems({});
    expect(request).toHaveBeenCalledWith({ path: '/api/adult/items', query: {} }, expect.anything());
  });

  it('builds the library-scoped stream URL and posts progress to it', async () => {
    const { client, request } = fakeClient();
    const api = createAdultLibraryApi(client);
    expect(api.streamUrl(42)).toBe('/api/adult/items/42/stream');
    await api.reportProgress(42, 120, 600);
    expect(request).toHaveBeenCalledWith(
      { path: '/api/adult/items/42/progress', method: 'POST', body: { position: 120, duration: 600 } },
      expect.anything(),
    );
  });
});
