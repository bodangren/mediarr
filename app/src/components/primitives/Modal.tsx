
import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
  maxWidthClassName?: string;
  className?: string;
}

interface ModalHeaderProps {
  title: ReactNode;
  onClose?: () => void;
  actions?: ReactNode;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  isConfirming?: boolean;
}

export function Modal({
  isOpen,
  ariaLabel,
  children,
  onClose,
  closeOnBackdropClick = true,
  maxWidthClassName = 'max-w-lg sm:max-w-xl lg:max-w-2xl',
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !onClose) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    if (!closeOnBackdropClick || !onClose) {
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-surface-3/70"
        data-testid="modal-backdrop"
        aria-label="Close modal"
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative z-10 w-full max-h-[85vh] flex flex-col rounded-md border border-border-subtle bg-surface-1 shadow-elevation-3 ${maxWidthClassName} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose, actions }: ModalHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {onClose ? (
          <Button variant="secondary" onClick={onClose} aria-label="Close modal">
            Close
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`flex-1 overflow-y-auto px-4 py-3 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <footer className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3 sticky bottom-0 bg-surface-1 z-10">{children}</footer>;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isConfirming = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} ariaLabel={title} onClose={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <p className="text-sm text-text-secondary">{description ?? 'Please confirm this action.'}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={isConfirming}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
