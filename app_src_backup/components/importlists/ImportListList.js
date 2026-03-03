'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
function formatLastSync(lastSyncAt) {
    if (!lastSyncAt)
        return 'Never';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins} min ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
function getProviderDisplayName(providerType) {
    switch (providerType) {
        case 'tmdb-popular':
            return 'TMDB Popular';
        case 'tmdb-list':
            return 'TMDB List';
        default:
            return providerType;
    }
}
export function ImportListList({ lists, isLoading, error, onEdit, onDelete, onSync, syncingId, }) {
    if (isLoading) {
        return (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsx("p", { className: "text-sm text-text-secondary", children: "Loading import lists..." }) }));
    }
    if (error) {
        return (_jsx(Alert, { variant: "danger", children: _jsx("p", { children: "Failed to load import lists. Please try again later." }) }));
    }
    if (lists.length === 0) {
        return (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No import lists configured. Click \"Add Import List\" to create one." }) }));
    }
    return (_jsx("div", { className: "space-y-3", children: lists.map((list) => {
            const isSyncing = syncingId === list.id;
            return (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-base font-semibold text-text-primary truncate", children: list.name }), _jsx("span", { className: `inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${list.enabled
                                                ? 'bg-status-completed/15 text-status-completed'
                                                : 'bg-surface-3 text-text-muted'}`, children: list.enabled ? 'Enabled' : 'Disabled' })] }), _jsxs("div", { className: "mt-2 space-y-1 text-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1", children: [_jsxs("span", { children: [_jsx("span", { className: "text-text-muted", children: "Provider:" }), ' ', _jsx("span", { className: "text-text-secondary", children: getProviderDisplayName(list.providerType) })] }), _jsxs("span", { children: [_jsx("span", { className: "text-text-muted", children: "Quality Profile:" }), ' ', _jsx("span", { className: "text-text-secondary", children: list.qualityProfile?.name ?? 'Unknown' })] }), _jsxs("span", { children: [_jsx("span", { className: "text-text-muted", children: "Sync Interval:" }), ' ', _jsxs("span", { className: "text-text-secondary", children: [list.syncInterval, "h"] })] }), _jsxs("span", { children: [_jsx("span", { className: "text-text-muted", children: "Last Sync:" }), ' ', _jsx("span", { className: "text-text-secondary", children: formatLastSync(list.lastSyncAt) })] })] }), _jsxs("div", { className: "text-text-muted truncate", children: ["Root: ", list.rootFolderPath] })] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx(Button, { variant: "secondary", onClick: () => onSync(list), disabled: isSyncing || !list.enabled, className: "text-sm", children: isSyncing ? 'Syncing...' : 'Sync' }), _jsx(Button, { variant: "secondary", onClick: () => onEdit(list), className: "text-sm", children: "Edit" }), _jsx(Button, { variant: "danger", onClick: () => onDelete(list), className: "text-sm", children: "Delete" })] })] }) }, list.id));
        }) }));
}
//# sourceMappingURL=ImportListList.js.map