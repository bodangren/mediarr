'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { getApiClients } from '@/lib/api/client';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import type { UpdateHistoryEntry, UpdateProgress } from '@/lib/api/updatesApi';

function SectionHeader({ icon, title }: { icon: Parameters<typeof Icon>[0]['name']; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
      <Icon name={icon} label={`${title} icon`} className="h-5 w-5" />
      {title}
    </h2>
  );
}

function ChangelogDisplay({ changelog }: { changelog: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
      <h3 className="text-sm font-medium text-text-primary mb-2">Changelog</h3>
      <pre className="whitespace-pre-wrap text-sm text-text-secondary font-mono">{changelog}</pre>
    </div>
  );
}

function UpdateProgressDisplay({ progress }: { progress: UpdateProgress }) {
  const statusColors: Record<string, string> = {
    queued: 'bg-status-wanted/20 text-status-wanted',
    downloading: 'bg-status-downloading/20 text-status-downloading',
    installing: 'bg-status-downloading/20 text-status-downloading',
    completed: 'bg-status-completed/20 text-status-completed',
    failed: 'bg-status-error/20 text-status-error',
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Installing Version {progress.version}</h3>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[progress.status]}`}>
          {progress.status}
        </span>
      </div>
      <ProgressBar value={progress.progress} label={progress.message} />
      {progress.estimatedTimeRemaining !== undefined && (
        <p className="text-xs text-text-secondary">
          Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 60)} minutes
        </p>
      )}
    </div>
  );
}

export default function Page() {
  const { updatesApi } = getApiClients();
  const [error, setError] = useState<string | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);

  // Fetch current version
  const { data: currentVersion, isLoading: isLoadingCurrent, error: currentVersionError } = useApiQuery({
    queryKey: queryKeys.updatesCurrent(),
    queryFn: () => updatesApi.getCurrentVersion(),
  });

  // Fetch available updates
  const {
    data: availableUpdate,
    isLoading: isLoadingAvailable,
    error: availableUpdateError,
    refetch: refetchAvailable,
  } = useApiQuery({
    queryKey: queryKeys.updatesAvailable(),
    queryFn: () => updatesApi.getAvailableUpdates(),
  });

  // Fetch update history
  const { data: historyData, isLoading: isLoadingHistory } = useApiQuery({
    queryKey: queryKeys.updatesHistory({ page: 1, pageSize: 20 }),
    queryFn: () => updatesApi.getUpdateHistory({ page: 1, pageSize: 20 }),
  });

  // Fetch update progress if active
  const { data: updateProgress } = useApiQuery({
    queryKey: queryKeys.updatesProgress(activeUpdateId ?? ''),
    queryFn: () => updatesApi.getUpdateProgress(activeUpdateId ?? ''),
    enabled: activeUpdateId !== null,
    refetchInterval: activeUpdateId !== null ? 2000 : false,
  });

  // Check for updates mutation
  const checkForUpdatesMutation = useMutation({
    mutationFn: () => updatesApi.checkForUpdates(),
    onSuccess: () => {
      setError(null);
      refetchAvailable();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to check for updates');
    },
  });

  // Install update mutation
  const installUpdateMutation = useMutation({
    mutationFn: (version: string) => updatesApi.installUpdate(version),
    onSuccess: (result) => {
      setError(null);
      setActiveUpdateId(result.updateId);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to install update');
      setActiveUpdateId(null);
    },
  });

  const isLoading = isLoadingCurrent || isLoadingAvailable || isLoadingHistory;
  const hasError = currentVersionError || availableUpdateError;
  const loadError = currentVersionError ?? availableUpdateError;

  if (isLoading) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Updates</h1>
          <p className="text-sm text-text-secondary">Application update checks and release notes.</p>
        </header>
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Icon name="refresh" label="Loading" className="animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Updates</h1>
          <p className="text-sm text-text-secondary">Application update checks and release notes.</p>
        </header>
        <Alert variant="danger">
          Failed to load updates:{' '}
          {loadError ? loadError.message : 'Unknown error'}
        </Alert>
      </section>
    );
  }

  const historyColumns: DataTableColumn<UpdateHistoryEntry>[] = [
    {
      key: 'version',
      header: 'Version',
      render: (entry) => <span className="font-mono text-text-primary">{entry.version}</span>,
    },
    {
      key: 'installedDate',
      header: 'Installed Date',
      render: (entry) => <span className="text-text-secondary">{formatRelativeDate(entry.installedDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => <StatusBadge status={entry.status} />,
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (entry) => <span className="text-text-secondary">{entry.branch}</span>,
    },
  ];

  return (
    <section className="space-y-6">
      <PageToolbar>
        <PageToolbarSection>
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">System Updates</h1>
            <p className="text-sm text-text-secondary">Application update checks and release notes.</p>
          </header>
        </PageToolbarSection>
      </PageToolbar>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Current Version Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader icon="tag" title="Current Version" />
          <Button
            variant="secondary"
            onClick={() => checkForUpdatesMutation.mutate()}
            disabled={checkForUpdatesMutation.isPending}
          >
            <Icon name="refresh" label="Refresh" className="mr-2 h-4 w-4" />
            {checkForUpdatesMutation.isPending ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-secondary">Version</h3>
            <p className="text-2xl font-mono font-semibold text-text-primary">{currentVersion?.version}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-secondary">Branch</h3>
            <p className="text-2xl font-semibold text-text-primary">{currentVersion?.branch}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-secondary">Build Date</h3>
            <p className="text-2xl font-semibold text-text-primary">
              {currentVersion ? formatRelativeDate(currentVersion.buildDate) : '-'}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <div className="flex items-center gap-2">
            <Icon name="commit" label="Commit" className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text-primary">Commit</p>
              <p className="text-xs font-mono text-text-muted">{currentVersion?.commit}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Update Progress Section */}
      {updateProgress && <UpdateProgressDisplay progress={updateProgress} />}

      {/* Available Updates Section */}
      {availableUpdate && availableUpdate.available && !activeUpdateId && (
        <section className="space-y-4">
          <SectionHeader icon="download" title="Available Update" />
          <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-1 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-text-primary">Version {availableUpdate.version}</h3>
                <p className="text-sm text-text-secondary">
                  Released on {availableUpdate.releaseDate ? formatRelativeDate(availableUpdate.releaseDate) : 'Unknown'}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => availableUpdate.version && installUpdateMutation.mutate(availableUpdate.version)}
                disabled={installUpdateMutation.isPending}
              >
                <Icon name="download" label="Install" className="mr-2 h-4 w-4" />
                {installUpdateMutation.isPending ? 'Installing...' : 'Install Update'}
              </Button>
            </div>
            {availableUpdate.changelog && <ChangelogDisplay changelog={availableUpdate.changelog} />}
          </div>
        </section>
      )}

      {/* No Update Available Section */}
      {availableUpdate && !availableUpdate.available && !activeUpdateId && (
        <section className="space-y-4">
          <SectionHeader icon="success" title="Available Update" />
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
            <div className="flex items-center gap-3">
              <Icon name="success" label="Up to date" className="h-8 w-8 text-status-completed" />
              <div>
                <h3 className="text-lg font-medium text-text-primary">You're up to date!</h3>
                <p className="text-sm text-text-secondary">
                  You're running the latest version of Mediarr ({currentVersion?.version})
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Update History Section */}
      <section className="space-y-4">
        <SectionHeader icon="history" title="Update History" />
        {historyData && historyData.items.length > 0 ? (
          <DataTable
            data={historyData.items}
            columns={historyColumns}
            getRowId={(entry) => entry.id}
            pagination={{
              page: historyData.meta.page,
              totalPages: historyData.meta.totalPages,
              onPrev: () => {},
              onNext: () => {},
            }}
          />
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-6 text-center">
            <Icon name="history" label="No history" className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-2 text-sm text-text-secondary">No update history available</p>
          </div>
        )}
      </section>
    </section>
  );
}
