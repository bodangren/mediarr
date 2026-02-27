'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@/components/primitives/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import type { BulkSeriesChanges } from '@/lib/api/seriesApi';

interface SeriesBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSeriesIds: number[];
  selectedSeriesTitles: string[];
}

interface FormState {
  qualityProfileId: string;
  monitored: string; // '' = no change, 'true' = yes, 'false' = no
  rootFolderPath: string;
  seasonFolder: string;
  addTags: string;
  removeTags: string;
}

const DEFAULT_FORM_STATE: FormState = {
  qualityProfileId: '',
  monitored: '',
  rootFolderPath: '',
  seasonFolder: '',
  addTags: '',
  removeTags: '',
};

export function SeriesBulkEditModal({
  isOpen,
  onClose,
  selectedSeriesIds,
  selectedSeriesTitles,
}: SeriesBulkEditModalProps) {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch quality profiles for the dropdown
  const { data: qualityProfilesData } = useQuery({
    queryKey: queryKeys.qualityProfiles(),
    queryFn: () => api.qualityProfileApi.list(),
    enabled: isOpen,
  });

  // Fetch root folders
  const { data: rootFoldersData } = useQuery({
    queryKey: ['series', 'root-folders'],
    queryFn: () => api.seriesApi.getRootFolders(),
    enabled: isOpen,
  });

  const qualityProfiles = qualityProfilesData ?? [];
  const rootFolders = rootFoldersData?.rootFolders ?? [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormState(DEFAULT_FORM_STATE);
      setShowPreview(false);
    }
  }, [isOpen]);

  // Build the changes object from form state
  const buildChanges = (): BulkSeriesChanges => {
    const changes: BulkSeriesChanges = {};

    if (formState.qualityProfileId !== '') {
      changes.qualityProfileId = parseInt(formState.qualityProfileId, 10);
    }
    if (formState.monitored !== '') {
      changes.monitored = formState.monitored === 'true';
    }
    if (formState.rootFolderPath !== '') {
      changes.rootFolderPath = formState.rootFolderPath;
    }
    if (formState.seasonFolder !== '') {
      changes.seasonFolder = formState.seasonFolder === 'true';
    }
    if (formState.addTags !== '') {
      changes.addTags = formState.addTags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (formState.removeTags !== '') {
      changes.removeTags = formState.removeTags.split(',').map(t => t.trim()).filter(Boolean);
    }

    return changes;
  };

  // Determine if there are any changes
  const hasChanges = (): boolean => {
    const changes = buildChanges();
    return Object.keys(changes).length > 0;
  };

  // Get summary of changes for preview
  const getChangesSummary = (): string[] => {
    const summary: string[] = [];
    const changes = buildChanges();

    if (changes.qualityProfileId !== undefined) {
      const profile = qualityProfiles.find((p: any) => p.id === changes.qualityProfileId);
      summary.push(`Quality Profile: ${profile?.name ?? changes.qualityProfileId}`);
    }
    if (changes.monitored !== undefined) {
      summary.push(`Monitored: ${changes.monitored ? 'Yes' : 'No'}`);
    }
    if (changes.rootFolderPath !== undefined) {
      summary.push(`Root Folder: ${changes.rootFolderPath}`);
    }
    if (changes.seasonFolder !== undefined) {
      summary.push(`Season Folder: ${changes.seasonFolder ? 'Yes' : 'No'}`);
    }
    if (changes.addTags && changes.addTags.length > 0) {
      summary.push(`Add Tags: ${changes.addTags.join(', ')}`);
    }
    if (changes.removeTags && changes.removeTags.length > 0) {
      summary.push(`Remove Tags: ${changes.removeTags.join(', ')}`);
    }

    return summary;
  };

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: () => api.seriesApi.bulkUpdate(selectedSeriesIds, buildChanges()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      
      if (result.failed > 0) {
        pushToast({
          title: 'Bulk update completed with errors',
          message: `${result.updated} series updated, ${result.failed} failed`,
          variant: 'warning',
        });
      } else {
        pushToast({
          title: 'Series updated',
          message: `${result.updated} series${result.updated === 1 ? '' : ''} updated successfully`,
          variant: 'success',
        });
      }
      
      onClose();
    },
    onError: (error) => {
      pushToast({
        title: 'Failed to update series',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    },
  });

  const handleApply = () => {
    if (showPreview) {
      bulkUpdateMutation.mutate();
    } else {
      setShowPreview(true);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState(current => ({ ...current, [field]: value }));
    setShowPreview(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel="Bulk Edit Series"
      onClose={onClose}
      maxWidthClassName="max-w-xl"
    >
      <ModalHeader title={`Edit ${selectedSeriesIds.length} Series${selectedSeriesIds.length === 1 ? '' : ''}`} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Selected series summary */}
          <div className="rounded-sm border border-border-subtle bg-surface-0 p-3">
            <p className="text-xs text-text-secondary mb-1">Selected series:</p>
            <p className="text-sm font-medium">
              {selectedSeriesTitles.length <= 5
                ? selectedSeriesTitles.join(', ')
                : `${selectedSeriesTitles.slice(0, 5).join(', ')} and ${selectedSeriesTitles.length - 5} more`}
            </p>
          </div>

          {/* Edit controls */}
          <div className="space-y-3">
            {/* Quality Profile */}
            <div>
              <label htmlFor="qualityProfileId" className="block text-sm font-medium mb-1">
                Quality Profile
              </label>
              <select
                id="qualityProfileId"
                value={formState.qualityProfileId}
                onChange={e => updateField('qualityProfileId', e.currentTarget.value)}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              >
                <option value="">-- No Change --</option>
                {qualityProfiles.map((profile: any) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Monitored */}
            <div>
              <label htmlFor="monitored" className="block text-sm font-medium mb-1">
                Monitored
              </label>
              <select
                id="monitored"
                value={formState.monitored}
                onChange={e => updateField('monitored', e.currentTarget.value)}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              >
                <option value="">-- No Change --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Root Folder */}
            <div>
              <label htmlFor="rootFolderPath" className="block text-sm font-medium mb-1">
                Root Folder
              </label>
              {rootFolders.length > 0 ? (
                <select
                  id="rootFolderPath"
                  value={formState.rootFolderPath}
                  onChange={e => updateField('rootFolderPath', e.currentTarget.value)}
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                >
                  <option value="">-- No Change --</option>
                  {rootFolders.map(folder => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="rootFolderPath"
                  type="text"
                  value={formState.rootFolderPath}
                  onChange={e => updateField('rootFolderPath', e.currentTarget.value)}
                  placeholder="/tv"
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                />
              )}
            </div>

            {/* Season Folder */}
            <div>
              <label htmlFor="seasonFolder" className="block text-sm font-medium mb-1">
                Season Folder
              </label>
              <select
                id="seasonFolder"
                value={formState.seasonFolder}
                onChange={e => updateField('seasonFolder', e.currentTarget.value)}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              >
                <option value="">-- No Change --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="addTags" className="block text-sm font-medium mb-1">
                  Add Tags
                </label>
                <input
                  id="addTags"
                  type="text"
                  value={formState.addTags}
                  onChange={e => updateField('addTags', e.currentTarget.value)}
                  placeholder="tag1, tag2, ..."
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                />
                <p className="text-xs text-text-muted mt-1">Comma-separated</p>
              </div>
              <div>
                <label htmlFor="removeTags" className="block text-sm font-medium mb-1">
                  Remove Tags
                </label>
                <input
                  id="removeTags"
                  type="text"
                  value={formState.removeTags}
                  onChange={e => updateField('removeTags', e.currentTarget.value)}
                  placeholder="tag1, tag2, ..."
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                />
                <p className="text-xs text-text-muted mt-1">Comma-separated</p>
              </div>
            </div>
          </div>

          {/* Preview section */}
          {showPreview && hasChanges() && (
            <div className="rounded-sm border border-accent-primary/50 bg-accent-primary/10 p-3">
              <p className="text-sm font-medium mb-2">Changes to apply:</p>
              <ul className="text-sm space-y-1">
                {getChangesSummary().map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-accent-primary">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No changes warning */}
          {showPreview && !hasChanges() && (
            <div className="rounded-sm border border-status-wanted/50 bg-status-wanted/10 p-3">
              <p className="text-sm text-status-wanted">No changes selected. Please modify at least one field.</p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={bulkUpdateMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={bulkUpdateMutation.isPending || (showPreview && !hasChanges())}
        >
          {bulkUpdateMutation.isPending
            ? 'Saving...'
            : showPreview
              ? 'Apply Changes'
              : 'Preview Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
