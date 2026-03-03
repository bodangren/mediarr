'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
export function FilterMenu({ label = 'Filter', value, options, onChange, onCustomFilter, customFilterActive = false, }) {
    const extendedOptions = useMemo(() => {
        return onCustomFilter
            ? [
                ...options,
                {
                    key: 'custom',
                    label: 'Custom...',
                },
            ]
            : options;
    }, [options, onCustomFilter]);
    const handleSelectChange = (event) => {
        const selectedValue = event.currentTarget.value;
        if (selectedValue === 'custom') {
            onCustomFilter?.();
        }
        else {
            onChange(selectedValue);
        }
    };
    return (_jsxs("label", { className: "inline-flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("span", { children: label }), _jsx("select", { "aria-label": label, value: customFilterActive ? 'custom' : value, className: "rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary", onChange: handleSelectChange, children: extendedOptions.map(option => (_jsx("option", { value: option.key, children: option.label }, option.key))) })] }));
}
//# sourceMappingURL=FilterMenu.js.map