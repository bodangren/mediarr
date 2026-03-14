
import { useState } from 'react';
import { Icon } from '@/components/primitives/Icon';
import { Menu, type MenuItem } from '@/components/primitives/Menu';

export interface MovieActionsToolbarProps {
  onSync: () => void;
  onScan: () => void;
  onSearch: () => void;
  onManualSearch: () => void;
  onUpload: () => void;
  onHistory: () => void;
  isSyncing?: boolean;
  isScanning?: boolean;
  isSearching?: boolean;
}

export function MovieActionsToolbar({
  onSync,
  onScan,
  onSearch,
  onManualSearch,
  onUpload,
  onHistory,
  isSyncing = false,
  isScanning = false,
  isSearching = false,
}: MovieActionsToolbarProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const moreMenuItems: MenuItem[] = [
    {
      key: 'history',
      label: 'History',
      icon: ({ className }: { className?: string }) => <Icon name="history" className={className} />,
      onClick: onHistory,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2">
      {/* Primary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
          onClick={onSync}
          disabled={isSyncing}
          aria-label="Sync movie"
        >
          <Icon name="refresh" className={isSyncing ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
          onClick={onScan}
          disabled={isScanning}
          aria-label="Scan disk"
        >
          <Icon name="disk" className={isScanning ? 'animate-spin' : ''} />
          <span>Scan Disk</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
          onClick={onSearch}
          disabled={isSearching}
          aria-label="Search all subtitles"
        >
          <Icon name="search" className={isSearching ? 'animate-spin' : ''} />
          <span>Search All</span>
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-border-subtle" />

      {/* Secondary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onManualSearch}
          aria-label="Manual search"
        >
          <Icon name="search" />
          <span>Manual Search</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onUpload}
          aria-label="Upload subtitles"
        >
          <Icon name="plus" />
          <span>Upload</span>
        </button>

        <div className="relative inline-flex items-center">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
            aria-label="More actions"
            aria-expanded={isMoreMenuOpen}
          >
            <Icon name="settings" />
          </button>

          <Menu
            isOpen={isMoreMenuOpen}
            onClose={() => setIsMoreMenuOpen(false)}
            items={moreMenuItems}
            align="right"
            ariaLabel="More actions"
          />
        </div>
      </div>
    </div>
  );
}
