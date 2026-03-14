
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { ConditionBuilder } from './ConditionBuilder';
import type {
  CustomFormat,
  CreateCustomFormatInput,
  UpdateCustomFormatInput,
  CustomFormatCondition,
} from '@/types/customFormat';
import { createDefaultCondition } from '@/types/customFormat';

interface CustomFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (format: CreateCustomFormatInput | UpdateCustomFormatInput) => Promise<void> | void;
  editFormat?: CustomFormat;
  isLoading?: boolean;
}

export function CustomFormatModal({
  isOpen,
  onClose,
  onSave,
  editFormat,
  isLoading = false,
}: CustomFormatModalProps) {
  const [name, setName] = useState('');
  const [includeWhenRenaming, setIncludeWhenRenaming] = useState(false);
  const [conditions, setConditions] = useState<CustomFormatCondition[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editFormat) {
        setName(editFormat.name);
        setIncludeWhenRenaming(editFormat.includeCustomFormatWhenRenaming);
        setConditions(editFormat.conditions.length > 0 ? editFormat.conditions : [createDefaultCondition()]);
      } else {
        setName('');
        setIncludeWhenRenaming(false);
        setConditions([createDefaultCondition()]);
      }
      setValidationError(null);
    }
  }, [isOpen, editFormat]);

  const handleSave = () => {
    // Validation
    if (!name.trim()) {
      setValidationError('Name is required');
      return;
    }

    if (conditions.length === 0) {
      setValidationError('At least one condition is required');
      return;
    }

    // Validate each condition has a value
    const invalidCondition = conditions.find(c => {
      if (c.value === undefined || c.value === null) return true;
      if (typeof c.value === 'string' && c.value.trim() === '') return true;
      return false;
    });

    if (invalidCondition) {
      setValidationError('All conditions must have a value');
      return;
    }

    setValidationError(null);

    const input: CreateCustomFormatInput = {
      name: name.trim(),
      includeCustomFormatWhenRenaming: includeWhenRenaming,
      conditions,
    };

    onSave(input);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel={editFormat ? 'Edit Custom Format' : 'Add Custom Format'}
      onClose={handleClose}
      maxWidthClassName="max-w-3xl"
    >
      <ModalHeader
        title={editFormat ? 'Edit Custom Format' : 'Add Custom Format'}
        onClose={handleClose}
      />
      <ModalBody>
        <div className="space-y-5">
          {/* Name Field */}
          <div>
            <label htmlFor="format-name" className="block text-sm font-medium text-text-primary">
              Name <span className="text-accent-danger">*</span>
            </label>
            <input
              id="format-name"
              type="text"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary disabled:opacity-50"
              placeholder="e.g., HDR10, Dolby Vision, x265"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Include When Renaming Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWhenRenaming}
                onChange={e => setIncludeWhenRenaming(e.target.checked)}
                disabled={isLoading}
                className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">
                  Include Custom Format when Renaming
                </span>
                <p className="text-xs text-text-muted">
                  Add matching custom format tokens to renamed file names
                </p>
              </div>
            </label>
          </div>

          {/* Conditions Builder */}
          <ConditionBuilder
            conditions={conditions}
            onChange={setConditions}
            disabled={isLoading}
          />

          {/* Validation Error */}
          {validationError && (
            <Alert variant="warning">
              {validationError}
            </Alert>
          )}

          {/* Help Text */}
          <div className="rounded-sm bg-surface-0 border border-border-subtle p-3 text-xs text-text-muted space-y-1">
            <p className="font-medium text-text-secondary">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Use <code className="bg-surface-1 px-1 rounded">regex</code> type for pattern matching in release titles</li>
              <li>Use <code className="bg-surface-1 px-1 rounded">size</code> conditions to filter by file size (in bytes)</li>
              <li>Enable <em>Negate</em> to invert a condition&apos;s match result</li>
              <li>Enable <em>Required</em> to make a condition mandatory for format matching</li>
            </ul>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : editFormat ? 'Save Changes' : 'Add Format'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
