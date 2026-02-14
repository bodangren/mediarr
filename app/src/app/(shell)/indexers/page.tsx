'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { PageJumpBar, type JumpFilter, matchesJumpFilter } from '@/components/primitives/PageJumpBar';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { AddIndexerModal, type AddIndexerDraft, type IndexerPreset } from './AddIndexerModal';
import { EditIndexerModal, type EditIndexerDraft } from './EditIndexerModal';

type IndexerRow = {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  health?: {
    failureCount?: number;
    lastErrorMessage?: string | null;
  } | null;
};

interface SaveIndexerInput {
  name: string;
  implementation: string;
  configContract: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  settings: string;
}

function toSaveIndexerInput(draft: AddIndexerDraft): SaveIndexerInput {
  return {
    name: draft.name,
    implementation: draft.implementation,
    configContract: draft.configContract,
    protocol: draft.protocol,
    enabled: draft.enabled,
    supportsRss: draft.supportsRss,
    supportsSearch: draft.supportsSearch,
    priority: draft.priority,
    settings: JSON.stringify(draft.settings),
  };
}

function healthStatus(row: IndexerRow): 'completed' | 'warning' | 'error' {
  const failureCount = row.health?.failureCount ?? 0;
  if (failureCount >= 3) {
    return 'error';
  }

  if (failureCount > 0) {
    return 'warning';
  }

  return 'completed';
}

const addIndexerPresets: IndexerPreset[] = [
  {
    id: 'torznab-generic',
    name: 'Generic Torznab',
    description: 'Custom torrent tracker using Torznab contract.',
    protocol: 'torrent',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    fields: [
      { name: 'url', label: 'Indexer URL', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'newznab-generic',
    name: 'Generic Newznab',
    description: 'Custom usenet indexer using Newznab contract.',
    protocol: 'usenet',
    implementation: 'Torznab',
    configContract: 'NewznabSettings',
    fields: [
      { name: 'host', label: 'Host', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
];

export default function IndexersPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [editing, setEditing] = useState<IndexerRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testOutput, setTestOutput] = useState<Record<number, { message: string; hints: string[] }>>({});
  const [jumpFilter, setJumpFilter] = useState<JumpFilter>('All');
  const [selectionModeEnabled, setSelectionModeEnabled] = useState(false);

  const indexersQuery = useApiQuery({
    queryKey: queryKeys.indexers(),
    queryFn: () => api.indexerApi.list() as Promise<IndexerRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const enableMutation = useOptimisticMutation<IndexerRow[], { id: number; enabled: boolean }, IndexerRow>({
    queryKey: queryKeys.indexers(),
    mutationFn: variables => api.indexerApi.update(variables.id, { enabled: variables.enabled }) as Promise<IndexerRow>,
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
    errorMessage: 'Could not update indexer enabled state.',
  });

  const priorityMutation = useOptimisticMutation<IndexerRow[], { id: number; priority: number }, IndexerRow>({
    queryKey: queryKeys.indexers(),
    mutationFn: variables => api.indexerApi.update(variables.id, { priority: variables.priority }) as Promise<IndexerRow>,
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
    errorMessage: 'Could not update indexer priority.',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.indexerApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
      pushToast({
        title: 'Indexer deleted',
        variant: 'success',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: SaveIndexerInput) => api.indexerApi.create(payload),
    onSuccess: () => {
      pushToast({
        title: 'Indexer created',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
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
    mutationFn: ({ id, payload }: { id: number; payload: SaveIndexerInput }) => api.indexerApi.update(id, payload),
    onSuccess: () => {
      pushToast({
        title: 'Indexer updated',
        variant: 'success',
      });
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
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
    mutationFn: (id: number) => api.indexerApi.test(id),
    onSuccess: (result, id) => {
      setTestOutput(current => ({
        ...current,
        [id]: {
          message: result.message,
          hints: result.diagnostics?.remediationHints ?? [],
        },
      }));

      pushToast({
        title: result.success ? 'Indexer test passed' : 'Indexer test failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });

      void queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });

  const draftTestMutation = useMutation({
    mutationFn: (payload: SaveIndexerInput) => api.indexerApi.testDraft(payload),
  });

  const columns: DataTableColumn<IndexerRow>[] = [
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
      render: row => row.protocol,
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

  const handleCreateFromModal = (draft: AddIndexerDraft) => {
    createMutation.mutate(toSaveIndexerInput(draft));
  };

  const handleEditFromModal = (draft: EditIndexerDraft) => {
    editMutation.mutate({
      id: draft.id,
      payload: {
        name: draft.name,
        implementation: draft.implementation,
        configContract: draft.configContract,
        protocol: draft.protocol,
        enabled: draft.enabled,
        supportsRss: draft.supportsRss,
        supportsSearch: draft.supportsSearch,
        priority: draft.priority,
        settings: JSON.stringify(draft.settings),
      },
    });
  };

  const handleDraftConnectionTest = async (draft: AddIndexerDraft) => {
    const result = await draftTestMutation.mutateAsync(toSaveIndexerInput(draft));
    return {
      success: result.success,
      message: result.message,
      hints: result.diagnostics?.remediationHints ?? [],
    };
  };

  const filteredRows = useMemo(() => {
    const rows = indexersQuery.data ?? [];
    return rows.filter(row => matchesJumpFilter(row.name, jumpFilter));
  }, [indexersQuery.data, jumpFilter]);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Indexer Management</h1>
        <p className="text-sm text-text-secondary">
          Control indexer state, priority, diagnostics, and protocol-specific settings.
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
              void indexersQuery.refetch();
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void indexersQuery.refetch();
              pushToast({
                title: 'Indexer sync requested',
                variant: 'info',
              });
            }}
          >
            Sync
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

      <PageJumpBar value={jumpFilter} onChange={setJumpFilter} />

      <QueryPanel
        isLoading={indexersQuery.isPending}
        isError={indexersQuery.isError}
        isEmpty={indexersQuery.isResolvedEmpty}
        errorMessage={indexersQuery.error?.message}
        onRetry={() => void indexersQuery.refetch()}
        emptyTitle="No indexers configured"
        emptyBody="Create your first indexer below."
      >
        <DataTable
          data={filteredRows}
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
                onClick={() => testMutation.mutate(row.id)}
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
      </QueryPanel>

      <AddIndexerModal
        isOpen={isAddModalOpen}
        presets={addIndexerPresets}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateFromModal}
        onTestConnection={handleDraftConnectionTest}
      />

      {editing ? (
        <EditIndexerModal
          key={editing.id}
          isOpen
          indexer={editing}
          isSubmitting={editMutation.isPending}
          onClose={() => setEditing(null)}
          onSave={handleEditFromModal}
        />
      ) : null}

      {Object.entries(testOutput).length > 0 ? (
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-semibold">Latest Diagnostics</h2>
          <ul className="mt-2 space-y-2 text-sm text-text-secondary">
            {Object.entries(testOutput).map(([id, output]) => (
              <li key={id}>
                <p className="font-medium text-text-primary">Indexer #{id}: {output.message}</p>
                <ul className="list-disc pl-5">
                  {output.hints.map(hint => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
