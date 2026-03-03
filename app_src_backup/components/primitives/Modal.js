'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Button } from './Button';
export function Modal({ isOpen, ariaLabel, children, onClose, closeOnBackdropClick = true, maxWidthClassName = 'max-w-lg sm:max-w-xl lg:max-w-2xl', className = '', }) {
    useEffect(() => {
        if (!isOpen || !onClose) {
            return;
        }
        const handleKeyDown = (event) => {
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
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4", children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-surface-3/70", "data-testid": "modal-backdrop", "aria-label": "Close modal", onClick: handleBackdropClick }), _jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": ariaLabel, className: `relative z-10 w-full max-h-[85vh] flex flex-col rounded-md border border-border-subtle bg-surface-1 shadow-elevation-3 ${maxWidthClassName} ${className}`, children: children })] }));
}
export function ModalHeader({ title, onClose, actions }) {
    return (_jsxs("header", { className: "flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3", children: [_jsx("h2", { className: "text-base font-semibold", children: title }), _jsxs("div", { className: "flex items-center gap-2", children: [actions, onClose ? (_jsx(Button, { variant: "secondary", onClick: onClose, "aria-label": "Close modal", children: "Close" })) : null] })] }));
}
export function ModalBody({ children }) {
    return _jsx("div", { className: "flex-1 overflow-y-auto px-4 py-3", children: children });
}
export function ModalFooter({ children }) {
    return _jsx("footer", { className: "flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3 sticky bottom-0 bg-surface-1 z-10", children: children });
}
export function ConfirmModal({ isOpen, title, description, onCancel, onConfirm, cancelLabel = 'Cancel', confirmLabel = 'Confirm', confirmVariant = 'danger', isConfirming = false, }) {
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: title, onClose: onCancel, children: [_jsx(ModalHeader, { title: title, onClose: onCancel }), _jsx(ModalBody, { children: _jsx("p", { className: "text-sm text-text-secondary", children: description ?? 'Please confirm this action.' }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onCancel, disabled: isConfirming, children: cancelLabel }), _jsx(Button, { variant: confirmVariant, onClick: onConfirm, disabled: isConfirming, children: confirmLabel })] })] }));
}
//# sourceMappingURL=Modal.js.map