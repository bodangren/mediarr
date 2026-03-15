import { useCallback, useEffect, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { SystemEvent, EventLevel, EventType } from '@/lib/api/systemApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<EventLevel, string> = {
  info: 'bg-blue-500/20 text-blue-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  fatal: 'bg-red-700/30 text-red-300',
};

const EVENT_LEVELS: EventLevel[] = ['info', 'warning', 'error', 'fatal'];
const EVENT_TYPES: EventType[] = [
  'system',
  'indexer',
  'network',
  'download',
  'import',
  'health',
  'update',
  'backup',
  'other',
];

function EventLevelBadge({ level }: { level: EventLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize ${LEVEL_STYLES[level] ?? 'bg-slate-500/20 text-slate-400'}`}
    >
      {level}
    </span>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export function SystemEventsPage() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<EventLevel | ''>('');
  const [typeFilter, setTypeFilter] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getApiClients().systemApi.getEvents({
        page,
        pageSize: PAGE_SIZE,
        ...(levelFilter ? { level: levelFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      setEvents(result.items);
      setTotal(result.meta.totalCount);
    } catch {
      setError('Failed to load system events');
    } finally {
      setLoading(false);
    }
  }, [page, levelFilter, typeFilter]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  async function handleClearAll() {
    setClearing(true);
    try {
      await getApiClients().systemApi.clearEvents();
      setPage(1);
      await fetchEvents();
    } finally {
      setClearing(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const blob = await getApiClients().systemApi.exportEvents({
        format: 'csv',
        page: 1,
        pageSize: 10000,
        ...(levelFilter ? { level: levelFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      triggerDownload(blob, 'system-events.csv');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const actions = (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="text-xs"
        disabled={exporting}
        onClick={() => { void handleExportCsv(); }}
      >
        {exporting ? 'Exporting…' : 'Export CSV'}
      </Button>
      <Button
        variant="destructive"
        className="text-xs"
        disabled={clearing}
        onClick={() => { void handleClearAll(); }}
      >
        {clearing ? 'Clearing…' : 'Clear All'}
      </Button>
    </div>
  );

  return (
    <RouteScaffold
      title="Events"
      description="System event log — indexer activity, download events, health alerts, and more."
      actions={actions}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={levelFilter}
          onChange={e => {
            setLevelFilter(e.target.value as EventLevel | '');
            setPage(1);
          }}
          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
          aria-label="Filter by level"
        >
          <option value="">All levels</option>
          {EVENT_LEVELS.map(l => (
            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value as EventType | '');
            setPage(1);
          }}
          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <section className="rounded-md border border-border-subtle bg-surface-1">
        {loading ? (
          <div className="p-6 text-center text-sm text-text-secondary">Loading events…</div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-status-error">{error}</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-secondary">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-text-secondary">
                  <th className="px-4 pb-2 pt-3 font-medium">Time</th>
                  <th className="pb-2 pr-4 pt-3 font-medium">Level</th>
                  <th className="pb-2 pr-4 pt-3 font-medium">Type</th>
                  <th className="pb-2 pr-4 pt-3 font-medium">Message</th>
                  <th className="pb-2 pr-4 pt-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} className="border-b border-border-subtle/50 last:border-0">
                    <td className="px-4 py-2 text-text-secondary tabular-nums whitespace-nowrap">
                      {formatDateTime(event.timestamp)}
                    </td>
                    <td className="py-2 pr-4">
                      <EventLevelBadge level={event.level} />
                    </td>
                    <td className="py-2 pr-4 capitalize text-text-secondary">{event.type}</td>
                    <td className="py-2 pr-4 max-w-md">{event.message}</td>
                    <td className="py-2 pr-4 text-text-secondary">{event.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-text-secondary">Page {page} of {totalPages}</span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </RouteScaffold>
  );
}
