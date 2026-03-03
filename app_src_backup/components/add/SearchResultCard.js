'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { StatusBadge } from '@/components/primitives/StatusBadge';
function getStatusBadge(status) {
    if (!status)
        return 'unknown';
    const normalized = status.toLowerCase();
    if (normalized.includes('continu') || normalized.includes('return'))
        return 'continuing';
    if (normalized.includes('end') || normalized.includes('cancel'))
        return 'ended';
    if (normalized.includes('upcom') || normalized.includes('announc'))
        return 'upcoming';
    return 'unknown';
}
export function SearchResultCard({ title, year, overview, network, status, posterUrl, isSelected, alreadyAdded, onSelect, }) {
    const displayPoster = posterUrl ?? '/images/placeholder-poster.png';
    const truncatedOverview = overview && overview.length > 150 ? `${overview.slice(0, 150)}...` : overview;
    return (_jsxs("article", { className: `flex gap-3 rounded-lg border p-3 transition-all ${isSelected
            ? 'border-accent-primary bg-accent-primary/10'
            : 'border-border-subtle bg-surface-1 hover:border-border-default'}`, children: [_jsx("div", { className: "h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-md bg-surface-2", children: _jsx("img", { src: displayPoster, alt: title, className: "h-full w-full object-cover", loading: "lazy", onError: event => {
                        const target = event.currentTarget;
                        target.src = '/images/placeholder-poster.png';
                    } }) }), _jsxs("div", { className: "flex flex-1 flex-col gap-1 overflow-hidden", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-semibold text-text-primary line-clamp-1", children: title }), alreadyAdded && _jsx(StatusBadge, { status: "monitored" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs text-text-secondary", children: [year && _jsx("span", { className: "font-medium", children: year }), network && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-border-subtle", children: "\u2022" }), _jsx("span", { children: network })] })), status && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-border-subtle", children: "\u2022" }), _jsx(StatusBadge, { status: getStatusBadge(status) })] }))] }), _jsx("p", { className: "mt-1 line-clamp-2 flex-1 text-sm text-text-secondary", children: truncatedOverview ?? 'No overview available.' }), _jsx("button", { type: "button", onClick: onSelect, className: "mt-2 self-start rounded-sm border border-border-subtle px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-2", children: alreadyAdded ? 'Review Config' : 'Select' })] })] }));
}
//# sourceMappingURL=SearchResultCard.js.map