import { describe, expect, it } from 'vitest';
import { metadataToAddMediaInput } from './mediaApi';
import type { MetadataSearchResult } from './mediaApi';

describe('metadataToAddMediaInput', () => {
  it('carries the provider collection id and the poster so the server can link the collection', () => {
    const item: MetadataSearchResult = {
      mediaType: 'MOVIE',
      title: 'John Wick',
      tmdbId: 245891,
      year: 2014,
      tmdbCollectionId: 404609,
      images: [{ coverType: 'poster', url: 'https://image.tmdb.org/p.jpg' }],
    };
    expect(metadataToAddMediaInput(item)).toMatchObject({
      mediaType: 'MOVIE',
      tmdbId: 245891,
      title: 'John Wick',
      year: 2014,
      tmdbCollectionId: 404609,
      posterUrl: 'https://image.tmdb.org/p.jpg',
    });
  });

  it('leaves the collection id undefined when the provider has none', () => {
    const item: MetadataSearchResult = { mediaType: 'TV', title: 'Show', tvdbId: 81189 };
    const input = metadataToAddMediaInput(item);
    expect(input.tmdbCollectionId).toBeUndefined();
    expect(input.posterUrl).toBeUndefined();
  });
});
