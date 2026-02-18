'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@/components/primitives/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import type { BulkMovieChanges } from '@/lib/api/movieApi';

const MINIMUM_AVAILABILITY_OPTIONS = [
  { value: 'tba', label: 'TBA' },
  { value: 'announced', label: 'Announced' },
  { value: 'inCinemas', label: 'In Cinemas' },
  { value: 'released', label: 'Released' },
] as const;

interface MovieBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMovieIds: number[];
  selectedMovieTitles: string[];
}

interface FormState {
  qualityProfileId: string;
  monitored: string; // '' = no change, 'true' = yes, 'false' = no
  minimumAvailability: string;
  path: string;
  addTags: string;
  removeTags: string;
}

const DEFAULT_FORM_STATE: FormState = {
  qualityProfileId: '',
  monitored: '',
  minimumAvailability: '',
  path: '',
  addTags: '',
  removeTags: '',
};

export function MovieBulkEditModal({
  isOpen,
  onClose,
  selectedMovieIds,
  selectedMovieTitles,
}: MovieBulkEditModalProps) {
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
    queryKey: ['movies', 'root-folders'],
    queryFn: () => api.movieApi.getRootFolders(),
    enabled: isOpen,
  });

  const qualityProfiles = qualityProfilesData?.data ?? [];
  const rootFolders = rootFoldersData?.rootFolders ?? [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormState(DEFAULT_FORM_STATE);
      setShowPreview(false);
    }
  }, [isOpen]);

  // Build the changes object from form state
  const buildChanges = (): BulkMovieChanges => {
    const changes: BulkMovieChanges = {};

    if (formState.qualityProfileId !== '') {
      changes.qualityProfileId = parseInt(formState.qualityProfileId, 10);
    }
    if (formState.monitored !== '') {
      changes.monitored = formState.monitored === 'true';
    }
    if (formState.minimumAvailability !== '') {
      changes.minimumAvailability = formState.minimumAvailability;
    }
    if (formState.path !== '') {
      changes.path = formState.path;
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
    if (changes.minimumAvailability !== undefined) {
      const opt = MINIMUM_AVAILABILITY_OPTIONS.find(o => o.value === changes.minimumAvailability);
      summary.push(`Minimum Availability: ${opt?.label ?? changes.minimumAvailability}`);
    }
    if (changes.path !== undefined) {
      summary.push(`Root Folder: ${changes.path}`);
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
    mutationFn: () => api.movieApi.bulkUpdate(selectedMovieIds, buildChanges()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      
      if (result.failed > 0) {
        pushToast({
          title: 'Bulk update completed with errors',
          message: `${result.updated} movies updated, ${result.failed} failed`,
          variant: 'warning',
        });
      } else {
        pushToast({
          title: 'Movies updated',
          message: `${result.updated} movie${result.updated === 1 ? '' : 's'} updated successfully`,
          variant: 'success',
        });
      }
      
      onClose();
    },
    onError: (error) => {
      pushToast({
        title: 'Failed to update movies',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    },
  });

  // Organize files mutation
  const organizeMutation = useMutation({
    mutationFn: () => api.movieApi.applyOrganize({ movieIds: selectedMovieIds }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      
      if (result.failed > 0) {
        pushToast({
          title: 'Organize completed with errors',
          message: `${result.renamed} files renamed, ${result.failed} failed`,
          variant: 'warning',
        });
      } else {
        pushToast({
          title: 'Files organized',
          message: `${result.renamed} file${result.renamed === 1 ? '' : 's'} renamed successfully`,
          variant: 'success',
        });
      }
    },
    onError: (error) => {
      pushToast({
        title: 'Failed to organize files',
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

  const handleOrganize = () => {
    const confirmed = window.confirm(
      `Organize files for ${selectedMovieIds.length} movie${selectedMovieIds.length === 1 ? '' : 's'}?\n\nThis will rename files according to your naming settings.`
    );
    if (confirmed) {
      organizeMutation.mutate();
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState(current => ({ ...current, [field]: value }));
    setShowPreview(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel="Bulk Edit Movies"
      onClose={onClose}
      maxWidthClassName="max-w-xl"
    >
      <ModalHeader title={`Edit ${selectedMovieIds.length} Movie${selectedMovieIds.length === 1 ? '' : 's'}`} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Selected movies summary */}
          <div className="rounded-sm border border-border-subtle bg-surface-0 p-3">
            <p className="text-xs text-text-secondary mb-1">Selected movies:</p>
            <p className="text-sm font-medium">
              {selectedMovieTitles.length <= 5
                ? selectedMovieTitles.join(', ')
                : `${selectedMovieTitles.slice(0, 5).join(', ')} and ${selectedMovieTitles.length - 5} more`}
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

            {/* Minimum Availability */}
            <div>
              <label htmlFor="minimumAvailability" className="block text-sm font-medium mb-1">
                Minimum Availability
              </label>
              <select
                id="minimumAvailability"
                value={formState.minimumAvailability}
                onChange={e => updateField('minimumAvailability', e.currentTarget.value)}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              >
                <option value="">-- No Change --</option>
                {MINIMUM_AVAILABILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Root Folder */}
            <div>
              <label htmlFor="path" className="block text-sm font-medium mb-1">
                Root Folder
              </label>
              {rootFolders.length > 0 ? (
                <select
                  id="path"
                  value={formState.path}
                  onChange={e => updateField('path', e.currentTarget.value)}
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
                  id="path"
                  type="text"
                  value={formState.path}
                  onChange={e => updateField('path', e.currentTarget.value)}
                  placeholder="/movies"
                  className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                />
              )}
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
        <div className="flex items-center gap-2 mr-auto">
          <Button
            variant="secondary"
            onClick={handleOrganize}
            disabled={organizeMutation.isPending}
          >
            {organizeMutation.isPending ? 'Organizing...' : 'Organize Files'}
          </Button>
        </div>
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
