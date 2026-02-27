'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { FilterDropdown } from '@/components/filters/FilterDropdown';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageJumpBar, type JumpFilter, matchesJumpFilter } from '@/components/primitives/PageJumpBar';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { FilterCondition, FilterConditionsGroup } from '@/lib/api/filters';
import { healthStatus } from '@/lib/health';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { getPopularPresets, indexerPresets } from '@/lib/indexer/indexerPresets';
import { AddIndexerModal, type AddIndexerDraft, type IndexerPreset } from './AddIndexerModal';
import { EditIndexerModal, type EditIndexerDraft } from './EditIndexerModal';

type IndexerRow = {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  appProfileId?: number | null;
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
  appProfileId?: number;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  settings: string;
}

function normalizeBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return false;
}

function stringMatches(actual: string, expected: string, operator: FilterCondition['operator']): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'notEquals':
      return actual !== expected;
    case 'contains':
      return actual.includes(expected);
    case 'notContains':
      return !actual.includes(expected);
    default:
      return false;
  }
}

function arrayMatches(values: string[], expected: string, operator: FilterCondition['operator']): boolean {
  if (operator === 'equals' || operator === 'contains') {
    return values.some(value => value === expected || value.includes(expected));
  }

  if (operator === 'notEquals' || operator === 'notContains') {
    return values.every(value => value !== expected && !value.includes(expected));
  }

  return false;
}

