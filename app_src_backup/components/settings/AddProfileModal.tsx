'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import type {
  CreateQualityProfileInput,
  Quality,
  QualityDefinition,
  QualityProfile,
} from '@/types/qualityProfile';
import {
  getAllQualities,
  formatQuality,
  sortQualitiesByRank,
} from '@/types/qualityProfile';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: CreateQualityProfileInput) => Promise<void> | void;
  editProfile?: QualityProfile;
  customFormatScores?: Array<{
    name: string;
    score: number;
  }>;
  isLoading?: boolean;
}

export function AddProfileModal({
  isOpen,
  onClose,
  onSave,
  editProfile,
  customFormatScores = [],
  isLoading = false,
}: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<Set<string>>(new Set());
  const [cutoffQuality, setCutoffQuality] = useState<string>('');
  const [languageProfileId, setLanguageProfileId] = useState<number | undefined>(undefined);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editProfile) {
        setName(editProfile.name);
        const qualitySet = new Set(editProfile.qualities.map(q => formatQuality(q)));
        setSelectedQualities(qualitySet);
        const cutoff = editProfile.qualities.find(q => q.id === editProfile.cutoffId);
        setCutoffQuality(cutoff ? formatQuality(cutoff) : '');
        setLanguageProfileId(editProfile.languageProfileId);
      } else {
        // Default: select all qualities, set cutoff to highest quality
        const allQualities = sortQualitiesByRank(getAllQualities());
        const qualitySet = new Set(allQualities.map(formatQuality));
        setSelectedQualities(qualitySet);
        if (allQualities.length > 0) {
          setCutoffQuality(formatQuality(allQualities[0]));
        }
        setName('');
        setLanguageProfileId(undefined);
      }
    }
  }, [isOpen, editProfile]);

  const handleQualityToggle = (quality: string) => {
    setSelectedQualities(current => {
      const next = new Set(current);
      if (next.has(quality)) {
        next.delete(quality);
        // If we removed the cutoff, update it to the next highest
        if (quality === cutoffQuality && next.size > 0) {
          const sorted = sortQualitiesByRank(
            Array.from(next).map(q => {
              const [source, resolution] = q.split('-');
              return { source, resolution };
            }),
          );
          setCutoffQuality(formatQuality(sorted[0]));
        }
      } else {
        next.add(quality);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedQualities.size === 0 || !cutoffQuality) {
      return;
    }

    const qualities = Array.from(selectedQualities).map(q => {
      const [source, resolution] = q.split('-');
      return { source, resolution };
    });

    // Find the index of cutoff quality in the sorted list
    const sortedQualities = sortQualitiesByRank(qualities);
    const cutoffIndex = sortedQualities.findIndex(q => formatQuality(q) === cutoffQuality);

    onSave({
      name: name.trim(),
      cutoffId: cutoffIndex >= 0 ? cutoffIndex : 0,
      qualities,
      languageProfileId,
    });
  };

  const allQualities = sortQualitiesByRank(getAllQualities());
  const selectedQualitiesList = sortQualitiesByRank(
    Array.from(selectedQualities).map(q => {
      const [source, resolution] = q.split('-');
      return { source, resolution };
    }),
  );

  const canSave = name.trim() !== '' && selectedQualities.size > 0 && cutoffQuality !== '';

  return (
    <Modal isOpen={isOpen} ariaLabel={editProfile ? 'Edit Quality Profile' : 'Add Quality Profile'} onClose={onClose}>
      <ModalHeader title={editProfile ? 'Edit Quality Profile' : 'Add Quality Profile'} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Profile Name */}
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-text-primary">
              Profile Name <span className="text-accent-danger">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              placeholder="e.g., HD - 1080p/720p"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Language Profile (optional) */}
          <div>
            <label htmlFor="language-profile" className="block text-sm font-medium text-text-primary">
              Language Profile
            </label>
            <select
              id="language-profile"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={languageProfileId ?? ''}
              onChange={e => setLanguageProfileId(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)}
            >
              <option value="">Any Language</option>
              <option value="1">English</option>
              <option value="2">Spanish</option>
              <option value="3">French</option>
              <option value="4">German</option>
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Optional: Restrict downloads to a specific language profile.
            </p>
          </div>

          {/* Custom Format Scores (edit mode only) */}
          {editProfile && (
            <div>
              <label className="block text-sm font-medium text-text-primary">
                Custom Format Scores
              </label>
              {customFormatScores.length === 0 ? (
                <p className="mt-1 text-xs text-text-muted">
                  No custom format scores assigned.
                </p>
              ) : (
                <div className="mt-2 space-y-1 rounded-sm border border-border-subtle bg-surface-0 p-3">
                  {customFormatScores.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{item.name}</span>
                      <span className={item.score >= 0 ? 'font-medium text-accent-primary' : 'font-medium text-accent-danger'}>
                        {item.score >= 0 ? `+${item.score}` : String(item.score)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary">
              Allowed Qualities <span className="text-accent-danger">*</span>
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Select the quality levels allowed in this profile. Drag to set download priority.
            </p>
            <div className="rounded-sm border border-border-subtle bg-surface-0 p-3">
              {selectedQualitiesList.length === 0 ? (
                <p className="text-sm text-text-muted">No qualities selected. Select from the list below.</p>
              ) : (
                <div className="space-y-1">
                  {selectedQualitiesList.map((quality) => {
                    const key = formatQuality(quality);
                    const isCutoff = cutoffQuality === key;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between rounded-sm border border-border-subtle px-3 py-1.5 text-sm ${
                          isCutoff ? 'border-accent-primary bg-accent-primary/10' : ''
                        }`}
                      >
                        <span>{formatQuality(quality)}</span>
                        {isCutoff ? <span className="text-xs font-semibold text-accent-primary">Cutoff</span> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cutoff Quality */}
          <div>
            <label htmlFor="cutoff-quality" className="block text-sm font-medium text-text-primary">
              Cutoff Quality <span className="text-accent-danger">*</span>
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Once a file at this quality is downloaded, lower quality files will not be downloaded.
            </p>
            <select
              id="cutoff-quality"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={cutoffQuality}
              onChange={e => setCutoffQuality(e.target.value)}
              disabled={selectedQualities.size === 0}
            >
              {selectedQualitiesList.map((quality) => (
                <option key={formatQuality(quality)} value={formatQuality(quality)}>
                  {formatQuality(quality)}
                </option>
              ))}
            </select>
          </div>

          {/* Available Qualities to Select */}
          <div>
            <label className="block text-sm font-medium text-text-primary">
              Available Qualities
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Click to add or remove qualities from the profile.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {allQualities.map(quality => {
                const key = formatQuality(quality);
                const isSelected = selectedQualities.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleQualityToggle(key)}
                    className={`rounded-sm border px-3 py-2 text-sm text-left transition ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                        : 'border-border-subtle bg-surface-1 text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    {formatQuality(quality)}
                  </button>
                );
              })}
            </div>
          </div>

          {!canSave && (
            <Alert variant="warning">
              Please provide a profile name, select at least one quality, and set a cutoff quality.
            </Alert>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave || isLoading}>
          {isLoading ? 'Saving...' : editProfile ? 'Save Changes' : 'Add Profile'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
