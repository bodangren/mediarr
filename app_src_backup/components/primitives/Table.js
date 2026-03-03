import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
export const Table = memo(function Table({ children }) {
    return (_jsx("div", { "data-testid": "table-overflow", className: "overflow-x-auto rounded-md border border-border-subtle", children: _jsx("table", { className: "min-w-full text-left text-sm", children: children }) }));
});
//# sourceMappingURL=Table.js.map