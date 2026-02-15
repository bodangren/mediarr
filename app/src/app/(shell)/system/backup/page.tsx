'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
import type { Backup, BackupSchedule } from '@/lib/api/backupApi';
import { formatBytesFromString, formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

function formatBackupType(type: string): string {
  const typeMap: Record<string, string> = {
    manual: 'Manual',
    scheduled: 'Scheduled',
  };
  return typeMap[type] ?? type;
}

export default function BackupPage() {
  const { backupApi } = getApiClients();

  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);

  // Fetch backups
  const backupsQuery = useApiQuery({
    queryKey: queryKeys.backups(),
    queryFn: () => backupApi.getBackups(),
    staleTimeKind: 'backups',
    isEmpty: data => data.length === 0,
  });

  // Fetch backup schedule
  const scheduleQuery = useApiQuery({
    queryKey: queryKeys.backupSchedule(),
    queryFn: () => backupApi.getBackupSchedule(),
    staleTimeKind: 'backupSchedule',
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => backupApi.createBackup(),
    onSuccess: () => {
      void backupsQuery.refetch();
      void scheduleQuery.refetch();
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (id: number) => backupApi.restoreBackup(id),
    onSuccess: () => {
      setBackupToRestore(null);
    },
  });

  // Download backup mutation
  const downloadBackupMutation = useMutation({
    mutationFn: (id: number) => backupApi.downloadBackup(id),
    onSuccess: result => {
      // Trigger download by navigating to the URL
      window.location.href = result.downloadUrl;
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (id: number) => backupApi.deleteBackup(id),
    onSuccess: () => {
      setBackupToDelete(null);
      void backupsQuery.refetch();
    },
  });

  // Backups table columns
  const backupsColumns: DataTableColumn<Backup>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: row => (
          <div className="flex items-center gap-2">
            <Icon name="backup" label="Backup" className="h-4 w-4 text-text-muted" />
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        render: row => formatRelativeDate(row.created),
      },
      {
        key: 'size',
        header: 'Size',
        render: row => formatBytesFromString(row.size),
      },
      {
        key: 'type',
        header: 'Type',
        render: row => <StatusBadge status={formatBackupType(row.type)} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: row => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60"
              onClick={() => setBackupToRestore(row)}
              disabled={restoreBackupMutation.isPending}
              aria-label={`Restore ${row.name}`}
            >
              Restore
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60"
              onClick={() => downloadBackupMutation.mutate(row.id)}
              disabled={downloadBackupMutation.isPending}
              aria-label={`Download ${row.name}`}
            >
              Download
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-danger bg-surface-danger px-2 py-1 text-xs text-text-primary hover:bg-surface-danger/80 disabled:opacity-60"
              onClick={() => setBackupToDelete(row)}
              disabled={deleteBackupMutation.isPending}
              aria-label={`Delete ${row.name}`}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [restoreBackupMutation.isPending, downloadBackupMutation.isPending, deleteBackupMutation.isPending],
  );

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <PageToolbar>
        <PageToolbarSection>
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">System Backup</h1>
            <p className="text-sm text-text-secondary">Backups, restores, and retention configuration.</p>
          </header>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <Button
            variant="primary"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <>
                <Icon name="refresh" label="Loading" className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Icon name="add" label="Create backup" className="mr-2 h-4 w-4" />
                Create Backup
              </>
            )}
          </Button>
        </PageToolbarSection>
      </PageToolbar>

      {/* Backups Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Backups</h2>
        <QueryPanel
          isLoading={backupsQuery.isPending}
          isError={backupsQuery.isError}
          isEmpty={backupsQuery.isResolvedEmpty}
          errorMessage={backupsQuery.error?.message}
          onRetry={() => void backupsQuery.refetch()}
          emptyTitle="No backups"
          emptyBody="Create a backup to protect your system data."
        >
          <DataTable data={backupsQuery.data ?? []} columns={backupsColumns} getRowId={row => row.id} />
        </QueryPanel>
      </div>

      {/* Backup Schedule Info */}
      {scheduleQuery.data && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Backup Schedule</h2>
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-text-secondary">Status</dt>
                <dd className="text-sm font-medium text-text-primary">
                  {scheduleQuery.data.enabled ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge status="Enabled" />
                      <span className="text-xs text-text-muted">
                        Next: {formatRelativeDate(scheduleQuery.data.nextBackup)}
                      </span>
                    </div>
                  ) : (
                    <StatusBadge status="Disabled" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">Interval</dt>
                <dd className="text-sm font-medium text-text-primary capitalize">{scheduleQuery.data.interval}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">Retention</dt>
                <dd className="text-sm font-medium text-text-primary">{scheduleQuery.data.retentionDays} days</dd>
              </div>
            </dl>
            {scheduleQuery.data.lastBackup && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <dt className="text-xs text-text-secondary">Last Backup</dt>
                <dd className="text-sm text-text-primary">{formatRelativeDate(scheduleQuery.data.lastBackup)}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {backupToRestore ? (
        <ConfirmModal
          isOpen
          title="Restore from backup"
          description={
            <>
              Are you sure you want to restore from <strong>{backupToRestore.name}</strong>? This will replace the
              current system state. This action cannot be undone.
            </>
          }
          onCancel={() => setBackupToRestore(null)}
          onConfirm={() => restoreBackupMutation.mutate(backupToRestore.id)}
          cancelLabel="Cancel"
          confirmLabel="Restore"
          confirmVariant="danger"
          isConfirming={restoreBackupMutation.isPending}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {backupToDelete ? (
        <ConfirmModal
          isOpen
          title="Delete backup"
          description={
            <>
              Are you sure you want to delete <strong>{backupToDelete.name}</strong>? This action cannot be undone.
            </>
          }
          onCancel={() => setBackupToDelete(null)}
          onConfirm={() => deleteBackupMutation.mutate(backupToDelete.id)}
          cancelLabel="Cancel"
          confirmLabel="Delete"
          confirmVariant="danger"
          isConfirming={deleteBackupMutation.isPending}
        />
      ) : null}
    </section>
  );
}
