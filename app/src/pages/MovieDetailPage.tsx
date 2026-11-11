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
import { ConfirmModal } from '@/components/ui/modal';
import { ManageActionBar } from '@/components/ManageActionBar';
import {
  createMediaManageApi,
  type PriorityCoverageItem,
  type SidecarMatch,
} from '@/lib/api/mediaManageApi';
import type { SubtitleTrack, SubtitleVariantInventory } from '@/lib/api/subtitleApi';
import { getApiClients } from '@/lib/api/client';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';
import { formatBytes } from '@/lib/format';
import { watchChip } from '@/lib/watchState';
import {
  type SubtitleCoverageSummary,
  summarizeSubtitleCoverage,
  subtitleStatusLabel,
  subtitleStatusBadgeClass,
} from '@/lib/subtitles/coverage';


function priorityCoverageLabel(status: PriorityCoverageItem['status']): string {
  switch (status) {
    case 'dual':
      return 'English + Chinese';
    case 'zho-only':
      return 'Chinese only';
    case 'en-only':
      return 'English only (Chinese missing)';
    default:
      return 'No subtitles';
  }
}

export function MovieDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const manageApi = useMemo(() => createMediaManageApi(api.httpClient), [api]);
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
    playbackState?: { isWatched?: boolean | null; progress?: number | null } | null;
  } | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [movieSubtitleSummary, setMovieSubtitleSummary] = useState<SubtitleCoverageSummary | null>(null);
  const [movieSubtitleTracks, setMovieSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [movieSubtitleVariantId, setMovieSubtitleVariantId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualSubtitleModalOpen, setIsManualSubtitleModalOpen] = useState(false);
  const [isSearchingSubtitles, setIsSearchingSubtitles] = useState(false);
  const [subtitleTrackPendingDeletion, setSubtitleTrackPendingDeletion] =
    useState<SubtitleTrack | null>(null);
  const [isDeletingSubtitle, setIsDeletingSubtitle] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [sidecarPreview, setSidecarPreview] = useState<{
    matched: SidecarMatch[];
    unmatched: string[];
  } | null>(null);
  const [priorityCoverageItem, setPriorityCoverageItem] = useState<PriorityCoverageItem | null>(null);

  const loadMovieSubtitleSummary = useCallback(async (targetMovieId: number) => {
    try {
      setMovieSubtitleVariantId(undefined);
      const variants = await api.subtitleApi.listMovieVariants(targetMovieId);
      const selectedVariant = variants.find((variant: SubtitleVariantInventory) => (variant.fileSize ?? 0) > 0)
        ?? variants[0];
      setMovieSubtitleVariantId(selectedVariant?.variantId);
      const tracks = variants.flatMap(variant => variant.subtitleTracks ?? []);
      const available = tracks
        .map((track) => String(track.languageCode ?? '').toLowerCase())
        .filter(Boolean);
      const missing = variants.flatMap(variant =>
        (variant.missingSubtitles ?? [])
          .map((item) => (typeof item === 'string' ? item : item.languageCode).toLowerCase())
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
          playbackState: (item as { playbackState?: { isWatched?: boolean | null; progress?: number | null } | null }).playbackState ?? null,
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

  const loadedMovieId = movie?.id;
  useEffect(() => {
    if (!loadedMovieId) return;
    let cancelled = false;
    void manageApi
      .getPriorityCoverage(14)
      .then((coverage) => {
        if (cancelled) return;
        const item = coverage.items.find(
          (entry) => entry.mediaType === 'MOVIE' && entry.mediaId === loadedMovieId,
        );
        setPriorityCoverageItem(item ?? null);
      })
      .catch(() => {
        // Coverage is a convenience badge; a failure must not break the detail page.
      });
    return () => {
      cancelled = true;
    };
  }, [manageApi, loadedMovieId]);

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

  const requestDeleteSubtitle = (trackId: number) => {
    const track = movieSubtitleTracks.find(item => item.id === trackId);
    if (track) {
      setSubtitleTrackPendingDeletion(track);
    }
  };

  const handleDeleteSubtitle = async () => {
    if (!movie || !subtitleTrackPendingDeletion) return;
    setIsDeletingSubtitle(true);
    try {
      await api.subtitleApi.deleteSubtitleTrack(subtitleTrackPendingDeletion.id);
      setSubtitleTrackPendingDeletion(null);
      pushToast({ title: 'Deleted', variant: 'success', message: 'Subtitle removed' });
      await loadMovieSubtitleSummary(movie.id);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to delete subtitle' });
    } finally {
      setIsDeletingSubtitle(false);
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
                {(() => {
                  const chip = watchChip(movie.playbackState);
                  return chip ? (
                    <span className={`rounded-sm px-2 py-0.5 text-xs ${chip.className}`}>{chip.label}</span>
                  ) : null;
                })()}
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
              disabled={movieSubtitleVariantId === undefined}
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
          </section>

          {/* Manage: every button maps to a real route; destructive actions confirm the exact target. */}
          <ManageActionBar
            description="Housekeeping for this movie: rescan disk, replace the file, re-search wanted, and maintain subtitles."
            onResult={(actionId, result) => {
              if (actionId === 'preview-sidecars' && result && 'payload' in result) {
                const payload = result.payload as { matched: SidecarMatch[]; unmatched: string[] } | undefined;
                setSidecarPreview(payload ?? null);
              }
              if (actionId === 'apply-sidecars') {
                setSidecarPreview(null);
              }
            }}
            actions={[
              {
                id: 'rescan-movie',
                label: 'Rescan movie',
                description: 'Re-link the files in this movie folder',
                run: async () => {
                  const result = await manageApi.rescanMovie(movie.id);
                  await loadMovieSubtitleSummary(movie.id);
                  return {
                    message: `Rescan complete: ${result.filesLinked} file(s) linked`,
                  };
                },
              },
              {
                id: 'search-releases',
                label: 'Search releases / replace file',
                description: 'Open interactive release search to grab a different version',
                variant: 'primary',
                run: async () => {
                  setIsSearchModalOpen(true);
                },
              },
              {
                id: 'research-wanted',
                label: 'Re-search wanted',
                description: 'Run the wanted auto-search for this movie',
                run: async () => {
                  const result = await manageApi.triggerAutoSearch(movie.id, 'movie');
                  if (!result.success) {
                    throw new Error(result.error || 'Automated search returned no release');
                  }
                  return {
                    message: `Wanted search grabbed ${result.data?.release?.title ?? 'a release'}`,
                  };
                },
              },
              ...(movie.path
                ? []
                : [{
                    id: 'add-wanted',
                    label: 'Add to wanted',
                    description: 'Create a wanted record for a movie that is not on disk',
                    disabled: !movie.tmdbId || !movie.year,
                    run: async () => {
                      await manageApi.addToWanted({
                        mediaType: 'MOVIE' as const,
                        tmdbId: movie.tmdbId,
                        imdbId: movie.imdbId,
                        title: movie.title,
                        year: movie.year ?? 0,
                        ...(movie.qualityProfileId ? { qualityProfileId: movie.qualityProfileId } : {}),
                      });
                      return { message: `"${movie.title}" added to wanted` };
                    },
                  }]),
              {
                id: 'rescan-subtitles',
                label: 'Rescan subtitles',
                description: 'Scan this movie folder for subtitle files',
                run: async () => {
                  const result = await manageApi.scanMovieSubtitles(movie.id);
                  await loadMovieSubtitleSummary(movie.id);
                  return {
                    message: `Subtitle scan complete: ${result.subtitlesFound} found, ${result.newSubtitles} new`,
                  };
                },
              },
              {
                id: 'preview-sidecars',
                label: 'Match orphaned subtitles',
                description: 'Preview Chinese sidecars named for an older release',
                run: async () => {
                  const result = await manageApi.matchMovieSidecars(movie.id);
                  const detail = result.matched.length > 0
                    ? result.matched.map((entry) => `${entry.from} -> ${entry.to}`).join('\n')
                    : result.unmatched.length > 0
                      ? result.unmatched.join('\n')
                      : undefined;
                  return {
                    message: result.matched.length > 0
                      ? `${result.matched.length} orphaned subtitle(s) can be copied`
                      : 'No orphaned Chinese subtitles to match',
                    ...(detail ? { detail } : {}),
                    payload: result,
                  };
                },
              },
              {
                id: 'apply-sidecars',
                label: sidecarPreview?.matched.length
                  ? `Apply ${sidecarPreview.matched.length} subtitle copy`
                  : 'Apply subtitle copies',
                description: 'Copy each previewed sidecar to the exact video stem',
                variant: 'primary',
                disabled: !sidecarPreview?.matched.length,
                run: async () => {
                  const result = await manageApi.matchMovieSidecars(movie.id, { apply: true });
                  await loadMovieSubtitleSummary(movie.id);
                  return {
                    message: `${result.matched.length} subtitle file(s) copied`,
                  };
                },
              },
              {
                id: 'delete-movie',
                label: 'Delete movie',
                description: 'Remove this movie from the library',
                variant: 'destructive',
                confirm: {
                  title: 'Delete movie',
                  description: (
                    <div className="space-y-2">
                      <p>
                        Delete <strong>{movie.title}</strong> from the library?
                      </p>
                      <p className="break-words font-mono text-xs text-text-muted">
                        {movie.path ?? 'No path on disk'}
                      </p>
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          aria-label="Also delete files from disk"
                          checked={deleteFiles}
                          onChange={(event) => setDeleteFiles(event.target.checked)}
                        />
                        Also delete files from disk
                      </label>
                      <p className="text-xs text-text-muted">This cannot be undone.</p>
                    </div>
                  ),
                  confirmLabel: deleteFiles ? 'Delete movie and files' : 'Delete movie',
                },
                run: async () => {
                  await manageApi.deleteMovie(movie.id, deleteFiles);
                  pushToast({
                    title: 'Deleted',
                    variant: 'success',
                    message: deleteFiles
                      ? `"${movie.title}" removed and deleted from disk`
                      : `"${movie.title}" removed from the library`,
                  });
                  navigate('/library/movies');
                  return {
                    message: deleteFiles
                      ? `"${movie.title}" removed and deleted from disk`
                      : `"${movie.title}" removed from the library`,
                  };
                },
              },
            ]}
          >
            <div className="space-y-1 text-xs text-text-secondary">
              <p>
                Recent playback Chinese-subtitle coverage:{' '}
                <span className="font-medium text-text-primary" data-testid="movie-priority-coverage">
                  {priorityCoverageItem
                    ? priorityCoverageLabel(priorityCoverageItem.status)
                    : 'not in the last 14 days'}
                </span>
              </p>
              {sidecarPreview ? (
                <div className="space-y-1" data-testid="movie-sidecar-preview">
                  <p className="text-text-primary">
                    {sidecarPreview.matched.length} sidecar(s) ready to copy
                    {sidecarPreview.unmatched.length > 0
                      ? `, ${sidecarPreview.unmatched.length} unmatched`
                      : ''}
                  </p>
                  {sidecarPreview.matched.slice(0, 8).map((entry) => (
                    <p key={entry.from} className="break-all font-mono text-[11px] text-text-muted">
                      {entry.from} -&gt; {entry.to}
                    </p>
                  ))}
                  {sidecarPreview.unmatched.slice(0, 8).map((file) => (
                    <p key={file} className="break-all font-mono text-[11px] text-text-muted">
                      unmatched: {file}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </ManageActionBar>

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
                onDelete={requestDeleteSubtitle}
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
            variantId={movieSubtitleVariantId}
            onClose={() => {
              setIsManualSubtitleModalOpen(false);
              void loadMovieSubtitleSummary(movie.id);
            }}
          />
        </>
      ) : null}

      {subtitleTrackPendingDeletion ? (
        <ConfirmModal
          isOpen
          title="Delete Subtitle"
          description={
            <div className="space-y-2">
              <p>
                Delete the <strong>{subtitleTrackPendingDeletion.languageCode}</strong> subtitle?
              </p>
              <p className="text-xs text-text-muted">
                This permanently removes the subtitle record and its sidecar file from disk. This action cannot be undone.
              </p>
            </div>
          }
          onCancel={() => setSubtitleTrackPendingDeletion(null)}
          onConfirm={() => { void handleDeleteSubtitle(); }}
          cancelLabel="Cancel"
          confirmLabel="Delete Subtitle"
          confirmVariant="destructive"
          isConfirming={isDeletingSubtitle}
        />
      ) : null}
    </RouteScaffold>
  );
}
