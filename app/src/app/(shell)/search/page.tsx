'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { FilterBuilder, type FilterBuilderResult } from '@/components/primitives/FilterBuilder';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
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

interface ReleaseViewRow extends ReleaseRow {
  rowId: string;
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

interface ActionNotice {
  tone: 'success' | 'error';
  message: string;
}

function SelectionCheckbox({ rowId }: { rowId: string }) {
  const { isSelected, toggleRow } = useSelectContext();

  return (
    <input
      type="checkbox"
      aria-label="Select row"
      checked={isSelected(rowId)}
      onChange={event => {
        toggleRow(rowId, (event.nativeEvent as MouseEvent).shiftKey);
      }}
    />
  );
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

function buildReleaseRowId(row: ReleaseRow): string {
  return [
    row.indexer,
    row.title,
    row.size,
    row.seeders,
    row.magnetUrl ?? '',
    row.downloadUrl ?? '',
  ].join('|');
}

function toReleasePayload(row: ReleaseRow): ReleaseRow {
  return {
    indexer: row.indexer,
    title: row.title,
    size: row.size,
    seeders: row.seeders,
    indexerFlags: row.indexerFlags,
    quality: row.quality,
    age: row.age,
    magnetUrl: row.magnetUrl,
    downloadUrl: row.downloadUrl,
  };
}

function customFilterValue(row: ReleaseViewRow, field: string): string | number {
  switch (field) {
    case 'title':
      return row.title;
    case 'indexer':
      return row.indexer;
    case 'protocol':
      return inferProtocol(row);
    case 'seeders':
      return row.seeders;
    case 'size':
      return row.size / (1024 * 1024 * 1024);
    default:
      return '';
  }
}

function matchesCustomFilters(row: ReleaseViewRow, filter: FilterBuilderResult | null): boolean {
  if (!filter || filter.conditions.length === 0) {
    return true;
  }

  const checks = filter.conditions.map(condition => {
    const value = customFilterValue(row, condition.field);
    const conditionValue = condition.value.trim();

    if (condition.operator === 'contains') {
      return String(value).toLowerCase().includes(conditionValue.toLowerCase());
    }

    if (condition.operator === 'equals') {
      return String(value).toLowerCase() === conditionValue.toLowerCase();
    }

    const numericValue = Number(value);
    const numericCondition = Number(conditionValue);
    if (!Number.isFinite(numericValue) || !Number.isFinite(numericCondition)) {
      return false;
    }

    return numericValue > numericCondition;
  });

  return filter.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
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
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<ReleaseViewRow | null>(null);
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overridesByRowId, setOverridesByRowId] = useState<Record<string, string>>({});
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'torrent' | 'usenet' | 'unknown'>('all');
  const [minSizeGbFilter, setMinSizeGbFilter] = useState('');
  const [minSeedersFilter, setMinSeedersFilter] = useState('');
  const [showCustomFilters, setShowCustomFilters] = useState(false);
  const [customFilter, setCustomFilter] = useState<FilterBuilderResult | null>(null);
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

  const grabMutation = useMutation({
    mutationFn: (candidate: ReleaseRow) => api.releaseApi.grabRelease(candidate),
  });

  const releaseRows = useMemo<ReleaseViewRow[]>(
    () =>
      (releasesQuery.data ?? []).map(row => {
        const rowId = buildReleaseRowId(row);
        const titleOverride = overridesByRowId[rowId];

        return {
          ...row,
          rowId,
          title: titleOverride ?? row.title,
        };
      }),
    [overridesByRowId, releasesQuery.data],
  );

  const filteredReleaseRows = useMemo(() => {
    const minSizeGb = Number.parseFloat(minSizeGbFilter);
    const minSeeders = Number.parseInt(minSeedersFilter, 10);

    return releaseRows.filter(row => {
      const protocol = inferProtocol(row);
      if (protocolFilter !== 'all' && protocol !== protocolFilter) {
        return false;
      }

      if (Number.isFinite(minSizeGb) && minSizeGb > 0) {
        const rowSizeGb = row.size / (1024 * 1024 * 1024);
        if (rowSizeGb < minSizeGb) {
          return false;
        }
      }

      if (Number.isFinite(minSeeders) && minSeeders > 0 && row.seeders < minSeeders) {
        return false;
      }

      return matchesCustomFilters(row, customFilter);
    });
  }, [customFilter, minSeedersFilter, minSizeGbFilter, protocolFilter, releaseRows]);

  const releaseById = useMemo(
    () => new Map(filteredReleaseRows.map(row => [row.rowId, row])),
    [filteredReleaseRows],
  );

  const columns: DataTableColumn<ReleaseViewRow>[] = [
    {
      key: 'select',
      header: 'Select',
      render: row => <SelectionCheckbox rowId={row.rowId} />,
    },
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
              <Label key={`${row.rowId}-${flag}`}>{flag}</Label>
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

  const handleGrab = async (candidate: ReleaseViewRow) => {
    try {
      await grabMutation.mutateAsync(toReleasePayload(candidate));
      setActionNotice({
        tone: 'success',
        message: `Grabbed ${candidate.title}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grab release.';
      setActionNotice({
        tone: 'error',
        message,
      });
    }
  };

  const handleBulkGrab = async (selectedIds: Array<string | number>) => {
    const candidates = selectedIds
      .map(id => releaseById.get(String(id)))
      .filter((row): row is ReleaseViewRow => Boolean(row?.magnetUrl));

    if (candidates.length === 0) {
      setActionNotice({
        tone: 'error',
        message: 'No selected releases contain a magnet URL.',
      });
      return;
    }

    const results = await Promise.allSettled(candidates.map(candidate => grabMutation.mutateAsync(toReleasePayload(candidate))));
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    if (failureCount === 0) {
      setActionNotice({
        tone: 'success',
        message: `Bulk grabbed ${successCount} release${successCount === 1 ? '' : 's'}.`,
      });
      return;
    }

    setActionNotice({
      tone: 'error',
      message: `Bulk grab completed with ${successCount} success and ${failureCount} failure.`,
    });
  };

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
          <div className="space-y-3">
            {actionNotice ? (
              <p
                className={`rounded-sm border px-3 py-2 text-sm ${
                  actionNotice.tone === 'success'
                    ? 'border-status-completed/40 bg-status-completed/15 text-status-completed'
                    : 'border-status-error/40 bg-status-error/15 text-status-error'
                }`}
                role="status"
              >
                {actionNotice.message}
              </p>
            ) : null}

            <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-xs">
                  <span>Protocol filter</span>
                  <select
                    aria-label="Protocol filter"
                    className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
                    value={protocolFilter}
                    onChange={event => {
                      setProtocolFilter(event.currentTarget.value as 'all' | 'torrent' | 'usenet' | 'unknown');
                    }}
                  >
                    <option value="all">all</option>
                    <option value="torrent">torrent</option>
                    <option value="usenet">usenet</option>
                    <option value="unknown">unknown</option>
                  </select>
                </label>

                <label className="grid gap-1 text-xs">
                  <span>Minimum size (GB)</span>
                  <input
                    aria-label="Minimum size (GB)"
                    type="number"
                    min={0}
                    step="0.1"
                    value={minSizeGbFilter}
                    onChange={event => {
                      setMinSizeGbFilter(event.currentTarget.value);
                    }}
                    className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
                  />
                </label>

                <label className="grid gap-1 text-xs">
                  <span>Minimum seeders</span>
                  <input
                    aria-label="Minimum seeders"
                    type="number"
                    min={0}
                    value={minSeedersFilter}
                    onChange={event => {
                      setMinSeedersFilter(event.currentTarget.value);
                    }}
                    className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => {
                    setShowCustomFilters(current => !current);
                  }}
                >
                  {showCustomFilters ? 'Hide custom filters' : 'Show custom filters'}
                </button>
                {customFilter ? (
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                    onClick={() => {
                      setCustomFilter(null);
                    }}
                  >
                    Clear custom filters
                  </button>
                ) : null}
              </div>

              {showCustomFilters ? (
                <FilterBuilder
                  fields={[
                    { key: 'title', label: 'Title' },
                    { key: 'indexer', label: 'Indexer' },
                    { key: 'protocol', label: 'Protocol' },
                    { key: 'size', label: 'Size (GB)' },
                    { key: 'seeders', label: 'Seeders' },
                  ]}
                  onApply={result => {
                    setCustomFilter(result);
                  }}
                />
              ) : null}
            </section>

            <SelectProvider rowIds={filteredReleaseRows.map(row => row.rowId)}>
              <DataTable
                data={filteredReleaseRows}
                columns={columns}
                getRowId={row => row.rowId}
                rowActions={row => {
                  const downloadHref = row.downloadUrl ?? row.magnetUrl;
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label={`Grab release ${row.title}`}
                        className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                        disabled={grabMutation.isPending || !row.magnetUrl}
                        onClick={() => {
                          void handleGrab(row);
                        }}
                      >
                        Grab
                      </button>
                      {downloadHref ? (
                        <a
                          aria-label={`Download release ${row.title}`}
                          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                          href={downloadHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                          disabled
                        >
                          Download
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Override match ${row.title}`}
                        className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                        onClick={() => {
                          setOverrideTarget(row);
                          setOverrideTitle(row.title);
                        }}
                      >
                        Override
                      </button>
                    </div>
                  );
                }}
              />
              <SelectFooter
                actions={[
                  {
                    label: 'Bulk grab',
                    onClick: selectedIds => {
                      void handleBulkGrab(selectedIds);
                    },
                  },
                ]}
              />
            </SelectProvider>
          </div>
        </QueryPanel>
      ) : (
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
          Run a manual search to inspect release results and ranking.
        </section>
      )}

      <Modal
        isOpen={Boolean(overrideTarget)}
        ariaLabel="Override release match"
        onClose={() => {
          setOverrideTarget(null);
          setOverrideTitle('');
        }}
      >
        <ModalHeader
          title="Override release match"
          onClose={() => {
            setOverrideTarget(null);
            setOverrideTitle('');
          }}
        />
        <ModalBody>
          <label className="grid gap-1 text-sm">
            <span>Override title</span>
            <input
              aria-label="Override title"
              value={overrideTitle}
              onChange={event => {
                setOverrideTitle(event.currentTarget.value);
              }}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setOverrideTarget(null);
              setOverrideTitle('');
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              if (!overrideTarget) {
                return;
              }

              const nextTitle = overrideTitle.trim();
              if (nextTitle.length === 0) {
                return;
              }

              setOverridesByRowId(current => ({
                ...current,
                [overrideTarget.rowId]: nextTitle,
              }));
              setOverrideTarget(null);
              setOverrideTitle('');
            }}
          >
            Apply override
          </button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
