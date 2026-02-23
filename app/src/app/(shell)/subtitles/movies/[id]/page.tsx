'use client';

import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/primitives/Alert';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { SubtitleTrackList } from '@/components/subtitles/SubtitleTrackList';
import { SubtitleUpload } from '@/components/subtitles/SubtitleUpload';
import { ManualSearchModal } from '@/components/subtitles/ManualSearchModal';
import { MovieActionsToolbar } from '@/components/subtitles/MovieActionsToolbar';
import { Icon } from '@/components/primitives/Icon';
import type { SubtitleTrack } from '@/lib/api';

interface MovieVariant {
  variantId: number;
  path: string;
  subtitleTracks: SubtitleTrack[];
  missingSubtitles: string[];
}

export default function MovieSubtitleDetailPage({ params }: { params: { id: string } }) {
  const movieId = Number(params.id);
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Query for movie details
  const movieQuery = useQuery({
    queryKey: queryKeys.movieDetail(movieId),
    queryFn: () => api.mediaApi.getMovie(movieId),
  });

  // Query for subtitle variants
  const variantsQuery = useQuery({
    queryKey: ['movie-subtitle-variants', movieId],
    queryFn: async () => {
      const variants = await api.subtitleApi.listMovieVariants(movieId);
      // Enrich variants with track and missing language data
      return variants.map((variant): MovieVariant => ({
        variantId: variant.variantId,
        path: variant.path,
        subtitleTracks: (variant as any).subtitleTracks ?? [],
        missingSubtitles: (variant as any).missingSubtitles ?? [],
      }));
    },
    enabled: movieQuery.data !== undefined,
  });

  // Mutation for sync
  const syncMutation = useMutation({
    mutationFn: () => api.subtitleApi.syncMovie(movieId),
    onSuccess: data => {
      pushToast({
        title: 'Sync Complete',
        message: `Synced ${data.episodesUpdated} items`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
    },
  });

  // Mutation for scan
  const scanMutation = useMutation({
    mutationFn: () => api.subtitleApi.scanMovieDisk(movieId),
    onSuccess: data => {
      pushToast({
        title: 'Scan Complete',
        message: `Found ${data.newSubtitles} new subtitles`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
    },
  });

  // Mutation for search all
  const searchMutation = useMutation({
    mutationFn: () => api.subtitleApi.searchMovieSubtitles(movieId),
    onSuccess: data => {
      pushToast({
        title: 'Search Complete',
        message: `Downloaded ${data.subtitlesDownloaded} subtitles`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
    },
  });

  const handleSync = useCallback(() => {
    setIsSyncing(true);
    syncMutation.mutate(undefined, {
      onSettled: () => setIsSyncing(false),
    });
  }, [syncMutation]);

  const handleScan = useCallback(() => {
    setIsScanning(true);
    scanMutation.mutate(undefined, {
      onSettled: () => setIsScanning(false),
    });
  }, [scanMutation]);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    searchMutation.mutate(undefined, {
      onSettled: () => setIsSearching(false),
    });
  }, [searchMutation]);

  const handleManualSearch = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  const handleUpload = useCallback(() => {
    setIsUploadModalOpen(true);
  }, []);

  const handleHistory = useCallback(() => {
    router.push('/subtitles/history/movies');
  }, [router]);

  const handleSearchLanguage = useCallback(
    (languageCode: string) => {
      pushToast({
        title: 'Searching',
        message: `Searching for ${languageCode} subtitles`,
        variant: 'info',
      });
    },
    [pushToast]
  );

  const handleUploadSuccess = useCallback(() => {
    setIsUploadModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['movie-subtitle-variants', movieId] });
  }, [movieId, queryClient]);

  if (!movieQuery.data) {
    return (
      <section className="space-y-5">
        <QueryPanel
          isLoading={movieQuery.isPending}
          isError={movieQuery.isError}
          isEmpty={movieQuery.data === undefined}
          errorMessage={movieQuery.error?.message}
          onRetry={() => void movieQuery.refetch()}
          emptyTitle="Movie not found"
          emptyBody="The movie you're looking for doesn't exist or has been deleted."
        >
          <div />
        </QueryPanel>
      </section>
    );
  }

  const movie = movieQuery.data;

  return (
    <section className="space-y-5">
      {/* Movie Overview Section */}
      <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4 sm:flex-row">
        {/* Poster placeholder */}
        <div className="aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:w-40">
          <Icon name="play" size={48} className="h-full w-full text-text-muted" />
        </div>

        {/* Movie Info */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-semibold">{movie.title}</h1>
            {movie.year && (
              <span className="text-lg text-text-muted">({movie.year})</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {movie.monitored !== undefined && (
              <StatusBadge status={movie.monitored ? 'monitored' : 'paused'} />
            )}
          </div>

          {/* Language profile - comes from movie data if available */}
          {(movie as any).languageProfile ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs">
              <span className="text-text-muted">Language Profile:</span>
              <span className="text-text-primary">{(movie as any).languageProfile}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs">
              <span className="text-text-muted">Language Profile:</span>
              <span className="text-text-muted">Unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Toolbar */}
      <MovieActionsToolbar
        onSync={handleSync}
        onScan={handleScan}
        onSearch={handleSearch}
        onManualSearch={handleManualSearch}
        onUpload={handleUpload}
        onHistory={handleHistory}
        isSyncing={isSyncing || syncMutation.isPending}
        isScanning={isScanning || scanMutation.isPending}
        isSearching={isSearching || searchMutation.isPending}
      />

      {/* Subtitle Files Section */}
      <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-lg font-semibold">Subtitle Files</h2>

        <QueryPanel
          isLoading={variantsQuery.isPending}
          isError={variantsQuery.isError}
          isEmpty={variantsQuery.data?.length === 0}
          errorMessage={variantsQuery.error?.message}
          onRetry={() => void variantsQuery.refetch()}
          emptyTitle="No subtitle files found"
          emptyBody="This movie doesn't have any video files tracked yet. Click 'Sync' to scan for files."
        >
          {variantsQuery.data?.map(variant => (
            <div key={variant.variantId} className="space-y-3 rounded-lg border border-border-subtle bg-surface-2 p-4">
              {/* File path */}
              <div className="flex items-center gap-3">
                <Icon name="folder" size={16} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary" title={variant.path}>
                    {variant.path}
                  </p>
                  <p className="text-xs text-text-muted">File Variant #{variant.variantId}</p>
                </div>
              </div>

              {/* Subtitle tracks */}
              <SubtitleTrackList
                tracks={variant.subtitleTracks}
                missingLanguages={variant.missingSubtitles}
                onSearch={handleSearchLanguage}
              />
            </div>
          ))}
        </QueryPanel>
      </section>

      {/* Manual Search Modal */}
      <ManualSearchModal
        isOpen={isSearchModalOpen}
        movieId={movieId}
        onClose={() => setIsSearchModalOpen(false)}
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-surface-3/70"
            onClick={() => setIsUploadModalOpen(false)}
            aria-label="Close modal"
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-md border border-border-subtle bg-surface-1 shadow-elevation-3 p-4">
            <SubtitleUpload
              movieId={movieId}
              onSuccess={handleUploadSuccess}
              onCancel={() => setIsUploadModalOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
