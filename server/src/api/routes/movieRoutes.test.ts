import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

const mockStat = vi.hoisted(() => vi.fn());
const mockMkdir = vi.hoisted(() => vi.fn());
const mockRename = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    default: {
      ...actual,
      stat: mockStat,
      mkdir: mockMkdir,
      rename: mockRename,
    },
    stat: mockStat,
    mkdir: mockMkdir,
    rename: mockRename,
  };
});

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('GET /api/movies — hasFile derivation', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    prismaMovie = {
      findMany: vi.fn(),
    };

    const deps: ApiDependencies = {
      prisma: { movie: prismaMovie } as any,
    };

    app = buildApp(deps);
  });

  it('serializes hasFile=true when fileVariants are present even without a path', async () => {
    prismaMovie.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Alien',
        year: 2024,
        monitored: true,
        qualityProfile: null,
        path: null,
        fileVariants: [
          { id: 99, mediaType: 'MOVIE', fileSize: 4096, subtitleTracks: [], missingSubtitles: [] },
        ],
      },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/movies' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0]).toMatchObject({ id: 1, hasFile: true });
  });

  it('serializes hasFile=false when there are no variants and no playable path', async () => {
    prismaMovie.findMany.mockResolvedValue([
      {
        id: 2,
        title: 'Missing',
        year: 2023,
        monitored: true,
        qualityProfile: null,
        path: null,
        fileVariants: [],
      },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/movies' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0]).toMatchObject({ id: 2, hasFile: false });
  });

    it('serializes hasFile=false when path is set but points nowhere on disk', async () => {
    prismaMovie.findMany.mockResolvedValue([
      {
        id: 3,
        title: 'Vanished',
        year: 2022,
        monitored: true,
        qualityProfile: null,
        path: '/definitely/does/not/exist/movie.mkv',
        fileVariants: [],
      },
    ]);

    mockStat.mockRejectedValueOnce(new Error('ENOENT'));

    const response = await app.inject({ method: 'GET', url: '/api/movies' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0]).toMatchObject({ id: 3, hasFile: false });
  });

  it('serializes hasFile=true when path points to a real file with no variants yet', async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const tempDir = await fs.mkdtemp(`${os.tmpdir()}/hasfile-list-`);
    try {
      const filePath = `${tempDir}/alien.mkv`;
      await fs.writeFile(filePath, 'x');

      prismaMovie.findMany.mockResolvedValue([
        {
          id: 4,
          title: 'Alien',
          year: 2024,
          monitored: true,
          qualityProfile: null,
          path: filePath,
          fileVariants: [],
        },
      ]);

      mockStat.mockResolvedValueOnce({ isFile: () => true, isDirectory: () => false });

      const response = await app.inject({ method: 'GET', url: '/api/movies' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data[0]).toMatchObject({ id: 4, hasFile: true });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('GET /api/movies/:id — hasFile derivation', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    prismaMovie = {
      findUnique: vi.fn(),
    };

    const deps: ApiDependencies = {
      prisma: { movie: prismaMovie } as any,
    };

    app = buildApp(deps);
  });

  it('includes hasFile=true when fileVariants exist (variants are the canonical signal)', async () => {
    prismaMovie.findUnique.mockResolvedValue({
      id: 5,
      title: 'Matrix',
      year: 1999,
      tmdbId: 603,
      qualityProfile: null,
      collection: null,
      path: '/moved/location/matrix.mkv',
      fileVariants: [
        {
          id: 1,
          mediaType: 'MOVIE',
          movieId: 5,
          fileSize: 4096,
          audioTracks: [],
          subtitleTracks: [],
          missingSubtitles: [],
        },
      ],
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/5' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({ id: 5, hasFile: true });
    expect(body.data.fileVariants).toBeUndefined();
  });

  it('includes hasFile=false when there are no variants and no playable path', async () => {
    prismaMovie.findUnique.mockResolvedValue({
      id: 6,
      title: 'Missing',
      year: 2020,
      tmdbId: 999,
      qualityProfile: null,
      collection: null,
      path: null,
      fileVariants: [],
    });

    const response = await app.inject({ method: 'GET', url: '/api/movies/6' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({ id: 6, hasFile: false });
  });
});

describe('POST /api/movies/import/apply — variant persistence', () => {
  let app: FastifyInstance;
  let prisma: any;

  beforeEach(() => {
    vi.resetAllMocks();
    prisma = {
      movie: {
        findUnique: vi.fn(),
      },
      mediaFileVariant: {
        create: vi.fn(),
      },
    };
    app = buildApp({ prisma } as ApiDependencies);
  });

  it('persists a MediaFileVariant row but does not write a nonexistent hasFile column', async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 1024 * 1024 });
    prisma.movie.findUnique.mockResolvedValue({
      id: 10,
      title: 'Inception',
      year: 2010,
      path: '/media/movies',
    });
    prisma.mediaFileVariant.create.mockResolvedValue({ id: 1 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/movies/import/apply',
      payload: {
        files: [{
          path: '/tmp/inception.mkv',
          movieId: 10,
        }],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toEqual({ imported: 1, failed: 0, errors: [] });
    expect(prisma.mediaFileVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaType: 'MOVIE',
          movieId: 10,
          path: '/media/movies/Inception (2010)/Inception (2010).mkv',
        }),
      }),
    );
    // The Movie table has no hasFile column — the import handler must NOT try to
    // write `data: { hasFile: true }` because that would fail at the SQLite layer.
    const updateCalls = (prisma.movie.update as ReturnType<typeof vi.fn> | undefined)?.mock?.calls;
    if (updateCalls) {
      expect(updateCalls).toEqual([]);
    }
  });
});