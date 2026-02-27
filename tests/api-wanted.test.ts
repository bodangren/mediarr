import { describe, expect, it, vi } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';

describe('Wanted API', () => {
  it('should add a movie to wanted via POST /api/wanted', async () => {
    const mockMovie = { id: 10, tmdbId: 13, title: 'Forrest Gump' };
    const deps = {
      mediaRepository: {
        findMovieByTmdbId: vi.fn().mockResolvedValue(null),
        upsertMovie: vi.fn().mockResolvedValue(mockMovie),
      },
      prisma: {},
    } as any;

    const server = await createApiServer(deps);

    const response = await server.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'MOVIE',
        tmdbId: 13,
        title: 'Forrest Gump',
        year: 1994,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.data.tmdbId).toBe(13);
    expect(deps.mediaRepository.upsertMovie).toHaveBeenCalled();
  });

  it('should add a series to wanted via POST /api/wanted', async () => {
    const mockSeries = { id: 20, tvdbId: 355567, title: 'The Boys' };
    const deps = {
      mediaRepository: {
        findSeriesByTvdbId: vi.fn().mockResolvedValue(null),
        upsertSeries: vi.fn().mockResolvedValue(mockSeries),
      },
      prisma: {},
    } as any;

    const server = await createApiServer(deps);

    const response = await server.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'TV',
        tvdbId: 355567,
        title: 'The Boys',
        year: 2019,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.data.tvdbId).toBe(355567);
    expect(deps.mediaRepository.upsertSeries).toHaveBeenCalled();
  });

  it('should return 409 Conflict if media already exists', async () => {
    const deps = {
      mediaRepository: {
        findMovieByTmdbId: vi.fn().mockResolvedValue({ id: 10 }),
      },
      prisma: {},
    } as any;

    const server = await createApiServer(deps);

    const response = await server.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'MOVIE',
        tmdbId: 13,
        title: 'Forrest Gump',
        year: 1994,
      },
    });

    expect(response.statusCode).toBe(409);
  });
});
