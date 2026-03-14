
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { SeriesOrganizePreview } from '@/lib/api/seriesApi';

interface OrganizePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesIds: number[];
  onComplete?: () => void;
}

export function OrganizePreviewModal({
  isOpen,
  onClose,
  seriesIds,
  onComplete,
}: OrganizePreviewModalProps) {
  const { seriesApi } = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [previews, setPreviews] = useState<SeriesOrganizePreview[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch previews when modal opens
  const fetchPreviews = useCallback(async () => {
    if (!isOpen || seriesIds.length === 0) return;
    
    setIsPreviewLoading(true);
    try {
      const result = await seriesApi.previewOrganize({ seriesIds });
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
  }, [isOpen, seriesIds, seriesApi, pushToast]);

  // Apply rename mutation
  const applyMutation = useMutation({
    mutationFn: () => seriesApi.applyOrganize({ seriesIds }),
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

  // Group previews by series and season
  const groupedPreviews = useMemo(() => {
    const groups: Record<string, Record<number, SeriesOrganizePreview[]>> = {};
    for (const preview of changedPreviews) {
      if (!groups[preview.seriesTitle]) {
        groups[preview.seriesTitle] = {};
      }
      if (!groups[preview.seriesTitle][preview.seasonNumber]) {
        groups[preview.seriesTitle][preview.seasonNumber] = [];
      }
      groups[preview.seriesTitle][preview.seasonNumber].push(preview);
    }
    return groups;
  }, [changedPreviews]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Organize Episode Files"
      maxWidthClassName="max-w-4xl"
    >
      <ModalHeader title="Organize Episode Files" onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-4">
            <div className="flex items-start gap-3">
              <Icon name="warning" className="text-status-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-status-warning">Warning</p>
                <p className="text-sm text-text-secondary mt-1">
                  This will rename and/or move episode files on disk. Make sure your media is not being accessed by other applications.
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
              No series selected for organization.
            </div>
          ) : (
            <>
              {unchangedCount > 0 && (
                <p className="text-sm text-text-secondary">
                  {unchangedCount} file(s) already follow the naming convention.
                </p>
              )}
              
              <div className="max-h-[400px] overflow-auto">
                {Object.entries(groupedPreviews).map(([seriesTitle, seasons]) => (
                  <div key={seriesTitle} className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-2 sticky top-0 bg-surface-1 py-1">
                      {seriesTitle}
                    </h3>
                    {Object.entries(seasons).map(([seasonNum, episodePreviews]) => (
                      <div key={`${seriesTitle}-${seasonNum}`} className="mb-3">
                        <h4 className="text-xs font-medium text-text-secondary mb-1 px-2">
                          Season {seasonNum}
                        </h4>
                        <table className="w-full text-sm">
                          <thead className="bg-surface-2">
                            <tr className="border-b border-border-subtle">
                              <th className="text-left py-2 px-3 font-medium w-16">Ep</th>
                              <th className="text-left py-2 px-3 font-medium">Current Path</th>
                              <th className="text-left py-2 px-3 font-medium">New Path</th>
                            </tr>
                          </thead>
                          <tbody>
                            {episodePreviews.map((preview) => (
                              <tr key={`${preview.episodeId}`} className="border-b border-border-subtle">
                                <td className="py-2 px-3 text-text-secondary">
                                  E{String(preview.episodeNumber).padStart(2, '0')}
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
                    ))}
                  </div>
                ))}
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
          variant="primary"
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
