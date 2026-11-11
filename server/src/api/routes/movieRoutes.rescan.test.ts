import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

const mockStat = vi.hoisted(() => vi.fn());
const mockScan = vi.hoisted(() => vi.fn());
const mockUpsertVariant = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    default: { ...actual, stat: mockStat },
    stat: mockStat,
  };
});

vi.mock('../../services/ExistingLibraryScanner', () => ({
  ExistingLibraryScanner: class {
    scan = mockScan;
  },
}));

vi.mock('../../repositories/SubtitleVariantRepository', () => ({
  SubtitleVariantRepository: class {
    upsertVariant = mockUpsertVariant;
  },
}));

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('POST /api/movies/:id/rescan', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    mockStat.mockReset();
    mockScan.mockReset();
    mockUpsertVariant.mockReset();
    prismaMovie = { findUnique: vi.fn() };
    app = buildApp({ prisma: { movie: prismaMovie } as any });
  });

  it('links each video file in the movie folder as a MOVIE variant', async () => {
    prismaMovie.findUnique.mockResolvedValue({ id: 1, path: '/data/Movies/Heat (1995)' });
    mockStat.mockImplementation(async (target: string) => {
      if (target === '/data/Movies/Heat (1995)') {
        return { isFile: () => false, isDirectory: () => true };
      }
      return { isFile: () => true, size: 4096 };
    });
    mockScan.mockResolvedValue({
      folders: [{ path: '/data/Movies/Heat (1995)', files: [{ path: '/data/Movies/Heat (1995)/Heat.1995.mkv' }] }],
    });
    mockUpsertVariant.mockResolvedValue({ id: 9 });

    const response = await app.inject({ method: 'POST', url: '/api/movies/1/rescan' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ rescanned: true, id: 1, filesLinked: 1 });
    expect(mockUpsertVariant).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      movieId: 1,
      path: '/data/Movies/Heat (1995)/Heat.1995.mkv',
      fileSize: 4096,
    });
  });

  it('reports zero linked files when the folder cannot be read', async () => {
    prismaMovie.findUnique.mockResolvedValue({ id: 2, path: '/data/Movies/Gone' });
    mockStat.mockRejectedValue(new Error('ENOENT'));

    const response = await app.inject({ method: 'POST', url: '/api/movies/2/rescan' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ rescanned: true, filesLinked: 0 });
    expect(mockUpsertVariant).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown movie', async () => {
    prismaMovie.findUnique.mockResolvedValue(null);

    const response = await app.inject({ method: 'POST', url: '/api/movies/99/rescan' });

    expect(response.statusCode).toBe(404);
  });
});
