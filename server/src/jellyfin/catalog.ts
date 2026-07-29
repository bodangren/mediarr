import { createHash } from 'node:crypto';
import {
  decodeJellyfinId,
  encodeJellyfinId,
  JELLYFIN_MOVIE_VIEW_ID,
  JELLYFIN_TV_VIEW_ID,
} from './ids';

type MaybePromise<T> = T | Promise<T>;
type DateLike = Date | string | number;

export interface CatalogMovieRecord {
  id: number;
  tmdbId: number;
  imdbId?: string | null | undefined;
  title: string;
  sortTitle?: string | null | undefined;
  overview?: string | null | undefined;
  year?: number | null | undefined;
  posterUrl?: string | null | undefined;
  added?: DateLike | null | undefined;
}

export interface CatalogSeriesRecord {
  id: number;
  tvdbId: number;
  tmdbId?: number | null | undefined;
  imdbId?: string | null | undefined;
  title: string;
  sortTitle?: string | null | undefined;
  overview?: string | null | undefined;
  year?: number | null | undefined;
  posterUrl?: string | null | undefined;
  added?: DateLike | null | undefined;
}

export interface CatalogSeasonRecord {
  id: number;
  seriesId: number;
  seasonNumber: number;
}

export interface CatalogEpisodeRecord {
  id: number;
  seriesId: number;
  seasonId?: number | null | undefined;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string | null | undefined;
  airDateUtc?: DateLike | null | undefined;
}

/**
 * Narrow catalog port consumed by the Jellyfin adapter. Production can back
 * these functions with Drizzle while tests use small in-memory fixtures.
 */
export interface JellyfinCatalogRepository {
  listMovies(): MaybePromise<readonly CatalogMovieRecord[]>;
  listSeries(): MaybePromise<readonly CatalogSeriesRecord[]>;
  listSeasonsBySeriesId(seriesId: number): MaybePromise<readonly CatalogSeasonRecord[]>;
  listEpisodesBySeriesId(seriesId: number): MaybePromise<readonly CatalogEpisodeRecord[]>;
  listEpisodesBySeasonId(seasonId: number): MaybePromise<readonly CatalogEpisodeRecord[]>;
  findMovieById(id: number): MaybePromise<CatalogMovieRecord | null>;
  findSeriesById(id: number): MaybePromise<CatalogSeriesRecord | null>;
  findSeasonById(id: number): MaybePromise<CatalogSeasonRecord | null>;
  findEpisodeById(id: number): MaybePromise<CatalogEpisodeRecord | null>;
}

export type JellyfinCatalogItemType = 'Movie' | 'Series' | 'Season' | 'Episode';

export interface JellyfinCatalogItem {
  Id: string;
  Name: string;
  SortName: string;
  Type: JellyfinCatalogItemType;
  IsFolder: boolean;
  ParentId: string;
  MediaType?: 'Video' | undefined;
  Overview?: string | undefined;
  ProductionYear?: number | undefined;
  DateCreated?: string | undefined;
  PremiereDate?: string | undefined;
  IndexNumber?: number | undefined;
  ParentIndexNumber?: number | undefined;
  SeriesId?: string | undefined;
  SeasonId?: string | undefined;
  ProviderIds: Record<string, string>;
  ImageTags: Record<string, string>;
  BackdropImageTags: string[];
  LocationType: 'FileSystem';
}

export interface CatalogQuery {
  parentId?: string | null | undefined;
  startIndex?: number | string | null | undefined;
  limit?: number | string | null | undefined;
  sortBy?: string | readonly string[] | null | undefined;
  sortOrder?: string | null | undefined;
  includeItemTypes?: string | readonly string[] | null | undefined;
}

/**
 * Navigation parameters accepted by Jellyfin's series-episodes surface.
 * They are intentionally separate from CatalogQuery so generic item browsing
 * retains its existing sorting behavior.
 */
export interface EpisodeQueryOptions {
  season?: number | string | null | undefined;
  startItemId?: string | null | undefined;
  adjacentTo?: string | null | undefined;
  startIndex?: number | string | null | undefined;
  limit?: number | string | null | undefined;
}

