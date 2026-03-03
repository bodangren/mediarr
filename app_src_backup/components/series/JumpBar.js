'use client';
import { jsx as _jsx } from "react/jsx-runtime";
const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
export function JumpBar({ value, onChange }) {
    const options = ['All', '#', ...LETTERS];
    return (_jsx("nav", { "aria-label": "Series jump bar", className: "sticky top-0 z-10 flex flex-wrap gap-1 rounded-sm border border-border-subtle bg-surface-1 px-2 py-2", children: options.map(option => {
            const active = option === value;
            return (_jsx("button", { type: "button", "aria-pressed": active, className: `rounded-sm border px-2 py-1 text-xs ${active ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`, onClick: () => onChange(option), children: option }, option));
        }) }));
}
//# sourceMappingURL=JumpBar.js.map