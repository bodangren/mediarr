import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataProvider } from '../server/src/services/MetadataProvider';
import { HttpClient } from '../server/src/indexers/HttpClient';

describe('MetadataProvider', () => {
  let provider;
  let client;

  beforeEach(() => {
    client = new HttpClient();
    provider = new MetadataProvider(client);
  });

  it('should search for series by title', async () => {
    const mockResponse = [
      {
        title: 'The Boys',
        tvdbId: 355567,
        status: 'continuing',
        overview: 'In a world where superheroes...',
        year: 2019,
        network: 'Amazon',
        slug: 'the-boys',
        images: [{ coverType: 'poster', url: 'http://example.com/poster.jpg' }]
      }
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const results = await provider.searchSeries('The Boys', mockFetch);
    
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('The Boys');
    expect(results[0].tvdbId).toBe(355567);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('skyhook.sonarr.tv/v1/tvdb/search?term=the%20boys'),
      expect.anything()
    );
  });

  it('should get series details including episodes and seasons', async () => {
    const mockResponse = {
      title: 'The Boys',
      tvdbId: 355567,
      status: 'continuing',
      seasons: [
        { seasonNumber: 1, monitored: true }
      ],
      episodes: [
        {
          tvdbId: 7181676,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'The Name of the Game',
          airDate: '2019-07-26'
        }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const { series, episodes } = await provider.getSeriesDetails(355567, mockFetch);
    
    expect(series.title).toBe('The Boys');
    expect(series.seasons).toHaveLength(1);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].title).toBe('The Name of the Game');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('skyhook.sonarr.tv/v1/tvdb/shows/355567'),
      expect.anything()
    );
  });
});
