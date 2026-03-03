import { jsx as _jsx } from "react/jsx-runtime";
export function PageContentBody({ children, className = '' }) {
    return (_jsx("div", { className: `
        overflow-y-auto
        scroll-smooth
        scrollbar-thin
        scrollbar-thumb-border-subtle
        scrollbar-track-transparent
        hover:scrollbar-thumb-text-muted
        ${className}
      `, children: children }));
}
//# sourceMappingURL=PageContentBody.js.map