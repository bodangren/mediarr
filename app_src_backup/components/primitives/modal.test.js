import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from './Modal';
describe('Modal primitives', () => {
    it('renders dialog content and closes on backdrop click', () => {
        const onClose = vi.fn();
        render(_jsxs(Modal, { isOpen: true, onClose: onClose, ariaLabel: "Indexers modal", children: [_jsx(ModalHeader, { title: "Manage indexer", onClose: onClose }), _jsx(ModalBody, { children: _jsx("p", { children: "Body content" }) })] }));
        expect(screen.getByRole('dialog', { name: 'Indexers modal' })).toBeInTheDocument();
        expect(screen.getByText('Body content')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('modal-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('does not render when closed', () => {
        render(_jsx(Modal, { isOpen: false, onClose: () => { }, ariaLabel: "Hidden modal", children: _jsx(ModalBody, { children: _jsx("p", { children: "Hidden" }) }) }));
        expect(screen.queryByRole('dialog', { name: 'Hidden modal' })).not.toBeInTheDocument();
    });
    it('renders modal subcomponents layout blocks', () => {
        render(_jsxs(Modal, { isOpen: true, ariaLabel: "Layout modal", children: [_jsx(ModalHeader, { title: "Layout title" }), _jsx(ModalBody, { children: _jsx("p", { children: "Layout body" }) }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", children: "Done" }) })] }));
        expect(screen.getByText('Layout title')).toBeInTheDocument();
        expect(screen.getByText('Layout body')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });
    it('fires confirm and cancel handlers in confirm modal', () => {
        const onCancel = vi.fn();
        const onConfirm = vi.fn();
        render(_jsx(ConfirmModal, { isOpen: true, title: "Delete indexer", description: "This operation cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", onCancel: onCancel, onConfirm: onConfirm, confirmVariant: "danger" }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-status-error/20');
    });
    it('applies scrollable overflow styles to ModalBody', () => {
        render(_jsxs(Modal, { isOpen: true, ariaLabel: "Scrollable modal", children: [_jsx(ModalHeader, { title: "Scrollable title" }), _jsx(ModalBody, { children: _jsx("p", { children: "Scrollable content" }) })] }));
        const modal = screen.getByRole('dialog', { name: 'Scrollable modal' });
        const modalBody = modal.querySelector('.overflow-y-auto');
        expect(modalBody).toBeInTheDocument();
        expect(modalBody).toHaveTextContent('Scrollable content');
    });
    it('applies sticky positioning to ModalFooter', () => {
        render(_jsxs(Modal, { isOpen: true, ariaLabel: "Sticky footer modal", children: [_jsx(ModalHeader, { title: "Sticky footer title" }), _jsx(ModalBody, { children: _jsx("p", { children: "Content" }) }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", children: "Footer Button" }) })] }));
        const modal = screen.getByRole('dialog', { name: 'Sticky footer modal' });
        const modalFooter = modal.querySelector('footer');
        expect(modalFooter).toBeInTheDocument();
        expect(modalFooter).toHaveClass('sticky', 'bottom-0');
    });
    it('applies responsive max-width classes to Modal', () => {
        render(_jsx(Modal, { isOpen: true, ariaLabel: "Responsive modal", maxWidthClassName: "max-w-lg sm:max-w-xl lg:max-w-2xl", children: _jsx(ModalBody, { children: _jsx("p", { children: "Responsive content" }) }) }));
        const modal = screen.getByRole('dialog', { name: 'Responsive modal' });
        expect(modal).toHaveClass('max-w-lg', 'sm:max-w-xl', 'lg:max-w-2xl');
    });
    it('applies mobile-optimized padding to Modal backdrop', () => {
        render(_jsx(Modal, { isOpen: true, ariaLabel: "Mobile modal", children: _jsx(ModalBody, { children: _jsx("p", { children: "Mobile content" }) }) }));
        const backdrop = screen.getByTestId('modal-backdrop').parentElement;
        expect(backdrop).toHaveClass('p-2', 'sm:p-4');
    });
    it('limits modal height to 85vh with flex layout', () => {
        render(_jsxs(Modal, { isOpen: true, ariaLabel: "Height-limited modal", children: [_jsx(ModalHeader, { title: "Height title" }), _jsx(ModalBody, { children: _jsx("p", { children: "Tall content" }) }), _jsx(ModalFooter, { children: _jsx("button", { type: "button", children: "Action" }) })] }));
        const modal = screen.getByRole('dialog', { name: 'Height-limited modal' });
        expect(modal).toHaveClass('max-h-[85vh]', 'flex', 'flex-col');
    });
});
//# sourceMappingURL=modal.test.js.map