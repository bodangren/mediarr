'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { AddApplicationModal, type AddApplicationDraft } from './AddApplicationModal';
import { EditApplicationModal, type EditApplicationDraft } from './EditApplicationModal';
import { type ApplicationTestResult, type ApplicationSyncResult } from '@/lib/api/applicationsApi';

type ApplicationRow = {
  id: number;
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
};

interface SaveApplicationInput {
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  url: string;
  apiKey: string;
  syncEnabled: boolean;
}

function SelectionCheckbox({ rowId }: { rowId: number }) {
  const { isSelected, toggleRow } = useSelectContext();

  return (
    <input
      type="checkbox"
      aria-label="Select row"
      checked={isSelected(rowId)}
      onChange={event => toggleRow(rowId, (event.nativeEvent as MouseEvent).shiftKey)}
    />
  );
}

function toSaveApplicationInput(draft: AddApplicationDraft): SaveApplicationInput {
  return {
    name: draft.name,
    type: draft.type,
    url: draft.url,
    apiKey: draft.apiKey,
    syncEnabled: draft.syncEnabled,
  };
}

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey === '********') return apiKey;
  return apiKey.length > 4 ? `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 4)}` : '********';
}

const applicationTypes: Array<{
  value: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr' | 'Whisparr';
  label: string;
}> = [
  { value: 'Sonarr', label: 'Sonarr' },
  { value: 'Radarr', label: 'Radarr' },
  { value: 'Lidarr', label: 'Lidarr' },
  { value: 'Readarr', label: 'Readarr' },
  { value: 'Whisparr', label: 'Whisparr' },
];

