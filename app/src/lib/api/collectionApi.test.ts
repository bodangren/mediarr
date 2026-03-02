import { describe, expect, it, vi } from 'vitest';
import { createCollectionApi } from './collectionApi';
import { ApiHttpClient } from './httpClient';

vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
  }
  return { ApiHttpClient: MockHttpClient };
});

describe('Collection API', () => {
  const mockHttpClient = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
  };
  const collectionApi = createCollectionApi(mockHttpClient);

  const mockCollection = {
    id: 1,
    tmdbCollectionId: 131296,
    name: 'The Dark Knight Collection',
    overview: 'Batman films',
    posterUrl: '/poster.jpg',
    backdropUrl: '/backdrop.jpg',
    movieCount: 3,
    moviesInLibrary: 2,
    monitored: true,
    movies: [
      {
        id: 10,
        tmdbId: 272,
        title: 'Batman Begins',
        year: 2005,
        posterUrl: '/batman.jpg',
        overview: null,
        inLibrary: true,
        monitored: true,
        status: 'released',
        quality: 'HD',
      },
    ],
    qualityProfileId: 1,
    qualityProfile: { id: 1, name: 'HD-1080p' },
    minimumAvailability: 'released',
    rootFolderPath: '/movies',
    addMoviesAutomatically: true,
    searchOnAdd: false,
  };

  it('lists all collections', async () => {
    mockHttpClient.request.mockResolvedValue([mockCollection]);

    const result = await collectionApi.list();

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections' },
      expect.anything(),
    );
    expect(result).toEqual([mockCollection]);
  });

  it('gets a collection by id', async () => {
    mockHttpClient.request.mockResolvedValue(mockCollection);

    const result = await collectionApi.getById(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections/1' },
      expect.anything(),
    );
    expect(result).toEqual(mockCollection);
  });

  it('creates a collection from tmdbCollectionId', async () => {
    const createResponse = { id: 1, name: 'The Dark Knight Collection', moviesAdded: 3 };
    mockHttpClient.request.mockResolvedValue(createResponse);

    const input = { tmdbCollectionId: 131296, monitored: true };
    const result = await collectionApi.create(input);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections', method: 'POST', body: input },
      expect.anything(),
    );
    expect(result).toEqual(createResponse);
  });

  it('updates a collection', async () => {
    mockHttpClient.request.mockResolvedValue(mockCollection);

    const updates = { monitored: false };
    const result = await collectionApi.update(1, updates);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections/1', method: 'PUT', body: updates },
      expect.anything(),
    );
    expect(result).toEqual(mockCollection);
  });

  it('deletes a collection', async () => {
    mockHttpClient.request.mockResolvedValue({ id: 1, deleted: true });

    const result = await collectionApi.delete(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections/1', method: 'DELETE' },
      expect.anything(),
    );
    expect(result).toEqual({ id: 1, deleted: true });
  });

  it('triggers search for missing movies', async () => {
    const searchResponse = { id: 1, message: 'Searching', searched: 1, missing: 1 };
    mockHttpClient.request.mockResolvedValue(searchResponse);

    const result = await collectionApi.search(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections/1/search', method: 'POST' },
      expect.anything(),
    );
    expect(result).toEqual(searchResponse);
  });

  it('syncs collection from TMDB', async () => {
    const syncResponse = { id: 1, message: 'Synced', added: 1, updated: 0 };
    mockHttpClient.request.mockResolvedValue(syncResponse);

    const result = await collectionApi.sync(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/collections/1/sync', method: 'POST' },
      expect.anything(),
    );
    expect(result).toEqual(syncResponse);
  });
});
