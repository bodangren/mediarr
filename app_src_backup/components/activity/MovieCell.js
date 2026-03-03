'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
const SIZE_CONFIG = {
    small: {
        posterWidth: 'w-10',
        posterHeight: 'h-15',
    },
    medium: {
        posterWidth: 'w-12',
        posterHeight: 'h-18',
    },
};
export function MovieCell({ movieId, title, posterUrl, year, size = 'small' }) {
    const config = SIZE_CONFIG[size];
    const content = (_jsxs("div", { className: "flex items-center gap-3", children: [posterUrl ? (_jsx("div", { className: `relative overflow-hidden rounded-sm border border-border-subtle bg-surface-2 ${config.posterWidth} ${config.posterHeight} flex-shrink-0`, children: _jsx("img", { src: posterUrl, alt: `${title} poster`, className: "h-full w-full object-cover", loading: "lazy" }) })) : (_jsx("div", { className: `flex items-center justify-center rounded-sm border border-border-subtle bg-surface-2 ${config.posterWidth} ${config.posterHeight} flex-shrink-0 text-text-muted`, children: _jsx("span", { className: "text-xs", children: "No poster" }) })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate font-medium text-text-primary", children: title }), year && _jsx("p", { className: "text-xs text-text-secondary", children: year })] })] }));
    if (movieId) {
        return (_jsx(Link, { href: `/movie/${movieId}`, className: "block transition-colors hover:text-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2", children: content }));
    }
    return content;
}
//# sourceMappingURL=MovieCell.js.map