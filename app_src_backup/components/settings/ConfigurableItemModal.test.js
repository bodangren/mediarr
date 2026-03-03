import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurableItemModal } from './ConfigurableItemModal';
const mockPresets = [
    {
        id: 'preset-1',
        name: 'Preset One',
        description: 'First preset description',
    },
    {
        id: 'preset-2',
        name: 'Preset Two',
        description: 'Second preset description',
    },
];
const mockFieldValues = {
    name: '',
    port: 8080,
};
const mockFieldValuesWithDefaults = {
    name: 'Test Client',
    port: 9091,
};
describe('ConfigurableItemModal', () => {
    it('renders with title and preset grid when open', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: (presets, selectedId, onSelect) => (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-sm font-medium text-text-primary", children: "Preset" }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: presets.map(preset => (_jsxs("button", { type: "button", onClick: () => onSelect(preset.id), className: `rounded-sm border px-3 py-2 text-left text-sm ${preset.id === selectedId
                                ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                                : 'border-border-subtle text-text-secondary'}`, "aria-pressed": preset.id === selectedId, children: [_jsx("p", { className: "font-medium", children: preset.name }), _jsx("p", { className: "text-xs", children: preset.description })] }, preset.id))) })] })), renderFields: (preset, values, onChange) => (_jsxs("div", { children: [_jsx("label", { htmlFor: "field-name", children: "Name" }), _jsx("input", { id: "field-name", type: "text", value: values.name, onChange: e => onChange('name', e.target.value) }), _jsx("label", { htmlFor: "field-port", children: "Port" }), _jsx("input", { id: "field-port", type: "number", value: values.port, onChange: e => onChange('port', Number.parseInt(e.target.value, 10)) })] })) }));
        expect(screen.getByRole('dialog', { name: 'Add Item' })).toBeInTheDocument();
        expect(screen.getByText('Preset One')).toBeInTheDocument();
        expect(screen.getByText('Preset Two')).toBeInTheDocument();
    });
    it('does not render when closed', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: false, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    it('calls onSelectPreset when a preset is clicked', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: (presets, selectedId, onSelect) => (_jsx("div", { children: presets.map(preset => (_jsx("button", { type: "button", onClick: () => onSelect(preset.id), children: preset.name }, preset.id))) })), renderFields: () => _jsx("div", { children: "Fields" }) }));
        fireEvent.click(screen.getByText('Preset Two'));
        expect(onSelectPreset).toHaveBeenCalledWith('preset-2');
    });
    it('calls onFieldChange when field values change', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: (preset, values, onChange) => (_jsxs(_Fragment, { children: [_jsx("label", { htmlFor: "field-name", children: "Name" }), _jsx("input", { id: "field-name", type: "text", value: values.name, onChange: e => onChange('name', e.target.value) })] })) }));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Name' } });
        expect(onFieldChange).toHaveBeenCalledWith('name', 'Test Name');
    });
    it('calls onTestConnection when Test Connection button is clicked', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
        expect(onTestConnection).toHaveBeenCalled();
    });
    it('shows "Testing..." when isTesting is true', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, isTesting: true, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByRole('button', { name: 'Testing...' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Test Connection' })).not.toBeInTheDocument();
    });
    it('disables all buttons when isSubmitting is true', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, isSubmitting: true, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Test Connection' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
    it('disables all buttons when isTesting is true', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, isTesting: true, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Testing...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
    it('calls onSave and prevents default form submission when Save is clicked', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        const saveButton = screen.getByRole('button', { name: 'Save' });
        fireEvent.click(saveButton);
        expect(onSave).toHaveBeenCalled();
    });
    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalled();
    });
    it('displays error message when error prop is provided', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, error: "Name is required", onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('Name is required');
        expect(errorAlert).toHaveClass('text-status-error');
    });
    it('displays successful test result', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, testResult: {
                success: true,
                message: 'Connection successful',
            }, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
        expect(screen.getByText('Connection successful')).toHaveClass('text-status-success');
    });
    it('displays failed test result with hints', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, testResult: {
                success: false,
                message: 'Connection failed',
                hints: ['Check your API key', 'Verify host and port'],
            }, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toHaveClass('text-status-error');
        expect(screen.getByText('Check your API key')).toBeInTheDocument();
        expect(screen.getByText('Verify host and port')).toBeInTheDocument();
    });
    it('renders custom preset grid renderer', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: (presets, selectedId, onSelect) => (_jsx("div", { "data-testid": "custom-preset-grid", children: presets.map(preset => (_jsxs("div", { children: [preset.name, " (ID: ", preset.id, ")"] }, preset.id))) })), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.getByTestId('custom-preset-grid')).toBeInTheDocument();
        expect(screen.getByText('Preset One (ID: preset-1)')).toBeInTheDocument();
        expect(screen.getByText('Preset Two (ID: preset-2)')).toBeInTheDocument();
    });
    it('renders custom fields renderer', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: (preset, values, onChange) => (_jsxs("div", { "data-testid": "custom-fields", children: [_jsxs("div", { children: ["Current name: ", values.name] }), _jsxs("div", { children: ["Current port: ", values.port] })] })) }));
        expect(screen.getByTestId('custom-fields')).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
            return element?.tagName === 'DIV' && content.startsWith('Current name:');
        })).toBeInTheDocument();
        expect(screen.getByText('Current port: 8080')).toBeInTheDocument();
    });
    it('does not display test result section when testResult is null', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, testResult: null, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.queryByText('Connection successful')).not.toBeInTheDocument();
        expect(screen.queryByText('Connection failed')).not.toBeInTheDocument();
    });
    it('does not display error section when error is null', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        const onTestConnection = vi.fn();
        const onSelectPreset = vi.fn();
        const onFieldChange = vi.fn();
        render(_jsx(ConfigurableItemModal, { isOpen: true, title: "Add Item", presets: mockPresets, selectedPresetId: "preset-1", fieldValues: mockFieldValues, error: null, onClose: onClose, onSave: onSave, onTestConnection: onTestConnection, onSelectPreset: onSelectPreset, onFieldChange: onFieldChange, renderPresetGrid: () => _jsx("div", { children: "Preset Grid" }), renderFields: () => _jsx("div", { children: "Fields" }) }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=ConfigurableItemModal.test.js.map