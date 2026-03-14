/**
 * Modal compatibility layer — wraps shadcn/ui Dialog with the legacy Modal API.
 * Callsites continue to use isOpen/onClose/ariaLabel/ModalHeader/ModalFooter etc.
 * @see components/ui/dialog.tsx for the underlying Radix Dialog primitives.
 */
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader as DialogHeaderPrimitive,
  DialogTitle,
  DialogFooter as DialogFooterPrimitive,
} from '@/components/ui/dialog';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

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
  confirmVariant?: 'default' | 'destructive';
  isConfirming?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  ariaLabel,
  children,
  onClose,
  closeOnBackdropClick = true,
  maxWidthClassName = 'sm:max-w-xl lg:max-w-2xl',
  className = '',
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && onClose) onClose();
      }}
    >
      <DialogContent
        aria-label={ariaLabel}
        className={`flex max-h-[85vh] flex-col gap-0 p-0 ${maxWidthClassName} ${className}`}
        onInteractOutside={(e) => {
          if (!closeOnBackdropClick) e.preventDefault();
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function ModalHeader({ title, onClose, actions }: ModalHeaderProps) {
  return (
    <DialogHeaderPrimitive className="flex-row items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 space-y-0">
      <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
      <div className="flex items-center gap-2">
        {actions}
        {onClose ? (
          <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close modal">
            Close
          </Button>
        ) : null}
      </div>
    </DialogHeaderPrimitive>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`flex-1 overflow-y-auto px-4 py-3 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <DialogFooterPrimitive className="border-t border-border-subtle px-4 py-3 sticky bottom-0 bg-background z-10 sm:justify-end">
      {children}
    </DialogFooterPrimitive>
  );
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'destructive',
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
