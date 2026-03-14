import { useEffect, useState } from 'react';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import type {
  CreateQualityProfileInput,
  QualityProfileItem,
  QualityProfileRule,
} from '@/lib/api/qualityProfileApi';

export interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateQualityProfileInput) => Promise<void> | void;
  editProfile?: QualityProfileItem;
  isLoading?: boolean;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface QualityRowProps {
  rule: QualityProfileRule;
  index: number;
  total: number;
  isCutoff: boolean;
  isDragging: boolean;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: (id: number) => void;
}

function QualityRow({
  rule,
  index,
  total,
  isCutoff,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onToggle,
}: QualityRowProps) {
  const qualityName = rule.quality.name;

  return (
    <li
      draggable
      onDragStart={e => {
        // Replace the browser ghost image with an invisible pixel so the
        // native floating ghost doesn't appear — feedback is via opacity only.
        const ghost = document.createElement('div');
        ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;width:1px;height:1px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => ghost.remove(), 0);
        onDragStart(index);
      }}
      onDragEnter={e => {
        e.preventDefault();
        onDragEnter(index);
      }}
      onDragOver={e => e.preventDefault()}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className={`flex cursor-grab items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-opacity ${
        isCutoff && rule.allowed
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-subtle'
      } ${!rule.allowed ? 'opacity-50' : ''}`}
    >
      <span className="text-text-muted select-none" aria-hidden="true" title="Drag to reorder">
        ⠿
      </span>
      <input
        type="checkbox"
        checked={rule.allowed}
        onChange={() => onToggle(rule.quality.id)}
        aria-label={`Toggle ${qualityName}`}
        className="h-4 w-4 shrink-0"
      />
      <span className="flex-1">
        {qualityName}
        {isCutoff && rule.allowed && (
          <span className="ml-2 text-xs font-semibold text-accent-primary">Cutoff</span>
        )}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${qualityName} up`}
          className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          onClick={onMoveUp}
          disabled={index <= 0}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Move ${qualityName} down`}
          className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          onClick={onMoveDown}
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
  isLoading = false,
}: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<QualityProfileRule[]>([]);
  const [cutoff, setCutoff] = useState<number>(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && editProfile) {
      setName(editProfile.name);
      setItems(editProfile.items);
      setCutoff(editProfile.cutoff);
    }
  }, [isOpen, editProfile]);

  const handleDragStart = (index: number) => setDraggingIndex(index);

  const handleDragEnter = (index: number) => {
    if (draggingIndex === null || draggingIndex === index) return;
    setItems(current => moveItem(current, draggingIndex, index));
    setDraggingIndex(index);
  };

  const handleDragEnd = () => setDraggingIndex(null);

  const handleMoveUp = (index: number) => {
    setItems(current => moveItem(current, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    setItems(current => moveItem(current, index, index + 1));
  };

  const handleToggle = (qualityId: number) => {
    const rule = items.find(r => r.quality.id === qualityId);
    setItems(current =>
      current.map(r => r.quality.id === qualityId ? { ...r, allowed: !r.allowed } : r),
    );
    if (rule?.allowed && cutoff === qualityId) {
      const nextAllowed = items.find(r => r.allowed && r.quality.id !== qualityId);
      setCutoff(nextAllowed?.quality.id ?? 0);
    }
  };

  const allowedItems = items.filter(r => r.allowed);
  const canSave = name.trim() !== '' && allowedItems.length > 0 && cutoff !== 0;

  const handleSave = () => {
    if (!canSave) return;
    void onSave({ name: name.trim(), cutoff, items });
  };

  return (
    <Modal isOpen={isOpen} ariaLabel={editProfile ? `Edit: ${editProfile.name}` : 'Add Quality Profile'} onClose={onClose}>
      <ModalHeader title={editProfile ? `Edit: ${editProfile.name}` : 'Add Quality Profile'} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-text-primary">
              Profile Name <span className="text-accent-danger">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              placeholder="e.g., HD - 1080p"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Qualities <span className="text-accent-danger">*</span>
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Drag rows or use ↑↓ to set priority. Check to allow. Top = highest priority.
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-text-muted">No qualities available.</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto rounded-sm border border-border-subtle bg-surface-0 p-2">
                {items.map((rule, index) => (
                  <QualityRow
                    key={rule.quality.id}
                    rule={rule}
                    index={index}
                    total={items.length}
                    isCutoff={cutoff === rule.quality.id}
                    isDragging={draggingIndex === index}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onToggle={handleToggle}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="cutoff-quality" className="block text-sm font-medium text-text-primary">
              Cutoff Quality <span className="text-accent-danger">*</span>
            </label>
            <p className="mb-1 text-xs text-text-muted">
              Mediarr stops upgrading once a file at this quality is grabbed.
            </p>
            <select
              id="cutoff-quality"
              aria-label="Cutoff quality"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={cutoff}
              onChange={e => setCutoff(Number(e.target.value))}
              disabled={allowedItems.length === 0}
            >
              {allowedItems.map(rule => (
                <option key={rule.quality.id} value={rule.quality.id}>
                  {rule.quality.name}
                </option>
              ))}
            </select>
          </div>

          {!canSave && (
            <Alert variant="warning">
              Please provide a profile name, allow at least one quality, and set a cutoff.
            </Alert>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleSave} disabled={!canSave || isLoading}>
          {isLoading ? 'Saving...' : editProfile ? 'Save Changes' : 'Add Profile'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
