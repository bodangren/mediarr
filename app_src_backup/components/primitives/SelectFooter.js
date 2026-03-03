'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useSelectContext } from './SelectProvider';
export function SelectFooter({ actions }) {
    const { selectedIds, clearSelection } = useSelectContext();
    if (selectedIds.length === 0) {
        return null;
    }
    return (_jsxs("footer", { className: "flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm", children: [_jsxs("p", { children: [selectedIds.length, " selected"] }), _jsxs("div", { className: "flex items-center gap-2", children: [actions.map(action => (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary", onClick: () => action.onClick(selectedIds), children: action.label }, action.label))), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary", onClick: clearSelection, children: "Clear" })] })] }));
}
//# sourceMappingURL=SelectFooter.js.map