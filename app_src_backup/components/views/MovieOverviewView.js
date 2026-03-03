'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/primitives/Icon';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getFileStatus, getRatingDisplay, getRuntimeDisplay } from '@/types/movie';
function MovieOverviewCard({ item, onToggleMonitored, onDelete, onSearch }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const fileStatus = getFileStatus(item);
    const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';
    const rating = getRatingDisplay(item);
    return (_jsxs("article", { className: "flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-subtle hover:bg-surface-2", children: [_jsx(Link, { href: `/library/movies/${item.id}`, className: "flex-shrink-0", children: _jsx("div", { className: "h-32 w-20 overflow-hidden rounded-md bg-surface-2", children: _jsx("img", { src: posterUrl, alt: item.title, className: "h-full w-full object-cover transition-transform hover:scale-105", loading: "lazy", onError: event => {
                            const target = event.currentTarget;
                            target.src = '/images/placeholder-poster.png';
                        } }) }) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx(Link, { href: `/library/movies/${item.id}`, className: "line-clamp-1 text-base font-medium text-text-primary hover:text-accent-primary", children: item.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs text-text-secondary", children: [item.year && _jsx("span", { children: item.year }), item.certification && _jsx("span", { children: "\u2022" }), item.certification && _jsx("span", { children: item.certification }), item.runtime && _jsx("span", { children: "\u2022" }), item.runtime && _jsx("span", { children: getRuntimeDisplay(item.runtime) }), _jsx(StatusBadge, { status: fileStatus })] })] }), _jsx("button", { type: "button", className: "flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-surface-3", onClick: () => onToggleMonitored(item.id, !Boolean(item.monitored)), "aria-label": item.monitored ? 'Disable monitoring' : 'Enable monitoring', children: item.monitored ? (_jsx(Icon, { name: "success", className: "text-status-completed" })) : (_jsx(Icon, { name: "warning", className: "text-text-muted" })) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-text-secondary", children: [rating && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-yellow-400", children: "\u2B50" }), _jsx("span", { children: rating })] })), item.tmdbId && (_jsxs("div", { className: "flex items-center gap-1 text-text-muted", children: [_jsx(Icon, { name: "info" }), _jsxs("span", { children: ["TMDb: ", item.tmdbId] })] }))] }), item.overview && (_jsxs("div", { className: "text-xs", children: [_jsx("button", { type: "button", className: "text-accent-primary hover:underline", onClick: () => setIsExpanded(!isExpanded), "aria-expanded": isExpanded, "aria-controls": `overview-${item.id}`, children: isExpanded ? 'Show less' : 'Show more' }), isExpanded && (_jsx("p", { id: `overview-${item.id}`, className: "mt-1 line-clamp-3 text-text-secondary", children: item.overview }))] })), _jsxs("div", { className: "mt-auto flex justify-end gap-2", children: [onSearch && (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3", onClick: () => onSearch(item.id), "aria-label": `Search ${item.title}`, children: _jsx(Icon, { name: "search" }) })), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3", "aria-label": `Edit ${item.title}`, children: _jsx(Icon, { name: "edit" }) }), onDelete && (_jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error transition-colors hover:bg-status-error/10", onClick: () => {
                                    const confirmed = window.confirm(`Delete ${item.title}?`);
                                    if (confirmed) {
                                        onDelete(item.id);
                                    }
                                }, "aria-label": `Delete ${item.title}`, children: _jsx(Icon, { name: "trash" }) }))] })] })] }));
}
function MovieOverviewCardSkeleton() {
    return (_jsxs("article", { className: "flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("div", { className: "h-32 w-20 animate-pulse rounded-md bg-surface-2" }), _jsxs("div", { className: "flex flex-1 flex-col gap-2", children: [_jsx("div", { className: "h-5 w-3/4 animate-pulse rounded bg-surface-2" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "h-3 w-12 animate-pulse rounded bg-surface-2" }), _jsx("div", { className: "h-3 w-12 animate-pulse rounded bg-surface-2" })] }), _jsx("div", { className: "flex-1 animate-pulse rounded bg-surface-2" }), _jsx("div", { className: "h-6 w-20 animate-pulse rounded bg-surface-2 self-end" })] })] }));
}
export function MovieOverviewView({ items, onToggleMonitored, onDelete, onSearch, isLoading }) {
    if (isLoading) {
        return (_jsx("div", { className: "space-y-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(MovieOverviewCardSkeleton, {}, i))) }));
    }
    if (items.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12", children: [_jsx(Icon, { name: "search", className: "mb-4 text-4xl text-text-muted" }), _jsx("p", { className: "text-center text-text-secondary", children: "No movies found" })] }));
    }
    return (_jsx("div", { className: "space-y-3", children: items.map(item => (_jsx(MovieOverviewCard, { item: item, onToggleMonitored: onToggleMonitored, onDelete: onDelete, onSearch: onSearch }, item.id))) }));
}
//# sourceMappingURL=MovieOverviewView.js.map