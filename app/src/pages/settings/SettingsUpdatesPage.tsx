import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getApiClients } from '@/lib/api/client';
import type {
  AvailableUpdate,
  CurrentVersion,
  InstallUpdateResult,
  UpdateHistoryEntry,
  UpdateProgress,
} from '@/lib/api/updatesApi';

const HISTORY_PAGE_SIZE = 20;

export function SettingsUpdatesPage() {
  const api = useMemo(() => getApiClients(), []);

  const [currentVersion, setCurrentVersion] = useState<CurrentVersion | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate>({ available: false });
  const [history, setHistory] = useState<UpdateHistoryEntry[]>([]);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<InstallUpdateResult | null>(null);

  const loadData = async () => {
    const [version, available, historyResponse] = await Promise.all([
      api.updatesApi.getCurrentVersion(),
      api.updatesApi.getAvailableUpdates(),
      api.updatesApi.getUpdateHistory({ page: 1, pageSize: HISTORY_PAGE_SIZE }),
    ]);

    setCurrentVersion(version);
    setAvailableUpdate(available);
    setHistory(historyResponse.items);
  };

  useEffect(() => {
    const run = async () => {
      setError(null);
      try {
        await loadData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load update settings');
      }
    };

    void run();
  }, [api]);

  useEffect(() => {
    if (!activeUpdateId || !progress) {
      return;
    }

    if (
      progress.status !== 'downloading' &&
      progress.status !== 'verifying' &&
      progress.status !== 'installing'
    ) {
      return;
    }

    const timer = setInterval(() => {
      void api.updatesApi.getUpdateProgress(activeUpdateId)
        .then(next => {
          setProgress(next);
          if (next.status === 'completed' || next.status === 'failed') {
            setIsDownloading(false);
          }
        })
        .catch((pollError) => {
          setError(pollError instanceof Error ? pollError.message : 'Failed to refresh update progress');
          setIsDownloading(false);
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeUpdateId, api, progress]);

  const onCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    setMessage(null);
    setInstallResult(null);
    try {
      const check = await api.updatesApi.checkForUpdates();
      await loadData();
      setMessage(check.available || check.updateAvailable ? 'Update available.' : 'No updates available.');
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const onDownload = async () => {
    if (!availableUpdate.available || !availableUpdate.version) {
      return;
    }

    setIsDownloading(true);
    setError(null);
    setMessage(null);
    setInstallResult(null);
    try {
      const started = await api.updatesApi.downloadUpdate(availableUpdate.version);
      setProgress(started);
      setActiveUpdateId(started.updateId);
      if (started.status === 'completed' || started.status === 'failed') {
        setIsDownloading(false);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download update');
      setIsDownloading(false);
    }
  };

  const onInstall = async () => {
    if (!availableUpdate.version) {
      return;
    }

    setIsInstalling(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.updatesApi.installUpdate(
        progress?.updateId
          ? { updateId: progress.updateId }
          : { version: availableUpdate.version },
      );
      setInstallResult(result);
      setMessage(result.message);
      await loadData();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : 'Failed to install update');
    } finally {
      setIsInstalling(false);
    }
  };

  const downloadReady = progress?.status === 'completed' || Boolean(progress?.stagedPath);

  return (
    <RouteScaffold
      title="Updates"
      description="Check GitHub releases, download updates, and install when ready."
      actions={(
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isChecking}
          onClick={() => { void onCheckForUpdates(); }}
        >
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </Button>
      )}
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm">
        <h2 className="text-base font-semibold text-text-primary">Current Version</h2>
        {!currentVersion ? (
          <p className="mt-2 text-text-secondary">Loading current version...</p>
        ) : (
          <div className="mt-2 grid gap-1 text-text-secondary">
            <p><span className="font-medium text-text-primary">Version:</span> {currentVersion.version}</p>
            <p><span className="font-medium text-text-primary">Branch:</span> {currentVersion.branch}</p>
            <p><span className="font-medium text-text-primary">Commit:</span> {currentVersion.commit}</p>
            <p><span className="font-medium text-text-primary">Build Date:</span> {currentVersion.buildDate}</p>
          </div>
        )}
      </section>

      <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm">
        <h2 className="text-base font-semibold text-text-primary">Available Update</h2>
        {!availableUpdate.available ? (
          <p className="mt-2 text-text-secondary">No cached update available. Click "Check for Updates".</p>
        ) : (
          <div className="mt-2 space-y-2 text-text-secondary">
            <p><span className="font-medium text-text-primary">Version:</span> {availableUpdate.version}</p>
            <p><span className="font-medium text-text-primary">Published:</span> {availableUpdate.releaseDate}</p>
            <p><span className="font-medium text-text-primary">Download:</span> {availableUpdate.downloadUrl}</p>
            <pre className="max-h-44 overflow-auto rounded-sm border border-border-subtle bg-surface-0 p-3 text-xs text-text-secondary">
              {availableUpdate.changelog || 'No changelog provided'}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDownloading}
                onClick={() => { void onDownload(); }}
              >
                {isDownloading ? 'Downloading...' : 'Download Update'}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isInstalling || !downloadReady}
                onClick={() => { void onInstall(); }}
              >
                {isInstalling ? 'Installing...' : 'Install Update'}
              </Button>
            </div>
            {installResult?.mode === 'docker' && installResult.command ? (
              <p className="rounded-sm border border-border-subtle bg-surface-0 p-2 text-xs">
                Docker command: {installResult.command}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {progress ? (
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm">
          <h2 className="text-base font-semibold text-text-primary">Download Progress</h2>
          <p className="mt-2 text-text-secondary">{progress.message}</p>
          <Progress className="mt-2" value={progress.progress} />
          <p className="mt-2 text-xs text-text-secondary">
            {progress.progress}% ({progress.bytesDownloaded} / {progress.totalBytes ?? 'unknown'} bytes)
          </p>
          {progress.error ? <p className="mt-1 text-xs text-status-error">{progress.error}</p> : null}
        </section>
      ) : null}

      <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm">
        <h2 className="text-base font-semibold text-text-primary">Update History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-text-secondary">No update installs recorded yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="text-text-secondary">
                  <th className="pr-3">Version</th>
                  <th className="pr-3">Date</th>
                  <th className="pr-3">Status</th>
                  <th className="pr-3">Branch</th>
                </tr>
              </thead>
              <tbody>
                {history.map(entry => (
                  <tr key={entry.id} className="border-t border-border-subtle">
                    <td className="py-1 pr-3 text-text-primary">{entry.version}</td>
                    <td className="py-1 pr-3 text-text-secondary">{entry.installedDate}</td>
                    <td className="py-1 pr-3 text-text-secondary">{entry.status}</td>
                    <td className="py-1 pr-3 text-text-secondary">{entry.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </RouteScaffold>
  );
}
