'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/primitives/Icon';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { formatRelativeDate } from '@/lib/format';
import { calculateEpisodeProgress, getEpisodeCounts, getLastAired, getNextAiring } from '@/types/series';
function SeriesOverviewCard({ item, onToggleMonitored, onDelete, onRefresh }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const progress = calculateEpisodeProgress(item);
    const { total, completed } = getEpisodeCounts(item);
    const nextAiring = getNextAiring(item);
    const lastAired = getLastAired(item);
    const posterUrl = item.posterUrl ?? '/images/placeholder-poster.png';
    return (_jsxs("article", { className: "flex gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-subtle hover:bg-surface-2", children: [_jsx(Link, { href: `/library/series/${item.id}`, className: "flex-shrink-0", children: _jsx("div", { className: "h-32 w-24 overflow-hidden rounded-md bg-surface-2", children: _jsx("img", { src: posterUrl, alt: item.title, className: "h-full w-full object-cover transition-transform hover:scale-105", loading: "lazy", onError: event => {
                            const target = event.currentTarget;
                            target.src = '/images/placeholder-poster.png';
                        } }) }) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx(Link, { href: `/library/series/${item.id}`, className: "line-clamp-1 text-base font-medium text-text-primary hover:text-accent-primary", children: item.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs text-text-secondary", children: [item.year && _jsx("span", { children: item.year }), item.year && item.network && _jsx("span", { children: "\u2022" }), item.network && _jsx("span", { children: item.network }), item.status && _jsx(StatusBadge, { status: item.status })] })] }), _jsx("button", { type: "button", className: "flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-surface-3", onClick: () => onToggleMonitored(item.id, !Boolean(item.monitored)), "aria-label": item.monitored ? 'Disable monitoring' : 'Enable monitoring', children: item.monitored ? (_jsx(Icon, { name: "success", className: "text-status-completed" })) : (_jsx(Icon, { name: "warning", className: "text-text-muted" })) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-text-secondary", children: [_jsxs("span", { children: [completed, "/", total, " episodes"] }), _jsx("div", { className: "flex-1", children: _jsx(ProgressBar, { value: progress }) })] }), _jsxs("div", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [nextAiring && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Icon, { name: "play", className: "h-3 w-3 text-accent-primary" }), _jsxs("span", { children: ["Next: S", nextAiring.seasonNumber, "E", nextAiring.episodeNumber, " - ", formatRelativeDate(nextAiring.airDate)] })] })), lastAired && !nextAiring && (_jsx("div", { className: "flex items-center gap-1", children: _jsxs("span", { children: ["Last: S", lastAired.seasonNumber, "E", lastAired.episodeNumber, " - ", formatRelativeDate(lastAired.airDate)] }) }))] }), item.overview && (_jsxs("div", { className: "text-xs", children: [_jsx("button", { type: "button", className: "text-accent-primary hover:underline", onClick: () => setIsExpanded(!isExpanded), "aria-expanded": isExpanded, "aria-controls": `overview-${item.id}`, children: isExpanded ? 'Show less' : 'Show more' }), isExpanded && (_jsx("p", { id: `overview-${item.id}`, className: "mt-1 line-clamp-4 text-text-secondary", children: item.overview }))] })), _jsxs("div", { className: "mt-auto flex justify-end gap-2", children: [onRefresh && (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3", onClick: () => onRefresh(item.id), "aria-label": `Refresh ${item.title}`, children: _jsx(Icon, { name: "refresh" }) })), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs transition-colors hover:bg-surface-3", "aria-label": `Edit ${item.title}`, children: _jsx(Icon, { name: "edit" }) }), onDelete && (_jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error transition-colors hover:bg-status-error/10", onClick: () => {
                                    const confirmed = window.confirm(`Delete ${item.title}?`);
                                    if (confirmed) {
                                        onDelete(item.id);
                                    }
                                }, "aria-label": `Delete ${item.title}`, children: _jsx(Icon, { name: "trash" }) }))] })] })] }));
}
export function SeriesOverviewView({ items, onToggleMonitored, onDelete, onRefresh }) {
    if (items.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-1 py-12", children: [_jsx(Icon, { name: "search", className: "mb-4 text-4xl text-text-muted" }), _jsx("p", { className: "text-center text-text-secondary", children: "No series found" })] }));
    }
    return (_jsx("div", { className: "space-y-3", children: items.map(item => (_jsx(SeriesOverviewCard, { item: item, onToggleMonitored: onToggleMonitored, onDelete: onDelete, onRefresh: onRefresh }, item.id))) }));
}
//# sourceMappingURL=SeriesOverviewView.js.map