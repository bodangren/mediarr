import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { CalendarDay } from './CalendarDay';
export function Calendar({ events, currentDate, dayCount }) {
    const { days, eventsByDate, today } = useMemo(() => {
        const startDate = new Date(currentDate);
        const startOfWeek = new Date(startDate);
        startOfWeek.setDate(startDate.getDate() - startDate.getDay());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = [];
        const eventsByDate = {};
        // Generate date range based on dayCount
        for (let i = 0; i < dayCount; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const isoDate = date.toISOString().split('T')[0];
            days.push(isoDate);
            eventsByDate[isoDate] = [];
        }
        // Group events by date
        for (const event of events) {
            const eventDate = event.type === 'episode' ? event.data.airDate : event.data.releaseDate;
            if (eventsByDate[eventDate]) {
                eventsByDate[eventDate].push(event);
            }
        }
        // Sort events within each day
        for (const date in eventsByDate) {
            eventsByDate[date].sort((a, b) => {
                // Movies first, then episodes
                if (a.type === 'movie' && b.type === 'episode')
                    return -1;
                if (a.type === 'episode' && b.type === 'movie')
                    return 1;
                // Within same type, sort by time/title
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
        return { days, eventsByDate, today: today.toISOString().split('T')[0] };
    }, [events, currentDate, dayCount]);
    return (_jsx("div", { className: "flex gap-3 overflow-x-auto pb-2", children: days.map(date => (_jsx(CalendarDay, { date: date, events: eventsByDate[date] || [], isToday: date === today }, date))) }));
}
//# sourceMappingURL=Calendar.js.map