'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from 'lucide-react';
import { StatusBadge } from '@/components/primitives/StatusBadge';
export function getStatusBadgeColor(status) {
    switch (status) {
        case 'announced':
            return 'text-accent-info';
        case 'incinemas':
            return 'text-accent-warning';
        case 'released':
            return 'text-accent-success';
        case 'missing':
        default:
            return 'text-accent-danger';
    }
}
export function getStatusLabel(status) {
    switch (status) {
        case 'announced':
            return 'Announced';
        case 'incinemas':
            return 'In Cinemas';
        case 'released':
            return 'Released';
        case 'missing':
        default:
            return 'Missing';
    }
}
export function WantedMovieRow({ movie, onSearch, onEdit, onDelete, onToggleMonitored, selected, onSelect, }) {
    return (_jsxs("tr", { className: "border-b border-border-subtle hover:bg-surface-2", children: [_jsx("td", { className: "px-3 py-3", children: _jsx("input", { type: "checkbox", checked: selected, onChange: () => onSelect(movie.id), className: "rounded-sm border-border-subtle bg-surface-1" }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [movie.posterUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        _jsx("img", { src: movie.posterUrl, alt: movie.title, className: "h-12 w-8 rounded-sm object-cover" })), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: movie.title }), _jsx("div", { className: "text-sm text-text-secondary", children: movie.year })] })] }) }), _jsx("td", { className: "px-3 py-3", children: _jsx(StatusBadge, { status: movie.status === 'missing' ? 'wanted' : 'monitored' }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex flex-col gap-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Cinema:" }), ' ', _jsx("span", { className: "text-text-primary", children: movie.cinemaDate || '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Digital:" }), ' ', _jsx("span", { className: "text-text-primary", children: movie.digitalRelease || '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-secondary", children: "Physical:" }), ' ', _jsx("span", { className: "text-text-primary", children: movie.physicalRelease || '-' })] })] }) }), _jsx("td", { className: "px-3 py-3", children: _jsx("span", { className: "text-sm", children: movie.qualityProfileName || '-' }) }), _jsx("td", { className: "px-3 py-3", children: _jsx("span", { className: "text-sm", children: movie.runtime ? `${movie.runtime} min` : '-' }) }), _jsx("td", { className: "px-3 py-3", children: _jsx("button", { type: "button", onClick: () => onToggleMonitored(movie.movieId, !movie.monitored), className: `rounded-sm px-2 py-1 text-xs font-medium transition-colors ${movie.monitored
                        ? 'bg-accent-success text-text-primary'
                        : 'bg-surface-2 text-text-secondary'}`, children: movie.monitored ? 'Monitored' : 'Unmonitored' }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => onSearch(movie), className: "rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2", children: "Search" }), _jsx("button", { type: "button", onClick: () => onEdit(movie), className: "rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2", children: "Edit" }), _jsx("button", { type: "button", onClick: () => onDelete(movie), className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-accent-danger hover:bg-surface-2", children: "Delete" })] }) })] }));
}
//# sourceMappingURL=WantedMovieRow.js.map