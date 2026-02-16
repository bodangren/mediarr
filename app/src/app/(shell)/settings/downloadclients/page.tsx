'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { AddDownloadClientModal } from '@/components/settings/AddDownloadClientModal';
import type { DownloadClientDraft } from '@/types/downloadClient';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import type { DownloadClientRow } from '@/types/downloadClient';

interface SaveDownloadClientInput {
  name: string;
  implementation: string;
  configContract: string;
  protocol: string;
  host: string;
  port: number;
  category?: string;
  priority?: number;
  enabled?: boolean;
  settings: string;
}

function healthStatus(row: DownloadClientRow): 'completed' | 'warning' | 'error' {
  const failureCount = row.health?.failureCount ?? 0;
  if (failureCount >= 3) {
    return 'error';
  }

  if (failureCount > 0) {
    return 'warning';
  }

  return 'completed';
}

function toSaveDownloadClientInput(draft: DownloadClientDraft): SaveDownloadClientInput {
  const settings: Record<string, unknown> = {
    host: draft.host,
    port: Number.parseInt(draft.port, 10),
  };

  if (draft.username) {
    settings.username = draft.username;
  }

  if (draft.password) {
    settings.password = draft.password;
  }

  if (draft.category) {
    settings.category = draft.category;
  }

  return {
    name: draft.name,
    implementation: draft.implementation,
    configContract: draft.configContract,
    protocol: draft.protocol,
    host: draft.host,
    port: Number.parseInt(draft.port, 10),
    category: draft.category || undefined,
    priority: draft.priority,
    enabled: draft.enabled,
    settings: JSON.stringify(settings),
  };
}

