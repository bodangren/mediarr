'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { NumberInput } from '@/components/primitives/SpecialInputs';
const torznabFields = [
    { name: 'url', label: 'Indexer URL', type: 'text', required: true },
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];
const usenetFields = [
    { name: 'host', label: 'Host', type: 'text', required: true },
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];
function parseSettings(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    }
    catch {
        // The user can overwrite malformed values from the form.
    }
    return {};
}
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
function toFieldLabel(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/^./, value => value.toUpperCase());
}
function inferFieldType(name, value) {
    if (typeof value === 'boolean') {
        return 'boolean';
    }
    if (typeof value === 'number') {
        return 'number';
    }
    const normalized = name.toLowerCase();
    if (normalized.includes('password')
        || normalized.includes('apikey')
        || normalized.includes('token')
        || normalized.includes('cookie')) {
        return 'password';
    }
    return 'text';
}
function buildCardigannSchemaFromSettings(parsedSettings) {
    const fields = Object.entries(parsedSettings)
        .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        .map(([name, value]) => ({
        name,
        label: toFieldLabel(name),
        type: inferFieldType(name, value),
        required: name === 'definitionId',
        defaultValue: value,
    }));
    if (!fields.some(field => field.name === 'definitionId')) {
        fields.unshift({
            name: 'definitionId',
            label: 'Definition ID',
            type: 'text',
            required: true,
            defaultValue: '',
        });
    }
    return fields;
}
function parseContractSchema(configContract, protocol, parsedSettings) {
    if (configContract === 'CardigannSettings') {
        return buildCardigannSchemaFromSettings(parsedSettings);
    }
    if (configContract === 'TorznabSettings') {
        return torznabFields;
    }
    if (configContract === 'NewznabSettings') {
        return usenetFields;
    }
    if (configContract.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(configContract);
            if (Array.isArray(parsed)) {
                const normalized = parsed.flatMap((field) => {
                    if (!field || typeof field !== 'object') {
                        return [];
                    }
                    const nextField = field;
                    const type = nextField.type;
                    const name = nextField.name;
                    if (typeof name !== 'string'
                        || typeof nextField.label !== 'string'
                        || (type !== 'text' && type !== 'password' && type !== 'number' && type !== 'boolean')) {
                        return [];
                    }
                    return [{
                            name,
                            label: nextField.label,
                            type,
                            required: Boolean(nextField.required),
                        }];
                });
                if (normalized.length > 0) {
                    return normalized;
                }
            }
        }
        catch {
            // Fallback handled below.
        }
    }
    return protocol === 'usenet' ? usenetFields : torznabFields;
}
export function EditIndexerModal({ isOpen, indexer, isSubmitting = false, onClose, onSave, appProfiles = [], }) {
    const initialSettings = parseSettings(indexer.settings);
    const [name, setName] = useState(indexer.name);
    const [protocol, setProtocol] = useState(indexer.protocol === 'usenet' ? 'usenet' : 'torrent');
    const [configContract, setConfigContract] = useState(indexer.configContract);
    const [appProfileId, setAppProfileId] = useState(typeof indexer.appProfileId === 'number' ? indexer.appProfileId : undefined);
    const [enabled, setEnabled] = useState(indexer.enabled);
    const [supportsRss, setSupportsRss] = useState(indexer.supportsRss);
    const [supportsSearch, setSupportsSearch] = useState(indexer.supportsSearch);
    const [priority, setPriority] = useState(indexer.priority);
    const [fieldValues, setFieldValues] = useState(() => {
        const startingSchema = parseContractSchema(indexer.configContract, indexer.protocol, initialSettings);
        const defaults = startingSchema.reduce((accumulator, field) => {
            accumulator[field.name] = normalizeFieldValue(field);
            return accumulator;
        }, {});
        return {
            ...defaults,
            ...initialSettings,
        };
    });
    const [validationError, setValidationError] = useState(null);
    const schema = useMemo(() => {
        return parseContractSchema(configContract, protocol, fieldValues);
    }, [configContract, protocol, fieldValues]);
    const getFieldValue = (field) => {
        if (field.name in fieldValues) {
            return fieldValues[field.name];
        }
        return normalizeFieldValue(field);
    };
    const handleProtocolChange = (nextProtocol) => {
        const normalized = nextProtocol === 'usenet' ? 'usenet' : 'torrent';
        setProtocol(normalized);
        if (configContract === 'TorznabSettings' || configContract === 'NewznabSettings') {
            setConfigContract(normalized === 'usenet' ? 'NewznabSettings' : 'TorznabSettings');
        }
        setValidationError(null);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (name.trim().length === 0) {
            setValidationError('Name is required.');
            return;
        }
        for (const field of schema) {
            if (!field.required || field.type === 'boolean') {
                continue;
            }
            const value = getFieldValue(field);
            if (value === undefined || value === null || String(value).trim().length === 0) {
                setValidationError(`${field.label} is required.`);
                return;
            }
        }
        setValidationError(null);
        const normalizedSettings = { ...fieldValues };
        for (const field of schema) {
            normalizedSettings[field.name] = getFieldValue(field);
        }
        await onSave({
            id: indexer.id,
            name: name.trim(),
            implementation: indexer.implementation,
            configContract,
            protocol,
            appProfileId,
            enabled,
            supportsRss,
            supportsSearch,
            priority,
            settings: normalizedSettings,
        });
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Edit indexer", onClose: onClose, maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: "Edit Indexer", onClose: onClose }), _jsx(ModalBody, { children: _jsxs(Form, { onSubmit: handleSubmit, children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(FormGroup, { label: "Name", htmlFor: "edit-indexer-name", children: _jsx(TextInput, { id: "edit-indexer-name", ariaLabel: "Name", value: name, onChange: setName }) }), _jsx(FormGroup, { label: "Priority", htmlFor: "edit-indexer-priority", children: _jsx(NumberInput, { id: "edit-indexer-priority", value: priority, min: 0, max: 100, onChange: setPriority }) })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SelectInput, { id: "edit-indexer-protocol", label: "Protocol", value: protocol, onChange: handleProtocolChange, options: [
                                        { value: 'torrent', label: 'torrent' },
                                        { value: 'usenet', label: 'usenet' },
                                    ] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "App Profile" }), _jsxs("select", { id: "edit-indexer-app-profile", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: appProfileId ?? '', onChange: (event) => {
                                                const value = event.target.value;
                                                setAppProfileId(value ? Number.parseInt(value, 10) : undefined);
                                            }, children: [_jsx("option", { value: "", children: "None" }), appProfiles.map((profile) => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] })] })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-3", children: [_jsx(CheckInput, { id: "edit-indexer-enabled", label: "Enabled", checked: enabled, onChange: setEnabled }), _jsx(CheckInput, { id: "edit-indexer-rss", label: "RSS", checked: supportsRss, onChange: setSupportsRss }), _jsx(CheckInput, { id: "edit-indexer-search", label: "Search", checked: supportsSearch, onChange: setSupportsSearch })] }), _jsx("section", { className: "space-y-3", children: schema.map(field => {
                                const value = getFieldValue(field);
                                if (field.type === 'boolean') {
                                    return (_jsx(CheckInput, { id: `edit-indexer-${field.name}`, label: field.label, checked: Boolean(value), onChange: checked => {
                                            setFieldValues(current => ({
                                                ...current,
                                                [field.name]: checked,
                                            }));
                                        } }, field.name));
                                }
                                if (field.type === 'number') {
                                    return (_jsx(FormGroup, { label: field.label, htmlFor: `edit-indexer-${field.name}`, children: _jsx(NumberInput, { id: `edit-indexer-${field.name}`, value: typeof value === 'number' ? value : 0, onChange: nextValue => {
                                                setFieldValues(current => ({
                                                    ...current,
                                                    [field.name]: nextValue,
                                                }));
                                            } }) }, field.name));
                                }
                                return (_jsx(FormGroup, { label: field.label, htmlFor: `edit-indexer-${field.name}`, children: _jsx(TextInput, { id: `edit-indexer-${field.name}`, ariaLabel: field.label, type: field.type === 'password' ? 'password' : 'text', value: typeof value === 'string' ? value : '', onChange: nextValue => {
                                            setFieldValues(current => ({
                                                ...current,
                                                [field.name]: nextValue,
                                            }));
                                        } }) }, field.name));
                            }) }), validationError ? (_jsx("p", { role: "alert", className: "text-sm text-status-error", children: validationError })) : null] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isSubmitting, children: "Cancel" }), _jsx("form", { onSubmit: handleSubmit, children: _jsx(Button, { variant: "primary", type: "submit", disabled: isSubmitting, children: "Save Indexer" }) })] })] }));
}
//# sourceMappingURL=EditIndexerModal.js.map