import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { CalendarEvent } from './CalendarEvent';
import { CalendarMovieEvent } from './CalendarMovieEvent';
export function Agenda({ events }) {
    const { eventsByDate, sortedDates } = useMemo(() => {
        const eventsByDate = {};
        const dates = new Set();
        // Group events by date
        for (const event of events) {
            const eventDate = event.type === 'episode' ? event.data.airDate : event.data.releaseDate;
            if (!eventsByDate[eventDate]) {
                eventsByDate[eventDate] = [];
            }
            eventsByDate[eventDate].push(event);
            dates.add(eventDate);
        }
        // Sort events within each day (movies first, then episodes)
        for (const date in eventsByDate) {
            eventsByDate[date].sort((a, b) => {
                // Movies first
                if (a.type === 'movie' && b.type === 'episode')
                    return -1;
                if (a.type === 'episode' && b.type === 'movie')
                    return 1;
                // Within same type
                if (a.type === 'movie' && b.type === 'movie') {
                    return a.data.title.localeCompare(b.data.title);
                }
                if (a.type === 'episode' && b.type === 'episode') {
                    const timeA = a.data.airTime || '00:00';
                    const timeB = b.data.airTime || '00:00';
                    return timeA.localeCompare(timeB);
                }
                return 0;
            });
        }
        // Sort dates chronologically
        const sortedDates = Array.from(dates).sort();
        return { eventsByDate, sortedDates };
    }, [events]);
    const today = new Date().toISOString().split('T')[0];
    return (_jsx("div", { className: "space-y-4", children: sortedDates.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-sm border border-border-subtle bg-surface-1 p-12 text-text-muted", children: [_jsx("p", { className: "text-lg font-medium", children: "No events scheduled" }), _jsx("p", { className: "text-sm", children: "Try adjusting your date range or filters" })] })) : (sortedDates.map(date => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
            const dayNumber = dateObj.getDate();
            const isToday = date === today;
            // Separate movies and episodes for this date
            const dateEvents = eventsByDate[date] || [];
            const movies = dateEvents.filter(e => e.type === 'movie').map(e => e.data);
            const episodes = dateEvents.filter(e => e.type === 'episode').map(e => e.data);
            return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: `flex items-center gap-2 border-b-2 ${isToday ? 'border-accent-primary text-accent-primary' : 'border-border-subtle text-text-secondary'} pb-2`, children: [_jsxs("h2", { className: "text-lg font-semibold", children: [dayName, ", ", monthName, " ", dayNumber] }), isToday && _jsx("span", { className: "rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium", children: "Today" }), (movies.length > 0 || episodes.length > 0) && (_jsxs("span", { className: "text-sm text-text-muted", children: [movies.length > 0 && `${movies.length} Movies`, movies.length > 0 && episodes.length > 0 && ' • ', episodes.length > 0 && `${episodes.length} Episodes`] }))] }), _jsxs("div", { className: "space-y-2", children: [movies.length > 0 && (_jsx("div", { className: "flex flex-col gap-2", children: movies.map(movie => (_jsx(CalendarMovieEvent, { movie: movie }, `movie-${movie.movieId}`))) })), episodes.length > 0 && (_jsx("div", { className: "flex flex-col gap-2", children: episodes.map(episode => (_jsx(CalendarEvent, { episode: episode }, `${episode.seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`))) }))] })] }, date));
        })) }));
}
//# sourceMappingURL=Agenda.js.map