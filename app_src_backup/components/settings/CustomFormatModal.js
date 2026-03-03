'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { ConditionBuilder } from './ConditionBuilder';
import { createDefaultCondition } from '@/types/customFormat';
export function CustomFormatModal({ isOpen, onClose, onSave, editFormat, isLoading = false, }) {
    const [name, setName] = useState('');
    const [includeWhenRenaming, setIncludeWhenRenaming] = useState(false);
    const [conditions, setConditions] = useState([]);
    const [validationError, setValidationError] = useState(null);
    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (editFormat) {
                setName(editFormat.name);
                setIncludeWhenRenaming(editFormat.includeCustomFormatWhenRenaming);
                setConditions(editFormat.conditions.length > 0 ? editFormat.conditions : [createDefaultCondition()]);
            }
            else {
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
            if (c.value === undefined || c.value === null)
                return true;
            if (typeof c.value === 'string' && c.value.trim() === '')
                return true;
            return false;
        });
        if (invalidCondition) {
            setValidationError('All conditions must have a value');
            return;
        }
        setValidationError(null);
        const input = {
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
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: editFormat ? 'Edit Custom Format' : 'Add Custom Format', onClose: handleClose, maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: editFormat ? 'Edit Custom Format' : 'Add Custom Format', onClose: handleClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "format-name", className: "block text-sm font-medium text-text-primary", children: ["Name ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("input", { id: "format-name", type: "text", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary disabled:opacity-50", placeholder: "e.g., HDR10, Dolby Vision, x265", value: name, onChange: e => setName(e.target.value), disabled: isLoading })] }), _jsx("div", { children: _jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: includeWhenRenaming, onChange: e => setIncludeWhenRenaming(e.target.checked), disabled: isLoading, className: "rounded border-border-subtle text-accent-primary focus:ring-accent-primary" }), _jsxs("div", { children: [_jsx("span", { className: "text-sm font-medium text-text-primary", children: "Include Custom Format when Renaming" }), _jsx("p", { className: "text-xs text-text-muted", children: "Add matching custom format tokens to renamed file names" })] })] }) }), _jsx(ConditionBuilder, { conditions: conditions, onChange: setConditions, disabled: isLoading }), validationError && (_jsx(Alert, { variant: "warning", children: validationError })), _jsxs("div", { className: "rounded-sm bg-surface-0 border border-border-subtle p-3 text-xs text-text-muted space-y-1", children: [_jsx("p", { className: "font-medium text-text-secondary", children: "Tips:" }), _jsxs("ul", { className: "list-disc list-inside space-y-0.5", children: [_jsxs("li", { children: ["Use ", _jsx("code", { className: "bg-surface-1 px-1 rounded", children: "regex" }), " type for pattern matching in release titles"] }), _jsxs("li", { children: ["Use ", _jsx("code", { className: "bg-surface-1 px-1 rounded", children: "size" }), " conditions to filter by file size (in bytes)"] }), _jsxs("li", { children: ["Enable ", _jsx("em", { children: "Negate" }), " to invert a condition's match result"] }), _jsxs("li", { children: ["Enable ", _jsx("em", { children: "Required" }), " to make a condition mandatory for format matching"] })] })] })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: isLoading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: isLoading, children: isLoading ? 'Saving...' : editFormat ? 'Save Changes' : 'Add Format' })] })] }));
}
//# sourceMappingURL=CustomFormatModal.js.map