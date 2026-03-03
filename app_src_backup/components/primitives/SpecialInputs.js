'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
function clampValue(value, min, max) {
    if (typeof min === 'number' && value < min) {
        return min;
    }
    if (typeof max === 'number' && value > max) {
        return max;
    }
    return value;
}
export function PasswordInput({ id, value, onChange, disabled = false, placeholder, error }) {
    const [visible, setVisible] = useState(false);
    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { id: id, "aria-label": id, type: visible ? 'text' : 'password', value: value, placeholder: placeholder, disabled: disabled, onChange: event => onChange(event.target.value), className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm" }), _jsx("button", { type: "button", disabled: disabled, onClick: () => setVisible(previous => !previous), "aria-label": visible ? 'Hide password' : 'Show password', className: "rounded-sm border border-border-subtle px-2 py-2 text-xs text-text-secondary", children: visible ? 'Hide' : 'Show' })] }), error ? _jsx("p", { role: "alert", className: "text-xs text-status-error", children: error }) : null] }));
}
export function PathInput({ id, value, onChange, onBrowse, disabled = false, placeholder }) {
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { id: id, "aria-label": id, type: "text", value: value, disabled: disabled, placeholder: placeholder, onChange: event => onChange(event.target.value), className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm" }), _jsx("button", { type: "button", disabled: disabled, onClick: onBrowse, className: "rounded-sm border border-border-subtle px-3 py-2 text-xs text-text-secondary", children: "Browse" })] }));
}
export function NumberInput({ id, value, onChange, min, max, step = 1, disabled = false }) {
    return (_jsx("input", { id: id, "aria-label": id, type: "number", value: value, min: min, max: max, step: step, disabled: disabled, onChange: event => {
            const parsed = Number(event.target.value);
            if (Number.isNaN(parsed)) {
                return;
            }
            onChange(clampValue(parsed, min, max));
        }, className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm" }));
}
export function AutoCompleteInput({ id, value, suggestions, onChange, onSelect, disabled = false, placeholder, }) {
    const filteredSuggestions = useMemo(() => {
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return suggestions.slice(0, 8);
        }
        return suggestions.filter(item => item.toLowerCase().includes(normalized)).slice(0, 8);
    }, [suggestions, value]);
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { id: id, "aria-label": id, type: "text", value: value, disabled: disabled, placeholder: placeholder, onChange: event => onChange(event.target.value), className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm" }), filteredSuggestions.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: filteredSuggestions.map(suggestion => (_jsx("button", { type: "button", disabled: disabled, onClick: () => {
                        onChange(suggestion);
                        onSelect?.(suggestion);
                    }, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary", children: suggestion }, suggestion))) })) : null] }));
}
//# sourceMappingURL=SpecialInputs.js.map