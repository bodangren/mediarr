import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CalendarEvent } from './CalendarEvent';
import { CalendarMovieEvent } from './CalendarMovieEvent';
export function CalendarDay({ date, events, isToday }) {
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = dateObj.getDate();
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
    // Separate movies and episodes
    const movies = events.filter(e => e.type === 'movie').map(e => e.data);
    const episodes = events.filter(e => e.type === 'episode').map(e => e.data);
    return (_jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2 rounded-sm border border-border-subtle bg-surface-1 p-3", children: [_jsxs("div", { className: `flex items-center justify-between border-b border-border-subtle pb-2 ${isToday ? 'text-accent-primary' : ''}`, children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-semibold text-text-secondary", children: dayName }), _jsx("span", { className: "text-xl font-bold text-text-primary", children: dayNumber })] }), _jsxs("div", { className: "flex flex-col items-end gap-0.5", children: [_jsx("span", { className: "text-xs text-text-muted", children: monthName }), (movies.length > 0 || episodes.length > 0) && (_jsxs("div", { className: "flex items-center gap-1 text-[10px] text-text-muted", children: [movies.length > 0 && _jsxs("span", { children: [movies.length, " Movies"] }), movies.length > 0 && episodes.length > 0 && _jsx("span", { children: "/" }), episodes.length > 0 && _jsxs("span", { children: [episodes.length, " Episodes"] })] }))] })] }), _jsx("div", { className: "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto", children: events.length === 0 ? (_jsx("div", { className: "flex flex-1 items-center justify-center text-text-muted", children: _jsx("span", { className: "text-sm", children: "No events" }) })) : (_jsxs("div", { className: "flex flex-col gap-2", children: [movies.length > 0 && (_jsx("div", { className: "flex flex-col gap-1.5", children: movies.map(movie => (_jsx(CalendarMovieEvent, { movie: movie }, `movie-${movie.movieId}`))) })), episodes.length > 0 && (_jsx("div", { className: "flex flex-col gap-1.5", children: episodes.map(episode => (_jsx(CalendarEvent, { episode: episode }, `${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`))) }))] })) })] }));
}
//# sourceMappingURL=CalendarDay.js.map