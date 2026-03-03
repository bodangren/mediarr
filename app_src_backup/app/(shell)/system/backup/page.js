'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { DataTable } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
import { formatBytesFromString, formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function formatBackupType(type) {
    const typeMap = {
        manual: 'Manual',
        scheduled: 'Scheduled',
    };
    return typeMap[type] ?? type;
}
export default function BackupPage() {
    const { backupApi } = getApiClients();
    const [backupToRestore, setBackupToRestore] = useState(null);
    const [backupToDelete, setBackupToDelete] = useState(null);
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
        mutationFn: (id) => backupApi.restoreBackup(id),
        onSuccess: () => {
            setBackupToRestore(null);
        },
    });
    // Download backup mutation
    const downloadBackupMutation = useMutation({
        mutationFn: (id) => backupApi.downloadBackup(id),
        onSuccess: result => {
            // Trigger download by navigating to the URL
            window.location.href = result.downloadUrl;
        },
    });
    // Delete backup mutation
    const deleteBackupMutation = useMutation({
        mutationFn: (id) => backupApi.deleteBackup(id),
        onSuccess: () => {
            setBackupToDelete(null);
            void backupsQuery.refetch();
        },
    });
    // Backups table columns
    const backupsColumns = useMemo(() => [
        {
            key: 'name',
            header: 'Name',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { name: "backup", label: "Backup", className: "h-4 w-4 text-text-muted" }), _jsx("span", { className: "font-medium", children: row.name })] })),
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
            render: row => _jsx(StatusBadge, { status: formatBackupType(row.type) }),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60", onClick: () => setBackupToRestore(row), disabled: restoreBackupMutation.isPending, "aria-label": `Restore ${row.name}`, children: "Restore" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60", onClick: () => downloadBackupMutation.mutate(row.id), disabled: downloadBackupMutation.isPending, "aria-label": `Download ${row.name}`, children: "Download" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-danger bg-surface-danger px-2 py-1 text-xs text-text-primary hover:bg-surface-danger/80 disabled:opacity-60", onClick: () => setBackupToDelete(row), disabled: deleteBackupMutation.isPending, "aria-label": `Delete ${row.name}`, children: "Delete" })] })),
        },
    ], [restoreBackupMutation.isPending, downloadBackupMutation.isPending, deleteBackupMutation.isPending]);
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs(PageToolbar, { children: [_jsx(PageToolbarSection, { children: _jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Backup" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Backups, restores, and retention configuration." })] }) }), _jsx(PageToolbarSection, { align: "right", children: _jsx(Button, { variant: "primary", onClick: () => createBackupMutation.mutate(), disabled: createBackupMutation.isPending, children: createBackupMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", label: "Loading", className: "mr-2 h-4 w-4 animate-spin" }), "Creating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "add", label: "Create backup", className: "mr-2 h-4 w-4" }), "Create Backup"] })) }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-medium", children: "Backups" }), _jsx(QueryPanel, { isLoading: backupsQuery.isPending, isError: backupsQuery.isError, isEmpty: backupsQuery.isResolvedEmpty, errorMessage: backupsQuery.error?.message, onRetry: () => void backupsQuery.refetch(), emptyTitle: "No backups", emptyBody: "Create a backup to protect your system data.", children: _jsx(DataTable, { data: backupsQuery.data ?? [], columns: backupsColumns, getRowId: row => row.id }) })] }), scheduleQuery.data && (_jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-medium", children: "Backup Schedule" }), _jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("dl", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-xs text-text-secondary", children: "Status" }), _jsx("dd", { className: "text-sm font-medium text-text-primary", children: scheduleQuery.data.enabled ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StatusBadge, { status: "Enabled" }), _jsxs("span", { className: "text-xs text-text-muted", children: ["Next: ", formatRelativeDate(scheduleQuery.data.nextBackup)] })] })) : (_jsx(StatusBadge, { status: "Disabled" })) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs text-text-secondary", children: "Interval" }), _jsx("dd", { className: "text-sm font-medium text-text-primary capitalize", children: scheduleQuery.data.interval })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs text-text-secondary", children: "Retention" }), _jsxs("dd", { className: "text-sm font-medium text-text-primary", children: [scheduleQuery.data.retentionDays, " days"] })] })] }), scheduleQuery.data.lastBackup && (_jsxs("div", { className: "mt-4 pt-4 border-t border-border-subtle", children: [_jsx("dt", { className: "text-xs text-text-secondary", children: "Last Backup" }), _jsx("dd", { className: "text-sm text-text-primary", children: formatRelativeDate(scheduleQuery.data.lastBackup) })] }))] })] })), backupToRestore ? (_jsx(ConfirmModal, { isOpen: true, title: "Restore from backup", description: _jsxs(_Fragment, { children: ["Are you sure you want to restore from ", _jsx("strong", { children: backupToRestore.name }), "? This will replace the current system state. This action cannot be undone."] }), onCancel: () => setBackupToRestore(null), onConfirm: () => restoreBackupMutation.mutate(backupToRestore.id), cancelLabel: "Cancel", confirmLabel: "Restore", confirmVariant: "danger", isConfirming: restoreBackupMutation.isPending })) : null, backupToDelete ? (_jsx(ConfirmModal, { isOpen: true, title: "Delete backup", description: _jsxs(_Fragment, { children: ["Are you sure you want to delete ", _jsx("strong", { children: backupToDelete.name }), "? This action cannot be undone."] }), onCancel: () => setBackupToDelete(null), onConfirm: () => deleteBackupMutation.mutate(backupToDelete.id), cancelLabel: "Cancel", confirmLabel: "Delete", confirmVariant: "danger", isConfirming: deleteBackupMutation.isPending })) : null] }));
}
//# sourceMappingURL=page.js.map