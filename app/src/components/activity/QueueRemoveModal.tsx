'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { Label } from '@/components/primitives/Label';

export interface QueueRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: QueueRemoveOptions) => void;
  itemTitle: string;
  isConfirming?: boolean;
}

export interface QueueRemoveOptions {
  blockRelease: boolean;
  addToImportExclusions: boolean;
  ignoreMovie: boolean;
  deleteFiles: boolean;
}

export function QueueRemoveModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  isConfirming = false,
}: QueueRemoveModalProps) {
  const [options, setOptions] = useState<QueueRemoveOptions>({
    blockRelease: false,
    addToImportExclusions: false,
    ignoreMovie: false,
    deleteFiles: false,
  });

  // Reset options when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setOptions({
        blockRelease: false,
        addToImportExclusions: false,
        ignoreMovie: false,
        deleteFiles: false,
      });
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(options);
    // Reset options after confirmation
    setOptions({
      blockRelease: false,
      addToImportExclusions: false,
      ignoreMovie: false,
      deleteFiles: false,
    });
  };

  const handleClose = () => {
    setOptions({
      blockRelease: false,
      addToImportExclusions: false,
      ignoreMovie: false,
      deleteFiles: false,
    });
    onClose();
  };

  return (
    <Modal isOpen ariaLabel="Remove from queue" onClose={handleClose}>
      <ModalHeader title="Remove from queue" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Are you sure you want to remove{' '}
            <span className="font-medium">{itemTitle}</span> from the queue?
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="block-release"
                checked={options.blockRelease}
                onChange={e =>
                  setOptions({ ...options, blockRelease: e.target.checked })
                }
                className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
              />
              <span className="text-sm text-text-primary">Block this release</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="add-exclusions"
                checked={options.addToImportExclusions}
                onChange={e =>
                  setOptions({
                    ...options,
                    addToImportExclusions: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
              />
              <span className="text-sm text-text-primary">
                Add to import exclusions
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="ignore-movie"
                checked={options.ignoreMovie}
                onChange={e =>
                  setOptions({ ...options, ignoreMovie: e.target.checked })
                }
                className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
              />
              <span className="text-sm text-text-primary">
                Ignore movie (don't auto-search)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="delete-files"
                checked={options.deleteFiles}
                onChange={e =>
                  setOptions({ ...options, deleteFiles: e.target.checked })
                }
                className="h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
              />
              <div className="flex flex-col">
                <span className="text-sm text-text-primary">Delete files</span>
                <span className="text-xs text-text-muted">
                  Warning: This will delete downloaded files
                </span>
              </div>
            </label>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
