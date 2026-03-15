import { useEffect, useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { ImportWizard } from '@/components/import/ImportWizard';
import { SeriesOverviewView } from '@/components/views';
import { getApiClients } from '@/lib/api/client';
import type { SeriesListItem as SeriesViewItem } from '@/types/series';

export function SeriesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [series, setSeries] = useState<SeriesViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listSeries({ page: 1, pageSize: 10_000 });
      setSeries(page.items as SeriesViewItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load series');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const sortedSeries = useMemo(() => {
    const sign = sortDir === 'desc' ? -1 : 1;
    const field = sortBy === 'title' ? 'sortTitle' : sortBy;
    return [...series].sort((a, b) => {
      const aVal = (a as any)[field] ?? (sortBy === 'title' ? a.title : 0);
      const bVal = (b as any)[field] ?? (sortBy === 'title' ? b.title : 0);
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * sign;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * sign;
    });
  }, [series, sortBy, sortDir]);

  return (
    <RouteScaffold
      title="TV Shows"
      description="Unified TV library view with monitoring controls and details access."
      actions={
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3"
        >
          <Folder size={14} />
          Import Existing
        </button>
      }
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
        >
          <option value="title">Name</option>
          <option value="year">Year</option>
          <option value="sizeOnDisk">Size</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary hover:bg-surface-2"
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>
      <SeriesOverviewView
        items={sortedSeries}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setSeriesMonitored(id, monitored).then(load);
        }}
        onDelete={async id => {
          const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
          await api.mediaApi.deleteSeries(id, deleteFiles);
          await load();
        }}
        onRefresh={() => {
          void load();
        }}
      />
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); void load(); }}
        mediaType="series"
      />
    </RouteScaffold>
  );
}
