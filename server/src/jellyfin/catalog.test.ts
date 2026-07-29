import { describe, expect, it, vi } from 'vitest';
import {
  getCatalogItem,
  mapEpisodeToItem,
  mapMovieToItem,
  mapSeasonToItem,
  mapSeriesToItem,
  queryCatalog,
  queryEpisodes,
  queryEpisodesWithNavigation,
  queryLatestCatalog,
  querySeasons,
  type JellyfinCatalogRepository,
} from './catalog';
import {
  encodeJellyfinId,
  JELLYFIN_MOVIE_VIEW_ID,
  JELLYFIN_TV_VIEW_ID,
} from './ids';

function createRepository(
  overrides: Partial<JellyfinCatalogRepository> = {},
): JellyfinCatalogRepository {
  return {
    listMovies: vi.fn().mockResolvedValue([]),
    listSeries: vi.fn().mockResolvedValue([]),
    listSeasonsBySeriesId: vi.fn().mockResolvedValue([]),
    listEpisodesBySeriesId: vi.fn().mockResolvedValue([]),
    listEpisodesBySeasonId: vi.fn().mockResolvedValue([]),
    findMovieById: vi.fn().mockResolvedValue(null),
    findSeriesById: vi.fn().mockResolvedValue(null),
    findSeasonById: vi.fn().mockResolvedValue(null),
    findEpisodeById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('Jellyfin catalog DTO mapping', () => {
  it('maps every media kind to stable ids and stable parent relationships', () => {
    const movie = mapMovieToItem({
      id: 12,
      tmdbId: 1200,
      imdbId: 'tt001200',
      title: 'A Movie',
      sortTitle: 'Movie, A',
      overview: 'Movie overview',
      year: 2024,
      posterUrl: 'https://image.example/movie.jpg',
      added: new Date('2026-07-01T12:00:00.000Z'),
    });
    const series = mapSeriesToItem({
      id: 21,
      tvdbId: 2100,
      tmdbId: 2200,
      imdbId: null,
      title: 'A Series',
      sortTitle: 'Series, A',
      overview: null,
      year: 2023,
      posterUrl: 'https://image.example/series.jpg',
    });
    const season = mapSeasonToItem({
      id: 31,
      seriesId: 21,
      seasonNumber: 2,
    });
    const episode = mapEpisodeToItem({
      id: 41,
      seriesId: 21,
      seasonId: 31,
      tvdbId: 4100,
      seasonNumber: 2,
      episodeNumber: 4,
      title: 'The Episode',
      overview: 'Episode overview',
      airDateUtc: new Date('2023-03-04T00:00:00.000Z'),
    });

    expect(movie).toMatchObject({
      Id: encodeJellyfinId('movie', 12),
      ParentId: JELLYFIN_MOVIE_VIEW_ID,
      Name: 'A Movie',
      SortName: 'Movie, A',
      Type: 'Movie',
      MediaType: 'Video',
      IsFolder: false,
      ProductionYear: 2024,
      ProviderIds: { Tmdb: '1200', Imdb: 'tt001200' },
      DateCreated: '2026-07-01T12:00:00.000Z',
    });
    expect(movie.ImageTags.Primary).toMatch(/^[0-9a-f]{40}$/);
    expect(movie.BackdropImageTags).toEqual([movie.ImageTags.Primary]);
    expect(series).toMatchObject({
      Id: encodeJellyfinId('series', 21),
      ParentId: JELLYFIN_TV_VIEW_ID,
      Type: 'Series',
      IsFolder: true,
      ProviderIds: { Tvdb: '2100', Tmdb: '2200' },
    });
    expect(season).toMatchObject({
      Id: encodeJellyfinId('season', 31),
      ParentId: encodeJellyfinId('series', 21),
      SeriesId: encodeJellyfinId('series', 21),
      Name: 'Season 2',
      IndexNumber: 2,
      Type: 'Season',
      IsFolder: true,
    });
    expect(episode).toMatchObject({
      Id: encodeJellyfinId('episode', 41),
      ParentId: encodeJellyfinId('season', 31),
      SeriesId: encodeJellyfinId('series', 21),
      SeasonId: encodeJellyfinId('season', 31),
      IndexNumber: 4,
      ParentIndexNumber: 2,
      Type: 'Episode',
      MediaType: 'Video',
      IsFolder: false,
      PremiereDate: '2023-03-04T00:00:00.000Z',
    });
  });

  it('maps specials and nullable metadata without fabricating values', () => {
    const season = mapSeasonToItem({ id: 1, seriesId: 2, seasonNumber: 0 });
    const episode = mapEpisodeToItem({
      id: 2,
      seriesId: 2,
      seasonId: null,
      tvdbId: 20,
      seasonNumber: 0,
      episodeNumber: 1,
      title: 'Special',
    });

    expect(season.Name).toBe('Specials');
    expect(episode.ParentId).toBe(encodeJellyfinId('series', 2));
    expect(episode).not.toHaveProperty('SeasonId');
    expect(episode).not.toHaveProperty('Overview');
    expect(episode.ImageTags).toEqual({});
  });
});

describe('queryCatalog', () => {
  it('filters by the movie view before sorting and paging', async () => {
    const repository = createRepository({
      listMovies: vi.fn().mockResolvedValue([
        { id: 1, tmdbId: 1, title: 'alpha', sortTitle: 'alpha', year: 2020 },
        { id: 2, tmdbId: 2, title: 'Zulu', sortTitle: 'Zulu', year: 2022 },
        { id: 3, tmdbId: 3, title: 'Beta', sortTitle: 'Beta', year: 2021 },
      ]),
    });

    const result = await queryCatalog(repository, {
      parentId: JELLYFIN_MOVIE_VIEW_ID,
      sortBy: 'SortName',
      sortOrder: 'Descending',
      startIndex: 1,
      limit: 1,
    });

    expect(result).toMatchObject({
      TotalRecordCount: 3,
      StartIndex: 1,
      Items: [{ Name: 'Beta', ParentId: JELLYFIN_MOVIE_VIEW_ID }],
    });
    expect(repository.listMovies).toHaveBeenCalledOnce();
    expect(repository.listSeries).not.toHaveBeenCalled();
  });

  it('uses the TV view and item-type filter without loading movies', async () => {
    const repository = createRepository({
      listSeries: vi.fn().mockResolvedValue([
        { id: 2, tvdbId: 20, title: 'Series B', sortTitle: 'Series B', year: 2022 },
        { id: 1, tvdbId: 10, title: 'Series A', sortTitle: 'Series A', year: 2023 },
      ]),
    });

    const result = await queryCatalog(repository, {
      parentId: JELLYFIN_TV_VIEW_ID,
      includeItemTypes: 'Series',
      sortBy: 'ProductionYear',
      sortOrder: 'Descending',
    });

    expect(result.Items.map(item => item.Name)).toEqual(['Series A', 'Series B']);
    expect(result.TotalRecordCount).toBe(2);
    expect(repository.listMovies).not.toHaveBeenCalled();
  });
  it('recursively traverses TV descendants before applying type, exclusion, and search filters', async () => {
    const repository = createRepository({
      listSeries: vi.fn().mockResolvedValue([
        { id: 7, tvdbId: 70, title: 'Series', sortTitle: 'Series', year: 2024 },
      ]),
      listSeasonsBySeriesId: vi.fn().mockResolvedValue([
        { id: 9, seriesId: 7, seasonNumber: 1 },
      ]),
      listEpisodesBySeriesId: vi.fn().mockResolvedValue([
        { id: 101, seriesId: 7, seasonId: 9, tvdbId: 101, seasonNumber: 1, episodeNumber: 1, title: 'Pilot Arrival' },
        { id: 102, seriesId: 7, seasonId: 9, tvdbId: 102, seasonNumber: 1, episodeNumber: 2, title: 'Second Act' },
      ]),
    });

    const result = await queryCatalog(repository, {
      parentId: JELLYFIN_TV_VIEW_ID,
      recursive: 'true',
      includeItemTypes: ['Season', 'Episode'],
      excludeItemTypes: 'Season',
      searchTerm: 'pilot',
    });

    expect(result).toMatchObject({
      TotalRecordCount: 1,
      Items: [{ Name: 'Pilot Arrival', Type: 'Episode' }],
    });
    expect(repository.listSeasonsBySeriesId).toHaveBeenCalledWith(7);
    expect(repository.listEpisodesBySeriesId).toHaveBeenCalledWith(7);
  });


  it('treats a series ParentId as a season query', async () => {
    const repository = createRepository({
      listSeasonsBySeriesId: vi.fn().mockResolvedValue([
        { id: 13, seriesId: 7, seasonNumber: 3 },
        { id: 11, seriesId: 7, seasonNumber: 1 },
      ]),
    });

    const result = await queryCatalog(repository, {
      parentId: encodeJellyfinId('series', 7),
      sortBy: 'IndexNumber',
    });

    expect(result.Items.map(item => item.IndexNumber)).toEqual([1, 3]);
    expect(repository.listSeasonsBySeriesId).toHaveBeenCalledWith(7);
  });

  it('treats a season ParentId as an episode query', async () => {
    const repository = createRepository({
      listEpisodesBySeasonId: vi.fn().mockResolvedValue([
        {
          id: 43,
          seriesId: 7,
          seasonId: 9,
          tvdbId: 430,
          seasonNumber: 1,
          episodeNumber: 3,
          title: 'Third',
        },
        {
          id: 41,
          seriesId: 7,
          seasonId: 9,
          tvdbId: 410,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'First',
        },
      ]),
    });

    const result = await queryCatalog(repository, {
      parentId: encodeJellyfinId('season', 9),
      sortBy: 'IndexNumber',
    });

    expect(result.Items.map(item => item.Name)).toEqual(['First', 'Third']);
    expect(repository.listEpisodesBySeasonId).toHaveBeenCalledWith(9);
  });

  it('returns no children for foreign or leaf ParentIds', async () => {
    const repository = createRepository();

    await expect(queryCatalog(repository, {
      parentId: '00000000-0000-0000-0000-000000000000',
    })).resolves.toEqual({
      Items: [],
      TotalRecordCount: 0,
      StartIndex: 0,
    });
    await expect(queryCatalog(repository, {
      parentId: encodeJellyfinId('movie', 1),
    })).resolves.toMatchObject({ Items: [], TotalRecordCount: 0 });

    expect(repository.listMovies).not.toHaveBeenCalled();
    expect(repository.listSeries).not.toHaveBeenCalled();
  });

  it('lists movie and series roots and normalizes invalid paging values', async () => {
    const repository = createRepository({
      listMovies: vi.fn().mockResolvedValue([
        { id: 1, tmdbId: 1, title: 'Movie', sortTitle: 'Movie', year: 2020 },
      ]),
      listSeries: vi.fn().mockResolvedValue([
        { id: 2, tvdbId: 2, title: 'Series', sortTitle: 'Series', year: 2020 },
      ]),
    });

    const result = await queryCatalog(repository, {
      startIndex: -10,
      limit: 'not-a-number',
      includeItemTypes: 'Movie,Series',
    });

    expect(result.StartIndex).toBe(0);
    expect(result.TotalRecordCount).toBe(2);
    expect(result.Items.map(item => item.Type)).toEqual(['Movie', 'Series']);
  });
});

describe('specialized catalog queries', () => {
  it('queries all episodes for a series or just one season', async () => {
    const bySeries = vi.fn().mockResolvedValue([{
      id: 1,
      seriesId: 8,
      seasonId: 9,
      tvdbId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot',
    }]);
    const bySeason = vi.fn().mockResolvedValue([{
      id: 2,
      seriesId: 8,
      seasonId: 9,
      tvdbId: 2,
      seasonNumber: 1,
      episodeNumber: 2,
      title: 'Second',
    }]);
    const repository = createRepository({
      listEpisodesBySeriesId: bySeries,
      listEpisodesBySeasonId: bySeason,
    });

    const seriesResult = await queryEpisodes(
      repository,
      encodeJellyfinId('series', 8),
    );
    const seasonResult = await queryEpisodes(
      repository,
      encodeJellyfinId('season', 9),
    );

    expect(seriesResult.Items[0]?.Name).toBe('Pilot');
    expect(seasonResult.Items[0]?.Name).toBe('Second');
    expect(bySeries).toHaveBeenCalledWith(8);
    expect(bySeason).toHaveBeenCalledWith(9);
    await expect(queryEpisodes(repository, encodeJellyfinId('movie', 1)))
      .resolves.toMatchObject({ Items: [], TotalRecordCount: 0 });
  });

  it('queries seasons only for a stable series id', async () => {
    const listSeasons = vi.fn().mockResolvedValue([
      { id: 2, seriesId: 5, seasonNumber: 2 },
      { id: 1, seriesId: 5, seasonNumber: 1 },
    ]);
    const repository = createRepository({ listSeasonsBySeriesId: listSeasons });

    const result = await querySeasons(
      repository,
      encodeJellyfinId('series', 5),
      { sortBy: 'IndexNumber', limit: 1 },
    );

    expect(result.Items).toHaveLength(1);
    expect(result.Items[0]?.IndexNumber).toBe(1);
    expect(result.TotalRecordCount).toBe(2);
    await expect(querySeasons(repository, encodeJellyfinId('season', 1)))
      .resolves.toMatchObject({ Items: [], TotalRecordCount: 0 });
  });

  it('navigates sorted series episodes after Season and StartItemId filtering, then pages', async () => {
    const repository = createRepository({
      listEpisodesBySeriesId: vi.fn().mockResolvedValue([
        { id: 104, seriesId: 8, seasonId: 10, tvdbId: 104, seasonNumber: 2, episodeNumber: 1, title: 'S2E1' },
        { id: 103, seriesId: 8, seasonId: 9, tvdbId: 103, seasonNumber: 1, episodeNumber: 3, title: 'S1E3' },
        { id: 101, seriesId: 8, seasonId: 9, tvdbId: 101, seasonNumber: 1, episodeNumber: 1, title: 'S1E1' },
        { id: 102, seriesId: 8, seasonId: 9, tvdbId: 102, seasonNumber: 1, episodeNumber: 2, title: 'S1E2' },
      ]),
    });

    const result = await queryEpisodesWithNavigation(
      repository,
      encodeJellyfinId('series', 8),
      {
        season: '1',
        startItemId: encodeJellyfinId('episode', 102).replace(/-/g, ''),
        adjacentTo: encodeJellyfinId('episode', 103),
        startIndex: 1,
        limit: 1,
      },
    );

    expect(result).toMatchObject({
      TotalRecordCount: 2,
      StartIndex: 1,
      Items: [{ Id: encodeJellyfinId('episode', 103), Name: 'S1E3' }],
    });
  });

  it('keeps a complete sorted episode list when navigation ids do not resolve', async () => {
    const repository = createRepository({
      listEpisodesBySeriesId: vi.fn().mockResolvedValue([
        { id: 12, seriesId: 8, seasonId: 9, tvdbId: 12, seasonNumber: 1, episodeNumber: 2, title: 'Second' },
        { id: 11, seriesId: 8, seasonId: 9, tvdbId: 11, seasonNumber: 1, episodeNumber: 1, title: 'First' },
      ]),
    });

    const result = await queryEpisodesWithNavigation(
      repository,
      encodeJellyfinId('series', 8),
      {
        startItemId: encodeJellyfinId('episode', 999),
        adjacentTo: encodeJellyfinId('movie', 1),
      },
    );

    expect(result.Items.map(item => item.Name)).toEqual(['First', 'Second']);
    expect(result.TotalRecordCount).toBe(2);
  });

  it('resolves a single stable item id through only its matching repository function', async () => {
    const findEpisode = vi.fn().mockResolvedValue({
      id: 99,
      seriesId: 8,
      seasonId: 9,
      tvdbId: 999,
      seasonNumber: 1,
      episodeNumber: 3,
      title: 'Found',
    });
    const repository = createRepository({ findEpisodeById: findEpisode });

    const result = await getCatalogItem(
      repository,
      encodeJellyfinId('episode', 99),
    );

    expect(result).toMatchObject({ Name: 'Found', Type: 'Episode' });
    expect(findEpisode).toHaveBeenCalledWith(99);
    expect(repository.findMovieById).not.toHaveBeenCalled();
    await expect(getCatalogItem(
      repository,
      '00000000-0000-0000-0000-000000000000',
    )).resolves.toBeNull();
  });
});

describe('queryLatestCatalog', () => {
  it('uses catalog records, ParentId and IncludeItemTypes before applying the latest limit', async () => {
    const repository = createRepository({
      listMovies: vi.fn().mockResolvedValue([
        { id: 1, tmdbId: 1, title: 'Old movie', sortTitle: 'Old movie', year: 2020, added: '2026-07-01T00:00:00.000Z' },
        { id: 2, tmdbId: 2, title: 'New movie', sortTitle: 'New movie', year: 2021, added: '2026-07-03T00:00:00.000Z' },
      ]),
      listSeries: vi.fn().mockResolvedValue([
        { id: 7, tvdbId: 70, title: 'Series', sortTitle: 'Series', year: 2024 },
      ]),
      listEpisodesBySeriesId: vi.fn().mockResolvedValue([
        { id: 70, seriesId: 7, seasonId: 71, tvdbId: 700, seasonNumber: 1, episodeNumber: 1, title: 'Newest episode', airDateUtc: '2026-07-04T00:00:00.000Z' },
      ]),
    });

    await expect(queryLatestCatalog(repository, {
      parentId: JELLYFIN_MOVIE_VIEW_ID,
      includeItemTypes: 'Movie',
      limit: 1,
    })).resolves.toMatchObject([{ Name: 'New movie', Type: 'Movie' }]);
    await expect(queryLatestCatalog(repository, {
      parentId: JELLYFIN_TV_VIEW_ID,
      includeItemTypes: 'Episode',
      limit: 1,
    })).resolves.toMatchObject([{ Name: 'Newest episode', Type: 'Episode' }]);
    await expect(queryLatestCatalog(repository, {
      includeItemTypes: 'Episode',
      limit: 1,
    })).resolves.toMatchObject([{ Name: 'Newest episode', Type: 'Episode' }]);
  });
});

describe('flat latest episode source', () => {
  it('uses the optional flat episode delegate when a series fixture is not populated', async () => {
    const listEpisodes = vi.fn().mockResolvedValue([
      { id: 8, seriesId: 7, seasonId: 6, tvdbId: 80, seasonNumber: 1, episodeNumber: 1, title: 'Flat latest', airDateUtc: '2026-07-29T00:00:00.000Z' },
    ]);
    const repository = createRepository({ listEpisodes });

    await expect(queryLatestCatalog(repository, { includeItemTypes: 'Episode' }))
      .resolves.toMatchObject([{ Name: 'Flat latest', Type: 'Episode' }]);
    expect(repository.listSeries).not.toHaveBeenCalled();
    expect(listEpisodes).toHaveBeenCalledOnce();
  });
});
