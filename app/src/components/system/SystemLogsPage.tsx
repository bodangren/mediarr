import { useCallback, useEffect, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { LogFile, LogFileContents } from '@/lib/api/logsApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/primitives/Button';
import { formatBytes, formatRelativeDate } from '@/lib/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

function detectLevel(line: string): LogLevel {
  if (/\bERROR\b/.test(line)) return 'ERROR';
  if (/\bWARN\b/.test(line)) return 'WARN';
  if (/\bDEBUG\b/.test(line)) return 'DEBUG';
  return 'INFO';
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: 'text-red-400',
  WARN: 'text-yellow-400',
  INFO: 'text-green-400',
  DEBUG: 'text-text-secondary',
};

const LINE_LIMIT_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: 'Last 50', value: 50 },
  { label: 'Last 100', value: 100 },
  { label: 'Last 500', value: 500 },
  { label: 'All', value: undefined },
];

// ─── Log Viewer ───────────────────────────────────────────────────────────────

function LogContentViewer({ filename }: { filename: string }) {
  const [contents, setContents] = useState<LogFileContents | null>(null);
  const [lineLimit, setLineLimit] = useState<number | undefined>(100);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApiClients().logsApi.getFileContents(filename, {
        ...(lineLimit !== undefined ? { limit: lineLimit } : {}),
      });
      setContents(data);
    } catch {
      setError('Failed to load log file contents');
    } finally {
      setLoading(false);
    }
  }, [filename, lineLimit]);

  useEffect(() => {
    void fetchContents();
  }, [fetchContents]);

  async function handleClear() {
    if (!window.confirm(`Clear contents of "${filename}"?`)) return;
    setClearing(true);
    try {
      await getApiClients().logsApi.clearFile(filename);
      await fetchContents();
    } finally {
      setClearing(false);
    }
  }

  async function handleDownload() {
    try {
      const result = await getApiClients().logsApi.downloadFile(filename);
      window.open(result.downloadUrl, '_blank');
    } catch {
      // ignore
    }
  }

  const lines = contents?.contents.split('\n').filter(l => l.trim()) ?? [];

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lineLimit ?? 'all'}
          onChange={e => setLineLimit(e.target.value === 'all' ? undefined : Number(e.target.value))}
          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm"
        >
          {LINE_LIMIT_OPTIONS.map(opt => (
            <option key={opt.label} value={opt.value ?? 'all'}>{opt.label}</option>
          ))}
        </select>
        <span className="flex-1 text-xs text-text-secondary">
          {contents ? `${contents.totalLines} total lines` : ''}
        </span>
        <Button variant="secondary" className="text-xs" onClick={() => { void fetchContents(); }}>
          Refresh
        </Button>
        <Button variant="secondary" className="text-xs" onClick={() => { void handleDownload(); }}>
          Download
        </Button>
        <Button variant="danger" className="text-xs" disabled={clearing} onClick={() => { void handleClear(); }}>
          {clearing ? 'Clearing…' : 'Clear'}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-sm text-text-secondary">Loading…</div>
      ) : error ? (
        <div className="text-sm text-status-error">{error}</div>
      ) : (
        <div className="overflow-auto rounded-md border border-border-subtle bg-surface-0 p-3 font-mono text-xs leading-relaxed" style={{ maxHeight: '60vh' }}>
          {lines.length === 0 ? (
            <span className="text-text-secondary">Log file is empty.</span>
          ) : (
            lines.map((line, idx) => {
              const level = detectLevel(line);
              return (
                <div key={idx} className={LEVEL_COLORS[level]}>
                  {line}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── File Sidebar ─────────────────────────────────────────────────────────────

function FileList({
  files,
  selected,
  onSelect,
  onDelete,
}: {
  files: LogFile[];
  selected: string | null;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [deletingName, setDeletingName] = useState<string | null>(null);

  async function handleDelete(filename: string) {
    if (!window.confirm(`Delete log file "${filename}"?`)) return;
    setDeletingName(filename);
    try {
      await getApiClients().logsApi.deleteFile(filename);
      onDelete(filename);
    } finally {
      setDeletingName(null);
    }
  }

  return (
    <ul className="space-y-1">
      {files.map(file => (
        <li key={file.filename}>
          <button
            type="button"
            className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${selected === file.filename ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-surface-2'}`}
            onClick={() => onSelect(file.filename)}
          >
            <div className="font-medium truncate">{file.filename}</div>
            <div className="text-xs text-text-secondary">
              {formatBytes(file.size)} · {formatRelativeDate(file.lastModified)}
            </div>
          </button>
          <div className="flex justify-end px-2">
            <button
              type="button"
              className="text-xs text-text-secondary hover:text-status-error disabled:opacity-40"
              disabled={deletingName === file.filename}
              onClick={() => { void handleDelete(file.filename); }}
            >
              {deletingName === file.filename ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SystemLogsPage() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    try {
      const data = await getApiClients().logsApi.listFiles();
      setFiles(data);
      if (!selectedFile && data.length > 0) {
        setSelectedFile(data[0].filename);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  function handleDelete(filename: string) {
    setFiles(prev => prev.filter(f => f.filename !== filename));
    if (selectedFile === filename) {
      const remaining = files.filter(f => f.filename !== filename);
      setSelectedFile(remaining[0]?.filename ?? null);
    }
  }

  return (
    <RouteScaffold title="Logs" description="Unified system and application log access.">
      <div className="flex gap-4">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 rounded-md border border-border-subtle bg-surface-1 p-3">
          <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Log Files</p>
          {loading ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-text-secondary">No log files found.</p>
          ) : (
            <FileList
              files={files}
              selected={selectedFile}
              onSelect={setSelectedFile}
              onDelete={handleDelete}
            />
          )}
        </aside>

        {/* Viewer */}
        <main className="flex-1 rounded-md border border-border-subtle bg-surface-1 p-4">
          {selectedFile ? (
            <LogContentViewer key={selectedFile} filename={selectedFile} />
          ) : (
            <p className="text-sm text-text-secondary">Select a log file to view.</p>
          )}
        </main>
      </div>
    </RouteScaffold>
  );
}
