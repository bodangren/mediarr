
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { OrganizePreview } from '@/lib/api/movieApi';

interface OrganizePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieIds: number[];
  onComplete?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function OrganizePreviewModal({
  isOpen,
  onClose,
  movieIds,
  onComplete,
}: OrganizePreviewModalProps) {
  const { movieApi } = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [previews, setPreviews] = useState<OrganizePreview[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch previews when modal opens
  const fetchPreviews = useCallback(async () => {
    if (!isOpen || movieIds.length === 0) return;
    
    setIsPreviewLoading(true);
    try {
      const result = await movieApi.previewOrganize({ movieIds });
      setPreviews(result.previews);
    } catch (error) {
      pushToast({
        title: 'Failed to preview',
        message: error instanceof Error ? error.message : 'Could not generate preview',
        variant: 'error',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }, [isOpen, movieIds, movieApi, pushToast]);

  // Apply rename mutation
  const applyMutation = useMutation({
    mutationFn: () => movieApi.applyOrganize({ movieIds }),
    onSuccess: (result) => {
      pushToast({
        title: 'Rename Complete',
        message: `${result.renamed} files renamed successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        variant: result.failed > 0 ? 'warning' : 'success',
      });
      if (result.errors.length > 0) {
        console.error('Rename errors:', result.errors);
      }
      onComplete?.();
      onClose();
    },
    onError: (error) => {
      pushToast({
        title: 'Rename Failed',
        message: error instanceof Error ? error.message : 'Failed to rename files',
        variant: 'error',
      });
    },
  });

  // Load previews on open
  useMemo(() => {
    if (isOpen) {
      void fetchPreviews();
    }
  }, [isOpen, fetchPreviews]);

  // Filter to only show files that would change
  const changedPreviews = previews.filter(p => p.isNewPath);
  const unchangedCount = previews.filter(p => !p.isNewPath).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Organize Files"
      maxWidthClassName="max-w-4xl"
    >
      <ModalHeader title="Organize Files" onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-4">
            <div className="flex items-start gap-3">
              <Icon name="warning" className="text-status-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-status-warning">Warning</p>
                <p className="text-sm text-text-secondary mt-1">
                  This will rename and/or move movie files on disk. Make sure your media is not being accessed by other applications.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          {isPreviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="refresh" className="animate-spin text-2xl" />
              <span className="ml-2">Generating preview...</span>
            </div>
          ) : previews.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No movies selected for organization.
            </div>
          ) : (
            <>
              {unchangedCount > 0 && (
                <p className="text-sm text-text-secondary">
                  {unchangedCount} file(s) already follow the naming convention.
                </p>
              )}
              
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-2 px-3 font-medium">Movie</th>
                      <th className="text-left py-2 px-3 font-medium">Current Path</th>
                      <th className="text-left py-2 px-3 font-medium">New Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedPreviews.map((preview, index) => (
                      <tr key={`${preview.movieId}-${index}`} className="border-b border-border-subtle">
                        <td className="py-2 px-3">
                          <span className="font-medium">{preview.movieTitle}</span>
                        </td>
                        <td className="py-2 px-3 text-text-secondary">
                          <span className="font-mono text-xs break-all">{preview.currentPath}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-xs break-all text-accent-primary">{preview.newPath}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {changedPreviews.length === 0 && (
                <div className="text-center py-4 text-text-secondary">
                  All files already follow the naming convention. No changes needed.
                </div>
              )}
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={() => applyMutation.mutate()}
          disabled={changedPreviews.length === 0 || applyMutation.isPending}
        >
          {applyMutation.isPending ? (
            <>
              <Icon name="refresh" className="animate-spin" />
              <span>Renaming...</span>
            </>
          ) : (
            `Rename ${changedPreviews.length} File(s)`
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
