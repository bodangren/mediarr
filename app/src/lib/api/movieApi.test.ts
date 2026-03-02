import { describe, expect, it, vi } from 'vitest';
import { createMovieApi } from './movieApi';
import { ApiHttpClient } from './httpClient';

vi.mock('./httpClient', () => {
  class MockHttpClient {
    public request = vi.fn();
    public requestPaginated = vi.fn();
  }
  return { ApiHttpClient: MockHttpClient };
});

describe('Movie API', () => {
  const mockHttpClient = new ApiHttpClient() as ApiHttpClient & {
    request: ReturnType<typeof vi.fn>;
    requestPaginated: ReturnType<typeof vi.fn>;
  };
  const movieApi = createMovieApi(mockHttpClient);

  const mockMovie = {
    id: 1,
    title: 'Inception',
    year: 2010,
    monitored: true,
    qualityProfileId: 1,
    added: '2024-01-01T00:00:00Z',
    tmdbId: 27205,
    imdbId: 'tt1375666',
    path: '/movies/Inception (2010)',
    sizeOnDisk: 4294967296,
    hasFile: true,
    status: 'released',
    overview: 'A thief who steals corporate secrets...',
    posterUrl: '/poster.jpg',
    runtime: 148,
    certification: 'PG-13',
    genres: ['Action', 'Sci-Fi'],
    studio: 'Warner Bros.',
    collection: {
      id: 42,
      name: 'Christopher Nolan Collection',
      posterUrl: null,
    },
  };

  it('gets a movie by id including collection with name field', async () => {
    mockHttpClient.request.mockResolvedValue(mockMovie);

    const result = await movieApi.getById(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/movies/1' },
      expect.anything(),
    );
    expect(result.collection).toEqual({
      id: 42,
      name: 'Christopher Nolan Collection',
      posterUrl: null,
    });
  });

  it('gets a movie by id without collection', async () => {
    const movieWithoutCollection = { ...mockMovie, collection: null };
    mockHttpClient.request.mockResolvedValue(movieWithoutCollection);

    const result = await movieApi.getById(1);

    expect(result.collection).toBeNull();
  });

  it('updates a movie', async () => {
    mockHttpClient.request.mockResolvedValue(mockMovie);

    const updates = { monitored: false };
    const result = await movieApi.update(1, updates);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/movies/1', method: 'PUT', body: updates },
      expect.anything(),
    );
    expect(result).toEqual(mockMovie);
  });

  it('removes a movie', async () => {
    mockHttpClient.request.mockResolvedValue({ id: 1 });

    const result = await movieApi.remove(1);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/movies/1', method: 'DELETE' },
      expect.anything(),
    );
    expect(result).toEqual({ id: 1 });
  });

  it('deletes a movie file', async () => {
    mockHttpClient.request.mockResolvedValue({ deleted: true });

    const result = await movieApi.deleteFile(1, 99);

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      { path: '/api/movies/1/files/99', method: 'DELETE' },
      expect.anything(),
    );
    expect(result).toEqual({ deleted: true });
  });
});
