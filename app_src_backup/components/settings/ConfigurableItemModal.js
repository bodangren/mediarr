'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/primitives/Button';
import { Form } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
export function ConfigurableItemModal({ isOpen, onClose, title, presets, selectedPresetId, fieldValues, isSubmitting = false, isTesting = false, testResult, error, saveButtonText = 'Save', renderPresetGrid, renderFields, onSelectPreset, onFieldChange, onTestConnection, onSave, }) {
    const selectedPreset = presets.length === 0 ? undefined : presets.find(p => p.id === selectedPresetId) ?? presets[0];
    const handleSubmit = (event) => {
        event.preventDefault();
        onSave();
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: title, onClose: onClose, maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: title, onClose: onClose }), _jsx(ModalBody, { children: _jsxs(Form, { onSubmit: handleSubmit, children: [_jsx("section", { className: "space-y-2", children: renderPresetGrid(presets, selectedPresetId, onSelectPreset) }), renderFields(selectedPreset, fieldValues, onFieldChange), error ? (_jsx("p", { role: "alert", className: "text-sm text-status-error", children: error })) : null, testResult ? (_jsxs("section", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm", children: [_jsx("p", { className: testResult.success ? 'text-status-success' : 'text-status-error', children: testResult.message }), testResult.hints && testResult.hints.length > 0 ? (_jsx("ul", { className: "list-disc pl-4 text-text-secondary", children: testResult.hints.map((hint, index) => (_jsx("li", { children: hint }, index))) })) : null] })) : null] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isSubmitting || isTesting, children: "Cancel" }), _jsx(Button, { variant: "secondary", onClick: onTestConnection, disabled: isSubmitting || isTesting, children: isTesting ? 'Testing...' : 'Test Connection' }), _jsx("form", { onSubmit: handleSubmit, children: _jsx(Button, { variant: "primary", type: "submit", disabled: isSubmitting || isTesting, children: saveButtonText }) })] })] }));
}
//# sourceMappingURL=ConfigurableItemModal.js.map