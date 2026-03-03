'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function formatDate(dateString) {
    if (!dateString)
        return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
export function ReleaseDateCell({ cinemaDate, digitalDate, physicalDate }) {
    return (_jsxs("div", { className: "flex flex-col gap-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Cinema:" }), ' ', _jsx("span", { className: "text-text-primary", children: formatDate(cinemaDate) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Digital:" }), ' ', _jsx("span", { className: "text-text-primary", children: formatDate(digitalDate) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Physical:" }), ' ', _jsx("span", { className: "text-text-primary", children: formatDate(physicalDate) })] })] }));
}
ReleaseDateCell.formatDate = formatDate;
//# sourceMappingURL=ReleaseDateCell.js.map