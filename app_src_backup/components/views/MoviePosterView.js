'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getFileStatus, getRatingDisplay, getRuntimeDisplay } from '@/types/movie';
function MoviePosterCard({ item, onToggleMonitored, onDelete, onSearch }) {
    const fileStatus = getFileStatus(item);
    const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';
    const rating = getRatingDisplay(item);
    return (_jsxs(Link, { href: `/library/movies/${item.id}`, className: "group relative flex flex-col gap-2 overflow-hidden rounded-md border border-border-subtle bg-surface-1 transition-all hover:shadow-elevation-2", children: [_jsxs("div", { className: "relative aspect-[2/3] overflow-hidden bg-surface-2", children: [_jsx("img", { src: posterUrl, alt: item.title, className: "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy", onError: event => {
                            const target = event.currentTarget;
                            target.src = '/images/placeholder-poster.png';
                        } }), _jsx("div", { className: "absolute left-2 top-2", children: _jsx("button", { type: "button", className: "rounded-full p-1.5 transition-colors hover:bg-surface-2/80", onClick: event => {
                                event.preventDefault();
                                event.stopPropagation();
                                onToggleMonitored(item.id, !Boolean(item.monitored));
                            }, "aria-label": item.monitored ? 'Disable monitoring' : 'Enable monitoring', children: item.monitored ? (_jsx(Icon, { name: "success", className: "text-status-completed" })) : (_jsx(Icon, { name: "warning", className: "text-text-muted" })) }) }), _jsx("div", { className: "absolute right-2 top-2", children: _jsx(StatusBadge, { status: fileStatus }) }), rating && (_jsxs("div", { className: "absolute bottom-2 left-2 rounded-full bg-surface-0/90 px-2 py-1 text-xs font-medium text-text-primary", children: ["\u2B50 ", rating] })), _jsxs("div", { className: "absolute inset-0 flex items-center justify-center gap-2 bg-surface-0/80 opacity-0 transition-opacity group-hover:opacity-100", children: [onSearch && (_jsx("button", { type: "button", className: "rounded-md bg-surface-2 px-3 py-2 text-sm transition-colors hover:bg-surface-3", onClick: event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onSearch(item.id);
                                }, "aria-label": `Search ${item.title}`, children: _jsx(Icon, { name: "search" }) })), _jsx("button", { type: "button", className: "rounded-md bg-surface-2 px-3 py-2 text-sm transition-colors hover:bg-surface-3", "aria-label": `Edit ${item.title}`, children: _jsx(Icon, { name: "edit" }) }), onDelete && (_jsx("button", { type: "button", className: "rounded-md bg-status-error/20 px-3 py-2 text-sm text-status-error transition-colors hover:bg-status-error/30", onClick: event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const confirmed = window.confirm(`Delete ${item.title}?`);
                                    if (confirmed) {
                                        onDelete(item.id);
                                    }
                                }, "aria-label": `Delete ${item.title}`, children: _jsx(Icon, { name: "trash" }) }))] })] }), _jsxs("div", { className: "flex flex-col gap-1 px-2 pb-2", children: [_jsx("h3", { className: "line-clamp-2 text-sm font-medium text-text-primary group-hover:text-accent-primary", children: item.title }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-text-secondary", children: [item.year && _jsx("span", { children: item.year }), item.runtime && _jsx("span", { children: "\u2022" }), item.runtime && _jsx("span", { children: getRuntimeDisplay(item.runtime) }), item.certification && _jsx("span", { children: "\u2022" }), item.certification && _jsx("span", { children: item.certification })] })] })] }));
}
function MoviePosterCardSkeleton() {
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("div", { className: "aspect-[2/3] animate-pulse rounded-md bg-surface-2" }), _jsxs("div", { className: "space-y-1 px-2 pb-2", children: [_jsx("div", { className: "h-4 w-full animate-pulse rounded bg-surface-2" }), _jsx("div", { className: "h-3 w-2/3 animate-pulse rounded bg-surface-2" })] })] }));
}
export function MoviePosterView({ items, onToggleMonitored, onDelete, onSearch, isLoading }) {
    if (isLoading) {
        return (_jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", children: Array.from({ length: 12 }).map((_, i) => (_jsx(MoviePosterCardSkeleton, {}, i))) }));
    }
    if (items.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12", children: [_jsx(Icon, { name: "search", className: "mb-4 text-4xl text-text-muted" }), _jsx("p", { className: "text-center text-text-secondary", children: "No movies found" })] }));
    }
    return (_jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", children: items.map(item => (_jsx(MoviePosterCard, { item: item, onToggleMonitored: onToggleMonitored, onDelete: onDelete, onSearch: onSearch }, item.id))) }));
}
//# sourceMappingURL=MoviePosterView.js.map