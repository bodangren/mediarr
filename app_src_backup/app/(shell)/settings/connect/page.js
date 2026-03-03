'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { AddNotificationModal } from '@/components/settings/AddNotificationModal';
import { getApiClients } from '@/lib/api/client';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { getNotificationTypeLabel } from '@/types/notification';
export default function NotificationsSettingsPage() {
    const queryClient = useQueryClient();
    const notificationsApi = getApiClients().notificationsApi;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingNotification, setEditingNotification] = useState();
    const [deleteTarget, setDeleteTarget] = useState();
    const [testResults, setTestResults] = useState(new Map());
    const { data: notifications = [], isPending, isError, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.list(),
        staleTime: 30000,
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => notificationsApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setDeleteTarget(undefined);
        },
    });
    const testMutation = useMutation({
        mutationFn: (id) => notificationsApi.test(id),
        onSuccess: (result, id) => {
            setTestResults(current => new Map(current).set(id, result));
        },
    });
    const handleAdd = () => {
        setEditingNotification(undefined);
        setIsAddModalOpen(true);
    };
    const handleEdit = (notification) => {
        setEditingNotification(notification);
        setIsAddModalOpen(true);
    };
    const handleDelete = (notification) => {
        setDeleteTarget(notification);
    };
    const handleConfirmDelete = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
        }
    };
    const handleTest = (notification) => {
        setTestResults(current => {
            const next = new Map(current);
            next.delete(notification.id);
            return next;
        });
        testMutation.mutate(notification.id);
    };
    const toggleEnabledMutation = useOptimisticMutation({
        queryKey: ['notifications'],
        mutationFn: async ({ notification, enabled }) => await notificationsApi.update(notification.id, { enabled }),
        updater: (current, { notification, enabled }) => current.map(n => (n.id === notification.id ? { ...n, enabled } : n)),
        errorMessage: 'Failed to update notification status',
    });
    const handleToggleEnabled = (notification, enabled) => {
        toggleEnabledMutation.mutate({ notification, enabled });
    };
    if (isPending) {
        return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Notifications" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage notification connections for alerts and updates." })] }), _jsx("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary", children: "Loading notifications\u2026" })] }));
    }
    if (isError) {
        return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Notifications" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage notification connections for alerts and updates." })] }), _jsx("div", { className: "rounded-md border border-status-error/50 bg-surface-danger p-4 text-sm text-text-primary", children: _jsxs("p", { children: ["Could not load notifications: ", error instanceof Error ? error.message : 'Unknown error'] }) })] }));
    }
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Notifications" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage notification connections for alerts and updates." })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Connections" }), _jsx(Button, { variant: "primary", onClick: handleAdd, children: "Add Connection" })] }), notifications.length === 0 ? (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No notification connections configured. Click Add Connection to create one." }) })) : (_jsx("div", { className: "space-y-2", children: notifications.map(notification => (_jsxs("div", { className: "flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsxs("div", { className: "flex flex-1 items-start gap-3", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsx("div", { className: `h-2 w-2 rounded-full ${notification.enabled ? 'bg-status-completed' : 'bg-text-muted'}`, title: notification.enabled ? 'Enabled' : 'Disabled' }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-medium", children: notification.name }), _jsx("span", { className: "text-xs text-text-muted", children: getNotificationTypeLabel(notification.type) })] }), _jsx("div", { className: "mt-1 flex flex-wrap gap-1 text-xs", children: notification.triggers.map(trigger => (_jsx("span", { className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-0.5 text-text-secondary", children: trigger.replace(/([A-Z])/g, ' $1').trim() }, trigger))) }), testResults.has(notification.id) && (_jsx("div", { className: "mt-2", children: _jsx(Alert, { variant: testResults.get(notification.id)?.success ? 'success' : 'danger', children: _jsx("p", { className: "text-xs", children: testResults.get(notification.id)?.message }) }) }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: notification.enabled, onChange: e => handleToggleEnabled(notification, e.target.checked), disabled: toggleEnabledMutation.isPending }), _jsx("span", { className: "sr-only", children: "Enabled" })] }), _jsx(Button, { variant: "secondary", onClick: () => handleTest(notification), disabled: testMutation.isPending, className: "text-xs", children: "Test" }), _jsx(Button, { variant: "secondary", onClick: () => handleEdit(notification), className: "text-xs", children: "Edit" }), _jsx(Button, { variant: "danger", onClick: () => handleDelete(notification), disabled: deleteMutation.isPending, className: "text-xs", children: "Delete" })] })] }, notification.id))) }))] }), _jsx(AddNotificationModal, { isOpen: isAddModalOpen, onClose: () => {
                    setIsAddModalOpen(false);
                    setEditingNotification(undefined);
                }, notificationToEdit: editingNotification }), _jsx(ConfirmModal, { isOpen: deleteTarget !== undefined, title: "Delete Notification Connection", description: `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`, onCancel: () => setDeleteTarget(undefined), onConfirm: handleConfirmDelete, confirmLabel: "Delete", confirmVariant: "danger", isConfirming: deleteMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map