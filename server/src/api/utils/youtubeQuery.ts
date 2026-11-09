export type YoutubeLibrarySort = 'added' | 'published' | 'title';
export type YoutubeWatchedFilter = 'all' | 'watched' | 'unwatched';

export interface YoutubeLibraryQuery {
  term: string;
  sort: YoutubeLibrarySort;
  watched: YoutubeWatchedFilter;
  channel: string | null;
  offset: number;
  limit: number;
}

/** Parses/clamps the TV YouTube library query so the route and tests share one contract. */
export function parseYoutubeLibraryQuery(query: Record<string, unknown>): YoutubeLibraryQuery {
  const term = typeof query.q === 'string' ? query.q.trim() : '';
  const channel = typeof query.channel === 'string' && query.channel.trim() ? query.channel.trim() : null;
  const rawSort = typeof query.sort === 'string' ? query.sort : 'added';
  const sort: YoutubeLibrarySort =
    rawSort === 'published' || rawSort === 'title' ? rawSort : 'added';
  const rawWatched = typeof query.watched === 'string' ? query.watched : 'all';
  const watched: YoutubeWatchedFilter =
    rawWatched === 'watched' || rawWatched === 'unwatched' ? rawWatched : 'all';
  const offset = Math.max(0, Number.parseInt(String(query.offset ?? '0'), 10) || 0);
  const limit = Math.max(1, Math.min(500, Number.parseInt(String(query.limit ?? '200'), 10) || 200));
  return { term, sort, watched, channel, offset, limit };
}