function parseIndexerSettings(settings: string): Record<string, unknown> {
  try {
    return JSON.parse(settings) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseTagsFromSettings(settings: string): string[] {
  const parsed = parseIndexerSettings(settings);
  if (Array.isArray(parsed.tags)) {
    return parsed.tags.map(value => String(value).trim()).filter(Boolean);
  }

  if (typeof parsed.tag === 'string' && parsed.tag.trim().length > 0) {
    return [parsed.tag.trim()];
  }

  return [];
}

function getIndexerTags(row: IndexerRow): string[] {
  const direct = (row as unknown as { tags?: unknown }).tags;
  if (Array.isArray(direct)) {
    return direct.map(value => String(value).trim()).filter(Boolean);
  }

  return parseTagsFromSettings(row.settings);
}

function getIndexerCapabilities(row: IndexerRow): string[] {
  const explicit = (row as unknown as { capabilities?: unknown }).capabilities;
  if (Array.isArray(explicit)) {
    return explicit.map(value => String(value).toLowerCase().trim()).filter(Boolean);
  }

  const derived: string[] = [];
  if (row.supportsRss) {
    derived.push('rss');
  }
  if (row.supportsSearch) {
    derived.push('search');
  }

  return [...new Set(derived)];
}

function getIndexerCategories(row: IndexerRow): string[] {
  const parsed = parseIndexerSettings(row.settings);
  if (Array.isArray(parsed.categories)) {
    return parsed.categories.map(value => String(value).trim()).filter(Boolean);
  }

  if (typeof parsed.category === 'string' && parsed.category.trim().length > 0) {
    return [parsed.category.trim()];
  }

  return [];
}

function getIndexerPrivacy(row: IndexerRow): string | null {
  const parsed = parseIndexerSettings(row.settings);
  if (typeof parsed.privacy === 'string' && parsed.privacy.trim().length > 0) {
    return parsed.privacy.trim();
  }

  return null;
}

function titleCase(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function evaluateIndexerCondition(row: IndexerRow, condition: FilterCondition): boolean {
  if (condition.field === 'enabled') {
    const expected = normalizeBooleanValue(condition.value);
    const actual = normalizeBooleanValue(row.enabled);
    if (condition.operator === 'equals') {
      return actual === expected;
    }
    if (condition.operator === 'notEquals') {
      return actual !== expected;
    }
    return false;
  }

  if (condition.field === 'priority') {
    const actual = Number(row.priority);
    const expected = Number(condition.value);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
      return false;
    }

    if (condition.operator === 'equals') {
      return actual === expected;
    }
    if (condition.operator === 'notEquals') {
      return actual !== expected;
    }
    if (condition.operator === 'greaterThan') {
      return actual > expected;
    }
    if (condition.operator === 'lessThan') {
      return actual < expected;
    }
    return false;
  }

  if (condition.field === 'capability') {
    const capabilities = getIndexerCapabilities(row).map(value => value.toLowerCase());
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return arrayMatches(capabilities, expected, condition.operator);
  }

  if (condition.field === 'tag') {
    const tags = getIndexerTags(row).map(value => value.toLowerCase());
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return arrayMatches(tags, expected, condition.operator);
  }

  if (condition.field === 'protocol') {
    const actual = String(row.protocol ?? '').toLowerCase().trim();
    const expected = String(condition.value ?? '').toLowerCase().trim();
    return stringMatches(actual, expected, condition.operator);
  }

  return false;
}

function applyIndexerFilter(rows: IndexerRow[], conditions: FilterConditionsGroup | null): IndexerRow[] {
  if (!conditions || conditions.conditions.length === 0) {
    return rows;
  }

  return rows.filter(row => {
    const checks = conditions.conditions.map(condition => evaluateIndexerCondition(row, condition));
    return conditions.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
  });
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

function toSaveIndexerInput(draft: AddIndexerDraft): SaveIndexerInput {
  return {
    name: draft.name,
    implementation: draft.implementation,
    configContract: draft.configContract,
    protocol: draft.protocol,
    ...(draft.appProfileId !== undefined ? { appProfileId: draft.appProfileId } : {}),
    enabled: draft.enabled,
    supportsRss: draft.supportsRss,
    supportsSearch: draft.supportsSearch,
    priority: draft.priority,
    settings: JSON.stringify(draft.settings),
  };
}

const addIndexerPresets: IndexerPreset[] = [
  // Popular indexers from Prowlarr definitions
  ...getPopularPresets(),
  // Generic Torznab for custom torrent indexers
  {
    id: 'torznab-generic',
    name: 'Generic Torznab',
    description: 'Custom torrent tracker using Torznab contract.',
    protocol: 'torrent',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    privacy: 'Public',
    fields: [
      { name: 'url', label: 'Indexer URL', type: 'text', required: true },
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
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditIds, setBulkEditIds] = useState<number[]>([]);
  const [bulkEditEnabled, setBulkEditEnabled] = useState(false);
  const [bulkEditPriority, setBulkEditPriority] = useState('');
  const [isApplyingBulkEdit, setIsApplyingBulkEdit] = useState(false);
  const [selectedFilterId, setSelectedFilterId] = useState<number | 'custom' | null>(null);
  const [customFilter, setCustomFilter] = useState<FilterConditionsGroup | null>(null);
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = useState(false);
  const [infoRow, setInfoRow] = useState<IndexerRow | null>(null);

  const indexersQuery = useApiQuery({
    queryKey: queryKeys.indexers(),
    queryFn: () => api.indexerApi.list() as Promise<IndexerRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const appProfilesQuery = useApiQuery({
    queryKey: queryKeys.appProfiles(),
    queryFn: () => api.appProfilesApi.list(),
  });

  const filtersQuery = useApiQuery({
    queryKey: queryKeys.filtersList('indexer'),
    queryFn: () => api.filtersApi.list('indexer'),
    staleTimeKind: 'list',
    isEmpty: data => data.length === 0,
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

  const cloneMutation = useMutation({
    mutationFn: (id: number) => api.indexerApi.clone(id),
    onSuccess: () => {
      pushToast({
        title: 'Indexer cloned',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Clone failed',
        message: error.message,
        variant: 'error',
      });
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
      key: 'capabilities',
      header: 'Capabilities',
      render: row => {
        const badges: string[] = [];
        if (row.supportsRss) {
          badges.push('RSS');
        }
        if (row.supportsSearch) {
          badges.push('Search');
        }

        const privacy = getIndexerPrivacy(row);
        if (privacy) {
          badges.push(titleCase(privacy));
        }

        badges.push(titleCase(row.protocol));

        return (
          <div className="flex flex-wrap gap-1">
            {badges.map(badge => (
              <span key={badge} className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium">
                {badge}
              </span>
            ))}
          </div>
        );
      },
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
          ...(draft.appProfileId !== undefined ? { appProfileId: draft.appProfileId } : {}),
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

  const savedFilters = filtersQuery.data ?? [];
  const activeSavedFilter =
    typeof selectedFilterId === 'number' ? savedFilters.find(filter => filter.id === selectedFilterId) ?? null : null;
  const activeFilterConditions =
    selectedFilterId === 'custom' ? customFilter : activeSavedFilter?.conditions ?? null;

  const filteredRows = useMemo(() => {
    const rows = indexersQuery.data ?? [];
    const jumped = rows.filter(row => matchesJumpFilter(row.name, jumpFilter));
    return applyIndexerFilter(jumped, activeFilterConditions);
  }, [indexersQuery.data, jumpFilter, activeFilterConditions]);

  const activeFilterForBuilder:
    | {
        id?: number;
        name: string;
        type: 'indexer';
        conditions: FilterConditionsGroup;
      }
    | null =
    selectedFilterId === 'custom'
      ? {
          id: undefined,
          name: 'Custom',
          type: 'indexer',
          conditions: customFilter ?? { operator: 'and', conditions: [] },
        }
      : activeSavedFilter
        ? {
            id: activeSavedFilter.id,
            name: activeSavedFilter.name,
            type: 'indexer',
            conditions: activeSavedFilter.conditions,
          }
        : null;

  const tableColumns: DataTableColumn<IndexerRow>[] = selectionModeEnabled
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
    const results = await Promise.allSettled(pendingBulkDeleteIds.map(id => api.indexerApi.remove(id)));
    const deletedCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - deletedCount;

    if (deletedCount > 0) {
      pushToast({
        title: `Deleted ${deletedCount} indexers`,
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
    }

    if (failedCount > 0) {
      pushToast({
        title: `Failed to delete ${failedCount} indexers`,
        variant: 'error',
      });
    }

    setIsBulkDeleting(false);
    setPendingBulkDeleteIds([]);
  };

  const handleBulkTest = async (selectedIds: Array<string | number>) => {
    const indexerIds = selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id));
    if (indexerIds.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      indexerIds.map(async id => {
        const result = await api.indexerApi.test(id);
        return { id, result };
      }),
    );

    let passed = 0;
    let failed = 0;
    const diagnostics: Record<number, { message: string; hints: string[] }> = {};

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        diagnostics[result.value.id] = {
          message: result.value.result.message,
          hints: result.value.result.diagnostics?.remediationHints ?? [],
        };
        if (result.value.result.success) {
          passed += 1;
        } else {
          failed += 1;
        }
        return;
      }

      failed += 1;
    });

    setTestOutput(current => ({
      ...current,
      ...diagnostics,
    }));

    pushToast({
      title: 'Bulk indexer test complete',
      message: `${passed} passed, ${failed} failed`,
      variant: failed > 0 ? 'warning' : 'success',
    });

    void queryClient.invalidateQueries({ queryKey: ['health'] });
  };

  const openBulkEdit = (selectedIds: Array<string | number>) => {
    const indexerIds = selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id));
    if (indexerIds.length === 0) {
      return;
    }

    setBulkEditIds(indexerIds);
    setBulkEditEnabled(false);
    setBulkEditPriority('');
    setIsBulkEditOpen(true);
  };

  const handleBulkEditApply = async () => {
    if (bulkEditIds.length === 0 || isApplyingBulkEdit) {
      return;
    }

    const parsedPriority = Number.parseInt(bulkEditPriority, 10);
    const payload: { enabled: boolean; priority?: number } = {
      enabled: bulkEditEnabled,
    };
    if (!Number.isNaN(parsedPriority)) {
      payload.priority = parsedPriority;
    }

    setIsApplyingBulkEdit(true);
    const results = await Promise.allSettled(bulkEditIds.map(id => api.indexerApi.update(id, payload)));
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      pushToast({
        title: `Updated ${successCount} indexers`,
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
    }

    if (failedCount > 0) {
      pushToast({
        title: `Failed to update ${failedCount} indexers`,
        variant: 'error',
      });
    }

    setIsApplyingBulkEdit(false);
    setIsBulkEditOpen(false);
    setBulkEditIds([]);
  };

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

      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          id="indexer-filter-dropdown"
          label="Saved Filter"
          allLabel="All indexers"
          filters={savedFilters}
          selectedFilterId={selectedFilterId}
          onSelectFilter={value => {
            setSelectedFilterId(value);
            if (value !== 'custom') {
              setCustomFilter(null);
            }
          }}
          onOpenBuilder={() => setIsFilterBuilderOpen(true)}
        />
      </div>

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
        {selectionModeEnabled ? (
          <SelectProvider rowIds={filteredRows.map(row => row.id)}>
            <div className="space-y-3">
              <DataTable
                data={filteredRows}
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
                      onClick={() => setInfoRow(row)}
                    >
                      Info
                    </button>
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
                      className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                      onClick={() => cloneMutation.mutate(row.id)}
                    >
                      Clone
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
              <SelectFooter
                actions={[
                  {
                    label: 'Delete Selected',
                    onClick: selectedIds => {
                      setPendingBulkDeleteIds(selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id)));
                    },
                  },
                  {
                    label: 'Test Selected',
                    onClick: selectedIds => {
                      void handleBulkTest(selectedIds);
                    },
                  },
                  {
                    label: 'Bulk Edit',
                    onClick: selectedIds => {
                      openBulkEdit(selectedIds);
                    },
                  },
                ]}
              />
            </div>
          </SelectProvider>
        ) : (
          <DataTable
            data={filteredRows}
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
                  onClick={() => setInfoRow(row)}
                >
                  Info
                </button>
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
                  className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                  onClick={() => cloneMutation.mutate(row.id)}
                >
                  Clone
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

      <AddIndexerModal
        isOpen={isAddModalOpen}
        presets={addIndexerPresets}
        appProfiles={appProfilesQuery.data?.map((profile) => ({ id: profile.id, name: profile.name })) ?? []}
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
          appProfiles={appProfilesQuery.data?.map((profile) => ({ id: profile.id, name: profile.name })) ?? []}
          isSubmitting={editMutation.isPending}
          onClose={() => setEditing(null)}
          onSave={handleEditFromModal}
        />
      ) : null}

      <FilterBuilder
        isOpen={isFilterBuilderOpen}
        targetType="indexer"
        activeFilter={activeFilterForBuilder}
        onClose={() => setIsFilterBuilderOpen(false)}
        onApply={conditions => {
          setSelectedFilterId('custom');
          setCustomFilter(conditions);
          setIsFilterBuilderOpen(false);
        }}
        onSave={async ({ id, name, conditions }) => {
          if (id) {
            await api.filtersApi.update(id, { name, conditions });
          } else {
            const created = await api.filtersApi.create({ name, type: 'indexer', conditions });
            setSelectedFilterId(created.id);
            setCustomFilter(null);
          }

          await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('indexer') });
          pushToast({ title: 'Filter saved', variant: 'success' });
          setIsFilterBuilderOpen(false);
        }}
        onDelete={async id => {
          await api.filtersApi.delete(id);
          await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('indexer') });
          setSelectedFilterId(null);
          setCustomFilter(null);
          setIsFilterBuilderOpen(false);
          pushToast({ title: 'Filter deleted', variant: 'success' });
        }}
      />

      <Modal
        isOpen={Boolean(infoRow)}
        ariaLabel="Indexer information"
        onClose={() => setInfoRow(null)}
      >
        <ModalHeader
          title="Indexer Information"
          onClose={() => {
            setInfoRow(null);
          }}
        />
        {infoRow ? (
          <ModalBody>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">{infoRow.name}</h3>
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Protocol</dt>
                  <dd>{infoRow.protocol}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Implementation</dt>
                  <dd>{infoRow.implementation}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Capabilities</dt>
                  <dd>
                    {[
                      infoRow.supportsRss ? 'RSS' : null,
                      infoRow.supportsSearch ? 'Search' : null,
                    ]
                      .filter((value): value is string => Boolean(value))
                      .join(', ') || 'None'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Privacy</dt>
                  <dd>{getIndexerPrivacy(infoRow) ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Categories</dt>
                  <dd>{getIndexerCategories(infoRow).join(', ') || 'None'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Health failures</dt>
                  <dd>{String(infoRow.health?.failureCount ?? 0)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-text-secondary">Last error</dt>
                  <dd>{infoRow.health?.lastErrorMessage ?? 'None'}</dd>
                </div>
              </dl>
            </div>
          </ModalBody>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={pendingBulkDeleteIds.length > 0}
        title="Delete selected indexers"
        description={`This will delete ${pendingBulkDeleteIds.length} selected indexers.`}
        onCancel={() => {
          setPendingBulkDeleteIds([]);
        }}
        onConfirm={() => {
          void handleBulkDelete();
        }}
        confirmLabel={`Delete ${pendingBulkDeleteIds.length} Indexers`}
        isConfirming={isBulkDeleting}
      />

      <Modal
        isOpen={isBulkEditOpen}
        ariaLabel="Bulk edit indexers"
        onClose={() => {
          setIsBulkEditOpen(false);
          setBulkEditIds([]);
        }}
      >
        <ModalHeader title="Bulk Edit Indexers" onClose={() => {
          setIsBulkEditOpen(false);
          setBulkEditIds([]);
        }} />
        <ModalBody>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bulkEditEnabled}
                onChange={event => {
                  setBulkEditEnabled(event.currentTarget.checked);
                }}
              />
              Enable selected indexers
            </label>
            <label className="grid gap-1 text-sm">
              <span>Priority</span>
              <input
                type="number"
                value={bulkEditPriority}
                onChange={event => {
                  setBulkEditPriority(event.currentTarget.value);
                }}
                className="w-24 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs"
              />
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setIsBulkEditOpen(false);
              setBulkEditIds([]);
            }}
            disabled={isApplyingBulkEdit}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void handleBulkEditApply();
            }}
            disabled={isApplyingBulkEdit}
          >
            Apply Changes
          </button>
        </ModalFooter>
      </Modal>

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
