'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { CheckInput, FormGroup, TextInput } from '@/components/primitives/Form';
import { NumberInput } from '@/components/primitives/SpecialInputs';
import { ConfigurableItemModal } from '@/components/settings/ConfigurableItemModal';
function normalizeFieldValue(field) {
    if (field.defaultValue !== undefined) {
        return field.defaultValue;
    }
    if (field.type === 'boolean') {
        return false;
    }
    if (field.type === 'number') {
        return 0;
    }
    return '';
}
export function AddIndexerModal({ isOpen, presets, isSubmitting = false, onClose, onCreate, onTestConnection, appProfiles = [], }) {
    const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id ?? '');
    const [name, setName] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [supportsRss, setSupportsRss] = useState(true);
    const [supportsSearch, setSupportsSearch] = useState(true);
    const [priority, setPriority] = useState(25);
    const [appProfileId, setAppProfileId] = useState(undefined);
    const [fieldValues, setFieldValues] = useState({});
    const [validationError, setValidationError] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const selectedPreset = useMemo(() => {
        if (presets.length === 0) {
            return null;
        }
        const found = presets.find(item => item.id === selectedPresetId);
        return found ?? presets[0];
    }, [presets, selectedPresetId]);
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setSelectedPresetId(presets[0]?.id ?? '');
        setName('');
        setEnabled(true);
        setSupportsRss(true);
        setSupportsSearch(true);
        setPriority(25);
        setAppProfileId(undefined);
        setValidationError(null);
        setTestResult(null);
    }, [isOpen, presets]);
    useEffect(() => {
        if (!selectedPreset) {
            setFieldValues({});
            return;
        }
        const nextValues = selectedPreset.fields.reduce((accumulator, field) => {
            accumulator[field.name] = normalizeFieldValue(field);
            return accumulator;
        }, {});
        setFieldValues(nextValues);
        setTestResult(null);
        setValidationError(null);
    }, [selectedPreset]);
    const buildDraft = () => {
        if (!selectedPreset) {
            setValidationError('No indexer preset is available.');
            return null;
        }
        if (name.trim().length === 0) {
            setValidationError('Name is required.');
            return null;
        }
        for (const field of selectedPreset.fields) {
            if (!field.required) {
                continue;
            }
            const value = fieldValues[field.name];
            if (field.type === 'boolean') {
                continue;
            }
            if (value === undefined || value === null || String(value).trim().length === 0) {
                setValidationError(`${field.label} is required.`);
                return null;
            }
        }
        setValidationError(null);
        return {
            presetId: selectedPreset.id,
            name: name.trim(),
            implementation: selectedPreset.implementation,
            configContract: selectedPreset.configContract,
            protocol: selectedPreset.protocol,
            enabled,
            supportsRss,
            supportsSearch,
            priority,
            appProfileId,
            settings: fieldValues,
        };
    };
    const handleSubmit = async () => {
        const draft = buildDraft();
        if (!draft) {
            return;
        }
        await onCreate(draft);
    };
    const handleTestConnection = async () => {
        const draft = buildDraft();
        if (!draft) {
            return;
        }
        setIsTesting(true);
        try {
            const result = await onTestConnection(draft);
            setTestResult(result);
        }
        finally {
            setIsTesting(false);
        }
    };
    const renderIndexerPresetGrid = (indexerPresets, selectedId, onSelect) => (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-sm font-medium text-text-primary", children: "Preset" }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: indexerPresets.map(preset => {
                    const selected = preset.id === selectedId;
                    return (_jsxs("button", { type: "button", onClick: () => onSelect(preset.id), className: `rounded-sm border px-3 py-2 text-left text-sm ${selected
                            ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                            : 'border-border-subtle text-text-secondary'}`, "aria-pressed": selected, children: [_jsx("p", { className: "font-medium", children: preset.name }), _jsx("p", { className: "text-xs", children: preset.description })] }, preset.id));
                }) })] }));
    const renderIndexerFields = (preset, values, onChange) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(FormGroup, { label: "Name", htmlFor: "add-indexer-name", children: _jsx(TextInput, { id: "add-indexer-name", ariaLabel: "Name", value: name, onChange: setName }) }), _jsx(FormGroup, { label: "Priority", htmlFor: "add-indexer-priority", children: _jsx(NumberInput, { id: "add-indexer-priority", value: priority, min: 0, max: 100, onChange: setPriority }) }), _jsx(FormGroup, { label: "App Profile", htmlFor: "add-indexer-app-profile", children: _jsxs("select", { id: "add-indexer-app-profile", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: appProfileId ?? '', onChange: (event) => {
                                const nextValue = event.target.value;
                                setAppProfileId(nextValue ? Number.parseInt(nextValue, 10) : undefined);
                            }, children: [_jsx("option", { value: "", children: "None" }), appProfiles.map((profile) => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] }) })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-3", children: [_jsx(CheckInput, { id: "add-indexer-enabled", label: "Enabled", checked: enabled, onChange: setEnabled }), _jsx(CheckInput, { id: "add-indexer-rss", label: "RSS", checked: supportsRss, onChange: setSupportsRss }), _jsx(CheckInput, { id: "add-indexer-search", label: "Search", checked: supportsSearch, onChange: setSupportsSearch })] }), _jsx("section", { className: "space-y-3", children: preset?.fields.filter(field => field.type !== 'hidden').map(field => {
                    const value = values[field.name];
                    if (field.type === 'boolean') {
                        return (_jsx(CheckInput, { id: `add-indexer-${field.name}`, label: field.label, checked: Boolean(value), onChange: checked => {
                                onChange(field.name, checked);
                            } }, field.name));
                    }
                    if (field.type === 'number') {
                        return (_jsx(FormGroup, { label: field.label, htmlFor: `add-indexer-${field.name}`, children: _jsx(NumberInput, { id: `add-indexer-${field.name}`, value: typeof value === 'number' ? value : 0, onChange: nextValue => {
                                    onChange(field.name, nextValue);
                                } }) }, field.name));
                    }
                    return (_jsx(FormGroup, { label: field.label, htmlFor: `add-indexer-${field.name}`, children: _jsx(TextInput, { id: `add-indexer-${field.name}`, ariaLabel: field.label, type: field.type === 'password' ? 'password' : 'text', value: typeof value === 'string' ? value : '', onChange: nextValue => {
                                onChange(field.name, nextValue);
                            } }) }, field.name));
                }) })] }));
    return (_jsx(ConfigurableItemModal, { isOpen: isOpen, title: "Add Indexer", presets: presets, selectedPresetId: selectedPresetId, fieldValues: fieldValues, isSubmitting: isSubmitting, isTesting: isTesting, testResult: testResult, error: validationError, saveButtonText: "Add Indexer", onClose: onClose, onSelectPreset: setSelectedPresetId, onFieldChange: (field, value) => {
            setFieldValues(current => ({
                ...current,
                [field]: value,
            }));
        }, onTestConnection: handleTestConnection, onSave: handleSubmit, renderPresetGrid: renderIndexerPresetGrid, renderFields: renderIndexerFields }));
}
//# sourceMappingURL=AddIndexerModal.js.map