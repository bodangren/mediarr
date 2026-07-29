/**
 * Modal compatibility layer — wraps shadcn/ui Dialog with the legacy Modal API.
 * Callsites continue to use isOpen/onClose/ariaLabel/ModalHeader/ModalFooter etc.
 * @see components/ui/dialog.tsx for the underlying Radix Dialog primitives.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader as DialogHeaderPrimitive,
  DialogTitle,
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
  confirmVariant?: 'default' | 'destructive' | 'primary' | 'danger';
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
  // De-duplicate close calls within a single event tick. A real (or
  // userEvent-simulated) click on the backdrop fires both `pointerdown` (which
  // Radix's `DismissableLayer` catches to dismiss) and `click` (which our
  // backdrop `onClick` fallback also reacts to). Without the ref, the
  // consumer's `onClose` would be called twice. The flag is reset on the next
  // macrotask so subsequent close attempts still propagate.
  const closeHandledRef = useRef(false);
  const handleClose = useCallback(() => {
    if (closeHandledRef.current) return;
    closeHandledRef.current = true;
    setTimeout(() => {
      closeHandledRef.current = false;
    }, 0);
    onClose?.();
  }, [onClose]);

  // Radix's `useEscapeKeydown` hook listens for `keydown` on `document` in the
  // capture phase, so a `fireEvent.keyDown(window, …)` (used by some tests)
  // never reaches it. Add a bubble-phase listener on `window` that closes the
  // modal on Escape. We bail out when `event.defaultPrevented` is set so we do
  // not double-fire alongside Radix's document-level capture listener for real
  // user keypresses (whose target sits inside `document`).
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        aria-label={ariaLabel}
        className={`flex max-h-[85vh] flex-col gap-0 p-0 ${maxWidthClassName} ${className}`}
        onBackdropClick={closeOnBackdropClick ? handleClose : undefined}
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
    <DialogHeaderPrimitive className="flex-row items-center justify-between gap-6 px-12 py-10 space-y-0">
      <DialogTitle className="text-3xl font-bold tracking-tight">{title}</DialogTitle>
      <div className="flex items-center gap-4">
        {actions}
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="text-text-muted hover:text-white">
            ESC
          </Button>
        ) : null}
      </div>
    </DialogHeaderPrimitive>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`flex-1 px-12 pb-12 pt-0 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <footer className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-6 px-12 py-10 sticky bottom-0 bg-black/90 backdrop-blur-md z-10">
      {children}
    </footer>
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
  confirmVariant = 'danger',
  isConfirming = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} ariaLabel={title} onClose={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <DialogDescription asChild>
          <div className="text-sm text-text-secondary">{description ?? 'Please confirm this action.'}</div>
        </DialogDescription>
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