export default function ApplicationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [editing, setEditing] = useState<ApplicationRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectionModeEnabled, setSelectionModeEnabled] = useState(false);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [testResultModal, setTestResultModal] = useState<{ isOpen: boolean; result: ApplicationTestResult | null }>({
    isOpen: false,
    result: null,
  });

  const applicationsQuery = useApiQuery({
    queryKey: queryKeys.applications(),
    queryFn: () => api.applicationsApi.list() as Promise<ApplicationRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const enableMutation = useMutation({
    mutationFn: (variables: { id: number; syncEnabled: boolean }) =>
      api.applicationsApi.update(variables.id, { syncEnabled: variables.syncEnabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Failed to update sync enabled state',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.applicationsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      pushToast({
        title: 'Application deleted',
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
    mutationFn: (payload: SaveApplicationInput) => api.applicationsApi.create(payload),
    onSuccess: () => {
      pushToast({
        title: 'Application created',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
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
    mutationFn: ({ id, payload }: { id: number; payload: SaveApplicationInput }) =>
      api.applicationsApi.update(id, payload),
    onSuccess: () => {
      pushToast({
        title: 'Application updated',
        variant: 'success',
      });
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
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
    mutationFn: (id: number) => api.applicationsApi.test(id),
    onSuccess: (result, id) => {
      setTestResultModal({
        isOpen: true,
        result,
      });

      pushToast({
        title: result.success ? 'Connection test passed' : 'Connection test failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });

      void queryClient.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Connection test failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const draftTestMutation = useMutation({
    mutationFn: (payload: SaveApplicationInput) => api.applicationsApi.testDraft(payload),
  });

  const syncMutation = useMutation({
    mutationFn: (id: number) => api.applicationsApi.sync(id),
    onSuccess: (_result: ApplicationSyncResult) => {
      pushToast({
        title: 'Sync completed',
        message: _result.message,
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Sync failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => api.applicationsApi.syncAll(),
    onSuccess: (result: ApplicationSyncResult) => {
      pushToast({
        title: 'Sync all completed',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Sync all failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: row => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-text-muted">{row.type}</p>
        </div>
      ),
    },
    {
      key: 'url',
      header: 'URL',
      render: row => (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          {row.url}
        </a>
      ),
    },
    {
      key: 'apiKey',
      header: 'API Key',
      render: row => <span className="font-mono text-sm">{maskApiKey(row.apiKey)}</span>,
    },
    {
      key: 'syncEnabled',
      header: 'Sync Enabled',
      render: row => (
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={row.syncEnabled}
            onChange={event => {
              enableMutation.mutate({
                id: row.id,
                syncEnabled: event.currentTarget.checked,
              });
            }}
          />
          {row.syncEnabled ? 'On' : 'Off'}
        </label>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="completed" />,
    },
  ];

  const handleCreateFromModal = (draft: AddApplicationDraft) => {
    createMutation.mutate(toSaveApplicationInput(draft));
  };

  const handleEditFromModal = (draft: EditApplicationDraft) => {
    editMutation.mutate({
      id: draft.id,
      payload: {
        name: draft.name,
        type: draft.type,
        url: draft.url,
        apiKey: draft.apiKey,
        syncEnabled: draft.syncEnabled,
      },
    });
  };

  const handleDraftConnectionTest = async (draft: AddApplicationDraft) => {
    const result = await draftTestMutation.mutateAsync(toSaveApplicationInput(draft));
    return {
      success: result.success,
      message: result.message,
      hints: result.diagnostics?.remediationHints ?? [],
    };
  };

  const tableColumns: DataTableColumn<ApplicationRow>[] = selectionModeEnabled
    ? [
        {
          key: 'select',
          header: 'Select',
          className: 'w-16',
          render: row => <SelectionCheckbox rowId={row.id} />,
        },
        ...columns,
      ]
    : columns;

  const handleBulkDelete = async () => {
    if (pendingBulkDeleteIds.length === 0 || isBulkDeleting) {
      return;
    }

    setIsBulkDeleting(true);
    const results = await Promise.allSettled(pendingBulkDeleteIds.map(id => api.applicationsApi.remove(id)));
    const deletedCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - deletedCount;

    if (deletedCount > 0) {
      pushToast({
        title: `Deleted ${deletedCount} applications`,
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
    }

    if (failedCount > 0) {
      pushToast({
        title: `Failed to delete ${failedCount} applications`,
        variant: 'error',
      });
    }

    setIsBulkDeleting(false);
    setPendingBulkDeleteIds([]);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Application Integration</h1>
        <p className="text-sm text-text-secondary">
          Manage Sonarr, Radarr, Lidarr, Readarr, and Whisparr integrations.
        </p>
      </header>

      <PageToolbar>
        <PageToolbarSection>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setEditing(null);
              setIsAddModalOpen(true);
            }}
          >
            Add
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void applicationsQuery.refetch();
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void syncAllMutation.mutate();
            }}
            disabled={syncAllMutation.isPending}
          >
            {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => setSelectionModeEnabled(previous => !previous)}
          >
            Select Mode
          </button>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          {selectionModeEnabled ? <span className="text-xs text-text-secondary">Selection mode enabled</span> : null}
        </PageToolbarSection>
      </PageToolbar>

      <QueryPanel
        isLoading={applicationsQuery.isPending}
        isError={applicationsQuery.isError}
        isEmpty={applicationsQuery.isResolvedEmpty}
        errorMessage={applicationsQuery.error?.message}
        onRetry={() => void applicationsQuery.refetch()}
        emptyTitle="No applications configured"
        emptyBody="Create your first application integration."
      >
        {selectionModeEnabled ? (
          <SelectProvider rowIds={(applicationsQuery.data ?? []).map(row => row.id)}>
            <div className="space-y-3">
              <DataTable
                data={applicationsQuery.data ?? []}
                columns={tableColumns}
                getRowId={row => row.id}
                onSort={() => {
                  // Sorting is managed by backend defaults for now.
                }}
                rowActions={row => (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setEditing(row);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                      onClick={() => {
                        void syncMutation.mutate(row.id);
                      }}
                      disabled={syncMutation.isPending}
                    >
                      Sync
                    </button>
                    <button
                      type="button"
                      className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                      onClick={() => testMutation.mutate(row.id)}
                      disabled={testMutation.isPending}
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                      onClick={() => deleteMutation.mutate(row.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              />
            </div>
          </SelectProvider>
        ) : (
          <DataTable
            data={applicationsQuery.data ?? []}
            columns={tableColumns}
            getRowId={row => row.id}
            onSort={() => {
              // Sorting is managed by backend defaults for now.
            }}
            rowActions={row => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditing(row);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => {
                    void syncMutation.mutate(row.id);
                  }}
                  disabled={syncMutation.isPending}
                >
                  Sync
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  Test
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                  onClick={() => deleteMutation.mutate(row.id)}
                >
                  Delete
                </button>
              </div>
            )}
          />
        )}
      </QueryPanel>

      <AddApplicationModal
        isOpen={isAddModalOpen}
        applicationTypes={applicationTypes}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateFromModal}
        onTestConnection={handleDraftConnectionTest}
      />

      {editing ? (
        <EditApplicationModal
          key={editing.id}
          isOpen
          application={editing}
          applicationTypes={applicationTypes}
          isSubmitting={editMutation.isPending}
          onClose={() => setEditing(null)}
          onSave={handleEditFromModal}
        />
      ) : null}

      <ConfirmModal
        isOpen={pendingBulkDeleteIds.length > 0}
        title="Delete selected applications"
        description={`This will delete ${pendingBulkDeleteIds.length} selected applications.`}
        onCancel={() => {
          setPendingBulkDeleteIds([]);
        }}
        onConfirm={() => {
          void handleBulkDelete();
        }}
        confirmLabel={`Delete ${pendingBulkDeleteIds.length} Applications`}
        isConfirming={isBulkDeleting}
      />

      <Modal
        isOpen={testResultModal.isOpen}
        ariaLabel="Test Connection Result"
        onClose={() => {
          setTestResultModal({ isOpen: false, result: null });
        }}
      >
        <ModalHeader title="Test Connection Result" onClose={() => {
          setTestResultModal({ isOpen: false, result: null });
        }} />
        <ModalBody>
          {testResultModal.result ? (
            <div className="space-y-3">
              <p className={testResultModal.result.success ? 'text-status-success' : 'text-status-error'}>
                {testResultModal.result.message}
              </p>
              {testResultModal.result.diagnostics?.remediationHints && testResultModal.result.diagnostics.remediationHints.length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Suggestions:</p>
                  <ul className="list-disc pl-5 text-text-secondary">
                    {testResultModal.result.diagnostics.remediationHints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setTestResultModal({ isOpen: false, result: null });
            }}
          >
            Close
          </button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
