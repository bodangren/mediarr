import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { WantedMovieRow } from '@/components/wanted/WantedMovieRow';
import { getApiClients } from '@/lib/api/client';
import type { MissingMovie } from '@/types/wanted';
import type { MissingEpisodeItem } from '@/lib/api/mediaApi';

type Tab = 'movies' | 'episodes';

export function WantedPage() {
  const api = useMemo(() => getApiClients(), []);
  const [activeTab, setActiveTab] = useState<Tab>('movies');
  const [movies, setMovies] = useState<MissingMovie[]>([]);
  const [episodes, setEpisodes] = useState<MissingEpisodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const loadMovies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.wantedApi.listMissingMovies({ page, pageSize });
      setMovies(result.items);
      setTotalCount(result.meta.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load missing movies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEpisodes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.mediaApi.listMissingEpisodes({ page, pageSize });
      setEpisodes(result.items);
      setTotalCount(result.meta.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load missing episodes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'movies') {
      void loadMovies();
    } else {
      void loadEpisodes();
    }
  }, [activeTab, page]);

  const handleSearch = async (movie: MissingMovie) => {
    setSearchFeedback(null);
    try {
      const result = await api.mediaApi.triggerAutoSearch(movie.movieId, 'movie');
      setSearchFeedback(
        result.success
          ? `Search started for ${movie.title}`
          : `Search failed for ${movie.title}: ${result.error ?? 'No matching release found'}`,
      );
    } catch (searchError) {
      setSearchFeedback(
        `Search failed for ${movie.title}: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`,
      );
    }
  };

  const handleToggleMonitored = async (movieId: number, monitored: boolean) => {
    try {
      await api.mediaApi.setMovieMonitored(movieId, monitored);
      setMovies(prev =>
        prev.map(m => (m.movieId === movieId ? { ...m, monitored } : m))
      );
    } catch {
      // ignore
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <RouteScaffold title="Wanted" description="Missing movies and episodes">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border-subtle">
          <button
            type="button"
            onClick={() => { setActiveTab('movies'); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'movies'
                ? 'border-b-2 border-accent-info text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('episodes'); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'episodes'
                ? 'border-b-2 border-accent-info text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Episodes
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-sm border border-accent-danger/50 bg-accent-danger/10 p-3 text-sm text-accent-danger">
            {error}
          </div>
        )}
        {searchFeedback ? <p role="status" className="text-sm text-text-secondary">{searchFeedback}</p> : null}

        {/* Loading */}
        {isLoading && (
          <div className="py-8 text-center text-sm text-text-secondary">Loading...</div>
        )}

        {/* Movies Table */}
        {!isLoading && activeTab === 'movies' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-secondary">
                  <th className="px-3 py-2">
                    <input type="checkbox" className="rounded-sm border-border-subtle bg-surface-1" />
                  </th>
                  <th className="px-3 py-2">Movie</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Release Dates</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Runtime</th>
                  <th className="px-3 py-2">Monitored</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-text-secondary">
                      No missing movies
                    </td>
                  </tr>
                ) : (
                  movies.map(movie => (
                    <WantedMovieRow
                      key={movie.id}
                      movie={movie}
                      onSearch={movie => { void handleSearch(movie); }}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onToggleMonitored={handleToggleMonitored}
                      onSelect={() => {}}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Episodes Table */}
        {!isLoading && activeTab === 'episodes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-secondary">
                  <th className="px-3 py-2">
                    <input type="checkbox" className="rounded-sm border-border-subtle bg-surface-1" />
                  </th>
                  <th className="px-3 py-2">Series</th>
                  <th className="px-3 py-2">Episode</th>
                  <th className="px-3 py-2">Air Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Monitored</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {episodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-text-secondary">
                      No missing episodes
                    </td>
                  </tr>
                ) : (
                  episodes.map(episode => (
                    <tr
                      key={episode.id}
                      className="border-b border-border-subtle hover:bg-surface-2"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="rounded-sm border-border-subtle bg-surface-1"
                        />
                      </td>
                      <td className="px-3 py-3">{episode.seriesTitle}</td>
                      <td className="px-3 py-3">
                        S{episode.seasonNumber}E{episode.episodeNumber} - {episode.episodeTitle}
                      </td>
                      <td className="px-3 py-3">{episode.airDate || '-'}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-sm px-2 py-1 text-xs font-medium ${
                            episode.status === 'missing'
                              ? 'bg-accent-danger/20 text-accent-danger'
                              : 'bg-accent-info/20 text-accent-info'
                          }`}
                        >
                          {episode.status === 'missing' ? 'Missing' : 'Unaired'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-sm px-2 py-1 text-xs font-medium ${
                            episode.monitored
                              ? 'bg-accent-success/20 text-accent-success'
                              : 'bg-surface-2 text-text-secondary'
                          }`}
                        >
                          {episode.monitored ? 'Monitored' : 'Unmonitored'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            void api.mediaApi.triggerAutoSearch(episode.id, 'episode')
                          }
                          className="rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
                        >
                          Search
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm disabled:opacity-50 hover:bg-surface-2"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary">
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm disabled:opacity-50 hover:bg-surface-2"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </RouteScaffold>
  );
}
