'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/primitives/DataTable';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getApiClients } from '@/lib/api/client';
import { formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) {
        return '-';
    }
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}
function formatTaskStatus(status) {
    const statusMap = {
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        queued: 'Queued',
        paused: 'Paused',
        success: 'Success',
    };
    return statusMap[status] ?? status;
}
function renderHistoryStatus(status) {
    if (status === 'success') {
        return _jsx(Label, { tone: "success", children: "success" });
    }
    return _jsx(Label, { tone: "danger", children: "failed" });
}
export default function TasksPage() {
    const api = useMemo(() => getApiClients(), []);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(25);
    const [historyStatus, setHistoryStatus] = useState('');
    const [detailsTask, setDetailsTask] = useState(null);
    // Scheduled tasks query
    const scheduledQuery = useApiQuery({
        queryKey: queryKeys.tasksScheduled(),
        queryFn: () => api.systemApi.getScheduledTasks(),
        staleTimeKind: 'tasksScheduled',
        isEmpty: data => data.length === 0,
    });
    // Queued tasks query (refreshes frequently)
    const queuedQuery = useApiQuery({
        queryKey: queryKeys.tasksQueued(),
        queryFn: () => api.systemApi.getQueuedTasks(),
        staleTimeKind: 'tasksQueued',
        isEmpty: data => data.length === 0,
    });
    // Task history query
    const historyQuery = useMemo(() => ({
        page: historyPage,
        pageSize: historyPageSize,
        ...(historyStatus ? { status: historyStatus } : {}),
    }), [historyPage, historyPageSize, historyStatus]);
    const historyListQuery = useApiQuery({
        queryKey: queryKeys.tasksHistory(historyQuery),
        queryFn: () => api.systemApi.getTaskHistory(historyQuery),
        staleTimeKind: 'tasksHistory',
        isEmpty: data => data.items.length === 0,
    });
    // Run task mutation
    const runTaskMutation = useMutation({
        mutationFn: (taskId) => api.systemApi.runTask(taskId),
        onSuccess: () => {
            void scheduledQuery.refetch();
            void queuedQuery.refetch();
        },
    });
    // Cancel task mutation
    const cancelTaskMutation = useMutation({
        mutationFn: (taskId) => api.systemApi.cancelTask(taskId),
        onSuccess: () => {
            void queuedQuery.refetch();
        },
    });
    // Scheduled tasks columns
    const scheduledColumns = useMemo(() => [
        {
            key: 'taskName',
            header: 'Task Name',
            render: row => row.taskName,
        },
        {
            key: 'interval',
            header: 'Interval',
            render: row => row.interval,
        },
        {
            key: 'lastExecution',
            header: 'Last Execution',
            render: row => (row.lastExecution ? formatRelativeDate(row.lastExecution) : '-'),
        },
        {
            key: 'lastDuration',
            header: 'Last Duration',
            render: row => formatDuration(row.lastDuration),
        },
        {
            key: 'nextExecution',
            header: 'Next Execution',
            render: row => formatRelativeDate(row.nextExecution),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => _jsx(StatusBadge, { status: formatTaskStatus(row.status) }),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:opacity-60", onClick: () => runTaskMutation.mutate(row.id), disabled: runTaskMutation.isPending || row.status === 'running', "aria-label": `Run ${row.taskName} now`, children: "Run Now" })),
        },
    ], [runTaskMutation.isPending]);
    // Queued tasks columns
    const queuedColumns = useMemo(() => [
        {
            key: 'taskName',
            header: 'Task Name',
            render: row => row.taskName,
        },
        {
            key: 'started',
            header: 'Started',
            render: row => formatRelativeDate(row.started),
        },
        {
            key: 'duration',
            header: 'Duration',
            render: row => formatDuration(row.duration),
        },
        {
            key: 'progress',
            header: 'Progress',
            render: row => (_jsx(ProgressBar, { value: row.progress, label: "", indeterminate: row.status === 'running' && row.progress === 0 })),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => _jsx(StatusBadge, { status: formatTaskStatus(row.status) }),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsx("button", { type: "button", className: "rounded-sm border border-border-danger bg-surface-danger px-2 py-1 text-xs text-text-primary hover:bg-surface-danger/80 disabled:opacity-60", onClick: () => cancelTaskMutation.mutate(row.id), disabled: cancelTaskMutation.isPending, "aria-label": `Cancel ${row.taskName}`, children: "Cancel" })),
        },
    ], [cancelTaskMutation.isPending]);
    // Task history columns
    const historyColumns = useMemo(() => [
        {
            key: 'taskName',
            header: 'Task Name',
            render: row => row.taskName,
        },
        {
            key: 'started',
            header: 'Started',
            render: row => formatRelativeDate(row.started),
        },
        {
            key: 'duration',
            header: 'Duration',
            render: row => formatDuration(row.duration),
        },
        {
            key: 'status',
            header: 'Status',
            render: row => renderHistoryStatus(row.status),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary hover:bg-surface-2", onClick: () => setDetailsTask(row), "aria-label": `Details for ${row.taskName}`, children: "Details" })),
        },
    ], []);
    // Task details query
    const taskDetailsQuery = useApiQuery({
        queryKey: queryKeys.taskDetails(detailsTask?.id ?? 0),
        queryFn: () => api.systemApi.getTaskDetails(detailsTask.id),
        enabled: detailsTask !== null,
        staleTimeKind: 'detail',
    });
    const historyMeta = historyListQuery.data?.meta;
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System Tasks" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Scheduled jobs and manual task execution." })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-medium", children: "Scheduled Tasks" }), _jsx(QueryPanel, { isLoading: scheduledQuery.isPending, isError: scheduledQuery.isError, isEmpty: scheduledQuery.isResolvedEmpty, errorMessage: scheduledQuery.error?.message, onRetry: () => void scheduledQuery.refetch(), emptyTitle: "No scheduled tasks", emptyBody: "Configure scheduled tasks in settings.", children: _jsx(DataTable, { data: scheduledQuery.data ?? [], columns: scheduledColumns, getRowId: row => String(row.id) }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-medium", children: "Queued Tasks" }), _jsx(QueryPanel, { isLoading: queuedQuery.isPending, isError: queuedQuery.isError, isEmpty: queuedQuery.isResolvedEmpty, errorMessage: queuedQuery.error?.message, onRetry: () => void queuedQuery.refetch(), emptyTitle: "No queued tasks", emptyBody: "Tasks will appear here when running.", children: _jsx(DataTable, { data: queuedQuery.data ?? [], columns: queuedColumns, getRowId: row => String(row.id) }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-medium", children: "Task History" }), _jsx("div", { className: "flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: _jsxs("label", { className: "flex min-w-40 flex-col gap-1 text-xs text-text-secondary", htmlFor: "history-status", children: ["Status", _jsxs("select", { id: "history-status", value: historyStatus, className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                        setHistoryStatus(event.currentTarget.value);
                                        setHistoryPage(1);
                                    }, children: [_jsx("option", { value: "", children: "All statuses" }), _jsx("option", { value: "success", children: "Success" }), _jsx("option", { value: "failed", children: "Failed" })] })] }) }), _jsx(QueryPanel, { isLoading: historyListQuery.isPending, isError: historyListQuery.isError, isEmpty: historyListQuery.isResolvedEmpty, errorMessage: historyListQuery.error?.message, onRetry: () => void historyListQuery.refetch(), emptyTitle: "No task history", emptyBody: "Completed tasks will appear here.", children: _jsx(DataTable, { data: historyListQuery.data?.items ?? [], columns: historyColumns, getRowId: row => row.id, pagination: {
                                page: historyMeta?.page ?? historyPage,
                                totalPages: Math.max(1, historyMeta?.totalPages ?? 1),
                                pageSize: historyMeta?.pageSize ?? historyPageSize,
                                onPrev: () => setHistoryPage(current => Math.max(1, current - 1)),
                                onNext: () => {
                                    const totalPages = Math.max(1, historyMeta?.totalPages ?? 1);
                                    setHistoryPage(current => Math.min(totalPages, current + 1));
                                },
                                onPageSizeChange: nextPageSize => {
                                    setHistoryPageSize(nextPageSize);
                                    setHistoryPage(1);
                                },
                            } }) })] }), detailsTask ? (_jsxs(Modal, { isOpen: true, ariaLabel: "Task Details", onClose: () => setDetailsTask(null), children: [_jsx(ModalHeader, { title: "Task Details", onClose: () => setDetailsTask(null) }), _jsx(ModalBody, { children: taskDetailsQuery.isPending ? (_jsx("div", { className: "text-sm text-text-secondary", children: "Loading task details..." })) : taskDetailsQuery.isError ? (_jsxs("div", { className: "text-sm text-text-error", children: ["Failed to load task details: ", taskDetailsQuery.error?.message] })) : taskDetailsQuery.data ? (_jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Task" }), _jsx("p", { children: taskDetailsQuery.data.taskName })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Status" }), _jsx("div", { children: renderHistoryStatus(taskDetailsQuery.data.status) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Started" }), _jsx("p", { children: formatRelativeDate(taskDetailsQuery.data.started) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Duration" }), _jsx("p", { children: formatDuration(taskDetailsQuery.data.duration) })] })] }), taskDetailsQuery.data.output ? (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-text-secondary", children: "Output" }), _jsx("pre", { className: "overflow-x-auto rounded-sm border border-border-subtle bg-surface-2 p-2 text-xs text-text-primary whitespace-pre-wrap", children: taskDetailsQuery.data.output })] })) : null] })) : null }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2", onClick: () => setDetailsTask(null), "aria-label": "Close details", children: "Close" }) })] })) : null] }));
}
//# sourceMappingURL=page.js.map