import { jsx as _jsx } from "react/jsx-runtime";
export function PageToolbar({ children }) {
    return (_jsx("div", { className: "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2", children: children }));
}
export function PageToolbarSection({ children, align = 'left' }) {
    return _jsx("div", { className: `flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`, children: children });
}
//# sourceMappingURL=PageToolbar.js.map