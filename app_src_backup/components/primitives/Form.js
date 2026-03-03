'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
export function Form({ children, onSubmit, className }) {
    return (_jsx("form", { onSubmit: onSubmit, className: `space-y-4 ${className ?? ''}`.trim(), children: children }));
}
export function FormGroup({ label, htmlFor, hint, error, children }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { htmlFor: htmlFor, className: "block text-sm font-medium text-text-primary", children: label }), hint ? _jsx("p", { className: "text-xs text-text-secondary", children: hint }) : null, children, error ? _jsx("p", { className: "text-xs text-status-error", role: "alert", children: error }) : null] }));
}
export function TextInput({ id, value, onChange, type = 'text', placeholder, disabled = false, error, ariaLabel, }) {
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("input", { id: id, type: type, value: value, "aria-label": ariaLabel ?? id, placeholder: placeholder, disabled: disabled, onChange: event => onChange(event.target.value), className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary" }), error ? _jsx("p", { className: "text-xs text-status-error", role: "alert", children: error }) : null] }));
}
export function SelectInput({ id, label, value, options, onChange, disabled = false }) {
    return (_jsxs("label", { htmlFor: id, className: "flex flex-col gap-1 text-sm text-text-primary", children: [_jsx("span", { children: label }), _jsx("select", { id: id, "aria-label": label, value: value, disabled: disabled, onChange: event => onChange(event.target.value), className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm", children: options.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }));
}
export function EnhancedSelectInput({ id, label, value, options, onChange, disabled = false }) {
    const [query, setQuery] = useState('');
    const filteredOptions = useMemo(() => {
        if (!query.trim()) {
            return options;
        }
        const normalized = query.trim().toLowerCase();
        return options.filter(option => option.label.toLowerCase().includes(normalized));
    }, [options, query]);
    const selectedLabel = options.find(option => option.value === value)?.label ?? 'None';
    return (_jsxs("div", { id: id, className: "space-y-2 rounded-sm border border-border-subtle p-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm text-text-primary", children: [_jsx("span", { children: label }), _jsx("input", { type: "text", "aria-label": `${label} search`, value: query, disabled: disabled, onChange: event => setQuery(event.target.value), className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm" })] }), _jsxs("p", { className: "text-xs text-text-secondary", children: ["Selected: ", selectedLabel] }), _jsx("div", { className: "flex flex-wrap gap-2", children: filteredOptions.map(option => (_jsx("button", { type: "button", disabled: disabled, onClick: () => onChange(option.value), className: `rounded-sm border px-2 py-1 text-xs ${value === option.value ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`, children: option.label }, option.value))) })] }));
}
export function CheckInput({ id, label, checked, onChange, disabled = false }) {
    return (_jsxs("label", { htmlFor: id, className: "inline-flex items-center gap-2 text-sm text-text-primary", children: [_jsx("input", { id: id, type: "checkbox", checked: checked, disabled: disabled, onChange: event => onChange(event.target.checked) }), _jsx("span", { children: label })] }));
}
export function TagInput({ id, label, availableTags, selectedTags, onChange, disabled = false }) {
    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            onChange(selectedTags.filter(item => item !== tag));
            return;
        }
        onChange([...selectedTags, tag]);
    };
    return (_jsxs("div", { id: id, className: "space-y-2", children: [_jsx("p", { className: "text-sm text-text-primary", children: label }), _jsx("div", { className: "flex flex-wrap gap-2", children: availableTags.map(tag => {
                    const selected = selectedTags.includes(tag);
                    return (_jsx("button", { type: "button", disabled: disabled, onClick: () => toggleTag(tag), className: `rounded-sm border px-2 py-1 text-xs ${selected ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`, children: tag }, tag));
                }) })] }));
}
export function PasswordInput({ id, value, onChange, placeholder, disabled = false, error, ariaLabel, }) {
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("input", { id: id, type: "password", value: value, "aria-label": ariaLabel ?? id, placeholder: placeholder, disabled: disabled, onChange: event => onChange(event.target.value), className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary" }), error ? _jsx("p", { className: "text-xs text-status-error", role: "alert", children: error }) : null] }));
}
//# sourceMappingURL=Form.js.map