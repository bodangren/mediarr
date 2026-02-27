'use client';

import { Icon } from '@/components/primitives/Icon';

export interface MovieActionsToolbarProps {
  onRefresh?: () => void;
  onSearch?: () => void;
  onInteractiveSearch?: () => void;
  onPreviewRename?: () => void;
  onManageFiles?: () => void;
  onHistory?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isRefreshing?: boolean;
  isSearching?: boolean;
}

export function MovieActionsToolbar({
  onRefresh,
  onSearch,
  onInteractiveSearch,
  onPreviewRename,
  onManageFiles,
  onHistory,
  onEdit,
  onDelete,
  isRefreshing = false,
  isSearching = false,
}: MovieActionsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2">
      {/* Primary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <Icon name="refresh" className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
          onClick={onSearch}
          disabled={isSearching}
        >
          <Icon name="search" />
          <span>Search Movie</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onInteractiveSearch}
        >
          <Icon name="search" />
          <span>Interactive Search</span>
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-border-subtle" />

      {/* Secondary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onPreviewRename}
        >
          <Icon name="file-edit" />
          <span>Preview Rename</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onManageFiles}
        >
          <Icon name="folder" />
          <span>Manage Files</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onHistory}
        >
          <Icon name="history" />
          <span>History</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          onClick={onEdit}
        >
          <Icon name="edit" />
          <span>Edit Movie</span>
        </button>

        {onDelete && (
          <button
            type="button"
            className="flex items-center gap-2 rounded-sm border border-accent-danger/30 px-3 py-1.5 text-sm text-accent-danger transition-colors hover:bg-accent-danger/10"
            onClick={onDelete}
          >
            <Icon name="trash" />
            <span>Delete Movie</span>
          </button>
        )}
      </div>
    </div>
  );
}
