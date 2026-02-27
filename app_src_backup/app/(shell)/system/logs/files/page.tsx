'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { formatBytesFromString, formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { LogLevel, type LogFile } from '@/lib/api/logsApi';

// Log viewer modal component
function LogViewerModal({
  isOpen,
  filename,
  onClose,
}: {
  isOpen: boolean;
  filename: string | null;
  onClose: () => void;
}) {
  const api = useMemo(() => getApiClients(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: logContents, isLoading, error, refetch } = useApiQuery({
    queryKey: filename ? queryKeys.logsFileContents(filename, { limit: 1000 }) : ['logs', 'file', null],
    queryFn: () => api.logsApi.getFileContents(filename!, { limit: 1000 }),
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
    if (!logContents?.contents) return [];

    return logContents.contents.split('\n').map((line, index) => {
      const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/);
      const level = levelMatch ? (levelMatch[1] as LogLevel) : 'INFO';
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
  const getLevelColor = (level: LogLevel) => {
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

  return (
    <Modal isOpen={isOpen} ariaLabel="Log viewer" onClose={onClose} maxWidthClassName="max-w-6xl">
      <ModalHeader
        title={`Log Viewer: ${filename}`}
        onClose={onClose}
        actions={
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Stop Refresh' : 'Auto Refresh'}
          </button>
        }
      />
      <ModalBody>
        <div className="max-h-[70vh] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-text-muted">
            Loading log contents...
          </div>
        ) : error ? (
          <div className="rounded-md bg-status-error/10 p-4 text-status-error">
            Failed to load log contents: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : !logContents ? (
          <div className="flex items-center justify-center py-12 text-text-muted">
            No log contents available
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 border-b border-border-subtle pb-4">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="log-search" className="mb-1 block text-sm font-medium">
                  Search
                </label>
                <input
                  id="log-search"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="log-level-filter" className="mb-1 block text-sm font-medium">
                  Log Level
                </label>
                <select
                  id="log-level-filter"
                  value={logLevelFilter}
                  onChange={e => setLogLevelFilter(e.target.value as LogLevel | 'ALL')}
                  className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none"
                >
                  <option value="ALL">All Levels</option>
                  <option value="ERROR">ERROR ({logLevelCounts.ERROR})</option>
                  <option value="WARN">WARN ({logLevelCounts.WARN})</option>
                  <option value="INFO">INFO ({logLevelCounts.INFO})</option>
                  <option value="DEBUG">DEBUG ({logLevelCounts.DEBUG})</option>
                </select>
              </div>

              <div className="flex-1 text-sm text-text-secondary">
                Showing {filteredLogLines.length} of {logLines.length} lines
              </div>
            </div>

            {/* Log contents */}
            <div className="flex-1 overflow-auto rounded-md bg-surface-0 p-4 font-mono text-sm">
              {filteredLogLines.length === 0 ? (
                <div className="text-center text-text-muted">No log lines match the filters</div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">
                  {filteredLogLines.map(logLine => (
                    <div key={logLine.id} className={`${getLevelColor(logLine.level)} hover:bg-surface-1`}>
                      {logLine.line}
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
         )}
        </div>
       </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default function LogsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<string | null>(null);
  const [pendingClearFile, setPendingClearFile] = useState<string | null>(null);

  const filesQuery = useApiQuery<LogFile[]>({
    queryKey: queryKeys.logsFiles(),
    queryFn: () => api.logsApi.listFiles(),
    staleTimeKind: 'list',
    isEmpty: files => files.length === 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.logsApi.deleteFile(filename),
    onSuccess: () => {
      pushToast({
        title: 'Log file deleted',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.logsFiles() });
      setPendingDeleteFile(null);
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Delete failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: (filename: string) => api.logsApi.clearFile(filename),
    onSuccess: () => {
      pushToast({
        title: 'Log file cleared',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.logsFiles() });
      setPendingClearFile(null);
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Clear failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (filename: string) => api.logsApi.downloadFile(filename),
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
    onError: (error: Error) => {
      pushToast({
        title: 'Download failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const columns: DataTableColumn<LogFile>[] = [
    {
      key: 'filename',
      header: 'Filename',
      sortable: true,
      render: row => (
        <span className="font-mono text-sm text-text-primary">{row.filename}</span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      sortable: false,
      render: row => (
        <span className="text-sm text-text-secondary">{formatBytesFromString(row.size)}</span>
      ),
    },
    {
      key: 'lastModified',
      header: 'Last Modified',
      sortable: true,
      render: row => (
        <span className="text-sm text-text-secondary">{formatRelativeDate(row.lastModified)}</span>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">System: Log Files</h1>
        <p className="text-sm text-text-secondary">Browse and inspect structured log files.</p>
      </header>

      <PageToolbar>
        <PageToolbarSection>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void filesQuery.refetch();
            }}
          >
            Refresh
          </button>
        </PageToolbarSection>
      </PageToolbar>

      <QueryPanel
        isLoading={filesQuery.isPending}
        isError={filesQuery.isError}
        isEmpty={filesQuery.isResolvedEmpty}
        errorMessage={filesQuery.error?.message}
        onRetry={() => void filesQuery.refetch()}
        emptyTitle="No log files available"
        emptyBody="Log files will appear here as the application runs."
      >
        <DataTable
          data={filesQuery.data ?? []}
          columns={columns}
          getRowId={row => row.filename}
          rowActions={row => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => setViewingFile(row.filename)}
              >
                View
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => downloadMutation.mutate(row.filename)}
                disabled={downloadMutation.isPending}
              >
                Download
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-warning/60 px-2 py-1 text-xs text-status-warning"
                onClick={() => setPendingClearFile(row.filename)}
                disabled={clearMutation.isPending}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                onClick={() => setPendingDeleteFile(row.filename)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          )}
        />
      </QueryPanel>

      <LogViewerModal
        isOpen={viewingFile !== null}
        filename={viewingFile}
        onClose={() => setViewingFile(null)}
      />

      <ConfirmModal
        isOpen={pendingDeleteFile !== null}
        title="Delete log file"
        description={`This will permanently delete the log file "${pendingDeleteFile}". This action cannot be undone.`}
        onCancel={() => {
          setPendingDeleteFile(null);
        }}
        onConfirm={() => {
          if (pendingDeleteFile) {
            deleteMutation.mutate(pendingDeleteFile);
          }
        }}
        confirmLabel="Delete File"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={pendingClearFile !== null}
        title="Clear log file"
        description={`This will clear all contents from the log file "${pendingClearFile}". This action cannot be undone.`}
        onCancel={() => {
          setPendingClearFile(null);
        }}
        onConfirm={() => {
          if (pendingClearFile) {
            clearMutation.mutate(pendingClearFile);
          }
        }}
        confirmLabel="Clear File"
        confirmVariant="danger"
        isConfirming={clearMutation.isPending}
      />
    </section>
  );
}
