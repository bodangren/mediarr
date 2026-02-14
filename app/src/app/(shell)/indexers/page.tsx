'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { DynamicForm } from './DynamicForm';

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

interface IndexerFormState {
  name: string;
  implementation: string;
  configContract: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
}

interface SaveIndexerInput extends IndexerFormState {
  settings: string;
}

function createDefaultFormState(): IndexerFormState {
  return {
    name: '',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    protocol: 'torrent',
    enabled: true,
    supportsRss: true,
    supportsSearch: true,
    priority: 25,
  };
}

function parseSettings(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid JSON is surfaced through form validation instead.
  }

  return {};
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

const torznabSchema = [
  { name: 'url', type: 'text', label: 'Indexer URL', required: true },
  { name: 'apiKey', type: 'text', label: 'API Key', required: true },
];

const usenetSchema = [
  { name: 'host', type: 'text', label: 'Host', required: true },
  { name: 'apiKey', type: 'text', label: 'API Key', required: true },
];

export default function IndexersPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [editing, setEditing] = useState<IndexerRow | null>(null);
  const [formState, setFormState] = useState<IndexerFormState>(() => createDefaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<Record<number, { message: string; hints: string[] }>>({});

  const resetForm = () => {
    setEditing(null);
    setFormState(createDefaultFormState());
    setFormError(null);
  };

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

  const saveMutation = useMutation({
    mutationFn: (payload: SaveIndexerInput) => {
      if (editing) {
        return api.indexerApi.update(editing.id, payload);
      }

      return api.indexerApi.create(payload);
    },
    onSuccess: () => {
      pushToast({
        title: editing ? 'Indexer updated' : 'Indexer created',
        variant: 'success',
      });
      resetForm();
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
    },
    onError: (error: Error) => {
      setFormError(error.message);
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

  const handleSave = (settingsData: any) => {
    if (formState.name.trim().length === 0) {
      setFormError('Name is required.');
      return;
    }

    setFormError(null);
    const payload: SaveIndexerInput = {
      ...formState,
      settings: JSON.stringify(settingsData),
    };

    saveMutation.mutate(payload);
  };

  const rows = indexersQuery.data ?? [];

  const schema = useMemo(() => {
    if (editing && editing.configContract && editing.configContract !== 'TorznabSettings') {
        try {
            return JSON.parse(editing.configContract);
        } catch { return torznabSchema; }
    }
    return formState.protocol === 'usenet' ? usenetSchema : torznabSchema;
  }, [editing, formState.protocol]);

  const initialSettings = useMemo(() => {
      if (editing) {
          return parseSettings(editing.settings);
      }
      return {};
  }, [editing]);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Indexer Management</h1>
        <p className="text-sm text-text-secondary">
          Control indexer state, priority, diagnostics, and protocol-specific settings.
        </p>
      </header>

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
          data={rows}
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
                  setFormError(null);
                  setEditing(row);
                  setFormState({
                    name: row.name,
                    implementation: row.implementation,
                    configContract: row.configContract,
                    protocol: row.protocol,
                    enabled: row.enabled,
                    supportsRss: row.supportsRss,
                    supportsSearch: row.supportsSearch,
                    priority: row.priority,
                  });
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

      <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-lg font-semibold">{editing ? 'Edit Indexer' : 'Create Indexer'}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 mb-4">
          <label className="space-y-1 text-sm">
            <span>Name</span>
            <input
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              value={formState.name}
              onChange={event => {
                const name = event.currentTarget.value;
                setFormState(current => ({ ...current, name }));
              }}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Protocol</span>
            <select
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              value={formState.protocol}
              onChange={event => {
                const protocol = event.currentTarget.value;
                setFormError(null);
                setFormState(current => ({ ...current, protocol }));
              }}
            >
              <option value="torrent">torrent</option>
              <option value="usenet">usenet</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.enabled}
              onChange={event => {
                const enabled = event.currentTarget.checked;
                setFormState(current => ({ ...current, enabled }));
              }}
            />
            Enabled
          </label>
        </div>

        <DynamicForm 
            schema={schema} 
            initialData={initialSettings} 
            onSubmit={handleSave} 
            submitLabel={editing ? 'Save' : 'Create'}
        />

        <div className="mt-3 flex gap-2">
          {editing ? (
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
              onClick={resetForm}
            >
              Cancel
            </button>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="mt-3 text-sm text-status-error">
            {formError}
          </p>
        ) : null}
      </section>

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
