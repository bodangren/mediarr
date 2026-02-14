'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type SearchType = 'search' | 'tvsearch' | 'movie' | 'music' | 'book';

interface IndexerRow {
  id: number;
  name: string;
  protocol: string;
  enabled: boolean;
  supportsSearch: boolean;
}

interface ReleaseRow {
  indexer: string;
  title: string;
  size: number;
  seeders: number;
  indexerFlags?: string;
  quality?: string;
  age?: number;
  magnetUrl?: string;
  downloadUrl?: string;
}

interface SearchPayload extends Record<string, unknown> {
  query: string;
  searchType: SearchType;
  category?: string;
  indexerId?: number;
  limit: number;
  offset: number;
  season?: number;
  episode?: number;
  year?: number;
}

interface FormState {
  query: string;
  searchType: SearchType;
  category: string;
  indexerId: string;
  limit: string;
  offset: string;
  season: string;
  episode: string;
  year: string;
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRequiredNumber(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferProtocol(row: ReleaseRow): string {
  if (row.magnetUrl) {
    return 'torrent';
  }

  if (row.downloadUrl) {
    return 'usenet';
  }

  return 'unknown';
}

function formatGiB(size: number): string {
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function parseIndexerFlags(flags?: string): string[] {
  if (!flags) {
    return [];
  }

  return flags
    .split(',')
    .map(flag => flag.trim().toLowerCase())
    .filter(Boolean);
}

function buildPayload(form: FormState): SearchPayload {
  const payload: SearchPayload = {
    query: form.query.trim(),
    searchType: form.searchType,
    limit: parseRequiredNumber(form.limit, 100),
    offset: parseRequiredNumber(form.offset, 0),
  };

  if (form.category.trim().length > 0) {
    payload.category = form.category.trim();
  }

  const indexerId = parseOptionalNumber(form.indexerId);
  if (indexerId !== undefined) {
    payload.indexerId = indexerId;
  }

  const season = parseOptionalNumber(form.season);
  if (season !== undefined) {
    payload.season = season;
  }

  const episode = parseOptionalNumber(form.episode);
  if (episode !== undefined) {
    payload.episode = episode;
  }

  const year = parseOptionalNumber(form.year);
  if (year !== undefined) {
    payload.year = year;
  }

  return payload;
}

export default function SearchPage() {
  const api = useMemo(() => getApiClients(), []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submittedPayload, setSubmittedPayload] = useState<SearchPayload | null>(null);
  const [form, setForm] = useState<FormState>({
    query: '',
    searchType: 'search',
    category: '',
    indexerId: '',
    limit: '100',
    offset: '0',
    season: '',
    episode: '',
    year: '',
  });

  const indexersQuery = useApiQuery({
    queryKey: queryKeys.indexers(),
    queryFn: () => api.indexerApi.list() as Promise<IndexerRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const releasesQuery = useApiQuery({
    queryKey: queryKeys.releaseCandidates(submittedPayload ?? { idle: true }),
    queryFn: () => api.releaseApi.searchCandidates(submittedPayload ?? {}),
    enabled: Boolean(submittedPayload),
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const columns: DataTableColumn<ReleaseRow>[] = [
    {
      key: 'protocol',
      header: 'Protocol',
      render: row => inferProtocol(row),
    },
    {
      key: 'age',
      header: 'Age',
      render: row => `${row.age ?? '-'} d`,
    },
    {
      key: 'title',
      header: 'Title',
      render: row => row.title,
    },
    {
      key: 'indexer',
      header: 'Indexer',
      render: row => row.indexer,
    },
    {
      key: 'flags',
      header: 'Flags',
      render: row => {
        const flags = parseIndexerFlags(row.indexerFlags);

        if (flags.length === 0) {
          return '-';
        }

        return (
          <div className="flex flex-wrap gap-1">
            {flags.map(flag => (
              <Label key={`${row.indexer}-${row.title}-${flag}`}>{flag}</Label>
            ))}
          </div>
        );
      },
    },
    {
      key: 'size',
      header: 'Size',
      render: row => formatGiB(row.size),
    },
    {
      key: 'seeders',
      header: 'Seeders',
      render: row => row.seeders,
    },
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(form);
    setSubmittedPayload(payload);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-text-secondary">Manual release search across configured indexers.</p>
      </header>

      <form className="space-y-4 rounded-lg border border-border-subtle bg-surface-1 p-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span>Search query</span>
            <input
              aria-label="Search query"
              value={form.query}
              onChange={event => {
                const query = event.currentTarget.value;
                setForm(current => ({
                  ...current,
                  query,
                }));
              }}
              placeholder="Title, release name, or query terms"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Search type</span>
            <select
              aria-label="Search type"
              value={form.searchType}
              onChange={event => {
                const searchType = event.currentTarget.value as SearchType;
                setForm(current => ({
                  ...current,
                  searchType,
                }));
              }}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            >
              <option value="search">search</option>
              <option value="tvsearch">tvsearch</option>
              <option value="movie">movie</option>
              <option value="music">music</option>
              <option value="book">book</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Category</span>
            <input
              aria-label="Category"
              value={form.category}
              onChange={event => {
                const category = event.currentTarget.value;
                setForm(current => ({
                  ...current,
                  category,
                }));
              }}
              placeholder="e.g. 2000"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Indexer</span>
            <select
              aria-label="Indexer"
              value={form.indexerId}
              onChange={event => {
                const indexerId = event.currentTarget.value;
                setForm(current => ({
                  ...current,
                  indexerId,
                }));
              }}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            >
              <option value="">All indexers</option>
              {(indexersQuery.data ?? [])
                .filter(indexer => indexer.supportsSearch)
                .map(indexer => (
                  <option key={indexer.id} value={String(indexer.id)}>
                    {indexer.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Limit</span>
            <input
              aria-label="Limit"
              type="number"
              min={1}
              value={form.limit}
              onChange={event => {
                const limit = event.currentTarget.value;
                setForm(current => ({
                  ...current,
                  limit,
                }));
              }}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Offset</span>
            <input
              aria-label="Offset"
              type="number"
              min={0}
              value={form.offset}
              onChange={event => {
                const offset = event.currentTarget.value;
                setForm(current => ({
                  ...current,
                  offset,
                }));
              }}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setShowAdvanced(current => !current);
            }}
          >
            {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
          </button>

          <button type="submit" className="rounded-sm border border-border-subtle px-3 py-1 text-sm">
            Search releases
          </button>
        </div>

        {showAdvanced ? (
          <div className="grid gap-3 border-t border-border-subtle pt-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span>Season</span>
              <input
                aria-label="Season"
                type="number"
                min={1}
                value={form.season}
                onChange={event => {
                  const season = event.currentTarget.value;
                  setForm(current => ({
                    ...current,
                    season,
                  }));
                }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Episode</span>
              <input
                aria-label="Episode"
                type="number"
                min={1}
                value={form.episode}
                onChange={event => {
                  const episode = event.currentTarget.value;
                  setForm(current => ({
                    ...current,
                    episode,
                  }));
                }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Year</span>
              <input
                aria-label="Year"
                type="number"
                min={1900}
                value={form.year}
                onChange={event => {
                  const year = event.currentTarget.value;
                  setForm(current => ({
                    ...current,
                    year,
                  }));
                }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              />
            </label>
          </div>
        ) : null}
      </form>

      {submittedPayload ? (
        <QueryPanel
          isLoading={releasesQuery.isPending}
          isError={releasesQuery.isError}
          isEmpty={releasesQuery.isResolvedEmpty}
          errorMessage={releasesQuery.error?.message}
          onRetry={() => {
            void releasesQuery.refetch();
          }}
          emptyTitle="No results"
          emptyBody="Try broader criteria or a different indexer selection."
        >
          <DataTable
            data={releasesQuery.data ?? []}
            columns={columns}
            getRowId={row => `${row.indexer}-${row.title}`}
          />
        </QueryPanel>
      ) : (
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
          Run a manual search to inspect release results and ranking.
        </section>
      )}
    </section>
  );
}
