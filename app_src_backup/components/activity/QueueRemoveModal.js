'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { Label } from '@/components/primitives/Label';
export function QueueRemoveModal({ isOpen, onClose, onConfirm, itemTitle, isConfirming = false, }) {
    const [options, setOptions] = useState({
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
    return (_jsxs(Modal, { isOpen: true, ariaLabel: "Remove from queue", onClose: handleClose, children: [_jsx(ModalHeader, { title: "Remove from queue", onClose: handleClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-text-primary", children: ["Are you sure you want to remove", ' ', _jsx("span", { className: "font-medium", children: itemTitle }), " from the queue?"] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", id: "block-release", checked: options.blockRelease, onChange: e => setOptions({ ...options, blockRelease: e.target.checked }), className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0" }), _jsx("span", { className: "text-sm text-text-primary", children: "Block this release" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", id: "add-exclusions", checked: options.addToImportExclusions, onChange: e => setOptions({
                                                ...options,
                                                addToImportExclusions: e.target.checked,
                                            }), className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0" }), _jsx("span", { className: "text-sm text-text-primary", children: "Add to import exclusions" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", id: "ignore-movie", checked: options.ignoreMovie, onChange: e => setOptions({ ...options, ignoreMovie: e.target.checked }), className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0" }), _jsx("span", { className: "text-sm text-text-primary", children: "Ignore movie (don't auto-search)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", id: "delete-files", checked: options.deleteFiles, onChange: e => setOptions({ ...options, deleteFiles: e.target.checked }), className: "h-4 w-4 rounded border-border-subtle bg-surface-1 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm text-text-primary", children: "Delete files" }), _jsx("span", { className: "text-xs text-text-muted", children: "Warning: This will delete downloaded files" })] })] })] })] }) }), _jsx(ModalFooter, { children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: isConfirming, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleConfirm, disabled: isConfirming, children: isConfirming ? 'Removing...' : 'Remove' })] }) })] }));
}
//# sourceMappingURL=QueueRemoveModal.js.map