import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageContent({ children, title, className = '' }) {
    return (_jsxs("div", { className: `flex flex-col ${className}`, children: [title && _jsx("h1", { className: "mb-4 text-2xl font-semibold text-text-primary", children: title }), children] }));
}
//# sourceMappingURL=PageContent.js.map