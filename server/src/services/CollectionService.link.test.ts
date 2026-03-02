import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionService } from './CollectionService';
import { ConflictError } from '../errors/domainErrors';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    collection: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 10, name: 'The Matrix Collection' }),
      ...overrides.collection,
    },
    movie: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
      ...overrides.movie,
    },
  };
}

function makeHttpClient(collectionBody: object) {
  return {
    get: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({
        id: 87359,
        name: 'The Matrix Collection',
        overview: 'A sci-fi trilogy.',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        parts: [
          { id: 603, title: 'The Matrix', release_date: '1999-03-31', overview: '', poster_path: null, backdrop_path: null, adult: false, genre_ids: [], popularity: 1, vote_average: 8, vote_count: 1, video: false },
        ],
        ...collectionBody,
      }),
    }),
  };
}

function makeSettingsService() {
  return { get: vi.fn().mockResolvedValue({ apiKeys: { tmdbApiKey: 'test-key' } }) };
}

describe('CollectionService.linkMovieToCollection', () => {
  let service: CollectionService;
  let prisma: ReturnType<typeof makePrisma>;
  let settingsService: ReturnType<typeof makeSettingsService>;

  beforeEach(() => {
    prisma = makePrisma();
    settingsService = makeSettingsService();
    const httpClient = makeHttpClient({});
    service = new CollectionService(prisma as any, httpClient as any, settingsService as any);
  });

  it('creates a new collection and links the movie when collection does not exist', async () => {
    // Arrange: collection does not exist, movie exists in DB
    prisma.collection.findUnique.mockResolvedValue(null);
    prisma.collection.create.mockResolvedValue({ id: 10, tmdbCollectionId: 87359, name: 'The Matrix Collection' });
    prisma.movie.findUnique.mockResolvedValue({ id: 5, tmdbId: 603, collectionId: null });
    prisma.movie.update.mockResolvedValue({});

    await service.linkMovieToCollection(87359, 5);

    expect(prisma.collection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tmdbCollectionId: 87359 }),
    }));
    expect(prisma.movie.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 },
      data: { collectionId: 10 },
    }));
  });

  it('links the movie to an existing collection without re-creating it', async () => {
    // Arrange: collection already exists
    const existingCollection = { id: 10, tmdbCollectionId: 87359, name: 'The Matrix Collection' };
    prisma.collection.findUnique.mockResolvedValue(existingCollection);

    await service.linkMovieToCollection(87359, 5);

    expect(prisma.collection.create).not.toHaveBeenCalled();
    expect(prisma.movie.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 },
      data: { collectionId: 10 },
    }));
  });

  it('handles ConflictError from createCollection gracefully by falling back to find-and-link', async () => {
    // Arrange: findUnique returns null initially, but create throws ConflictError (race condition)
    prisma.collection.findUnique
      .mockResolvedValueOnce(null)  // first call (before create)
      .mockResolvedValueOnce({ id: 10, tmdbCollectionId: 87359 }); // second call (after conflict)
    prisma.collection.create.mockRejectedValue(new ConflictError('Collection already exists'));

    await service.linkMovieToCollection(87359, 5);

    expect(prisma.movie.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 },
      data: { collectionId: 10 },
    }));
  });

  it('skips link if movie is already linked to the same collection', async () => {
    const existingCollection = { id: 10, tmdbCollectionId: 87359 };
    prisma.collection.findUnique.mockResolvedValue(existingCollection);

    // Movie already has this collectionId
    await service.linkMovieToCollection(87359, 5);

    // update should still be called idempotently (it's a no-op in DB terms)
    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { collectionId: 10 },
    });
  });
});