export interface JellyfinCatalogQueryResult {
  Items: JellyfinCatalogItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toIsoString(value: DateLike | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function imageTags(posterUrl: string | null | undefined): Record<string, string> {
  const normalized = optionalString(posterUrl);
  if (!normalized) {
    return {};
  }

  return {
    Primary: createHash('sha1').update(normalized).digest('hex'),
  };
}

function providerIds(
  entries: ReadonlyArray<readonly [string, string | number | null | undefined]>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of entries) {
    if (value !== null && value !== undefined && String(value).trim().length > 0) {
      result[name] = String(value);
    }
  }
  return result;
}

function baseItem(input: {
  id: string;
  name: string;
  sortName?: string | null | undefined;
  type: JellyfinCatalogItemType;
  isFolder: boolean;
  parentId: string;
  providerIds?: Record<string, string> | undefined;
  posterUrl?: string | null | undefined;
}): JellyfinCatalogItem {
  return {
    Id: input.id,
    Name: input.name,
    SortName: optionalString(input.sortName) ?? input.name,
    Type: input.type,
    IsFolder: input.isFolder,
    ParentId: input.parentId,
    ProviderIds: input.providerIds ?? {},
    ImageTags: imageTags(input.posterUrl),
    BackdropImageTags: [],
    LocationType: 'FileSystem',
  };
}

/** Maps a Mediarr movie row to the raw Jellyfin item contract. */
export function mapMovieToItem(movie: CatalogMovieRecord): JellyfinCatalogItem {
  const overview = optionalString(movie.overview);
  const dateCreated = toIsoString(movie.added);

  return {
    ...baseItem({
      id: encodeJellyfinId('movie', movie.id),
      name: movie.title,
      sortName: movie.sortTitle,
      type: 'Movie',
      isFolder: false,
      parentId: JELLYFIN_MOVIE_VIEW_ID,
      providerIds: providerIds([
        ['Tmdb', movie.tmdbId],
        ['Imdb', movie.imdbId],
      ]),
      posterUrl: movie.posterUrl,
    }),
    MediaType: 'Video',
    ...(overview ? { Overview: overview } : {}),
    ...(movie.year !== null && movie.year !== undefined
      ? { ProductionYear: movie.year }
      : {}),
    ...(dateCreated ? { DateCreated: dateCreated } : {}),
  };
}

/** Maps a Mediarr series row to the raw Jellyfin item contract. */
export function mapSeriesToItem(series: CatalogSeriesRecord): JellyfinCatalogItem {
  const overview = optionalString(series.overview);
  const dateCreated = toIsoString(series.added);

  return {
    ...baseItem({
      id: encodeJellyfinId('series', series.id),
      name: series.title,
      sortName: series.sortTitle,
      type: 'Series',
      isFolder: true,
      parentId: JELLYFIN_TV_VIEW_ID,
      providerIds: providerIds([
        ['Tvdb', series.tvdbId],
        ['Tmdb', series.tmdbId],
        ['Imdb', series.imdbId],
      ]),
      posterUrl: series.posterUrl,
    }),
    ...(overview ? { Overview: overview } : {}),
    ...(series.year !== null && series.year !== undefined
      ? { ProductionYear: series.year }
      : {}),
    ...(dateCreated ? { DateCreated: dateCreated } : {}),
  };
}

/** Maps a Mediarr season row and preserves its series parent relation. */
export function mapSeasonToItem(season: CatalogSeasonRecord): JellyfinCatalogItem {
  const seriesId = encodeJellyfinId('series', season.seriesId);
  const name = season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`;

  return {
    ...baseItem({
      id: encodeJellyfinId('season', season.id),
      name,
      type: 'Season',
      isFolder: true,
      parentId: seriesId,
    }),
    IndexNumber: season.seasonNumber,
    SeriesId: seriesId,
  };
}

/** Maps a Mediarr episode row and preserves its series and season relations. */
export function mapEpisodeToItem(episode: CatalogEpisodeRecord): JellyfinCatalogItem {
  const seriesId = encodeJellyfinId('series', episode.seriesId);
  const seasonId = episode.seasonId === null || episode.seasonId === undefined
    ? undefined
    : encodeJellyfinId('season', episode.seasonId);
  const overview = optionalString(episode.overview);
  const premiereDate = toIsoString(episode.airDateUtc);

  return {
    ...baseItem({
      id: encodeJellyfinId('episode', episode.id),
      name: episode.title,
      type: 'Episode',
      isFolder: false,
      parentId: seasonId ?? seriesId,
      providerIds: providerIds([['Tvdb', episode.tvdbId]]),
    }),
    MediaType: 'Video',
    IndexNumber: episode.episodeNumber,
    ParentIndexNumber: episode.seasonNumber,
    SeriesId: seriesId,
    ...(seasonId ? { SeasonId: seasonId } : {}),
    ...(overview ? { Overview: overview } : {}),
    ...(premiereDate ? { PremiereDate: premiereDate } : {}),
  };
}

function parseNonNegativeInteger(
  value: number | string | null | undefined,
  fallback: number,
): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function splitList(value: string | readonly string[] | null | undefined): string[] {
  if (!value) {
    return [];
  }

  const entries = typeof value === 'string' ? [value] : value;
  return entries
    .flatMap(entry => entry.split(','))
    .map(entry => entry.trim())
    .filter(Boolean);
}

function itemSortValue(item: JellyfinCatalogItem, rawField: string): string | number | null {
  switch (rawField.trim().toLowerCase()) {
    case 'name':
      return item.Name;
    case 'sortname':
      return item.SortName;
    case 'datecreated':
      return item.DateCreated ?? null;
    case 'premieredate':
      return item.PremiereDate ?? null;
    case 'productionyear':
      return item.ProductionYear ?? null;
    case 'indexnumber':
      return item.IndexNumber ?? null;
    case 'parentindexnumber':
      return item.ParentIndexNumber ?? null;
    default:
      return item.SortName;
  }
}

function compareValues(
  left: string | number | null,
  right: string | number | null,
): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftText = String(left).toLocaleLowerCase();
  const rightText = String(right).toLocaleLowerCase();
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function applyQuery(
  items: readonly JellyfinCatalogItem[],
  query: CatalogQuery,
): JellyfinCatalogQueryResult {
  const includedTypes = new Set(
    splitList(query.includeItemTypes).map(type => type.toLocaleLowerCase()),
  );
  const filtered = includedTypes.size === 0
    ? [...items]
    : items.filter(item => includedTypes.has(item.Type.toLocaleLowerCase()));
  const sortFields = splitList(query.sortBy);
  if (sortFields.length === 0) {
    sortFields.push('SortName');
  }
  const descending = query.sortOrder?.trim().toLowerCase() === 'descending';

  filtered.sort((left, right) => {
    for (const field of sortFields) {
      const compared = compareValues(
        itemSortValue(left, field),
        itemSortValue(right, field),
      );
      if (compared !== 0) {
        return descending ? -compared : compared;
      }
    }
    return left.Id.localeCompare(right.Id);
  });

  const startIndex = parseNonNegativeInteger(query.startIndex, 0);
  const parsedLimit = parseNonNegativeInteger(query.limit, filtered.length);
  const limit = parsedLimit === 0 ? filtered.length : parsedLimit;

  return {
    Items: filtered.slice(startIndex, startIndex + limit),
    TotalRecordCount: filtered.length,
    StartIndex: startIndex,
  };
}

function emptyResult(query: CatalogQuery = {}): JellyfinCatalogQueryResult {
  return {
    Items: [],
    TotalRecordCount: 0,
    StartIndex: parseNonNegativeInteger(query.startIndex, 0),
  };
}

/**
 * Queries items using Jellyfin ParentId semantics:
 * library view -> media, series -> seasons, season -> episodes.
 */
export async function queryCatalog(
  repository: JellyfinCatalogRepository,
  query: CatalogQuery = {},
): Promise<JellyfinCatalogQueryResult> {
  if (!query.parentId) {
    const [movies, series] = await Promise.all([
      repository.listMovies(),
      repository.listSeries(),
    ]);
    return applyQuery(
      [...movies.map(mapMovieToItem), ...series.map(mapSeriesToItem)],
      query,
    );
  }

  if (query.parentId === JELLYFIN_MOVIE_VIEW_ID) {
    const movies = await repository.listMovies();
    return applyQuery(movies.map(mapMovieToItem), query);
  }
  if (query.parentId === JELLYFIN_TV_VIEW_ID) {
    const series = await repository.listSeries();
    return applyQuery(series.map(mapSeriesToItem), query);
  }

  const parent = decodeJellyfinId(query.parentId);
  if (parent?.kind === 'series') {
    const seasons = await repository.listSeasonsBySeriesId(parent.id);
    return applyQuery(seasons.map(mapSeasonToItem), query);
  }
  if (parent?.kind === 'season') {
    const episodes = await repository.listEpisodesBySeasonId(parent.id);
    return applyQuery(episodes.map(mapEpisodeToItem), query);
  }

  return emptyResult(query);
}

/** Queries seasons for a stable Jellyfin series id. */
export async function querySeasons(
  repository: JellyfinCatalogRepository,
  seriesId: string,
  query: CatalogQuery = {},
): Promise<JellyfinCatalogQueryResult> {
  const decoded = decodeJellyfinId(seriesId);
  if (decoded?.kind !== 'series') {
    return emptyResult(query);
  }
  const seasons = await repository.listSeasonsBySeriesId(decoded.id);
  return applyQuery(seasons.map(mapSeasonToItem), query);
}

/** Queries episodes below either a stable series id or a stable season id. */
export async function queryEpisodes(
  repository: JellyfinCatalogRepository,
  parentId: string,
  query: CatalogQuery = {},
): Promise<JellyfinCatalogQueryResult> {
  const decoded = decodeJellyfinId(parentId);
  if (decoded?.kind === 'series') {
    const episodes = await repository.listEpisodesBySeriesId(decoded.id);
    return applyQuery(episodes.map(mapEpisodeToItem), query);
  }
  if (decoded?.kind === 'season') {
    const episodes = await repository.listEpisodesBySeasonId(decoded.id);
    return applyQuery(episodes.map(mapEpisodeToItem), query);
  }
  return emptyResult(query);
}

function parseOptionalInteger(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function compareEpisodeNavigationOrder(
  left: CatalogEpisodeRecord,
  right: CatalogEpisodeRecord,
): number {
  return left.seasonNumber - right.seasonNumber
    || left.episodeNumber - right.episodeNumber
    || left.id - right.id;
}

/**
 * Queries a series' episodes with Jellyfin's episode-navigation semantics.
 * Filtering and navigation are evaluated before paging, so TotalRecordCount
 * remains useful to clients requesting an adjacent episode window.
 */
export async function queryEpisodesWithNavigation(
  repository: JellyfinCatalogRepository,
  seriesId: string,
  options: EpisodeQueryOptions = {},
): Promise<JellyfinCatalogQueryResult> {
  const decoded = decodeJellyfinId(seriesId);
  if (decoded?.kind !== 'series') {
    return emptyResult({ startIndex: options.startIndex });
  }

  const season = parseOptionalInteger(options.season);
  let episodes = [...await repository.listEpisodesBySeriesId(decoded.id)]
    .sort(compareEpisodeNavigationOrder);
  if (season !== undefined) {
    episodes = episodes.filter(episode => episode.seasonNumber === season);
  }

  const startItem = options.startItemId ? decodeJellyfinId(options.startItemId) : null;
  if (startItem?.kind === 'episode') {
    const startAt = episodes.findIndex(episode => episode.id === startItem.id);
    if (startAt >= 0) {
      episodes = episodes.slice(startAt);
    }
  }

  const adjacentItem = options.adjacentTo ? decodeJellyfinId(options.adjacentTo) : null;
  if (adjacentItem?.kind === 'episode') {
    const adjacentAt = episodes.findIndex(episode => episode.id === adjacentItem.id);
    if (adjacentAt >= 0) {
      episodes = episodes.slice(Math.max(0, adjacentAt - 1), adjacentAt + 2);
    }
  }

  const total = episodes.length;
  const startIndex = parseNonNegativeInteger(options.startIndex, 0);
  const parsedLimit = parseNonNegativeInteger(options.limit, total);
  const limit = parsedLimit === 0 ? total : parsedLimit;
  return {
    Items: episodes.slice(startIndex, startIndex + limit).map(mapEpisodeToItem),
    TotalRecordCount: total,
    StartIndex: startIndex,
  };
}

/** Resolves a single Jellyfin item id without probing unrelated tables. */
export async function getCatalogItem(
  repository: JellyfinCatalogRepository,
  itemId: string,
): Promise<JellyfinCatalogItem | null> {
  const decoded = decodeJellyfinId(itemId);
  if (!decoded) {
    return null;
  }

  switch (decoded.kind) {
    case 'movie': {
      const movie = await repository.findMovieById(decoded.id);
      return movie ? mapMovieToItem(movie) : null;
    }
    case 'series': {
      const series = await repository.findSeriesById(decoded.id);
      return series ? mapSeriesToItem(series) : null;
    }
    case 'season': {
      const season = await repository.findSeasonById(decoded.id);
      return season ? mapSeasonToItem(season) : null;
    }
    case 'episode': {
      const episode = await repository.findEpisodeById(decoded.id);
      return episode ? mapEpisodeToItem(episode) : null;
    }
    case 'movie-view':
    case 'tv-view':
      return null;
  }
}
