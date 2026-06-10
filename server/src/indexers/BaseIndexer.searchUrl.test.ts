import { beforeEach, describe, expect, it } from 'vitest';
import { TorznabIndexer, type IndexerConfig } from './BaseIndexer';

function makeIndexer(): TorznabIndexer {
  const config: IndexerConfig = {
    id: 7,
    name: 'Test Indexer',
    implementation: 'torznab',
    protocol: 'torrent',
    enabled: true,
    priority: 25,
    supportsRss: false,
    supportsSearch: true,
    settings: {
      url: 'https://indexer.example.com/',
      apiKey: 'secret-key',
    },
    httpClient: {} as any,
  };
  return new TorznabIndexer(config);
}

function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('TorznabIndexer.buildSearchUrl (FR-4.1)', () => {
  let indexer: TorznabIndexer;

  beforeEach(() => {
    indexer = makeIndexer();
  });

  it('uses t=movie and propagates tmdbid for movie queries', () => {
    const url = indexer.buildSearchUrl({ mediaType: 'movie', tmdbid: 123 });
    const params = paramsOf(url);
    expect(params.get('t')).toBe('movie');
    expect(params.get('tmdbid')).toBe('123');
    expect(params.get('apikey')).toBe('secret-key');
  });

  it('uses t=tvsearch and propagates tvdbid for TV queries', () => {
    const url = indexer.buildSearchUrl({ mediaType: 'tv', tvdbid: 456 });
    const params = paramsOf(url);
    expect(params.get('t')).toBe('tvsearch');
    expect(params.get('tvdbid')).toBe('456');
  });

  it('uses t=tvsearch and propagates imdbid when only imdbid is set for TV', () => {
    const url = indexer.buildSearchUrl({ mediaType: 'tv', imdbid: 'tt0903747' });
    const params = paramsOf(url);
    expect(params.get('t')).toBe('tvsearch');
    expect(params.get('imdbid')).toBe('0903747');
  });

  it('uses t=search and preserves q for generic queries with no mediaType', () => {
    const url = indexer.buildSearchUrl({ q: 'breaking bad s01e01' });
    const params = paramsOf(url);
    expect(params.get('t')).toBe('search');
    expect(params.get('q')).toBe('breaking bad s01e01');
  });

  it('falls back to t=search when neither mediaType nor id fields are present', () => {
    const url = indexer.buildSearchUrl({});
    expect(paramsOf(url).get('t')).toBe('search');
  });

  it('infers movie type from tmdbid when mediaType is omitted', () => {
    const url = indexer.buildSearchUrl({ tmdbid: 999 });
    expect(paramsOf(url).get('t')).toBe('movie');
    expect(paramsOf(url).get('tmdbid')).toBe('999');
  });

  it('infers tvsearch type from tvdbid when mediaType is omitted', () => {
    const url = indexer.buildSearchUrl({ tvdbid: 42 });
    expect(paramsOf(url).get('t')).toBe('tvsearch');
    expect(paramsOf(url).get('tvdbid')).toBe('42');
  });

  it('omits the q parameter when type-specific t=movie/tvsearch is used', () => {
    const url = indexer.buildSearchUrl({ mediaType: 'movie', tmdbid: 1, q: 'ignored' });
    const params = paramsOf(url);
    expect(params.get('t')).toBe('movie');
    expect(params.get('q')).toBeNull();
  });

  it('propagates season and ep for TV queries', () => {
    const url = indexer.buildSearchUrl({ mediaType: 'tv', tvdbid: 1, season: 2, ep: 5 });
    const params = paramsOf(url);
    expect(params.get('season')).toBe('2');
    expect(params.get('ep')).toBe('5');
  });
});
