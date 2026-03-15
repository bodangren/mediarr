import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { TorrentLimitsSettings } from '@/lib/api/downloadClientsApi';

export function SettingsClientsPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<TorrentLimitsSettings | null>(null);
  const [incompleteDirectory, setIncompleteDirectory] = useState('');
  const [completeDirectory, setCompleteDirectory] = useState('');
  const [globalDownloadLimitKbps, setGlobalDownloadLimitKbps] = useState('0');
  const [globalUploadLimitKbps, setGlobalUploadLimitKbps] = useState('0');
  const [maxActiveDownloads, setMaxActiveDownloads] = useState('3');
  const [seedRatioLimit, setSeedRatioLimit] = useState('0');
  const [seedTimeLimitMinutes, setSeedTimeLimitMinutes] = useState('0');
  const [seedLimitAction, setSeedLimitAction] = useState<'pause' | 'remove'>('pause');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBrowser, setActiveBrowser] = useState<'incomplete' | 'complete' | null>(null);
  const [incompleteStatus, setIncompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [completeStatus, setCompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

  const validateDirectory = useCallback(
    async (path: string, setStatus: (s: 'writable' | 'readonly' | 'notfound') => void) => {
      try {
        const result = await api.filesystemApi.list(path);
        setStatus(result.writable ? 'writable' : 'readonly');
      } catch {
        setStatus('notfound');
      }
    },
    [api.filesystemApi],
  );

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const value = await api.downloadClientApi.get();
        setSettings(value);
        setIncompleteDirectory(value.incompleteDirectory);
        setCompleteDirectory(value.completeDirectory);
        setGlobalDownloadLimitKbps(String(value.globalDownloadLimitKbps ?? 0));
        setGlobalUploadLimitKbps(String(value.globalUploadLimitKbps ?? 0));
        setMaxActiveDownloads(String(value.maxActiveDownloads));
        setSeedRatioLimit(String(value.seedRatioLimit));
        setSeedTimeLimitMinutes(String(value.seedTimeLimitMinutes));
        setSeedLimitAction(value.seedLimitAction);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load download client settings');
      }
    };

    void load();
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    try {
      const dlLimit = Number.parseFloat(globalDownloadLimitKbps);
      const ulLimit = Number.parseFloat(globalUploadLimitKbps);
      const updated = await api.downloadClientApi.save({
        maxActiveDownloads: Number.parseInt(maxActiveDownloads, 10),
        maxActiveSeeds: settings?.maxActiveSeeds ?? 3,
        globalDownloadLimitKbps: dlLimit > 0 ? dlLimit : null,
        globalUploadLimitKbps: ulLimit > 0 ? ulLimit : null,
        incompleteDirectory,
        completeDirectory,
        seedRatioLimit: Number.parseFloat(seedRatioLimit),
        seedTimeLimitMinutes: Number.parseInt(seedTimeLimitMinutes, 10),
        seedLimitAction,
      });
      setSettings(updated);
      setIncompleteDirectory(updated.incompleteDirectory);
      setCompleteDirectory(updated.completeDirectory);
      setGlobalDownloadLimitKbps(String(updated.globalDownloadLimitKbps ?? 0));
      setGlobalUploadLimitKbps(String(updated.globalUploadLimitKbps ?? 0));
      setMaxActiveDownloads(String(updated.maxActiveDownloads));
      setSeedRatioLimit(String(updated.seedRatioLimit));
      setSeedTimeLimitMinutes(String(updated.seedTimeLimitMinutes));
      setSeedLimitAction(updated.seedLimitAction);
      pushToast({ title: 'Download Client settings saved.', variant: 'success' });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save download client settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Download Client" description="Integrated downloader settings for the built-in torrent client.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <form
        className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary"
        onSubmit={event => { void onSave(event); }}
      >
        {!settings ? (
          <p>Loading settings...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="text-sm text-text-secondary">
              <label>
                Incomplete Directory
                <p className="text-xs text-text-secondary">Where downloading pieces are stored temporarily.</p>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={incompleteDirectory}
                    onChange={event => { setIncompleteDirectory(event.target.value); setIncompleteStatus(null); }}
                    className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    aria-label="Browse incomplete directory"
                    onClick={() => setActiveBrowser('incomplete')}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Validate incomplete directory"
                    onClick={() => { void validateDirectory(incompleteDirectory, setIncompleteStatus); }}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                  >
                    Validate
                  </button>
                </div>
              </label>
              {incompleteStatus === 'writable' && (
                <span className="mt-1 block text-xs text-green-500">✓ Writable</span>
              )}
              {incompleteStatus === 'readonly' && (
                <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>
              )}
              {incompleteStatus === 'notfound' && (
                <span className="mt-1 block text-xs text-red-500">✗ Not found</span>
              )}
            </div>
            <div className="text-sm text-text-secondary">
              <label>
                Complete Directory
                <p className="text-xs text-text-secondary">Where finished torrents are moved after download.</p>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={completeDirectory}
                    onChange={event => { setCompleteDirectory(event.target.value); setCompleteStatus(null); }}
                    className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    aria-label="Browse complete directory"
                    onClick={() => setActiveBrowser('complete')}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Validate complete directory"
                    onClick={() => { void validateDirectory(completeDirectory, setCompleteStatus); }}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                  >
                    Validate
                  </button>
                </div>
              </label>
              {completeStatus === 'writable' && (
                <span className="mt-1 block text-xs text-green-500">✓ Writable</span>
              )}
              {completeStatus === 'readonly' && (
                <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>
              )}
              {completeStatus === 'notfound' && (
                <span className="mt-1 block text-xs text-red-500">✗ Not found</span>
              )}
            </div>
            <label className="text-sm text-text-secondary">
              Max Download Speed (KB/s, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={globalDownloadLimitKbps}
                onChange={event => setGlobalDownloadLimitKbps(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Upload Speed (KB/s, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={globalUploadLimitKbps}
                onChange={event => setGlobalUploadLimitKbps(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Downloads (0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={maxActiveDownloads}
                onChange={event => setMaxActiveDownloads(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Seed Ratio Limit (0 = unlimited)
              <input
                type="number"
                min={0}
                step={0.01}
                value={seedRatioLimit}
                onChange={event => setSeedRatioLimit(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Seed Time Limit (minutes, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={seedTimeLimitMinutes}
                onChange={event => setSeedTimeLimitMinutes(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              When Seed Limit Reached
              <select
                value={seedLimitAction}
                onChange={event => setSeedLimitAction(event.target.value as 'pause' | 'remove')}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              >
                <option value="pause">Pause torrent</option>
                <option value="remove">Remove torrent</option>
              </select>
            </label>
          </div>
        )}
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
            disabled={!settings || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Download Client Settings'}
          </button>
        </div>
      </form>
      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'incomplete') {
            setIncompleteDirectory(path);
            setIncompleteStatus(null);
          } else if (activeBrowser === 'complete') {
            setCompleteDirectory(path);
            setCompleteStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'incomplete' ? incompleteDirectory : completeDirectory}
      />
    </RouteScaffold>
  );
}
