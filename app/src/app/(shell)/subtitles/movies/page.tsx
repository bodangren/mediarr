'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';

interface MovieRow {
  id: number;
  title: string;
  year?: number;
  monitored?: boolean;
  audioLanguages?: string[];
  languageProfile?: string;
  missingSubtitles: string[];
}

export default function MovieSubtitlesListPage() {
  const api = useMemo(() => getApiClients(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);

  // Query for movies
  const moviesQuery = useQuery({
    queryKey: ['movies-subtitles-list', searchQuery, filterMissing],
    queryFn: async () => {
      const result = await api.mediaApi.listMovies({ search: searchQuery, pageSize: 100 });
      return result.items.map((movie): MovieRow => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        monitored: movie.monitored,
        audioLanguages: (movie as any).audioLanguages ?? ['en'],
        languageProfile: 'Default',
        missingSubtitles: (movie as any).missingSubtitles ?? [],
      }));
    },
  });

  const filteredMovies = useMemo(() => {
    if (!filterMissing) {
      return moviesQuery.data ?? [];
    }
    return (moviesQuery.data ?? []).filter(movie => movie.missingSubtitles.length > 0);
  }, [moviesQuery.data, filterMissing]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterToggle = useCallback(() => {
    setFilterMissing(prev => !prev);
  }, []);

  const columns: DataTableColumn<MovieRow>[] = [
    {
      key: 'monitored',
      header: 'Status',
      render: row =>
        row.monitored !== undefined ? (
          <StatusBadge status={row.monitored ? 'monitored' : 'paused'} />
        ) : null,
    },
    {
      key: 'title',
      header: 'Title',
      render: row => (
        <Link
          href={`/subtitles/movies/${row.id}`}
          className="font-medium text-text-primary hover:text-accent-primary"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      render: row => <span className="text-sm text-text-secondary">{row.year ?? '-'}</span>,
    },
    {
      key: 'audioLanguages',
      header: 'Audio Languages',
      render: row => (
        <div className="flex flex-wrap gap-1">
          {row.audioLanguages?.map(lang => (
            <span
              key={lang}
              className="inline-flex rounded-md bg-surface-2 px-2 py-0.5 text-xs text-text-primary"
            >
              {lang}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'languageProfile',
      header: 'Language Profile',
      render: row => (
        <span className="inline-flex rounded-md bg-surface-2 px-2 py-1 text-xs text-text-primary">
          {row.languageProfile ?? 'Default'}
        </span>
      ),
    },
    {
      key: 'missingSubtitles',
      header: 'Missing Subtitles',
      render: row => (
        <div className="flex flex-wrap gap-1">
          {row.missingSubtitles.length > 0 ? (
            row.missingSubtitles.map(lang => (
              <LanguageBadge key={lang} languageCode={lang} variant="missing" />
            ))
          ) : (
            <span className="text-xs text-text-muted">None</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Movies</h1>
          <p className="text-sm text-text-secondary">Manage subtitles for your movie library.</p>
        </div>

        <Link
          href="/subtitles/movies/edit"
          className="inline-flex items-center gap-2 rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-2"
        >
          <Icon name="edit" size={16} />
          <span>Mass Edit</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="search-input" className="mb-1 block text-sm font-medium text-text-primary">
            Search
          </label>
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search movies..."
            className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="filter-missing"
            type="checkbox"
            checked={filterMissing}
            onChange={handleFilterToggle}
            className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary/50"
          />
          <label htmlFor="filter-missing" className="text-sm font-medium text-text-primary cursor-pointer">
            Show only missing subtitles
          </label>
        </div>

        <div className="text-sm text-text-muted">
          {filteredMovies.length} movie{filteredMovies.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Movies Table */}
      <QueryPanel
        isLoading={moviesQuery.isPending}
        isError={moviesQuery.isError}
        isEmpty={filteredMovies.length === 0}
        errorMessage={moviesQuery.error?.message}
        onRetry={() => void moviesQuery.refetch()}
        emptyTitle="No movies found"
        emptyBody="Add some movies to your library to manage subtitles."
      >
        <DataTable
          data={filteredMovies}
          columns={columns}
          getRowId={row => row.id}
        />
      </QueryPanel>
    </section>
  );
}
