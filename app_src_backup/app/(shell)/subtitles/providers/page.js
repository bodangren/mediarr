'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Switch } from '@/components/primitives/Switch';
import { ConfirmModal } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { ProviderSettingsModal } from '@/components/subtitles/ProviderSettingsModal';
import { ProviderStatusBadge } from '@/components/subtitles/ProviderStatusBadge';
import {} from '@/lib/api';
export default function SubtitleProvidersPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const [editingProvider, setEditingProvider] = useState(null);
    const [pendingResetId, setPendingResetId] = useState(null);
    const providersQuery = useApiQuery({
        queryKey: queryKeys.subtitleProviders(),
        queryFn: () => api.subtitleProvidersApi.listProviders(),
        staleTimeKind: 'list',
        isEmpty: providers => providers.length === 0,
    });
    const enableMutation = useOptimisticMutation({
        queryKey: queryKeys.subtitleProviders(),
        mutationFn: variables => api.subtitleProvidersApi.updateProvider(variables.id, { enabled: variables.enabled }),
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
        mutationFn: ({ id, settings }) => api.subtitleProvidersApi.updateProvider(id, settings),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.subtitleProviders() });
            setEditingProvider(null);
        },
    });
    const testMutation = useMutation({
        mutationFn: (id) => api.subtitleProvidersApi.testProvider(id),
    });
    const resetMutation = useMutation({
        mutationFn: (id) => api.subtitleProvidersApi.resetProvider(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.subtitleProviders() });
            setPendingResetId(null);
        },
    });
    const handleToggleEnable = (provider) => {
        enableMutation.mutate({
            id: provider.id,
            enabled: !provider.enabled,
        });
    };
    const handleSaveSettings = async (providerId, settings) => {
        await updateMutation.mutateAsync({ id: providerId, settings });
    };
    const handleTest = async (providerId) => {
        const result = await testMutation.mutateAsync(providerId);
        return result;
    };
    const handleReset = async (providerId) => {
        const provider = await resetMutation.mutateAsync(providerId);
        return provider;
    };
    const handleResetConfirm = async () => {
        if (pendingResetId) {
            await handleReset(pendingResetId);
        }
    };
    const columns = [
        {
            key: 'name',
            header: 'Provider',
            sortable: true,
            render: row => (_jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: row.name }), _jsx("p", { className: "text-xs text-text-muted", children: row.type })] })),
        },
        {
            key: 'type',
            header: 'Type',
            render: row => (_jsx("span", { className: "inline-flex rounded-sm bg-surface-2 px-2 py-1 text-xs text-text-secondary", children: row.type })),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => _jsx(ProviderStatusBadge, { provider: row }),
        },
        {
            key: 'enabled',
            header: 'Enabled',
            render: row => (_jsx(Switch, { checked: row.enabled, onChange: () => handleToggleEnable(row), "aria-label": `Enable ${row.name}` })),
        },
    ];
    const renderActions = (row) => (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => {
                    setEditingProvider(row);
                }, children: "Settings" }), _jsx(Button, { variant: "secondary", onClick: () => {
                    void testMutation.mutateAsync(row.id);
                }, children: "Test" })] }));
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Subtitle Providers" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Configure and manage subtitle providers for automatic subtitle downloads." })] }), _jsx(QueryPanel, { isLoading: providersQuery.isPending, isError: providersQuery.isError, isEmpty: providersQuery.isResolvedEmpty, errorMessage: providersQuery.error?.message, onRetry: () => void providersQuery.refetch(), emptyTitle: "No subtitle providers configured", emptyBody: "Configure subtitle providers to enable automatic subtitle downloads.", children: _jsx(DataTable, { data: providersQuery.data ?? [], columns: columns, getRowId: row => row.id, rowActions: renderActions }) }), editingProvider ? (_jsx(ProviderSettingsModal, { isOpen: true, provider: editingProvider, isSaving: updateMutation.isPending, onClose: () => setEditingProvider(null), onSave: handleSaveSettings, onTest: handleTest, onReset: handleReset }, editingProvider.id)) : null, _jsx(ConfirmModal, { isOpen: pendingResetId !== null, title: "Reset Provider Settings", description: "This will reset all settings for this provider to their default values. This action cannot be undone.", onCancel: () => setPendingResetId(null), onConfirm: handleResetConfirm, confirmLabel: "Reset Settings", isConfirming: resetMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map