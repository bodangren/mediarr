import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
import { MovieCollectionSection } from '@/components/movie/MovieCollectionSection';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { SubtitleTrackList } from '@/components/subtitles/SubtitleTrackList';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { useToast } from '@/components/providers/ToastProvider';
import type { SubtitleTrack } from '@/lib/api/subtitleApi';
import { getApiClients } from '@/lib/api/client';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';
import { formatBytes } from '@/lib/format';
import {
  type SubtitleCoverageSummary,
  summarizeSubtitleCoverage,
  subtitleStatusLabel,
  subtitleStatusBadgeClass,
} from '@/lib/subtitles/coverage';


export function MovieDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const movieId = Number(params.id);
  const [movie, setMovie] = useState<{
    id: number;
    title: string;
    year?: number;
    overview?: string;
    status?: string;
    monitored: boolean;
    tmdbId?: number;
    imdbId?: string;
    posterUrl?: string;
    genres?: string[];
    qualityProfileId?: number;
    path?: string;
    sizeOnDisk?: number;
    collection?: { id: number; name: string } | null;
  } | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [movieSubtitleSummary, setMovieSubtitleSummary] = useState<SubtitleCoverageSummary | null>(null);
  const [movieSubtitleTracks, setMovieSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualSubtitleModalOpen, setIsManualSubtitleModalOpen] = useState(false);
  const [isSearchingSubtitles, setIsSearchingSubtitles] = useState(false);

  const loadMovieSubtitleSummary = useCallback(async (targetMovieId: number) => {
    try {
      const variants = await api.subtitleApi.listMovieVariants(targetMovieId);
      const tracks = variants.flatMap(variant => variant.subtitleTracks ?? []);
      const available = tracks
        .map((track) => String(track.languageCode ?? '').toLowerCase())
        .filter(Boolean);
      const missing = variants.flatMap(variant =>
        (variant.missingSubtitles ?? [])
          .map((item) => String(item ?? '').toLowerCase())
          .filter(Boolean),
      );
      setMovieSubtitleTracks(tracks);
      setMovieSubtitleSummary(summarizeSubtitleCoverage(available, missing));
    } catch {
      setMovieSubtitleTracks([]);
      setMovieSubtitleSummary(null);
    }
  }, [api]);

  useEffect(() => {
    if (!Number.isFinite(movieId)) {
      setError('Invalid movie id');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [item, profiles] = await Promise.all([
          api.movieApi.getById(movieId),
          api.qualityProfileApi.list(),
        ]);
        setMovie({
          id: item.id,
          title: item.title,
          year: item.year ?? undefined,
          overview: item.overview ?? undefined,
          status: item.status ?? undefined,
          monitored: item.monitored ?? false,
          tmdbId: item.tmdbId ?? undefined,
          imdbId: item.imdbId ?? undefined,
          posterUrl: item.posterUrl ?? undefined,
          genres: item.genres ?? undefined,
          qualityProfileId: item.qualityProfileId,
          path: item.path ?? undefined,
          sizeOnDisk: item.sizeOnDisk ?? undefined,
          collection: item.collection ?? null,
        });
        setQualityProfiles(profiles);
        await loadMovieSubtitleSummary(item.id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load movie details');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, movieId, loadMovieSubtitleSummary]);

  const handleToggleMonitored = async () => {
    if (!movie) return;
    try {
      await api.mediaApi.setMovieMonitored(movie.id, !movie.monitored);
      setMovie(prev => prev ? { ...prev, monitored: !prev.monitored } : prev);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update monitoring' });
    }
  };

  const handleQualityProfileChange = async (profileId: number) => {
    if (!movie) return;
    try {
      await api.movieApi.update(movie.id, { qualityProfileId: profileId });
      setMovie(prev => prev ? { ...prev, qualityProfileId: profileId } : prev);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update quality profile' });
    }
  };

  const handleRemove = async () => {
    if (!movie) return;
    if (!window.confirm(`Remove "${movie.title}" from library?`)) return;
    const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
    try {
      await api.mediaApi.deleteMovie(movie.id, deleteFiles);
      const msg = deleteFiles ? `"${movie.title}" removed from library and deleted from disk` : `"${movie.title}" removed from library`;
      pushToast({ title: 'Success', variant: 'success', message: msg });
      navigate('/library/movies');
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to remove movie' });
    }
  };

  const handleSearchSubtitles = async () => {
    if (!movie) return;
    setIsSearchingSubtitles(true);
    try {
      pushToast({ title: 'Searching', message: `Searching subtitles for ${movie.title}...`, variant: 'info' });
      const result = await api.subtitleApi.searchMovieSubtitles(movie.id);
      pushToast({
        title: 'Subtitles',
        variant: 'success',
        message: `Search complete: ${result.subtitlesDownloaded} subtitle(s) downloaded`,
      });
      await loadMovieSubtitleSummary(movie.id);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Subtitle search failed' });
    } finally {
      setIsSearchingSubtitles(false);
    }
  };

  const handleDeleteSubtitle = async (trackId: number) => {
    if (!movie) return;
    try {
      await api.subtitleApi.deleteSubtitleTrack(trackId);
      pushToast({ title: 'Deleted', variant: 'success', message: 'Subtitle removed' });
      await loadMovieSubtitleSummary(movie.id);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to delete subtitle' });
    }
  };

  const handleAutoSearch = async () => {
    if (!movie) return;
    try {
      pushToast({ title: 'Searching', message: `Automated search started for ${movie.title}`, variant: 'info' });
      const data = await api.mediaApi.triggerAutoSearch(movie.id, 'movie');
      if (!data.success) {
        pushToast({ title: 'Search Failed', variant: 'error', message: data.error || 'No candidates found' });
      } else {
        pushToast({ title: 'Success', variant: 'success', message: `Grabbed ${data.data?.release?.title || 'a release'}` });
      }
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to execute automated search' });
    }
  };

  return (
    <RouteScaffold title="Movie Details" description="Details and interactive search for the selected movie.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading movie...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {movie ? (
        <>
          {/* Header: poster + metadata */}
          <section className="flex flex-col gap-6 rounded-md border border-border-subtle bg-surface-1 p-4 sm:flex-row">
            <div className="flex-shrink-0 w-32">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={movie.title} className="w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-md bg-surface-2 text-xs text-text-secondary">No Poster</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-xl font-semibold">{movie.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                {movie.year ? <span>{movie.year}</span> : null}
                {movie.status ? <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs">{movie.status}</span> : null}
                {movieSubtitleSummary ? (
                  <span className={`rounded-sm px-2 py-0.5 text-xs ${subtitleStatusBadgeClass(movieSubtitleSummary.status)}`}>
                    {subtitleStatusLabel(movieSubtitleSummary.status)}
                  </span>
                ) : null}
              </div>
              {movieSubtitleSummary && (movieSubtitleSummary.availableLanguages.length > 0 || movieSubtitleSummary.missingLanguages.length > 0) ? (
                <div className="flex flex-wrap gap-1">
                  {movieSubtitleSummary.availableLanguages.slice(0, 6).map(code => (
                    <LanguageBadge key={`movie-available-${code}`} languageCode={code} variant="available" />
                  ))}
                  {movieSubtitleSummary.missingLanguages.slice(0, 6).map(code => (
                    <LanguageBadge key={`movie-missing-${code}`} languageCode={code} variant="missing" />
                  ))}
                </div>
              ) : null}
              {movie.genres && movie.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {movie.genres.map(g => (
                    <span key={g} className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">{g}</span>
                  ))}
                </div>
              ) : null}
              {movie.overview ? <p className="text-sm text-text-secondary">{movie.overview}</p> : null}
              {movie.path ? (
                <p className="text-xs text-text-secondary font-mono truncate" title={movie.path}>{movie.path}</p>
              ) : null}
              {movie.sizeOnDisk != null && movie.sizeOnDisk > 0 ? (
                <p className="text-xs text-text-muted">{formatBytes(movie.sizeOnDisk)} on disk</p>
              ) : null}
              <MovieCollectionSection
                movieId={movie.id}
                tmdbId={movie.tmdbId}
                collection={movie.collection ?? null}
                onCollectionAdded={() => {
                  // Re-fetch movie to get updated collection link
                  void api.movieApi.getById(movie.id).then(item => {
                    setMovie(prev => prev ? { ...prev, collection: item.collection ?? null } : prev);
                  });
                }}
              />
            </div>
          </section>

          {/* Controls */}
          <section className="flex flex-wrap items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={movie.monitored}
                aria-label="Monitored"
                onChange={() => { void handleToggleMonitored(); }}
              />
              Monitored
            </label>

            <label className="flex items-center gap-2 text-sm" htmlFor="movie-quality-profile">
              Quality Profile
              <select
                id="movie-quality-profile"
                aria-label="Quality Profile"
                value={movie.qualityProfileId ?? ''}
                onChange={event => { void handleQualityProfileChange(Number(event.target.value)); }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              >
                {qualityProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-3 flex items-center gap-2"
              onClick={handleAutoSearch}
            >
              <Search size={16} />
              Auto-Search
            </button>

            <button
              type="button"
              className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-3 flex items-center gap-2"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <Search size={16} />
              Interactive Search
            </button>

            <button
              type="button"
              className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-3"
              onClick={() => setIsManualSubtitleModalOpen(true)}
            >
              Manual Subtitles
            </button>

            <button
              type="button"
              className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-3 disabled:opacity-50"
              disabled={isSearchingSubtitles}
              onClick={() => { void handleSearchSubtitles(); }}
            >
              {isSearchingSubtitles ? 'Searching...' : 'Search Subtitles'}
            </button>

            <button
              type="button"
              className="rounded-sm border border-status-error/60 px-3 py-2 text-sm text-status-error"
              aria-label="Remove from Library"
              onClick={() => { void handleRemove(); }}
            >
              Remove from Library
            </button>
          </section>

          {/* Subtitle Inventory */}
          {(movieSubtitleTracks.length > 0 || (movieSubtitleSummary?.missingLanguages.length ?? 0) > 0) && (
            <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Subtitles</h3>
              <SubtitleTrackList
                tracks={movieSubtitleTracks}
                missingLanguages={movieSubtitleSummary?.missingLanguages ?? []}
                onSearch={() => {
                  setIsManualSubtitleModalOpen(true);
                }}
                onDelete={handleDeleteSubtitle}
              />
            </section>
          )}

          <MovieInteractiveSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            movieId={movie.id}
            movieTitle={movie.title}
            movieYear={movie.year}
            imdbId={movie.imdbId}
            tmdbId={movie.tmdbId}
          />
          <ManualSearchModal
            isOpen={isManualSubtitleModalOpen}
            movieId={movie.id}
            onClose={() => {
              setIsManualSubtitleModalOpen(false);
              void loadMovieSubtitleSummary(movie.id);
            }}
          />
        </>
      ) : null}
    </RouteScaffold>
  );
}
