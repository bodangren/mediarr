import { describe, expect, it, vi } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';

describe('Unified Search API', () => {
  it('should search for both TV and movies via GET /api/search', async () => {
    const mockResults = [
      { mediaType: 'TV', title: 'The Boys', tvdbId: 355567 },
      { mediaType: 'MOVIE', title: "Boys Don't Cry", tmdbId: 242 },
    ];

    const deps = {
      metadataProvider: {
        searchMedia: vi.fn().mockResolvedValue(mockResults),
      },
      prisma: {},
    } as any;

    const server = await createApiServer(deps);

    const response = await server.inject({
      method: 'GET',
      url: '/api/search',
      query: { term: 'Boys' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(deps.metadataProvider.searchMedia).toHaveBeenCalledWith({
      term: 'Boys',
      mediaType: undefined,
    });
  });

  it('should filter by mediaType if provided', async () => {
    const mockResults = [
      { mediaType: 'MOVIE', title: 'Forrest Gump', tmdbId: 13 },
    ];

    const deps = {
      metadataProvider: {
        searchMedia: vi.fn().mockResolvedValue(mockResults),
      },
      prisma: {},
    } as any;

    const server = await createApiServer(deps);

    const response = await server.inject({
      method: 'GET',
      url: '/api/search',
      query: { term: 'Forrest', mediaType: 'movie' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(deps.metadataProvider.searchMedia).toHaveBeenCalledWith({
      term: 'Forrest',
      mediaType: 'MOVIE',
    });
  });

  it('should return error if term is missing or empty', async () => {
    const server = await createApiServer({ prisma: {} } as any);

    const response1 = await server.inject({
      method: 'GET',
      url: '/api/search',
    });
    expect(response1.statusCode).toBe(422);

    const response2 = await server.inject({
      method: 'GET',
      url: '/api/search',
      query: { term: '' },
    });
    expect(response2.statusCode).toBe(422);
  });
});
