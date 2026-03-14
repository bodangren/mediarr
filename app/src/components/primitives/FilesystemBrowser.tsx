
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from './Modal';
import { SkeletonBlock } from './SkeletonBlock';
import { getApiClients } from '@/lib/api/client';
import type { FilesystemEntry } from '@/lib/api/filesystemApi';

export interface FilesystemBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the selected directory path when the user confirms. */
  onSelect: (path: string) => void;
  /** Starting directory; defaults to '/' */
  initialPath?: string;
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function buildBreadcrumbs(path: string): BreadcrumbSegment[] {
  if (path === '/') return [{ label: '/', path: '/' }];

  const parts = path.split('/').filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [{ label: '/', path: '/' }];
  let accumulated = '';
  for (const part of parts) {
    accumulated += `/${part}`;
    crumbs.push({ label: part, path: accumulated });
  }
  return crumbs;
}

export function FilesystemBrowser({
  isOpen,
  onClose,
  onSelect,
  initialPath = '/',
}: FilesystemBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [entries, setEntries] = useState<FilesystemEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const api = useMemo(() => getApiClients(), []);

  const navigate = useCallback(async (path: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await api.filesystemApi.list(path);
      setCurrentPath(result.path);
      setEntries(result.entries.filter(e => e.isDirectory));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setIsLoading(false);
    }
  }, [api.filesystemApi]);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      void navigate(initialPath);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = buildBreadcrumbs(currentPath);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(() => {
    onSelect(currentPath);
    onClose();
  }, [currentPath, onSelect, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel="Browse filesystem"
      onClose={handleClose}
      maxWidthClassName="max-w-lg"
    >
      <ModalHeader title="Select Directory" onClose={handleClose} />
      <ModalBody>
        {/* Breadcrumb */}
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm" aria-label="breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={12} className="text-text-secondary" />}
              <button
                type="button"
                aria-label={crumb.label}
                onClick={() => void navigate(crumb.path)}
                className={`rounded px-1 py-0.5 text-xs hover:bg-surface-2 ${
                  idx === breadcrumbs.length - 1
                    ? 'font-medium text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        {/* Error */}
        {loadError && (
          <p className="mb-3 text-sm text-status-error">{loadError}</p>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <SkeletonBlock key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {/* Directory list */}
        {!isLoading && entries.length === 0 && !loadError && (
          <p className="text-sm text-text-secondary">No subdirectories found.</p>
        )}

        {!isLoading && entries.length > 0 && (
          <ul className="max-h-64 overflow-y-auto divide-y divide-border-subtle rounded-md border border-border-subtle">
            {entries.map(entry => (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => void navigate(entry.path)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2 text-left"
                >
                  {entry.path === currentPath ? (
                    <FolderOpen size={16} className="flex-shrink-0 text-yellow-400" />
                  ) : (
                    <Folder size={16} className="flex-shrink-0 text-text-secondary" />
                  )}
                  <span className="flex-1 truncate">{entry.name}</span>
                  {!entry.writable && (
                    <span className="text-xs text-text-secondary">read-only</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Current path display */}
        <p className="mt-3 truncate rounded-sm bg-surface-2 px-2 py-1 text-xs font-mono text-text-secondary">
          {currentPath}
        </p>
      </ModalBody>
      <ModalFooter>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSelect} aria-label="Select directory">
            Select
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
