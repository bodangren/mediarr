'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { Icon } from '@/components/primitives/Icon';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { DataTable } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { getApiClients } from '@/lib/api/client';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function SectionHeader({ icon, title }) {
    return (_jsxs("h2", { className: "flex items-center gap-2 text-lg font-semibold text-text-primary", children: [_jsx(Icon, { name: icon, label: `${title} icon`, className: "h-5 w-5" }), title] }));
}
function ChangelogDisplay({ changelog }) {
    return (_jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h3", { className: "text-sm font-medium text-text-primary mb-2", children: "Changelog" }), _jsx("pre", { className: "whitespace-pre-wrap text-sm text-text-secondary font-mono", children: changelog })] }));
}
function UpdateProgressDisplay({ progress }) {
    const statusColors = {
        queued: 'bg-status-wanted/20 text-status-wanted',
        downloading: 'bg-status-downloading/20 text-status-downloading',
        installing: 'bg-status-downloading/20 text-status-downloading',
        completed: 'bg-status-completed/20 text-status-completed',
        failed: 'bg-status-error/20 text-status-error',
    };
    return (_jsxs("div", { className: "space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h3", { className: "text-sm font-medium text-text-primary", children: ["Installing Version ", progress.version] }), _jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[progress.status]}`, children: progress.status })] }), _jsx(ProgressBar, { value: progress.progress, label: progress.message }), progress.estimatedTimeRemaining !== undefined && (_jsxs("p", { className: "text-xs text-text-secondary", children: ["Estimated time remaining: ", Math.ceil(progress.estimatedTimeRemaining / 60), " minutes"] }))] }));
}
export default function Page() {
    const { updatesApi } = getApiClients();
    const [error, setError] = useState(null);
    const [activeUpdateId, setActiveUpdateId] = useState(null);
    const [page, setPage] = useState(1);
    // Fetch current version
    const { data: currentVersion, isLoading: isLoadingCurrent, error: currentVersionError } = useApiQuery({
        queryKey: queryKeys.updatesCurrent(),
        queryFn: () => updatesApi.getCurrentVersion(),
    });
    // Fetch available updates
    const { data: availableUpdate, isLoading: isLoadingAvailable, error: availableUpdateError, refetch: refetchAvailable, } = useApiQuery({
        queryKey: queryKeys.updatesAvailable(),
        queryFn: () => updatesApi.getAvailableUpdates(),
    });
    // Fetch update history
    const { data: historyData, isLoading: isLoadingHistory } = useApiQuery({
        queryKey: queryKeys.updatesHistory({ page, pageSize: 20 }),
        queryFn: () => updatesApi.getUpdateHistory({ page, pageSize: 20 }),
    });
    // Fetch update progress if active
    const { data: updateProgress } = useApiQuery({
        queryKey: queryKeys.updatesProgress(activeUpdateId ?? ''),
        queryFn: () => updatesApi.getUpdateProgress(activeUpdateId ?? ''),
        enabled: activeUpdateId !== null,
        refetchInterval: activeUpdateId !== null ? 2000 : false,
    });
    // Check for updates mutation
    const checkForUpdatesMutation = useMutation({
        mutationFn: () => updatesApi.checkForUpdates(),
        onSuccess: () => {
            setError(null);
            refetchAvailable();
        },
        onError: (err) => {
            setError(err.message || 'Failed to check for updates');
        },
    });
    // Install update mutation
    const installUpdateMutation = useMutation({
        mutationFn: (version) => updatesApi.installUpdate(version),
        onSuccess: (result) => {
            setError(null);
            setActiveUpdateId(result.updateId);
        },
        onError: (err) => {
            setError(err.message || 'Failed to install update');
            setActiveUpdateId(null);
        },
    });
    const isLoading = isLoadingCurrent || isLoadingAvailable || isLoadingHistory;
    const hasError = currentVersionError || availableUpdateError;
    const loadError = currentVersionError ?? availableUpdateError;
    if (isLoading) {
        return (_jsxs("section", { className: "space-y-3", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Updates" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application update checks and release notes." })] }), _jsxs("div", { className: "flex items-center justify-center py-12 text-text-muted", children: [_jsx(Icon, { name: "refresh", label: "Loading", className: "animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading..." })] })] }));
    }
    if (hasError) {
        return (_jsxs("section", { className: "space-y-3", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Updates" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application update checks and release notes." })] }), _jsxs(Alert, { variant: "danger", children: ["Failed to load updates:", ' ', loadError ? loadError.message : 'Unknown error'] })] }));
    }
    const historyColumns = [
        {
            key: 'version',
            header: 'Version',
            render: (entry) => _jsx("span", { className: "font-mono text-text-primary", children: entry.version }),
        },
        {
            key: 'installedDate',
            header: 'Installed Date',
            render: (entry) => _jsx("span", { className: "text-text-secondary", children: formatRelativeDate(entry.installedDate) }),
        },
        {
            key: 'status',
            header: 'Status',
            render: (entry) => _jsx(StatusBadge, { status: entry.status }),
        },
        {
            key: 'branch',
            header: 'Branch',
            render: (entry) => _jsx("span", { className: "text-text-secondary", children: entry.branch }),
        },
    ];
    return (_jsxs("section", { className: "space-y-6", children: [_jsx(PageToolbar, { children: _jsx(PageToolbarSection, { children: _jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Updates" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Application update checks and release notes." })] }) }) }), error && _jsx(Alert, { variant: "danger", children: error }), _jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(SectionHeader, { icon: "tag", title: "Current Version" }), _jsxs(Button, { variant: "secondary", onClick: () => checkForUpdatesMutation.mutate(), disabled: checkForUpdatesMutation.isPending, children: [_jsx(Icon, { name: "refresh", label: "Refresh", className: "mr-2 h-4 w-4" }), checkForUpdatesMutation.isPending ? 'Checking...' : 'Check for Updates'] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h3", { className: "text-sm font-medium text-text-secondary", children: "Version" }), _jsx("p", { className: "text-2xl font-mono font-semibold text-text-primary", children: currentVersion?.version })] }), _jsxs("div", { className: "space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h3", { className: "text-sm font-medium text-text-secondary", children: "Branch" }), _jsx("p", { className: "text-2xl font-semibold text-text-primary", children: currentVersion?.branch })] }), _jsxs("div", { className: "space-y-2 rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h3", { className: "text-sm font-medium text-text-secondary", children: "Build Date" }), _jsx("p", { className: "text-2xl font-semibold text-text-primary", children: currentVersion ? formatRelativeDate(currentVersion.buildDate) : '-' })] })] }), _jsx("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { name: "commit", label: "Commit", className: "h-5 w-5 text-text-muted" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: "Commit" }), _jsx("p", { className: "text-xs font-mono text-text-muted", children: currentVersion?.commit })] })] }) })] }), updateProgress && _jsx(UpdateProgressDisplay, { progress: updateProgress }), availableUpdate && availableUpdate.available && !activeUpdateId && (_jsxs("section", { className: "space-y-4", children: [_jsx(SectionHeader, { icon: "download", title: "Available Update" }), _jsxs("div", { className: "space-y-4 rounded-lg border border-border-subtle bg-surface-1 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xl font-semibold text-text-primary", children: ["Version ", availableUpdate.version] }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["Released on ", availableUpdate.releaseDate ? formatRelativeDate(availableUpdate.releaseDate) : 'Unknown'] })] }), _jsxs(Button, { variant: "primary", onClick: () => availableUpdate.version && installUpdateMutation.mutate(availableUpdate.version), disabled: installUpdateMutation.isPending, children: [_jsx(Icon, { name: "download", label: "Install", className: "mr-2 h-4 w-4" }), installUpdateMutation.isPending ? 'Installing...' : 'Install Update'] })] }), availableUpdate.changelog && _jsx(ChangelogDisplay, { changelog: availableUpdate.changelog })] })] })), availableUpdate && !availableUpdate.available && !activeUpdateId && (_jsxs("section", { className: "space-y-4", children: [_jsx(SectionHeader, { icon: "success", title: "Available Update" }), _jsx("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-6", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Icon, { name: "success", label: "Up to date", className: "h-8 w-8 text-status-completed" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "You're up to date!" }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["You're running the latest version of Mediarr (", currentVersion?.version, ")"] })] })] }) })] })), _jsxs("section", { className: "space-y-4", children: [_jsx(SectionHeader, { icon: "history", title: "Update History" }), historyData && historyData.items.length > 0 ? (_jsx(DataTable, { data: historyData.items, columns: historyColumns, getRowId: (entry) => entry.id, pagination: {
                            page: historyData.meta.page,
                            totalPages: historyData.meta.totalPages,
                            onPrev: () => setPage(current => Math.max(1, current - 1)),
                            onNext: () => setPage(current => Math.min(historyData.meta.totalPages, current + 1)),
                        } })) : (_jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-6 text-center", children: [_jsx(Icon, { name: "history", label: "No history", className: "mx-auto h-12 w-12 text-text-muted" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "No update history available" })] }))] })] }));
}
//# sourceMappingURL=page.js.map