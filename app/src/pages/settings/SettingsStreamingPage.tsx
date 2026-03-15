import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';

export function SettingsStreamingPage() {
  const api = useMemo(() => getApiClients(), []);
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [discoveryServiceName, setDiscoveryServiceName] = useState('Mediarr');
  const [defaultUserId, setDefaultUserId] = useState('lan-default');
  const [watchedThresholdPercent, setWatchedThresholdPercent] = useState('90');
  const [subtitleDirectory, setSubtitleDirectory] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const settings = await api.settingsApi.get();
        const streaming = settings.streaming;

        setDiscoveryEnabled(streaming?.discoveryEnabled ?? true);
        setDiscoveryServiceName(streaming?.discoveryServiceName ?? 'Mediarr');
        setDefaultUserId(streaming?.defaultUserId ?? 'lan-default');
        setWatchedThresholdPercent(String(Math.round((streaming?.watchedThreshold ?? 0.9) * 100)));
        setSubtitleDirectory(streaming?.subtitleDirectory ?? '');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load streaming settings');
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedServiceName = discoveryServiceName.trim();
    const normalizedDefaultUserId = defaultUserId.trim();
    const normalizedSubtitleDirectory = subtitleDirectory.trim();
    const threshold = Number.parseFloat(watchedThresholdPercent);

    if (normalizedServiceName.length === 0) {
      setError('Discovery service name is required.');
      setMessage(null);
      return;
    }

    if (normalizedDefaultUserId.length === 0) {
      setError('Default playback user id is required.');
      setMessage(null);
      return;
    }

    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
      setError('Watched threshold must be a number between 1 and 100.');
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.settingsApi.update({
        streaming: {
          discoveryEnabled,
          discoveryServiceName: normalizedServiceName,
          defaultUserId: normalizedDefaultUserId,
          watchedThreshold: threshold / 100,
          subtitleDirectory: normalizedSubtitleDirectory.length > 0
            ? normalizedSubtitleDirectory
            : null,
        },
      });

      const nextStreaming = updated.streaming ?? {
        discoveryEnabled,
        discoveryServiceName: normalizedServiceName,
        defaultUserId: normalizedDefaultUserId,
        watchedThreshold: threshold / 100,
        subtitleDirectory: normalizedSubtitleDirectory.length > 0
          ? normalizedSubtitleDirectory
          : null,
      };
      setDiscoveryEnabled(nextStreaming.discoveryEnabled);
      setDiscoveryServiceName(nextStreaming.discoveryServiceName);
      setDefaultUserId(nextStreaming.defaultUserId);
      setWatchedThresholdPercent(String(Math.round(nextStreaming.watchedThreshold * 100)));
      setSubtitleDirectory(nextStreaming.subtitleDirectory ?? '');
      setMessage('Streaming settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save streaming settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Streaming" description="Playback and discovery settings for LAN streaming clients.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {!isLoaded ? <p className="text-sm text-text-secondary">Loading streaming settings...</p> : null}

      <form className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary" onSubmit={event => { void onSave(event); }}>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={discoveryEnabled}
            onChange={event => setDiscoveryEnabled(event.target.checked)}
          />
          Enable mDNS discovery broadcast
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Discovery Service Name
          <input
            type="text"
            value={discoveryServiceName}
            onChange={event => setDiscoveryServiceName(event.target.value)}
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Default Playback User ID
          <input
            type="text"
            value={defaultUserId}
            onChange={event => setDefaultUserId(event.target.value)}
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Watched Threshold (%)
          <input
            type="number"
            min={1}
            max={100}
            value={watchedThresholdPercent}
            onChange={event => setWatchedThresholdPercent(event.target.value)}
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
          <p className="mt-1 text-xs text-text-secondary">Media is marked watched once playback progress reaches this percentage.</p>
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Subtitle Directory (Optional)
          <input
            type="text"
            value={subtitleDirectory}
            onChange={event => setSubtitleDirectory(event.target.value)}
            placeholder="/path/to/subtitles"
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Additional root allowed for sidecar subtitle streaming.
          </p>
        </label>

        <p className="mt-3 text-xs text-text-secondary">Discovery service changes apply on next server restart.</p>

        <div className="mt-3">
          <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={!isLoaded || isSaving}>
            {isSaving ? 'Saving...' : 'Save Streaming Settings'}
          </button>
        </div>
      </form>
    </RouteScaffold>
  );
}
