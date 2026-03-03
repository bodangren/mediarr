'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { formatBytesFromString, formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { LogLevel } from '@/lib/api/logsApi';
// Log viewer modal component
function LogViewerModal({ isOpen, filename, onClose, }) {
    const api = useMemo(() => getApiClients(), []);
    const [searchQuery, setSearchQuery] = useState('');
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const { data: logContents, isLoading, error, refetch } = useApiQuery({
        queryKey: filename ? queryKeys.logsFileContents(filename, { limit: 1000 }) : ['logs', 'file', null],
        queryFn: () => api.logsApi.getFileContents(filename, { limit: 1000 }),
        enabled: isOpen && filename !== null,
    });
    // Auto-refresh logic
    useEffect(() => {
        if (autoRefresh && isOpen) {
            const interval = setInterval(() => {
                void refetch();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, isOpen, refetch]);
    // Parse log lines with level detection
    const logLines = useMemo(() => {
        if (!logContents?.contents)
            return [];
        return logContents.contents.split('\n').map((line, index) => {
            const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/);
            const level = levelMatch ? levelMatch[1] : 'INFO';
            const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z)/);
            return {
                id: index,
                line,
                level,
                timestamp: timestampMatch ? timestampMatch[1] : null,
            };
        });
    }, [logContents]);
    // Filter log lines based on search and level
    const filteredLogLines = useMemo(() => {
        return logLines.filter(logLine => {
            if (searchQuery && !logLine.line.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (logLevelFilter !== 'ALL' && logLine.level !== logLevelFilter) {
                return false;
            }
            return true;
        });
    }, [logLines, searchQuery, logLevelFilter]);
    // Get log level counts
    const logLevelCounts = useMemo(() => {
        const counts = {
            ERROR: 0,
            WARN: 0,
            INFO: 0,
            DEBUG: 0,
        };
        logLines.forEach(logLine => {
            counts[logLine.level]++;
        });
        return counts;
    }, [logLines]);
    // Get level color
    const getLevelColor = (level) => {
        switch (level) {
            case 'ERROR':
                return 'text-status-error';
            case 'WARN':
                return 'text-status-warning';
            case 'INFO':
                return 'text-status-info';
            case 'DEBUG':
                return 'text-text-muted';
        }
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Log viewer", onClose: onClose, maxWidthClassName: "max-w-6xl", children: [_jsx(ModalHeader, { title: `Log Viewer: ${filename}`, onClose: onClose, actions: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1.5 text-sm", onClick: () => setAutoRefresh(!autoRefresh), children: autoRefresh ? 'Stop Refresh' : 'Auto Refresh' }) }), _jsx(ModalBody, { children: _jsx("div", { className: "max-h-[70vh] overflow-hidden", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12 text-text-muted", children: "Loading log contents..." })) : error ? (_jsxs("div", { className: "rounded-md bg-status-error/10 p-4 text-status-error", children: ["Failed to load log contents: ", error instanceof Error ? error.message : 'Unknown error'] })) : !logContents ? (_jsx("div", { className: "flex items-center justify-center py-12 text-text-muted", children: "No log contents available" })) : (_jsxs("div", { className: "flex h-full flex-col gap-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 border-b border-border-subtle pb-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { htmlFor: "log-search", className: "mb-1 block text-sm font-medium", children: "Search" }), _jsx("input", { id: "log-search", type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search logs...", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "log-level-filter", className: "mb-1 block text-sm font-medium", children: "Log Level" }), _jsxs("select", { id: "log-level-filter", value: logLevelFilter, onChange: e => setLogLevelFilter(e.target.value), className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none", children: [_jsx("option", { value: "ALL", children: "All Levels" }), _jsxs("option", { value: "ERROR", children: ["ERROR (", logLevelCounts.ERROR, ")"] }), _jsxs("option", { value: "WARN", children: ["WARN (", logLevelCounts.WARN, ")"] }), _jsxs("option", { value: "INFO", children: ["INFO (", logLevelCounts.INFO, ")"] }), _jsxs("option", { value: "DEBUG", children: ["DEBUG (", logLevelCounts.DEBUG, ")"] })] })] }), _jsxs("div", { className: "flex-1 text-sm text-text-secondary", children: ["Showing ", filteredLogLines.length, " of ", logLines.length, " lines"] })] }), _jsx("div", { className: "flex-1 overflow-auto rounded-md bg-surface-0 p-4 font-mono text-sm", children: filteredLogLines.length === 0 ? (_jsx("div", { className: "text-center text-text-muted", children: "No log lines match the filters" })) : (_jsx("pre", { className: "whitespace-pre-wrap break-words", children: filteredLogLines.map(logLine => (_jsx("div", { className: `${getLevelColor(logLine.level)} hover:bg-surface-1`, children: logLine.line }, logLine.id))) })) })] })) }) }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1.5 text-sm", onClick: onClose, children: "Close" }) })] }));
}
export default function LogsPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [viewingFile, setViewingFile] = useState(null);
    const [pendingDeleteFile, setPendingDeleteFile] = useState(null);
    const [pendingClearFile, setPendingClearFile] = useState(null);
    const filesQuery = useApiQuery({
        queryKey: queryKeys.logsFiles(),
        queryFn: () => api.logsApi.listFiles(),
        staleTimeKind: 'list',
        isEmpty: files => files.length === 0,
    });
    const deleteMutation = useMutation({
        mutationFn: (filename) => api.logsApi.deleteFile(filename),
        onSuccess: () => {
            pushToast({
                title: 'Log file deleted',
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.logsFiles() });
            setPendingDeleteFile(null);
        },
        onError: (error) => {
            pushToast({
                title: 'Delete failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const clearMutation = useMutation({
        mutationFn: (filename) => api.logsApi.clearFile(filename),
        onSuccess: () => {
            pushToast({
                title: 'Log file cleared',
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.logsFiles() });
            setPendingClearFile(null);
        },
        onError: (error) => {
            pushToast({
                title: 'Clear failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const downloadMutation = useMutation({
        mutationFn: (filename) => api.logsApi.downloadFile(filename),
        onSuccess: (result, filename) => {
            // Create download link
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            pushToast({
                title: 'Download started',
                variant: 'success',
            });
        },
        onError: (error) => {
            pushToast({
                title: 'Download failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const columns = [
        {
            key: 'filename',
            header: 'Filename',
            sortable: true,
            render: row => (_jsx("span", { className: "font-mono text-sm text-text-primary", children: row.filename })),
        },
        {
            key: 'size',
            header: 'Size',
            sortable: false,
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: formatBytesFromString(row.size) })),
        },
        {
            key: 'lastModified',
            header: 'Last Modified',
            sortable: true,
            render: row => (_jsx("span", { className: "text-sm text-text-secondary", children: formatRelativeDate(row.lastModified) })),
        },
    ];
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "System: Log Files" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Browse and inspect structured log files." })] }), _jsx(PageToolbar, { children: _jsx(PageToolbarSection, { children: _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                            void filesQuery.refetch();
                        }, children: "Refresh" }) }) }), _jsx(QueryPanel, { isLoading: filesQuery.isPending, isError: filesQuery.isError, isEmpty: filesQuery.isResolvedEmpty, errorMessage: filesQuery.error?.message, onRetry: () => void filesQuery.refetch(), emptyTitle: "No log files available", emptyBody: "Log files will appear here as the application runs.", children: _jsx(DataTable, { data: filesQuery.data ?? [], columns: columns, getRowId: row => row.filename, rowActions: row => (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => setViewingFile(row.filename), children: "View" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => downloadMutation.mutate(row.filename), disabled: downloadMutation.isPending, children: "Download" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-warning/60 px-2 py-1 text-xs text-status-warning", onClick: () => setPendingClearFile(row.filename), disabled: clearMutation.isPending, children: "Clear" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => setPendingDeleteFile(row.filename), disabled: deleteMutation.isPending, children: "Delete" })] })) }) }), _jsx(LogViewerModal, { isOpen: viewingFile !== null, filename: viewingFile, onClose: () => setViewingFile(null) }), _jsx(ConfirmModal, { isOpen: pendingDeleteFile !== null, title: "Delete log file", description: `This will permanently delete the log file "${pendingDeleteFile}". This action cannot be undone.`, onCancel: () => {
                    setPendingDeleteFile(null);
                }, onConfirm: () => {
                    if (pendingDeleteFile) {
                        deleteMutation.mutate(pendingDeleteFile);
                    }
                }, confirmLabel: "Delete File", confirmVariant: "danger", isConfirming: deleteMutation.isPending }), _jsx(ConfirmModal, { isOpen: pendingClearFile !== null, title: "Clear log file", description: `This will clear all contents from the log file "${pendingClearFile}". This action cannot be undone.`, onCancel: () => {
                    setPendingClearFile(null);
                }, onConfirm: () => {
                    if (pendingClearFile) {
                        clearMutation.mutate(pendingClearFile);
                    }
                }, confirmLabel: "Clear File", confirmVariant: "danger", isConfirming: clearMutation.isPending })] }));
}
//# sourceMappingURL=page.js.map