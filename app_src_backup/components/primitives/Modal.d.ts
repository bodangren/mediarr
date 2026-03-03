import { type ReactNode } from 'react';
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
export declare function Modal({ isOpen, ariaLabel, children, onClose, closeOnBackdropClick, maxWidthClassName, className, }: ModalProps): import("react/jsx-runtime").JSX.Element | null;
export declare function ModalHeader({ title, onClose, actions }: ModalHeaderProps): import("react/jsx-runtime").JSX.Element;
export declare function ModalBody({ children }: ModalBodyProps): import("react/jsx-runtime").JSX.Element;
export declare function ModalFooter({ children }: ModalFooterProps): import("react/jsx-runtime").JSX.Element;
export declare function ConfirmModal({ isOpen, title, description, onCancel, onConfirm, cancelLabel, confirmLabel, confirmVariant, isConfirming, }: ConfirmModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Modal.d.ts.map