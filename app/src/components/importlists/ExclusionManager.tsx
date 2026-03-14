
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert-compat';
import type { ImportListExclusion } from '@/lib/api/importListsApi';

interface ExclusionManagerProps {
  exclusions: ImportListExclusion[];
  isLoading: boolean;
  error: Error | null;
  onAddExclusion: () => void;
  onRemoveExclusion: (exclusion: ImportListExclusion) => void;
  isDeleting: boolean;
}

export function ExclusionManager({
  exclusions,
  isLoading,
  error,
  onAddExclusion,
  onRemoveExclusion,
  isDeleting,
}: ExclusionManagerProps) {
  if (isLoading) {
    return (
      <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
        <p className="text-sm text-text-secondary">Loading exclusions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <p>Failed to load exclusions. Please try again later.</p>
      </Alert>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Import List Exclusions
          </h2>
          <p className="text-xs text-text-muted">
            Items excluded from automatic import
          </p>
        </div>
        <Button variant="secondary" onClick={onAddExclusion}>
          Add Exclusion
        </Button>
      </div>

      {exclusions.length === 0 ? (
        <Alert variant="info">
          <p>No exclusions configured. Items will be imported normally.</p>
        </Alert>
      ) : (
        <div className="rounded-sm border border-border-subtle bg-surface-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Title</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">TMDB ID</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">IMDB ID</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">TVDB ID</th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {exclusions.map((exclusion) => (
                <tr key={exclusion.id} className="hover:bg-surface-1">
                  <td className="px-4 py-3 text-text-primary">{exclusion.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{exclusion.tmdbId ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{exclusion.imdbId ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{exclusion.tvdbId ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="destructive"
                      onClick={() => onRemoveExclusion(exclusion)}
                      disabled={isDeleting}
                      className="text-xs"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
