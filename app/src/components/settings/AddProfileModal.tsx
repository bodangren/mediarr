'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import type {
  CreateQualityProfileInput,
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

const QUALITY_ITEM_TYPE = 'quality-row';

interface DragItem {
  index: number;
}

interface QualityRowProps {
  quality: QualityDefinition;
  index: number;
  total: number;
  isCutoff: boolean;
  orderedQualities: QualityDefinition[];
  onReorder: (qualities: QualityDefinition[]) => void;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function QualityRow({ quality, index, total, isCutoff, orderedQualities, onReorder }: QualityRowProps) {
  const ref = useRef<HTMLLIElement>(null);
  const key = formatQuality(quality);

  const [{ isDragging }, drag] = useDrag({
    type: QUALITY_ITEM_TYPE,
    item: { index },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: QUALITY_ITEM_TYPE,
    hover(item) {
      if (item.index === index) return;
      onReorder(moveItem(orderedQualities, item.index, index));
      item.index = index;
    },
  });

  const attachRef = useCallback(
    (node: HTMLLIElement | null) => {
      ref.current = node;
      drag(drop(node));
    },
    [drag, drop],
  );

  return (
    <li
      ref={attachRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center justify-between rounded-sm border px-3 py-1.5 text-sm ${
        isCutoff ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="cursor-grab text-text-muted select-none"
          aria-hidden="true"
          title="Drag to reorder"
        >
          ⠿
        </span>
        {key}
      </span>
      <span className="flex items-center gap-1">
        {isCutoff && <span className="mr-2 text-xs font-semibold text-accent-primary">Cutoff</span>}
        <button
          type="button"
          aria-label={`Move ${key} up`}
          className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          onClick={() => onReorder(moveItem(orderedQualities, index, index - 1))}
          disabled={index <= 0}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Move ${key} down`}
          className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          onClick={() => onReorder(moveItem(orderedQualities, index, index + 1))}
          disabled={index >= total - 1}
        >
          ↓
        </button>
      </span>
    </li>
  );
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
  // orderedQualities: user-defined priority order (top = highest priority)
  const [orderedQualities, setOrderedQualities] = useState<QualityDefinition[]>([]);
  const [cutoffQuality, setCutoffQuality] = useState<string>('');
  const [languageProfileId, setLanguageProfileId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      if (editProfile) {
        setName(editProfile.name);
        const qualities = editProfile.qualities.map(q => ({ resolution: q.resolution, source: q.source }));
        setOrderedQualities(qualities);
        const cutoff = editProfile.qualities.find(q => q.id === editProfile.cutoffId);
        setCutoffQuality(cutoff ? formatQuality({ resolution: cutoff.resolution, source: cutoff.source }) : '');
        setLanguageProfileId(editProfile.languageProfileId);
      } else {
        const allQualities = sortQualitiesByRank(getAllQualities());
        setOrderedQualities(allQualities);
        if (allQualities.length > 0) {
          setCutoffQuality(formatQuality(allQualities[0]));
        }
        setName('');
        setLanguageProfileId(undefined);
      }
    }
  }, [isOpen, editProfile]);

  const handleQualityToggle = (quality: QualityDefinition) => {
    const key = formatQuality(quality);
    setOrderedQualities(current => {
      const idx = current.findIndex(q => formatQuality(q) === key);
      if (idx >= 0) {
        const next = current.filter((_, i) => i !== idx);
        // If we removed the cutoff, pick the new first quality as cutoff
        if (key === cutoffQuality) {
          if (next.length > 0) {
            setCutoffQuality(formatQuality(next[0]));
          } else {
            setCutoffQuality('');
          }
        }
        return next;
      }
      return [...current, quality];
    });
  };

  const handleSave = () => {
    if (!name.trim() || orderedQualities.length === 0 || !cutoffQuality) {
      return;
    }

    // Find the cutoff index in the ordered list (user-defined order)
    const cutoffIndex = orderedQualities.findIndex(q => formatQuality(q) === cutoffQuality);

    onSave({
      name: name.trim(),
      cutoffId: cutoffIndex >= 0 ? cutoffIndex : 0,
      qualities: orderedQualities,
      languageProfileId,
    });
  };

  const allQualities = sortQualitiesByRank(getAllQualities());
  const selectedKeys = new Set(orderedQualities.map(formatQuality));
  const canSave = name.trim() !== '' && orderedQualities.length > 0 && cutoffQuality !== '';

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

          {/* Quality Priority List (drag-to-reorder) */}
          <div>
            <label className="block text-sm font-medium text-text-primary">
              Allowed Qualities <span className="text-accent-danger">*</span>
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Drag rows or use ↑↓ arrows to set download priority. Top = highest priority.
            </p>
            <div className="rounded-sm border border-border-subtle bg-surface-0 p-3">
              {orderedQualities.length === 0 ? (
                <p className="text-sm text-text-muted">No qualities selected. Select from the list below.</p>
              ) : (
                <DndProvider backend={HTML5Backend}>
                  <ul className="space-y-1">
                    {orderedQualities.map((quality, index) => {
                      const key = formatQuality(quality);
                      return (
                        <QualityRow
                          key={key}
                          quality={quality}
                          index={index}
                          total={orderedQualities.length}
                          isCutoff={cutoffQuality === key}
                          orderedQualities={orderedQualities}
                          onReorder={setOrderedQualities}
                        />
                      );
                    })}
                  </ul>
                </DndProvider>
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
              aria-label="Cutoff quality"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={cutoffQuality}
              onChange={e => setCutoffQuality(e.target.value)}
              disabled={orderedQualities.length === 0}
            >
              {orderedQualities.map((quality) => {
                const k = formatQuality(quality);
                return (
                  <option key={k} value={k}>
                    {k}
                  </option>
                );
              })}
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
                const isSelected = selectedKeys.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleQualityToggle(quality)}
                    className={`rounded-sm border px-3 py-2 text-sm text-left transition ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                        : 'border-border-subtle bg-surface-1 text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    {key}
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
