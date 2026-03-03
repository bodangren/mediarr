import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { StatusBadge } from '@/components/primitives/StatusBadge';
export function CalendarMovieEvent({ movie, onClick }) {
    const statusConfig = {
        downloaded: { color: 'status-completed', label: 'Downloaded' },
        monitored: { color: 'status-monitored', label: 'Monitored' },
        missing: { color: 'status-wanted', label: 'Missing' },
        unmonitored: { color: 'text-text-muted', label: 'Unmonitored' },
    };
    const releaseTypeConfig = {
        cinema: { color: 'bg-purple-500/20 text-purple-400', label: 'Cinema' },
        digital: { color: 'bg-blue-500/20 text-blue-400', label: 'Digital' },
        physical: { color: 'bg-green-500/20 text-green-400', label: 'Physical' },
    };
    const statusInfo = statusConfig[movie.status] || { color: 'text-text-muted', label: movie.status };
    const releaseTypeInfo = releaseTypeConfig[movie.releaseType] || releaseTypeConfig.digital;
    const handleClick = (e) => {
        if (onClick) {
            e.preventDefault();
            onClick(movie);
        }
    };
    return (_jsxs(Link, { href: `/library/movies/${movie.movieId}`, onClick: handleClick, className: "group block flex items-start gap-2 rounded-sm border border-border-subtle bg-surface-2 p-2 transition hover:border-status-monitored hover:bg-surface-3", title: movie.title, children: [movie.posterUrl && (_jsx("div", { className: "relative h-10 w-7 flex-shrink-0 overflow-hidden rounded-sm bg-surface-1", children: _jsx("img", { src: movie.posterUrl, alt: movie.title, className: "h-full w-full object-cover", loading: "lazy" }) })), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1", children: [_jsxs("div", { className: "flex min-w-0 items-start justify-between gap-1", children: [_jsx("h3", { className: "truncate text-xs font-medium text-text-primary group-hover:text-accent-primary", children: movie.title }), _jsx(StatusBadge, { status: statusInfo.label })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-text-muted", children: [_jsx("span", { className: `inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${releaseTypeInfo.color}`, children: releaseTypeInfo.label }), movie.certification && (_jsx("span", { className: "truncate", children: movie.certification })), movie.runtime && (_jsxs("span", { className: "truncate", children: [movie.runtime, "m"] }))] })] })] }));
}
//# sourceMappingURL=CalendarMovieEvent.js.map