'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Folder, File, ArrowUp, Home, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

export interface FileBrowserItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
}

interface FileBrowserProps {
  isOpen: boolean;
  title: string;
  initialPath?: string;
  selectFolder?: boolean;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

// Mock file system data
const MOCK_FILE_SYSTEM: Record<string, FileBrowserItem[]> = {
  '/': [
    { name: 'data', path: '/data', type: 'folder' },
    { name: 'config', path: '/config', type: 'folder' },
    { name: 'downloads', path: '/downloads', type: 'folder' },
    { name: 'media', path: '/media', type: 'folder' },
  ],
  '/data': [
    { name: 'media', path: '/data/media', type: 'folder' },
    { name: 'backups', path: '/data/backups', type: 'folder' },
    { name: 'downloads', path: '/data/downloads', type: 'folder' },
  ],
  '/data/media': [
    { name: 'movies', path: '/data/media/movies', type: 'folder' },
    { name: 'tv', path: '/data/media/tv', type: 'folder' },
    { name: 'music', path: '/data/media/music', type: 'folder' },
  ],
  '/data/media/movies': [
    { name: 'Inception.mkv', path: '/data/media/movies/Inception.mkv', type: 'file', size: 2147483648, modified: new Date('2024-01-15') },
    { name: 'The Matrix.mkv', path: '/data/media/movies/The Matrix.mkv', type: 'file', size: 1073741824, modified: new Date('2024-02-20') },
  ],
  '/downloads': [
    { name: 'complete', path: '/downloads/complete', type: 'folder' },
    { name: 'incomplete', path: '/downloads/incomplete', type: 'folder' },
  ],
  '/config': [
    { name: 'settings.json', path: '/config/settings.json', type: 'file', size: 1024, modified: new Date('2024-03-01') },
  ],
  '/media': [
    { name: 'external', path: '/media/external', type: 'folder' },
  ],
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(date?: Date): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getPathParts(path: string): string[] {
  if (path === '/') return [];
  return path.split('/').filter(Boolean);
}

function getParentPath(path: string): string {
  if (path === '/') return '/';
  const parts = getPathParts(path);
  parts.pop();
  return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

export function FileBrowser({
  isOpen,
  title,
  initialPath = '/',
  selectFolder = false,
  onSelect,
  onCancel,
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const items = useMemo(() => {
    return MOCK_FILE_SYSTEM[currentPath] || [];
  }, [currentPath]);

  const pathParts = getPathParts(currentPath);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedPath(null);
  };

  const handleGoUp = () => {
    const parentPath = getParentPath(currentPath);
    handleNavigate(parentPath);
  };

  const handleGoHome = () => {
    handleNavigate('/');
  };

  const handleItemClick = (item: FileBrowserItem) => {
    if (item.type === 'folder') {
      handleNavigate(item.path);
    } else if (!selectFolder) {
      setSelectedPath(item.path);
    }
  };

  const handleItemDoubleClick = (item: FileBrowserItem) => {
    if (item.type === 'folder') {
      handleNavigate(item.path);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = index === 0 ? '/' : `/${pathParts.slice(0, index).join('/')}`;
    handleNavigate(newPath);
  };

  const handleSelectFolder = () => {
    if (selectedPath || selectFolder) {
      onSelect(selectedPath || currentPath);
    }
  };

  const canSelect = selectFolder ? true : selectedPath !== null;

  return (
    <Modal isOpen={isOpen} ariaLabel={title} onClose={onCancel} maxWidthClassName="max-w-3xl">
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        {/* Breadcrumb Navigation */}
        <div className="mb-3 flex items-center gap-1 overflow-x-auto border-b border-border-subtle pb-2">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
            aria-label="Go to root"
          >
            <Home size={14} />
            <span>root</span>
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-text-muted" />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(index)}
                className="rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoUp}
            disabled={currentPath === '/'}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-text-muted"
            aria-label="Go to parent directory"
          >
            <ArrowUp size={14} />
            <span>Up</span>
          </button>
          <span className="text-xs text-text-muted">{items.length} items</span>
        </div>

        {/* File List */}
        <div className="rounded-sm border border-border-subtle">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,100px,120px] gap-2 border-b border-border-subtle bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary">
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Modified</div>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted">This folder is empty</div>
          ) : (
            items.map(item => {
              const isSelected = selectedPath === item.path;
              const ItemIcon = item.type === 'folder' ? Folder : File;

              return (
                <div
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`grid grid-cols-[1fr,80px,100px,120px] gap-2 border-b border-border-subtle px-3 py-2 text-xs text-text-primary hover:bg-surface-2 cursor-pointer ${
                    isSelected ? 'bg-surface-2' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ItemIcon size={14} className="flex-shrink-0 text-text-secondary" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="text-text-muted">{item.type}</div>
                  <div className="text-text-muted">{formatFileSize(item.size)}</div>
                  <div className="text-text-muted">{formatDate(item.modified)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Selection Info */}
        {selectFolder ? (
          <div className="mt-3 text-xs text-text-secondary">
            Current folder: <span className="text-text-primary font-medium">{currentPath}</span>
          </div>
        ) : (
          selectedPath && (
            <div className="mt-3 text-xs text-text-secondary">
              Selected: <span className="text-text-primary font-medium">{selectedPath}</span>
            </div>
          )
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSelectFolder} disabled={!canSelect}>
          Select
        </Button>
      </ModalFooter>
    </Modal>
  );
}