export default function SettingsDownloadClientsPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editing, setEditing] = useState<DownloadClientRow | null>(null);
  const [testOutput, setTestOutput] = useState<Record<number, { message: string; hints: string[] }>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const downloadClientsQuery = useApiQuery({
    queryKey: queryKeys.downloadClients(),
    queryFn: () => api.downloadClientApi.list() as Promise<DownloadClientRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const enableMutation = useOptimisticMutation<DownloadClientRow[], { id: number; enabled: boolean }, DownloadClientRow>({
    queryKey: queryKeys.downloadClients(),
    mutationFn: variables => api.downloadClientApi.update(variables.id, { enabled: variables.enabled }) as Promise<DownloadClientRow>,
    updater: (current, variables) => {
      return current.map(item => {
        if (item.id !== variables.id) {
          return item;
        }

        return {
          ...item,
          enabled: variables.enabled,
        };
      });
    },
    errorMessage: 'Could not update download client enabled state.',
  });

  const priorityMutation = useOptimisticMutation<DownloadClientRow[], { id: number; priority: number }, DownloadClientRow>({
    queryKey: queryKeys.downloadClients(),
    mutationFn: variables => api.downloadClientApi.update(variables.id, { priority: variables.priority }) as Promise<DownloadClientRow>,
    updater: (current, variables) => {
      return current.map(item => {
        if (item.id !== variables.id) {
          return item;
        }

        return {
          ...item,
          priority: variables.priority,
        };
      });
    },
    errorMessage: 'Could not update download client priority.',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.downloadClientApi.remove(id),
    onSuccess: () => {
      pushToast({
        title: 'Download client deleted',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Delete failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: SaveDownloadClientInput) => api.downloadClientApi.create(payload),
    onSuccess: () => {
      pushToast({
        title: 'Download client created',
        variant: 'success',
      });
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SaveDownloadClientInput }) =>
      api.downloadClientApi.update(id, payload),
    onSuccess: () => {
      pushToast({
        title: 'Download client updated',
        variant: 'success',
      });
      setEditing(null);
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.downloadClientApi.test(id),
    onSuccess: (result, id) => {
      setTestOutput(current => ({
        ...current,
        [id]: {
          message: result.message,
          hints: result.diagnostics?.remediationHints ?? [],
        },
      }));

      pushToast({
        title: result.success ? 'Connection test passed' : 'Connection test failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });
    },
  });

  const draftTestMutation = useMutation({
    mutationFn: (payload: SaveDownloadClientInput) => api.downloadClientApi.testDraft(payload),
  });

  const columns: DataTableColumn<DownloadClientRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: row => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-text-muted">{row.implementation}</p>
        </div>
      ),
    },
    {
      key: 'protocol',
      header: 'Protocol',
      render: row => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.protocol === 'torrent'
              ? 'bg-accent-primary/20 text-accent-primary'
              : 'bg-accent-info/20 text-accent-info'
          }`}
        >
          {row.protocol}
        </span>
      ),
    },
    {
      key: 'host',
      header: 'Host',
      render: row => `${row.host}:${row.port}`,
    },
    {
      key: 'category',
      header: 'Category',
      render: row => row.category ?? <span className="text-text-muted">-</span>,
    },
    {
      key: 'enabled',
      header: 'Enabled',
      render: row => (
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={event => {
              enableMutation.mutate({
                id: row.id,
                enabled: event.currentTarget.checked,
              });
            }}
          />
          {row.enabled ? 'On' : 'Off'}
        </label>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: row => (
        <input
          type="number"
          className="w-20 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
          defaultValue={row.priority}
          onBlur={event => {
            const value = Number.parseInt(event.currentTarget.value, 10);
            if (Number.isNaN(value)) {
              return;
            }

            priorityMutation.mutate({
              id: row.id,
              priority: value,
            });
          }}
        />
      ),
    },
    {
      key: 'health',
      header: 'Health',
      render: row => <StatusBadge status={healthStatus(row)} />,
    },
  ];

  const handleCreateFromModal = (draft: DownloadClientDraft) => {
    createMutation.mutate(toSaveDownloadClientInput(draft));
  };

  const handleDraftConnectionTest = async (draft: DownloadClientDraft) => {
    const result = await draftTestMutation.mutateAsync(toSaveDownloadClientInput(draft));
    return {
      success: result.success,
      message: result.message,
      hints: result.diagnostics?.remediationHints ?? [],
    };
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Download Clients</h1>
        <p className="text-sm text-text-secondary">Manage your torrent and usenet download clients.</p>
      </header>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          Add Client
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void downloadClientsQuery.refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      <QueryPanel
        isLoading={downloadClientsQuery.isPending}
        isError={downloadClientsQuery.isError}
        isEmpty={downloadClientsQuery.isResolvedEmpty}
        errorMessage={downloadClientsQuery.error?.message}
        onRetry={() => void downloadClientsQuery.refetch()}
        emptyTitle="No download clients configured"
        emptyBody="Add your first download client to begin downloading media."
      >
        <DataTable
          data={downloadClientsQuery.data ?? []}
          columns={columns}
          getRowId={row => row.id}
          onSort={() => {
            // Sorting is managed by backend defaults for now.
          }}
          rowActions={row => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => testMutation.mutate(row.id)}
              >
                Test
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                onClick={() => setPendingDeleteId(row.id)}
              >
                Delete
              </button>
            </div>
          )}
        />
      </QueryPanel>

      <AddDownloadClientModal
        isOpen={isAddModalOpen}
        presets={[
          {
            id: 'transmission',
            name: 'Transmission',
            description: 'Lightweight BitTorrent client',
            implementation: 'Transmission',
            configContract: 'TransmissionSettings',
            protocol: 'torrent',
            defaultPort: 9091,
            requiresAuth: true,
          },
          {
            id: 'qbittorrent',
            name: 'qBittorrent',
            description: 'Cross-platform Bittorrent client',
            implementation: 'QBittorrent',
            configContract: 'QBittorrentSettings',
            protocol: 'torrent',
            defaultPort: 8080,
            requiresAuth: true,
          },
          {
            id: 'deluge',
            name: 'Deluge',
            description: 'Lightweight, free BitTorrent client',
            implementation: 'Deluge',
            configContract: 'DelugeSettings',
            protocol: 'torrent',
            defaultPort: 58846,
            requiresAuth: false,
          },
          {
            id: 'rtorrent',
            name: 'rTorrent',
            description: 'Command-line BitTorrent client',
            implementation: 'RTorrent',
            configContract: 'RTorrentSettings',
            protocol: 'torrent',
            defaultPort: 5000,
            requiresAuth: false,
          },
          {
            id: 'sabnzbd',
            name: 'SABnzbd',
            description: 'Usenet NZB downloader',
            implementation: 'SABnzbd',
            configContract: 'SABnzbdSettings',
            protocol: 'usenet',
            defaultPort: 8080,
            requiresAuth: true,
          },
          {
            id: 'nzbget',
            name: 'NZBGet',
            description: 'Efficient Usenet NZB downloader',
            implementation: 'NZBGet',
            configContract: 'NZBGetSettings',
            protocol: 'usenet',
            defaultPort: 6789,
            requiresAuth: true,
          },
        ]}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateFromModal}
        onTestConnection={handleDraftConnectionTest}
      />

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Delete download client"
        description="Are you sure you want to delete this download client? This action cannot be undone."
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId !== null) {
            deleteMutation.mutate(pendingDeleteId);
          }
          setPendingDeleteId(null);
        }}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
      />

      {Object.entries(testOutput).length > 0 ? (
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Latest Diagnostics</h2>
          <ul className="mt-2 space-y-2 text-sm text-text-secondary">
            {Object.entries(testOutput).map(([id, output]) => (
              <li key={id}>
                <p className="font-medium text-text-primary">Client #{id}: {output.message}</p>
                {output.hints.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {output.hints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
