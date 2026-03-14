
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/primitives/Alert';
import type { ImportList } from '@/lib/api/importListsApi';

interface ImportListListProps {
  lists: ImportList[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (list: ImportList) => void;
  onDelete: (list: ImportList) => void;
  onSync: (list: ImportList) => void;
  syncingId: number | null;
}

function formatLastSync(lastSyncAt: string | null | undefined): string {
  if (!lastSyncAt) return 'Never';
  const date = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getProviderDisplayName(providerType: string): string {
  switch (providerType) {
    case 'tmdb-popular':
      return 'TMDB Popular';
    case 'tmdb-list':
      return 'TMDB List';
    default:
      return providerType;
  }
}

export function ImportListList({
  lists,
  isLoading,
  error,
  onEdit,
  onDelete,
  onSync,
  syncingId,
}: ImportListListProps) {
  if (isLoading) {
    return (
      <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
        <p className="text-sm text-text-secondary">Loading import lists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <p>Failed to load import lists. Please try again later.</p>
      </Alert>
    );
  }

  if (lists.length === 0) {
    return (
      <Alert variant="info">
        <p>No import lists configured. Click "Add Import List" to create one.</p>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {lists.map((list) => {
        const isSyncing = syncingId === list.id;
        return (
          <div
            key={list.id}
            className="rounded-sm border border-border-subtle bg-surface-1 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary truncate">
                    {list.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
                      list.enabled
                        ? 'bg-status-completed/15 text-status-completed'
                        : 'bg-surface-3 text-text-muted'
                    }`}
                  >
                    {list.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="text-text-muted">Provider:</span>{' '}
                      <span className="text-text-secondary">
                        {getProviderDisplayName(list.providerType)}
                      </span>
                    </span>
                    <span>
                      <span className="text-text-muted">Quality Profile:</span>{' '}
                      <span className="text-text-secondary">
                        {list.qualityProfile?.name ?? 'Unknown'}
                      </span>
                    </span>
                    <span>
                      <span className="text-text-muted">Sync Interval:</span>{' '}
                      <span className="text-text-secondary">{list.syncInterval}h</span>
                    </span>
                    <span>
                      <span className="text-text-muted">Last Sync:</span>{' '}
                      <span className="text-text-secondary">
                        {formatLastSync(list.lastSyncAt)}
                      </span>
                    </span>
                  </div>
                  <div className="text-text-muted truncate">
                    Root: {list.rootFolderPath}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => onSync(list)}
                  disabled={isSyncing || !list.enabled}
                  className="text-sm"
                >
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onEdit(list)}
                  className="text-sm"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(list)}
                  className="text-sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
