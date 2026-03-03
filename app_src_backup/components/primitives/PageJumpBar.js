import { jsx as _jsx } from "react/jsx-runtime";
const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
export function matchesJumpFilter(name, filter) {
    if (filter === 'All') {
        return true;
    }
    const normalized = name.trim();
    if (!normalized) {
        return false;
    }
    const firstChar = normalized[0].toUpperCase();
    if (filter === '#') {
        return !/[A-Z]/.test(firstChar);
    }
    return firstChar === filter;
}
export function PageJumpBar({ value, onChange }) {
    const options = ['All', '#', ...LETTERS];
    return (_jsx("nav", { "aria-label": "Jump bar", className: "flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface-1 px-2 py-2", children: options.map(option => {
            const active = option === value;
            return (_jsx("button", { type: "button", "aria-pressed": active, className: `rounded-sm border px-2 py-1 text-xs ${active ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary'}`, onClick: () => onChange(option), children: option }, option));
        }) }));
}
//# sourceMappingURL=PageJumpBar.js.map