import { describe, expect, it } from 'vitest';
import { parseYoutubeLibraryQuery } from './youtubeQuery';

describe('parseYoutubeLibraryQuery', () => {
  it('defaults to added order, all watched states, first 200', () => {
    expect(parseYoutubeLibraryQuery({})).toEqual({
      term: '', sort: 'added', watched: 'all', channel: null, offset: 0, limit: 200,
    });
  });

  it('keeps known values and clamps pagination', () => {
    expect(parseYoutubeLibraryQuery({
      q: '  react  ', sort: 'title', watched: 'unwatched', channel: 'CodeStoic',
      offset: '-4', limit: '9999',
    })).toEqual({
      term: 'react', sort: 'title', watched: 'unwatched', channel: 'CodeStoic', offset: 0, limit: 500,
    });
  });

  it('falls back on unknown sorts and filters', () => {
    expect(parseYoutubeLibraryQuery({ sort: 'nope', watched: 'maybe' })).toMatchObject({
      sort: 'added', watched: 'all',
    });
  });
});
