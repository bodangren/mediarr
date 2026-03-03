'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function CastCard({ cast }) {
    const { name, character, profileUrl } = cast;
    return (_jsxs("div", { className: "group flex flex-col gap-2", children: [_jsx("div", { className: "aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-elevation-1", children: profileUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                _jsx("img", { src: profileUrl, alt: name, className: "h-full w-full object-cover transition-transform group-hover:scale-105" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-text-muted", children: _jsx("svg", { className: "h-12 w-12", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }) }) })) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium text-text-primary", children: name }), _jsx("p", { className: "truncate text-xs text-text-secondary", children: character })] })] }));
}
//# sourceMappingURL=CastCard.js.map