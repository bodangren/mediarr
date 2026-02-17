'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';

type SeriesRow = {
  id: number;
  title: string;
  year?: number;
  seasonCount?: number;
  episodeProgress?: { completed: number; total: number };
  missingSubtitles?: string[];
  languageProfile?: string;
};

export default function SeriesSubtitleListPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);

  const queryInput = {
    page,
    pageSize: 25,
    search: search.trim() || undefined,
  };

  const seriesQuery = useApiQuery({
    queryKey: ['series', 'subtitles', 'list', queryInput],
    queryFn: async () => {
      const result = await api.mediaApi.listSeries(queryInput);
      // Transform series data to include subtitle status
      const items = await Promise.all(
        result.items.map(async (series: SeriesRow) => {
          try {
            const variants = await api.subtitleApi.listSeriesVariants(series.id);
            const allEpisodes = variants.flatMap(v => v.episodes);
            const totalEpisodes = allEpisodes.length;
            const episodesWithSubs = allEpisodes.filter(e => e.subtitleTracks.length > 0);
            const missingLanguages = new Set<string>();
            allEpisodes.forEach(e => e.missingSubtitles.forEach(l => missingLanguages.add(l)));

            return {
              ...series,
              seasonCount: variants.length,
              episodeProgress: { completed: episodesWithSubs.length, total: totalEpisodes },
              missingSubtitles: Array.from(missingLanguages),
            };
          } catch {
            return {
              ...series,
              seasonCount: 0,
              episodeProgress: { completed: 0, total: 0 },
              missingSubtitles: [],
            };
          }
        })
      );
      return { ...result, items };
    },
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const filteredItems = useMemo(() => {
    if (!seriesQuery.data) return [];
    if (!filterMissing) return seriesQuery.data.items;
    return seriesQuery.data.items.filter(item => (item.missingSubtitles?.length ?? 0) > 0);
  }, [seriesQuery.data, filterMissing]);

  const columns: DataTableColumn<SeriesRow>[] = [
    {
      key: 'title',
      header: 'Series',
      render: row => (
        <Link href={`/subtitles/series/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      render: row => row.year ?? '-',
    },
    {
      key: 'seasonCount',
      header: 'Seasons',
      render: row => row.seasonCount ?? 0,
    },
    {
      key: 'episodeProgress',
      header: 'Progress',
      render: row => {
        const progress = row.episodeProgress;
        if (!progress || progress.total === 0) return '-';
        const percent = Math.round((progress.completed / progress.total) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-surface-2">
              <div
                className="h-2 rounded-full bg-accent-success"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">
              {progress.completed}/{progress.total}
            </span>
          </div>
        );
      },
    },
    {
      key: 'missingSubtitles',
      header: 'Missing Languages',
      render: row => {
        const missing = row.missingSubtitles ?? [];
        if (missing.length === 0) return <span className="text-xs text-text-muted">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {missing.slice(0, 3).map(lang => (
              <span
                key={lang}
                className="rounded-sm bg-accent-danger/20 px-1.5 py-0.5 text-xs text-text-primary"
              >
                {lang}
              </span>
            ))}
            {missing.length > 3 && (
              <span className="text-xs text-text-muted">+{missing.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'languageProfile',
      header: 'Language Profile',
      render: row => row.languageProfile ?? <span className="text-xs text-text-muted">-</span>,
    },
  ];

  const data = seriesQuery.data;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Series Subtitles</h1>
        <p className="text-sm text-text-secondary">Manage subtitle tracks for your TV series.</p>
      </header>

      <label className="block space-y-1 text-sm">
        <span>Search by name</span>
        <input
          value={search}
          onChange={event => {
            setPage(1);
            setSearch(event.currentTarget.value);
          }}
          className="w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2"
          placeholder="Search series..."
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filterMissing}
          onChange={event => setFilterMissing(event.currentTarget.checked)}
          className="rounded-sm border border-border-subtle"
        />
        <span>Only show series with missing subtitles</span>
      </label>

      <QueryPanel
        isLoading={seriesQuery.isPending}
        isError={seriesQuery.isError}
        isEmpty={seriesQuery.isResolvedEmpty || filteredItems.length === 0}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="No series found"
        emptyBody={
          filterMissing
            ? 'No series with missing subtitles. Adjust filters or add series to your library.'
            : 'Add series to your library to manage subtitles.'
        }
      >
        <DataTable
          data={filteredItems}
          columns={columns}
          getRowId={row => row.id}
          pagination={
            data
              ? {
                  page,
                  totalPages: Math.ceil(data.meta.totalCount / (queryInput.pageSize ?? 25)),
                  onPrev: () => setPage(current => Math.max(1, current - 1)),
                  onNext: () => setPage(current => Math.min(Math.ceil(data.meta.totalCount / (queryInput.pageSize ?? 25)), current + 1)),
                }
              : undefined
          }
        />
      </QueryPanel>
    </section>
  );
}
