'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AlternateTitleTable({ titles }) {
    if (titles.length === 0) {
        return (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 px-4 py-8 text-center", children: _jsx("p", { className: "text-text-secondary", children: "No alternate titles found" }) }));
    }
    return (_jsx("div", { className: "overflow-x-auto rounded-sm border border-border-subtle", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2", children: "Title" }), _jsx("th", { className: "px-4 py-2", children: "Source" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: titles.map((title, index) => (_jsxs("tr", { className: "hover:bg-surface-2/50", children: [_jsx("td", { className: "px-4 py-2", children: title.title }), _jsx("td", { className: "px-4 py-2", children: _jsx("span", { className: "rounded-sm bg-surface-2 px-2 py-1 text-xs", children: title.source }) })] }, index))) })] }) }));
}
//# sourceMappingURL=AlternateTitleTable.js.map