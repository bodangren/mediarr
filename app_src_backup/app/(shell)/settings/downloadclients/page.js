'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { AddDownloadClientModal } from '@/components/settings/AddDownloadClientModal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { healthStatus } from '@/lib/health';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
function toSaveDownloadClientInput(draft) {
    const settings = {
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
    const [editing, setEditing] = useState(null);
    const [testOutput, setTestOutput] = useState({});
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const downloadClientsQuery = useApiQuery({
        queryKey: queryKeys.downloadClients(),
        queryFn: () => api.downloadClientApi.list(),
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const enableMutation = useOptimisticMutation({
        queryKey: queryKeys.downloadClients(),
        mutationFn: variables => api.downloadClientApi.update(variables.id, { enabled: variables.enabled }),
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
    const priorityMutation = useOptimisticMutation({
        queryKey: queryKeys.downloadClients(),
        mutationFn: variables => api.downloadClientApi.update(variables.id, { priority: variables.priority }),
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
        mutationFn: (id) => api.downloadClientApi.remove(id),
        onSuccess: () => {
            pushToast({
                title: 'Download client deleted',
                variant: 'success',
            });
        },
        onError: (error) => {
            pushToast({
                title: 'Delete failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const createMutation = useMutation({
        mutationFn: (payload) => api.downloadClientApi.create(payload),
        onSuccess: () => {
            pushToast({
                title: 'Download client created',
                variant: 'success',
            });
            setIsAddModalOpen(false);
        },
        onError: (error) => {
            pushToast({
                title: 'Save failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const editMutation = useMutation({
        mutationFn: ({ id, payload }) => api.downloadClientApi.update(id, payload),
        onSuccess: () => {
            pushToast({
                title: 'Download client updated',
                variant: 'success',
            });
            setEditing(null);
        },
        onError: (error) => {
            pushToast({
                title: 'Save failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const testMutation = useMutation({
        mutationFn: (id) => api.downloadClientApi.test(id),
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
        mutationFn: (payload) => api.downloadClientApi.testDraft(payload),
    });
    const columns = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: row => (_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: row.name }), _jsx("p", { className: "text-xs text-text-muted", children: row.implementation })] })),
        },
        {
            key: 'protocol',
            header: 'Protocol',
            render: row => (_jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.protocol === 'torrent'
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-accent-info/20 text-accent-info'}`, children: row.protocol })),
        },
        {
            key: 'host',
            header: 'Host',
            render: row => `${row.host}:${row.port}`,
        },
        {
            key: 'category',
            header: 'Category',
            render: row => row.category ?? _jsx("span", { className: "text-text-muted", children: "-" }),
        },
        {
            key: 'enabled',
            header: 'Enabled',
            render: row => (_jsxs("label", { className: "inline-flex items-center gap-2 text-xs", children: [_jsx("input", { type: "checkbox", checked: row.enabled, onChange: event => {
                            enableMutation.mutate({
                                id: row.id,
                                enabled: event.currentTarget.checked,
                            });
                        } }), row.enabled ? 'On' : 'Off'] })),
        },
        {
            key: 'priority',
            header: 'Priority',
            sortable: true,
            render: row => (_jsx("input", { type: "number", className: "w-20 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", defaultValue: row.priority, onBlur: event => {
                    const value = Number.parseInt(event.currentTarget.value, 10);
                    if (Number.isNaN(value)) {
                        return;
                    }
                    priorityMutation.mutate({
                        id: row.id,
                        priority: value,
                    });
                } })),
        },
        {
            key: 'health',
            header: 'Health',
            render: row => _jsx(StatusBadge, { status: healthStatus(row) }),
        },
    ];
    const handleCreateFromModal = (draft) => {
        createMutation.mutate(toSaveDownloadClientInput(draft));
    };
    const handleDraftConnectionTest = async (draft) => {
        const result = await draftTestMutation.mutateAsync(toSaveDownloadClientInput(draft));
        return {
            success: result.success,
            message: result.message,
            hints: result.diagnostics?.remediationHints ?? [],
        };
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Download Clients" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage your torrent and usenet download clients." })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { variant: "primary", onClick: () => setIsAddModalOpen(true), children: "Add Client" }), _jsx(Button, { variant: "secondary", onClick: () => {
                            void downloadClientsQuery.refetch();
                        }, children: "Refresh" })] }), _jsx(QueryPanel, { isLoading: downloadClientsQuery.isPending, isError: downloadClientsQuery.isError, isEmpty: downloadClientsQuery.isResolvedEmpty, errorMessage: downloadClientsQuery.error?.message, onRetry: () => void downloadClientsQuery.refetch(), emptyTitle: "No download clients configured", emptyBody: "Add your first download client to begin downloading media.", children: _jsx(DataTable, { data: downloadClientsQuery.data ?? [], columns: columns, getRowId: row => row.id, onSort: () => {
                        // Sorting is managed by backend defaults for now.
                    }, rowActions: row => (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => testMutation.mutate(row.id), children: "Test" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => setPendingDeleteId(row.id), children: "Delete" })] })) }) }), _jsx(AddDownloadClientModal, { isOpen: isAddModalOpen, presets: [
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
                ], isSubmitting: createMutation.isPending, onClose: () => setIsAddModalOpen(false), onCreate: handleCreateFromModal, onTestConnection: handleDraftConnectionTest }), _jsx(ConfirmModal, { isOpen: pendingDeleteId !== null, title: "Delete download client", description: "Are you sure you want to delete this download client? This action cannot be undone.", onCancel: () => setPendingDeleteId(null), onConfirm: () => {
                    if (pendingDeleteId !== null) {
                        deleteMutation.mutate(pendingDeleteId);
                    }
                    setPendingDeleteId(null);
                }, cancelLabel: "Cancel", confirmLabel: "Delete", confirmVariant: "danger", isConfirming: deleteMutation.isPending }), Object.entries(testOutput).length > 0 ? (_jsxs("section", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Latest Diagnostics" }), _jsx("ul", { className: "mt-2 space-y-2 text-sm text-text-secondary", children: Object.entries(testOutput).map(([id, output]) => (_jsxs("li", { children: [_jsxs("p", { className: "font-medium text-text-primary", children: ["Client #", id, ": ", output.message] }), output.hints.length > 0 ? (_jsx("ul", { className: "list-disc pl-5", children: output.hints.map((hint, index) => (_jsx("li", { children: hint }, index))) })) : null] }, id))) })] })) : null] }));
}
//# sourceMappingURL=page.js.map