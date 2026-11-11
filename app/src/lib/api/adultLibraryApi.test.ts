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

  it('reads the watched-undecided decision list', async () => {
    const { client, request } = fakeClient();
    request.mockResolvedValueOnce({ items: [], total: 0 });

    await expect(createAdultLibraryApi(client).listDecisions()).resolves.toEqual({ items: [], total: 0 });
    expect(request).toHaveBeenCalledWith({ path: '/api/adult/decisions' }, expect.anything());
  });

  it('posts the decision under the item path', async () => {
    const { client, request } = fakeClient();
    request.mockResolvedValueOnce({ id: 42, decision: 'keep', kept: true });

    await expect(createAdultLibraryApi(client).decide(42, 'keep')).resolves.toEqual({
      id: 42,
      decision: 'keep',
      kept: true,
    });
    expect(request).toHaveBeenCalledWith(
      { path: '/api/adult/items/42/decision', method: 'POST', body: { decision: 'keep' } },
      expect.anything(),
    );
  });
});
