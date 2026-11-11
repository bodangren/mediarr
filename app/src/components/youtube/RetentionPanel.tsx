import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { YoutubeApi, YoutubeRetentionCandidate } from '@/lib/api/youtubeApi';
import {
  errorText,
  FeedbackLine,
  formatAge,
  formatBytes,
  formatDate,
  useConfirmAction,
  useFeedbackMap,
} from './manageShared';

interface RetentionPanelProps {
  api: YoutubeApi;
  /** Refresh the page-level library/queue after files move or are purged. */
  onChanged?: () => void;
}

/**
 * Retention surface: watched subscription videos older than N days, the quarantined copies they
 * become, and the two guarded routes that restore or permanently purge one. Files are named in full
 * in every confirmation.
 */
export function RetentionPanel({ api, onChanged }: RetentionPanelProps) {
  const { feedback, show } = useFeedbackMap();
  const { confirm, dialog } = useConfirmAction();
  const [days, setDays] = useState(7);
  const [candidates, setCandidates] = useState<YoutubeRetentionCandidate[]>([]);
  const [quarantined, setQuarantined] = useState<YoutubeRetentionCandidate[]>([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [quarantineError, setQuarantineError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (retentionDays: number) => {
    setIsLoading(true);
    setCandidateError(null);
    setQuarantineError(null);
    try {
      const result = await api.listRetentionCandidates(retentionDays);
      setCandidates(result.candidates);
    } catch (error) {
      setCandidates([]);
      setCandidateError(errorText(error, 'Failed to load retention candidates'));
    }
    try {
      const result = await api.listQuarantined();
      setQuarantined(result.items);
    } catch (error) {
      setQuarantined([]);
      setQuarantineError(errorText(error, 'Failed to load quarantined videos'));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load(7);
  }, [load]);

  const handleRun = () => {
    confirm({
      title: `Quarantine ${candidates.length} watched video${candidates.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Quarantine now',
      description: (
        <div className="space-y-2">
          <p>
            Watched subscription videos older than {days} day{days === 1 ? '' : 's'} move into the
            quarantine folder. Restore or purge each one below.
          </p>
          {candidates.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-auto font-mono text-xs text-text-primary">
              {candidates.map((row) => <li key={row.id} className="break-all">{row.title}</li>)}
            </ul>
          ) : null}
        </div>
      ),
      run: async () => {
        setIsRunning(true);
        show('run', null);
        try {
          const receipt = await api.runRetention(days, false);
          show('run', {
            kind: receipt.failed.length > 0 ? 'error' : 'success',
            text: `Moved ${receipt.moved.length} file${receipt.moved.length === 1 ? '' : 's'} to quarantine, skipped ${receipt.skipped}${receipt.failed.length > 0 ? `, ${receipt.failed.length} failed: ${receipt.failed[0]?.error ?? ''}` : ''}.`,
          });
          await load(days);
          onChanged?.();
        } catch (error) {
          show('run', { kind: 'error', text: errorText(error, 'Failed to run retention') });
        } finally {
          setIsRunning(false);
        }
      },
    });
  };

  const handleRestore = async (row: YoutubeRetentionCandidate) => {
    setBusyId(row.id);
    show('retention', null);
    try {
      const result = await api.restoreRetention(row.id);
      if (!result.restored) {
        show('retention', {
          kind: 'error',
          text: result.error ?? `Failed to restore ${row.path ?? row.title}`,
        });
      } else {
        show('retention', { kind: 'success', text: `Restored to ${result.originalPath}.` });
      }
      await load(days);
      onChanged?.();
    } catch (error) {
      show('retention', { kind: 'error', text: errorText(error, 'Failed to restore video') });
    } finally {
      setBusyId(null);
    }
  };

  const askPurge = (row: YoutubeRetentionCandidate) => {
    confirm({
      title: `Permanently delete “${row.title}”?`,
      confirmLabel: 'Delete permanently',
      description: (
        <div className="space-y-2">
          <p className="break-all font-mono text-xs text-text-primary">{row.path ?? 'no path recorded'}</p>
          <p>This removes the quarantined file from disk. It cannot be undone.</p>
        </div>
      ),
      run: async () => {
        try {
          await api.purgeRetention(row.id);
          setQuarantined((previous) => previous.filter((item) => item.id !== row.id));
          show('retention', { kind: 'success', text: `Permanently deleted ${row.path ?? row.title}.` });
          onChanged?.();
        } catch (error) {
          show('retention', { kind: 'error', text: errorText(error, 'Failed to purge video') });
        }
      },
    });
  };

  return (
    <section aria-label="YouTube retention" className="space-y-5">
      {dialog}
      <div className="grid gap-3 rounded-md border border-border-subtle bg-surface-1 p-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Retention days
          <Input
            type="number"
            min={1}
            max={365}
            value={String(days)}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setDays(Number.isFinite(next) ? Math.max(1, Math.min(365, next)) : 7);
            }}
            aria-label="Retention days"
            className="max-w-24"
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => void load(days)} disabled={isLoading || isRunning}>
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {isLoading ? 'Loading…' : 'Preview candidates'}
        </Button>
        <div className="flex flex-col gap-1 sm:items-end">
          <Button variant="destructive" size="sm" onClick={handleRun} disabled={isRunning || candidates.length === 0}>
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            {isRunning ? 'Quarantining…' : 'Quarantine eligible videos'}
          </Button>
          <p className="text-xs text-text-muted">
            {candidates.length} watched video{candidates.length === 1 ? '' : 's'} older than {days} day{days === 1 ? '' : 's'}
          </p>
        </div>
        <div className="sm:col-span-3">
          <FeedbackLine feedback={feedback.run} />
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Retention candidates</h2>
          <p className="text-xs text-text-muted">Watched subscription videos past the retention window. Preview is read-only.</p>
        </div>
        {candidateError ? (
          <p role="alert" className="rounded-md border border-accent-danger/40 bg-surface-1 p-3 text-sm text-accent-danger">{candidateError}</p>
        ) : null}
        {!isLoading && !candidateError && candidates.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing is eligible at {days} day{days === 1 ? '' : 's'}.</p>
        ) : null}
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-1">
          {candidates.map((row) => (
            <li key={row.id} className="space-y-1 px-4 py-3">
              <p className="truncate text-sm font-medium text-text-primary" title={row.title}>{row.title}</p>
              <p className="text-xs text-text-muted">
                {row.channel ?? 'Unknown channel'} · watched {formatDate(row.watchedAt)} ({formatAge(row.watchedAt)}) · {formatBytes(row.sizeBytes)}
              </p>
              <p className="break-all font-mono text-xs text-text-muted">{row.path ?? 'no path recorded'}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Quarantined</h2>
          <p className="text-xs text-text-muted">Restore puts the file back at its original path; purge deletes it for good.</p>
        </div>
        <FeedbackLine feedback={feedback.retention} />
        {quarantineError ? (
          <p role="alert" className="rounded-md border border-accent-danger/40 bg-surface-1 p-3 text-sm text-accent-danger">{quarantineError}</p>
        ) : null}
        {!isLoading && !quarantineError && quarantined.length === 0 ? (
          <p className="text-sm text-text-muted">No quarantined videos.</p>
        ) : null}
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-1">
          {quarantined.map((row) => {
            const isBusy = busyId === row.id;
            return (
              <li key={row.id} className="space-y-2 px-4 py-3">
                <p className="truncate text-sm font-medium text-text-primary" title={row.title}>{row.title}</p>
                <p className="text-xs text-text-muted">
                  {row.channel ?? 'Unknown channel'} · watched {formatDate(row.watchedAt)} ({formatAge(row.watchedAt)}) · {formatBytes(row.sizeBytes)}
                </p>
                <p className="break-all font-mono text-xs text-text-muted">{row.path ?? 'no path recorded'}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="xs" onClick={() => void handleRestore(row)} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
                    {isBusy ? 'Working…' : 'Restore'}
                  </Button>
                  <Button variant="destructive" size="xs" onClick={() => askPurge(row)} disabled={isBusy}>
                    Purge permanently
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
