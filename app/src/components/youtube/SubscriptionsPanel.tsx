import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { YoutubeApi, YoutubeSubscription } from '@/lib/api/youtubeApi';
import { errorText, FeedbackLine, formatDate, useConfirmAction, useFeedbackMap } from './manageShared';

interface SubscriptionsPanelProps {
  api: YoutubeApi;
  /** Called after a poll/removal so the queue summary elsewhere on the page can refresh. */
  onChanged?: () => void;
}

function label(subscription: YoutubeSubscription): string {
  return subscription.title?.trim() || subscription.url;
}

/**
 * Subscription manager: the server already owns polling (`/subscriptions/:id/poll` and
 * `/automation/poll`); this surface only exposes those exact routes with inline results.
 */
export function SubscriptionsPanel({ api, onChanged }: SubscriptionsPanelProps) {
  const { feedback, show } = useFeedbackMap();
  const { confirm, dialog } = useConfirmAction();
  const [subscriptions, setSubscriptions] = useState<YoutubeSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPollingAll, setIsPollingAll] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSubscriptions(await api.listSubscriptions());
    } catch (error) {
      setLoadError(errorText(error, 'Failed to load subscriptions'));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      show('add', { kind: 'error', text: 'Enter a channel URL or @handle first.' });
      return;
    }
    setIsAdding(true);
    show('add', null);
    try {
      const created = await api.addSubscription({
        url: trimmed,
        ...(title.trim().length > 0 ? { title: title.trim() } : {}),
      });
      setSubscriptions((previous) => {
        const without = previous.filter((row) => row.id !== created.id);
        return [...without, created].sort((a, b) => a.added.localeCompare(b.added));
      });
      setUrl('');
      setTitle('');
      show('add', { kind: 'success', text: `Added ${created.title ?? created.url} (${created.kind}).` });
    } catch (error) {
      show('add', { kind: 'error', text: errorText(error, 'Failed to add subscription') });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (subscription: YoutubeSubscription, enabled: boolean) => {
    setBusyId(subscription.id);
    show(`sub-${subscription.id}`, null);
    try {
      const updated = await api.updateSubscription(subscription.id, { enabled });
      setSubscriptions((previous) => previous.map((row) => (row.id === updated.id ? updated : row)));
      show(`sub-${subscription.id}`, {
        kind: 'success',
        text: `${label(updated)} is now ${updated.enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      show(`sub-${subscription.id}`, {
        kind: 'error',
        text: errorText(error, 'Failed to update subscription'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (subscription: YoutubeSubscription) => {
    setEditingId(subscription.id);
    setEditValue(subscription.title ?? '');
  };

  const handleRename = async (event: FormEvent, subscription: YoutubeSubscription) => {
    event.preventDefault();
    setBusyId(subscription.id);
    show(`sub-${subscription.id}`, null);
    try {
      const trimmed = editValue.trim();
      const updated = await api.updateSubscription(subscription.id, { title: trimmed.length > 0 ? trimmed : null });
      setSubscriptions((previous) => previous.map((row) => (row.id === updated.id ? updated : row)));
      setEditingId(null);
      show(`sub-${subscription.id}`, { kind: 'success', text: `Renamed to ${label(updated)}.` });
    } catch (error) {
      show(`sub-${subscription.id}`, {
        kind: 'error',
        text: errorText(error, 'Failed to rename subscription'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePoll = async (subscription: YoutubeSubscription) => {
    setBusyId(subscription.id);
    show(`sub-${subscription.id}`, null);
    try {
      const result = await api.pollSubscription(subscription.id);
      const failure = result.error ?? result.failures[0]?.error ?? null;
      show(`sub-${subscription.id}`, failure
        ? {
            kind: 'error',
            text: `Poll failed for ${label(subscription)}: ${failure}`,
          }
        : {
            kind: 'success',
            text: `Polled ${label(subscription)}: ${result.seen} seen, ${result.queued} queued, ${result.duplicates} duplicates, ${result.skipped} skipped.`,
          });
      await reload();
      onChanged?.();
    } catch (error) {
      show(`sub-${subscription.id}`, {
        kind: 'error',
        text: errorText(error, `Failed to poll ${label(subscription)}`),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePollAll = async () => {
    setIsPollingAll(true);
    show('poll-all', null);
    try {
      const result = await api.pollAllSubscriptions();
      const failures = result.results.filter((row) => row.error || row.failures.length > 0);
      const detail = failures
        .map((row) => `${row.subscriptionId}: ${row.error ?? row.failures[0]?.error ?? 'failed'}`)
        .join('; ');
      show('poll-all', {
        kind: failures.length > 0 ? 'error' : 'success',
        text: `Polled ${result.subscriptions} subscription(s): ${result.queued} queued, ${result.failures} failed.${detail ? ` ${detail}` : ''}`,
      });
      await reload();
      onChanged?.();
    } catch (error) {
      show('poll-all', { kind: 'error', text: errorText(error, 'Failed to poll subscriptions') });
    } finally {
      setIsPollingAll(false);
    }
  };

  const askRemove = (subscription: YoutubeSubscription) => {
    confirm({
      title: `Remove ${label(subscription)}?`,
      confirmLabel: 'Remove subscription',
      description: (
        <div className="space-y-2">
          <p className="break-all font-mono text-xs text-text-primary">{subscription.url}</p>
          <p>Downloaded videos stay in the library; only the subscription and its future polls stop.</p>
        </div>
      ),
      run: async () => {
        try {
          await api.deleteSubscription(subscription.id);
          setSubscriptions((previous) => previous.filter((row) => row.id !== subscription.id));
          show('list', { kind: 'success', text: `Removed ${label(subscription)}.` });
          onChanged?.();
        } catch (error) {
          show(`sub-${subscription.id}`, {
            kind: 'error',
            text: errorText(error, `Failed to remove ${label(subscription)}`),
          });
        }
      },
    });
  };

  return (
    <section aria-label="YouTube subscriptions" className="space-y-4">
      {dialog}
      <form onSubmit={handleAdd} className="grid gap-3 rounded-md border border-border-subtle bg-surface-1 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Channel or playlist URL
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/@handle or UC… channel id"
            aria-label="Channel or playlist URL"
            disabled={isAdding}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Label (optional)
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Dave Gray"
            aria-label="Subscription label"
            disabled={isAdding}
          />
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={isAdding || url.trim().length === 0}>
          {isAdding ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {isAdding ? 'Adding…' : 'Add subscription'}
        </Button>
        <div className="sm:col-span-3">
          <FeedbackLine feedback={feedback.add} />
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          {subscriptions.length} subscription{subscriptions.length === 1 ? '' : 's'} · polling adds new uploads to the download queue
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => void reload()} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handlePollAll()} disabled={isPollingAll || subscriptions.length === 0}>
            {isPollingAll ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            {isPollingAll ? 'Polling all…' : 'Poll all'}
          </Button>
        </div>
      </div>
      <FeedbackLine feedback={feedback['poll-all']} />
      <FeedbackLine feedback={feedback.list} />

      {loadError ? (
        <p role="alert" className="rounded-md border border-accent-danger/40 bg-surface-1 p-3 text-sm text-accent-danger">{loadError}</p>
      ) : null}
      {!isLoading && !loadError && subscriptions.length === 0 ? (
        <p className="text-sm text-text-muted">No subscriptions yet — add a channel or playlist URL above.</p>
      ) : null}

      <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-1">
        {subscriptions.map((subscription) => {
          const rowFeedback = feedback[`sub-${subscription.id}`];
          const isBusy = busyId === subscription.id;
          return (
            <li key={subscription.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-text-primary" title={label(subscription)}>
                    {label(subscription)}
                  </p>
                  <p className="break-all text-xs text-text-muted">
                    {subscription.url} · {subscription.kind}
                    {subscription.externalId ? ` · ${subscription.externalId}` : ''}
                  </p>
                  <p className="text-xs text-text-muted">
                    Added {formatDate(subscription.added)}
                    {subscription.lastPolledAt ? ` · last polled ${formatDate(subscription.lastPolledAt)}` : ' · never polled'}
                  </p>
                  {subscription.lastError ? (
                    <p role="alert" className="break-words text-xs text-accent-danger">{subscription.lastError}</p>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <Switch
                    checked={subscription.enabled}
                    disabled={isBusy}
                    onCheckedChange={(checked) => void handleToggle(subscription, checked)}
                    aria-label={`Enable ${label(subscription)}`}
                  />
                  {subscription.enabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>

              {editingId === subscription.id ? (
                <form onSubmit={(event) => void handleRename(event, subscription)} className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Label
                    <Input
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      aria-label={`Label for ${label(subscription)}`}
                      disabled={isBusy}
                    />
                  </label>
                  <Button type="submit" size="xs" variant="primary" disabled={isBusy}>Save label</Button>
                  <Button type="button" size="xs" variant="ghost" onClick={() => setEditingId(null)} disabled={isBusy}>Cancel</Button>
                </form>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="xs" onClick={() => void handlePoll(subscription)} disabled={isBusy}>
                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
                  {isBusy ? 'Working…' : 'Poll now'}
                </Button>
                <Button variant="ghost" size="xs" onClick={() => startRename(subscription)} disabled={isBusy}>
                  Rename
                </Button>
                <Button variant="destructive" size="xs" onClick={() => askRemove(subscription)} disabled={isBusy}>
                  Remove
                </Button>
                <FeedbackLine feedback={rowFeedback} className="basis-full" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
