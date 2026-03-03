import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { StatusBadge } from '@/components/primitives/StatusBadge';
export function CalendarEvent({ episode }) {
    const statusConfig = {
        downloaded: { color: 'status-completed', label: 'Downloaded' },
        missing: { color: 'status-wanted', label: 'Missing' },
        airing: { color: 'status-downloading', label: 'Airing' },
        unaired: { color: 'status-monitored', label: 'Unaired' },
    };
    const config = statusConfig[episode.status] || { color: 'text-text-muted', label: episode.status };
    return (_jsx(Link, { href: `/library/series/${episode.seriesId}`, className: "group block rounded-sm border border-border-subtle bg-surface-2 p-3 transition hover:border-status-monitored hover:bg-surface-3", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "truncate font-medium text-text-primary group-hover:text-accent-primary", children: episode.seriesTitle }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["S", episode.seasonNumber.toString().padStart(2, '0'), "E", episode.episodeNumber.toString().padStart(2, '0'), " - ", episode.episodeTitle] }), episode.airTime && (_jsx("p", { className: "text-xs text-text-muted", children: episode.airTime }))] }), _jsx(StatusBadge, { status: config.label })] }) }));
}
//# sourceMappingURL=CalendarEvent.js.map