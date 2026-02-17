'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Switch } from '@/components/primitives/Switch';
import { ConfirmModal } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { ProviderSettingsModal } from '@/components/subtitles/ProviderSettingsModal';
import { ProviderStatusBadge } from '@/components/subtitles/ProviderStatusBadge';
import { type SubtitleProvider, type ProviderSettings } from '@/lib/api';

export default function SubtitleProvidersPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();

  const [editingProvider, setEditingProvider] = useState<SubtitleProvider | null>(null);
  const [pendingResetId, setPendingResetId] = useState<string | null>(null);

  const providersQuery = useApiQuery({
    queryKey: queryKeys.subtitleProviders(),
    queryFn: () => api.subtitleProvidersApi.listProviders(),
    staleTimeKind: 'list',
    isEmpty: providers => providers.length === 0,
  });

  const enableMutation = useOptimisticMutation<SubtitleProvider[], { id: string; enabled: boolean }, SubtitleProvider>({
    queryKey: queryKeys.subtitleProviders(),
    mutationFn: variables =>
      api.subtitleProvidersApi.updateProvider(variables.id, { enabled: variables.enabled }),
    updater: (current, variables) => {
      return current.map(provider => {
        if (provider.id !== variables.id) {
          return provider;
        }

        return {
          ...provider,
          enabled: variables.enabled,
          status: variables.enabled ? 'active' : 'disabled',
        };
      });
    },
    errorMessage: 'Could not update provider enabled state.',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: ProviderSettings }) =>
      api.subtitleProvidersApi.updateProvider(id, settings),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subtitleProviders() });
      setEditingProvider(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.subtitleProvidersApi.testProvider(id),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => api.subtitleProvidersApi.resetProvider(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subtitleProviders() });
      setPendingResetId(null);
    },
  });

  const handleToggleEnable = (provider: SubtitleProvider) => {
    enableMutation.mutate({
      id: provider.id,
      enabled: !provider.enabled,
    });
  };

  const handleSaveSettings = async (providerId: string, settings: ProviderSettings) => {
    await updateMutation.mutateAsync({ id: providerId, settings });
  };

  const handleTest = async (providerId: string) => {
    const result = await testMutation.mutateAsync(providerId);
    return result;
  };

  const handleReset = async (providerId: string) => {
    const provider = await resetMutation.mutateAsync(providerId);
    return provider;
  };

  const handleResetConfirm = async () => {
    if (pendingResetId) {
      await handleReset(pendingResetId);
    }
  };

  const columns: DataTableColumn<SubtitleProvider>[] = [
    {
      key: 'name',
      header: 'Provider',
      sortable: true,
      render: row => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-muted">{row.type}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: row => (
        <span className="inline-flex rounded-sm bg-surface-2 px-2 py-1 text-xs text-text-secondary">
          {row.type}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <ProviderStatusBadge provider={row} />,
    },
    {
      key: 'enabled',
      header: 'Enabled',
      render: row => (
        <Switch
          checked={row.enabled}
          onChange={() => handleToggleEnable(row)}
          aria-label={`Enable ${row.name}`}
        />
      ),
    },
  ];

  const renderActions = (row: SubtitleProvider) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        onClick={() => {
          setEditingProvider(row);
        }}
      >
        Settings
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          void testMutation.mutateAsync(row.id);
        }}
      >
        Test
      </Button>
    </div>
  );

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitle Providers</h1>
        <p className="text-sm text-text-secondary">
          Configure and manage subtitle providers for automatic subtitle downloads.
        </p>
      </header>

      <QueryPanel
        isLoading={providersQuery.isPending}
        isError={providersQuery.isError}
        isEmpty={providersQuery.isResolvedEmpty}
        errorMessage={providersQuery.error?.message}
        onRetry={() => void providersQuery.refetch()}
        emptyTitle="No subtitle providers configured"
        emptyBody="Configure subtitle providers to enable automatic subtitle downloads."
      >
        <DataTable
          data={providersQuery.data ?? []}
          columns={columns}
          getRowId={row => row.id}
          rowActions={renderActions}
        />
      </QueryPanel>

      {editingProvider ? (
        <ProviderSettingsModal
          key={editingProvider.id}
          isOpen
          provider={editingProvider}
          isSaving={updateMutation.isPending}
          onClose={() => setEditingProvider(null)}
          onSave={handleSaveSettings}
          onTest={handleTest}
          onReset={handleReset}
        />
      ) : null}

      <ConfirmModal
        isOpen={pendingResetId !== null}
        title="Reset Provider Settings"
        description="This will reset all settings for this provider to their default values. This action cannot be undone."
        onCancel={() => setPendingResetId(null)}
        onConfirm={handleResetConfirm}
        confirmLabel="Reset Settings"
        isConfirming={resetMutation.isPending}
      />
    </section>
  );
}
