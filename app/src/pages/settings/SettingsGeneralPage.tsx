import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { AppSettings } from '@/lib/api/settingsApi';

export function SettingsGeneralPage() {
  const api = useMemo(() => getApiClients(), []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [rssSyncMinutes, setRssSyncMinutes] = useState('');
  const [maxActiveDownloads, setMaxActiveDownloads] = useState('');
  const [maxActiveSeeds, setMaxActiveSeeds] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const value = await api.settingsApi.get();
        setSettings(value);
        setRssSyncMinutes(String(value.schedulerIntervals.rssSyncMinutes));
        setMaxActiveDownloads(String(value.torrentLimits.maxActiveDownloads));
        setMaxActiveSeeds(String(value.torrentLimits.maxActiveSeeds));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load general settings');
      }
    };

    void load();
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!settings) {
      return;
    }

    const rss = Number.parseInt(rssSyncMinutes, 10);
    const downloads = Number.parseInt(maxActiveDownloads, 10);
    const seeds = Number.parseInt(maxActiveSeeds, 10);

    if (!Number.isFinite(rss) || rss <= 0 || !Number.isFinite(downloads) || downloads <= 0 || !Number.isFinite(seeds) || seeds <= 0) {
      setError('All values must be positive integers.');
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.settingsApi.update({
        schedulerIntervals: {
          ...settings.schedulerIntervals,
          rssSyncMinutes: rss,
        },
        torrentLimits: {
          ...settings.torrentLimits,
          maxActiveDownloads: downloads,
          maxActiveSeeds: seeds,
        },
      });
      setSettings(updated);
      setRssSyncMinutes(String(updated.schedulerIntervals.rssSyncMinutes));
      setMaxActiveDownloads(String(updated.torrentLimits.maxActiveDownloads));
      setMaxActiveSeeds(String(updated.torrentLimits.maxActiveSeeds));
      setMessage('General settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save general settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="General" description="Global daemon and scheduler controls for the unified application.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      <form className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary" onSubmit={event => { void onSave(event); }}>
        {!settings ? (
          <p>Loading settings...</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="text-sm text-text-secondary">
              RSS Sync Interval (minutes)
              <input
                type="number"
                min={1}
                value={rssSyncMinutes}
                onChange={event => setRssSyncMinutes(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Downloads
              <input
                type="number"
                min={1}
                value={maxActiveDownloads}
                onChange={event => setMaxActiveDownloads(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Seeds
              <input
                type="number"
                min={1}
                value={maxActiveSeeds}
                onChange={event => setMaxActiveSeeds(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
          </div>
        )}
        <div className="mt-3">
          <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={!settings || isSaving}>
            {isSaving ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      </form>
    </RouteScaffold>
  );
}
