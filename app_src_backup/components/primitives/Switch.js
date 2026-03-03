import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Switch({ checked, onChange, disabled = false, label, 'aria-label': ariaLabel }) {
    const handleChange = (event) => {
        onChange(event.target.checked);
    };
    const switchElement = (_jsxs("label", { className: "relative inline-flex items-center", children: [_jsx("input", { type: "checkbox", checked: checked, disabled: disabled, onChange: handleChange, "aria-label": ariaLabel ?? label, className: "peer sr-only" }), _jsx("div", { className: `
          h-5 w-9 rounded-full border transition-colors duration-200
          ${checked ? 'border-accent-primary bg-accent-primary' : 'border-border-subtle bg-surface-2'}
          ${disabled ? 'opacity-50' : 'cursor-pointer'}
        ` }), _jsx("div", { className: `
          absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white
          transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        ` })] }));
    if (label) {
        return (_jsxs("label", { className: "inline-flex items-center gap-2 text-sm text-text-primary", children: [switchElement, _jsx("span", { className: disabled ? 'text-text-muted' : '', children: label })] }));
    }
    return switchElement;
}
//# sourceMappingURL=Switch.js.map